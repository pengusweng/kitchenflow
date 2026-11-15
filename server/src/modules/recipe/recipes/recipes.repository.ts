import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateRecipeDTO } from './dto/create-recipe.dto';
import { UpdateRecipeDTO } from './dto/update-recipe.dto';
import { FindRecipesDTO, RecipeSortField } from './dto/find-recipes.dto';
import type { SortOrder } from '../../users/dto/find-users.dto';

@Injectable()
export class RecipesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateRecipeDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipe.create({
      data: dto,
    });
  }

  async findAll(
    skip: number,
    take: number,
    {
      status,
      search,
      brand_id,
      sortBy,
      sortOrder,
    }: Pick<
      FindRecipesDTO,
      'status' | 'search' | 'brand_id' | 'sortBy' | 'sortOrder'
    >,
    includeFormulationNotes = false,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const matchesFilters: Prisma.RecipeWhereInput = {
      ...this.searchWhere(search),
      brand_id,
    };
    const where: Prisma.RecipeWhereInput = {
      ...matchesFilters,
      is_active: status === 'all' ? undefined : status === 'active',
    };

    const recipesQuery = tx.recipe.findMany({
      where,
      skip,
      take,
      orderBy: this.orderBy(sortBy, sortOrder),
      omit: { formulation_notes: !includeFormulationNotes },
    });

    const activeQuery = tx.recipe.count({
      where: { ...matchesFilters, is_active: true },
    });
    const inactiveQuery = tx.recipe.count({
      where: { ...matchesFilters, is_active: false },
    });

    const [recipes, active, inactive] =
      '$transaction' in tx
        ? await tx.$transaction([recipesQuery, activeQuery, inactiveQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([recipesQuery, activeQuery, inactiveQuery]);

    return { recipes, counts: { all: active + inactive, active, inactive } };
  }

  private orderBy(
    sortBy?: RecipeSortField,
    sortOrder: SortOrder = 'asc',
  ): Prisma.RecipeOrderByWithRelationInput[] {
    const primary: Record<
      RecipeSortField,
      Prisma.RecipeOrderByWithRelationInput[]
    > = {
      name: [{ name: sortOrder }],
      code: [{ code: sortOrder }],
      created_at: [{ created_at: sortOrder }, { name: 'asc' }],
      modified_at: [{ modified_at: sortOrder }, { name: 'asc' }],
    };
    return [
      ...(sortBy ? primary[sortBy] : [{ created_at: 'desc' as const }]),
      { recipe_id: 'asc' },
    ];
  }

  private searchWhere(search?: string): Prisma.RecipeWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: (['code', 'name'] as const).map((field) => ({
          [field]: { contains: term, mode: 'insensitive' },
        })),
      })),
    };
  }

  async findOne(
    recipeIdOrCode: string,
    activeOnly = true,
    includeFormulationNotes = false,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const key: Prisma.RecipeWhereUniqueInput = isUUID(recipeIdOrCode)
      ? { recipe_id: recipeIdOrCode }
      : { code: recipeIdOrCode };
    return tx.recipe.findUnique({
      where: {
        ...key,
        is_active: activeOnly ? true : undefined,
      },
      omit: { formulation_notes: !includeFormulationNotes },
    });
  }

  async update(
    recipeId: string,
    dto: UpdateRecipeDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipe.update({
      where: { recipe_id: recipeId, is_active: true },
      data: {
        code: dto.code,
        name: dto.name,
        formulation_notes: dto.formulation_notes,
        version: { increment: 1 },
        modified_at: new Date(),
      },
    });
  }

  async deactivate(
    recipeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipe.update({
      where: {
        recipe_id: recipeId,
        is_active: true,
      },
      data: {
        is_active: false,
        modified_at: new Date(),
      },
    });
  }

  async reactivate(
    recipeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipe.update({
      where: {
        recipe_id: recipeId,
        is_active: false,
      },
      data: {
        is_active: true,
        modified_at: new Date(),
      },
    });
  }
}
