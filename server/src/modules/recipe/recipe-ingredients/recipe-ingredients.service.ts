import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { RecipesRepository } from '../recipes/recipes.repository';
import { CreateRecipeIngredientDTO } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDTO } from './dto/update-recipe-ingredient.dto';
import { RecipeIngredientsRepository } from './recipe-ingredients.repository';

@Injectable()
export class RecipeIngredientsService {
  private readonly logger = new Logger(RecipeIngredientsService.name);
  constructor(
    private readonly recipeIngredientsRepository: RecipeIngredientsRepository,
    private readonly recipesRepository: RecipesRepository,
  ) {}

  async create(dto: CreateRecipeIngredientDTO, tx?: Prisma.TransactionClient) {
    this.logger.log(`Creating recipe ingredient for ${dto.recipe_id}`);

    const recipe = await this.recipesRepository.findOne(
      dto.recipe_id,
      true,
      false, // false ko nalang tong recipe formulation
      tx,
    );

    assertExists(recipe, 'Recipe', dto.recipe_id, this.logger);

    const recipeIngredient = await this.recipeIngredientsRepository.create(
      dto,
      tx,
    );

    this.logger.log(
      `Created recipe ingredient ${recipeIngredient.ingredient_name} for recipe ${recipe.recipe_id}`,
    );

    return recipeIngredient;
  }

  async findMany(recipeId: string, tx?: Prisma.TransactionClient) {
    this.logger.log(`Finding recipe ingredients for recipeId ${recipeId}`);

    const recipe = await this.recipesRepository.findOne(
      recipeId,
      true,
      false, // false ko nalang tong recipe formulation
      tx,
    );

    assertExists(recipe, 'Recipe', recipeId, this.logger);

    const recipeIngredients = await this.recipeIngredientsRepository.findMany(
      recipeId,
      tx,
    );

    this.logger.log(
      `Found ${recipeIngredients.length} recipe ingredients for recipe ${recipeId}`,
    );

    return recipeIngredients;
  }

  async findOne(recipeIngredientId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding recipe ingredient ${recipeIngredientId}`);

    const ingredient = await this.recipeIngredientsRepository.findOne(
      recipeIngredientId,
      tx,
    );
    assertExists(
      ingredient,
      'RecipeIngredient',
      recipeIngredientId,
      this.logger,
    );

    this.logger.log(
      `Recipe ingredient ${ingredient.recipe_ingredient_id} found`,
    );
    return ingredient;
  }

  async update(
    recipeIngredientId: string,
    dto: UpdateRecipeIngredientDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating recipe ingredient ${recipeIngredientId}`);

    const ingredient = await this.findOne(recipeIngredientId, tx);
    await this.assertActiveRecipe(ingredient.recipe_id, tx);

    const updated = await this.recipeIngredientsRepository.update(
      recipeIngredientId,
      dto,
      tx,
    );
    this.logger.log(
      `Updated recipe ingredient ${updated.ingredient_name} for recipe ${updated.recipe_id}`,
    );

    return updated;
  }

  async delete(recipeIngredientId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deleting recipe ingredient ${recipeIngredientId}`);

    const ingredient = await this.findOne(recipeIngredientId, tx);
    await this.assertActiveRecipe(ingredient.recipe_id, tx);

    const deleted = await this.recipeIngredientsRepository.delete(
      recipeIngredientId,
      tx,
    );
    this.logger.log(
      `Deleted recipe ingredient ${deleted.ingredient_name} from recipe ${deleted.recipe_id}`,
    );

    return deleted;
  }

  private async assertActiveRecipe(
    recipeId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const recipe = await this.recipesRepository.findOne(
      recipeId,
      true,
      false,
      tx,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);
    return recipe;
  }
}
