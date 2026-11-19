import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { RecipesRepository } from '../recipes/recipes.repository';
import { CreateRecipeIngredientDTO } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDTO } from './dto/update-recipe-ingredient.dto';
import { RecipeIngredientsRepository } from './recipe-ingredients.repository';
import { UnitsRepository } from '../../units/units.repository';

@Injectable()
export class RecipeIngredientsService {
  private readonly logger = new Logger(RecipeIngredientsService.name);
  constructor(
    private readonly recipeIngredientsRepository: RecipeIngredientsRepository,
    private readonly recipesRepository: RecipesRepository,
    private readonly unitsRepository: UnitsRepository,
  ) {}

  async create(
    recipeId: string,
    dto: CreateRecipeIngredientDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Creating recipe ingredient for ${recipeId}`);

    await this.assertActiveRecipe(recipeId, tx);
    await this.assertExistingUnit(dto.unit_code, tx);

    const recipeIngredient = await this.recipeIngredientsRepository.create(
      recipeId,
      dto,
      tx,
    );

    this.logger.log(
      `Created recipe ingredient ${recipeIngredient.ingredient_name} for recipe ${recipeId}`,
    );

    return recipeIngredient;
  }

  async createMany(
    recipeId: string,
    ingredients: CreateRecipeIngredientDTO[],
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Creating ${ingredients.length} ingredients for recipe ${recipeId}`,
    );

    this.assertNoDuplicateNames(ingredients);
    await this.assertExistingUnits(ingredients, tx);
    await this.assertActiveRecipe(recipeId, tx);

    const recipeIngredients = await this.recipeIngredientsRepository.createMany(
      recipeId,
      ingredients,
      tx,
    );

    this.logger.log(
      `Created ${recipeIngredients.length} ingredients for recipe ${recipeId}`,
    );

    return recipeIngredients;
  }

  private assertNoDuplicateNames(ingredients: CreateRecipeIngredientDTO[]) {
    const names = ingredients.map((i) =>
      i.ingredient_name.trim().toLowerCase(),
    );

    const ingredientNameSet = new Set(names);

    if (ingredientNameSet.size !== ingredients.length) {
      this.logger.warn(`Duplicate ingredient name found.`);

      throw new BadRequestException({
        code: 'DUPLICATE_INGREDIENT_NAME',
        message: 'Ingredient must be unique',
      });
    }
  }

  private async assertExistingUnits(
    ingredients: CreateRecipeIngredientDTO[],
    tx?: Prisma.TransactionClient,
  ) {
    for (const ingredient of ingredients) {
      await this.assertExistingUnit(ingredient.unit_code, tx);
    }
  }

  private async assertExistingUnit(
    unitCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    const unit = await this.unitsRepository.findOne(unitCode, tx);
    if (!unit) {
      throw new BadRequestException({
        code: 'NON_EXISTING_UNIT',
        message: `Enter an existing unit code`,
      });
    }
  }

  async findMany(recipeId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding recipe ingredients for recipeId ${recipeId}`);

    await this.assertActiveRecipe(recipeId, tx);

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
