import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UpdateRecipeDTO } from './dto/update-recipe.dto';
import { CreateRecipeDTO } from './dto/create-recipe.dto';
import { BrandsRepository } from '../../brands/brands.repository';
import { Prisma, UserRole } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { RecipesRepository } from './recipes.repository';
import { UsersRepository } from '../../users/users.repository';
import { FindRecipesDTO } from './dto/find-recipes.dto';
import { assertValidPagination } from '../../../shared/assertions/assert-valid-pagination';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipesRepository: RecipesRepository,
    private readonly brandsRepository: BrandsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreateRecipeDTO, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Creating recipe ${dto.code} for ${dto.brand_id}`);

    const brand = await this.brandsRepository.findOneBrand(
      dto.brand_id,
      true,
      tx,
    );
    assertExists(brand, 'Brand', dto.brand_id);

    const recipe = await this.recipesRepository.create(dto);
    this.logger.log(`Created recipe ${recipe.code}`);

    return recipe;
  }

  async findMany(
    callerId: string,
    query: FindRecipesDTO,
    tx?: Prisma.TransactionClient,
  ) {
    const { page, limit, status, search, brand_id, sortBy, sortOrder } = query;

    this.logger.log(
      `Listing recipes: user=${callerId}, page=${page}, limit=${limit}, status=${status}, brand=${brand_id ?? 'any'}, search=${search ? 'yes' : 'no'}, sort=${sortBy ? `${sortBy} ${sortOrder ?? 'asc'}` : 'default'}`,
    );

    const hasConfidentialAccess = await this.hasConfidentialAccess(callerId);

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { recipes, counts } = await this.recipesRepository.findAll(
      skip,
      limit,
      { status, search, brand_id, sortBy, sortOrder },
      hasConfidentialAccess,
      tx,
    );
    const total = counts[status];

    this.logger.log(
      `Listed recipes: page=${page}, returned=${recipes.length}, total=${total}`,
    );

    return {
      data: recipes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts,
      },
    };
  }

  async findOne(callerId: string, recipeId: string) {
    this.logger.debug(`Finding recipe ${recipeId}`);

    const hasConfidentialAccess = await this.hasConfidentialAccess(callerId);
    const recipe = await this.recipesRepository.findOne(
      recipeId,
      false,
      hasConfidentialAccess,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);

    this.logger.log(`Recipe ${recipe.code} found`);
    return recipe;
  }

  async update(
    recipeId: string,
    dto: UpdateRecipeDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating recipe ${recipeId}`);

    const recipe = await this.recipesRepository.findOne(
      recipeId,
      true,
      false,
      tx,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);

    // Formulation notes are confidential, so the response never includes them.
    const updated = await this.recipesRepository.update(
      recipeId,
      dto,
      false,
      tx,
    );
    this.logger.log(`Updated recipe ${updated.code} to v${updated.version}`);

    return updated;
  }

  async deactivate(recipeId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deactivating recipe ${recipeId}`);

    const recipe = await this.recipesRepository.findOne(
      recipeId,
      true,
      false,
      tx,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);

    const deactivated = await this.recipesRepository.deactivate(recipeId, tx);
    this.logger.log(`Deactivated recipe ${deactivated.code}`);

    return {
      recipe_id: deactivated.recipe_id,
      is_active: deactivated.is_active,
    };
  }

  async reactivate(recipeId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Reactivating recipe ${recipeId}`);

    const recipe = await this.recipesRepository.findOne(
      recipeId,
      false,
      false,
      tx,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);

    const reactivated = await this.recipesRepository.reactivate(recipeId, tx);
    this.logger.log(`Reactivated recipe ${reactivated.code}`);

    return {
      recipe_id: reactivated.recipe_id,
      is_active: reactivated.is_active,
    };
  }

  private async hasConfidentialAccess(
    callerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const user = await this.usersRepository.findOne(callerId, true, tx);
    assertExists(user, 'User', callerId, this.logger);
    return (
      user.role === UserRole.RECIPE_MANAGER || user.role === UserRole.SUPERADMIN
    );
  }
}
