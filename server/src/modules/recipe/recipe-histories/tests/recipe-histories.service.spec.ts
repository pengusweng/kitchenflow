import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RecipeIngredientsRepository } from '../../recipe-ingredients/recipe-ingredients.repository';
import { RecipeStepsRepository } from '../../recipe-steps/recipe-steps.repository';
import { RecipesRepository } from '../../recipes/recipes.repository';
import { RecipeHistoriesRepository } from '../recipe-histories.repository';
import { RecipeHistoriesService } from '../recipe-histories.service';

describe('RecipeHistoriesService listing', () => {
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const recipe = {
    recipe_id: recipeId,
    code: 'RCP-GC-KIMCHI',
    is_active: false,
  };
  const histories = [{ version: 2 }, { version: 1 }];

  function setup(found: unknown = recipe) {
    const recipes = { findOne: jest.fn().mockResolvedValue(found) };
    const repository = { findMany: jest.fn().mockResolvedValue(histories) };
    const service = new RecipeHistoriesService(
      {} as PrismaService,
      repository as unknown as RecipeHistoriesRepository,
      recipes as unknown as RecipesRepository,
      {} as RecipeIngredientsRepository,
      {} as RecipeStepsRepository,
    );
    return { service, recipes, repository };
  }

  it('UT-RCPH-001: Given a recipe, When its history is listed, Then return its snapshots whether the recipe is active or not', async () => {
    const { service, recipes, repository } = setup();

    await expect(service.findMany(recipeId)).resolves.toBe(histories);
    // activeOnly = false, and no confidential notes are needed for the lookup.
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      false,
      false,
      undefined,
    );
    expect(repository.findMany).toHaveBeenCalledWith(recipeId, undefined);
  });

  it('UT-RCPH-002: Given an unknown recipe, When its history is listed, Then throw not found without reading histories', async () => {
    const { service, repository } = setup(null);

    await expect(service.findMany(recipeId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findMany).not.toHaveBeenCalled();
  });
});

describe('RecipeHistoriesRepository listing', () => {
  it('UT-RCPH-003: Given a recipe ID, When histories are read, Then query that recipe newest version first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new RecipeHistoriesRepository({
      recipeHistory: { findMany },
    } as unknown as PrismaService);

    await repository.findMany('recipe-id');
    expect(findMany).toHaveBeenCalledWith({
      where: { recipe_id: 'recipe-id' },
      orderBy: { version: 'desc' },
    });
  });
});
