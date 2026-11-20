import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RecipeHistory } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RecipeIngredientsRepository } from '../recipe-ingredients/recipe-ingredients.repository';
import { RecipeStepsRepository } from '../recipe-steps/recipe-steps.repository';
import { RecipesRepository } from '../recipes/recipes.repository';
import { CreateRecipeHistoryDTO } from './dto/create-recipe-history.dto';
import { RecipeHistoriesRepository } from './recipe-histories.repository';

@Injectable()
export class RecipeHistoriesService {
  private readonly logger = new Logger(RecipeHistoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeHistoriesRepository: RecipeHistoriesRepository,
    private readonly recipesRepository: RecipesRepository,
    private readonly recipeIngredientsRepository: RecipeIngredientsRepository,
    private readonly recipeStepsRepository: RecipeStepsRepository,
  ) {}

  async create(
    dto: CreateRecipeHistoryDTO,
    tx?: Prisma.TransactionClient,
  ): Promise<RecipeHistory> {
    if (!tx) {
      return this.prisma.$transaction((client) => this.create(dto, client), {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      });
    }

    this.logger.debug(`Creating recipe history for recipe ${dto.recipe_id}`);

    const recipe = await this.recipesRepository.findOne(
      dto.recipe_id,
      true,
      true,
      tx,
    );
    assertExists(recipe, 'Recipe', dto.recipe_id, this.logger);

    const ingredients = await this.recipeIngredientsRepository.findMany(
      dto.recipe_id,
      tx,
    );
    const steps = await this.recipeStepsRepository.findMany(dto.recipe_id, tx);

    const history = await this.recipeHistoriesRepository.create(
      {
        recipe_id: recipe.recipe_id,
        version: recipe.version,
        recipe_snapshot: this.toJson(recipe),
        ingredients_snapshot: this.toJson(ingredients),
        steps_snapshot: this.toJson(steps),
      },
      tx,
    );

    this.logger.log(
      `Created recipe history for recipe ${recipe.code} v${recipe.version}`,
    );
    return history;
  }

  async findOne(recipeHistoryId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding recipe history ${recipeHistoryId}`);

    const history = await this.recipeHistoriesRepository.findOne(
      recipeHistoryId,
      tx,
    );
    assertExists(history, 'RecipeHistory', recipeHistoryId, this.logger);

    this.logger.log(`Recipe history ${history.recipe_history_id} found`);
    return history;
  }

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
