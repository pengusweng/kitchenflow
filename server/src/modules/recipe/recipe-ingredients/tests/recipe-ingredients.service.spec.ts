import { Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecipesRepository } from '../../recipes/recipes.repository';
import { RecipeIngredientsRepository } from '../recipe-ingredients.repository';
import { RecipeIngredientsService } from '../recipe-ingredients.service';

describe('RecipeIngredientsService', () => {
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const ingredientId = '00000000-0000-4000-8000-000000000020';
  const recipe = { recipe_id: recipeId, code: 'RCP-1', is_active: true };
  const ingredient = {
    recipe_ingredient_id: ingredientId,
    recipe_id: recipeId,
    ingredient_name: 'Kimchi',
    quantity: new Prisma.Decimal(150),
    unit_code: 'g',
    note: null,
  };
  const dto = {
    recipe_id: recipeId,
    ingredient_name: 'Kimchi',
    quantity: 150,
    unit_code: 'g',
  };
  let ingredients: jest.Mocked<
    Pick<
      RecipeIngredientsRepository,
      'create' | 'findOne' | 'findMany' | 'update' | 'delete'
    >
  >;
  let recipes: jest.Mocked<Pick<RecipesRepository, 'findOne'>>;
  let service: RecipeIngredientsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    ingredients = {
      create: jest.fn().mockResolvedValue(ingredient),
      findOne: jest.fn().mockResolvedValue(ingredient),
      findMany: jest.fn().mockResolvedValue([ingredient]),
      update: jest
        .fn()
        .mockResolvedValue({ ...ingredient, ingredient_name: 'Rice' }),
      delete: jest.fn().mockResolvedValue(ingredient),
    };
    recipes = { findOne: jest.fn().mockResolvedValue(recipe) };
    service = new RecipeIngredientsService(
      ingredients as unknown as RecipeIngredientsRepository,
      recipes as unknown as RecipesRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('UT-RCPI-001: Given an active recipe, When an ingredient is created, Then check the recipe and persist the ingredient', async () => {
    await expect(service.create(dto)).resolves.toEqual(ingredient);
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(ingredients.create).toHaveBeenCalledWith(dto, undefined);
  });

  it('UT-RCPI-002: Given a missing or inactive recipe, When an ingredient is created, Then throw RECIPE_NOT_FOUND without writing', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toMatchObject({
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(ingredients.create).not.toHaveBeenCalled();
  });

  it('UT-RCPI-003: Given an active recipe, When its ingredients are listed, Then return the ingredients of the recipe', async () => {
    await expect(service.findMany(recipeId)).resolves.toEqual([ingredient]);
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(ingredients.findMany).toHaveBeenCalledWith(recipeId, undefined);
  });

  it('UT-RCPI-004: Given a missing or inactive recipe, When its ingredients are listed, Then throw RECIPE_NOT_FOUND without querying ingredients', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(service.findMany(recipeId)).rejects.toMatchObject({
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(ingredients.findMany).not.toHaveBeenCalled();
  });

  it('UT-RCPI-005: Given an existing ingredient, When it is fetched, Then return it', async () => {
    await expect(service.findOne(ingredientId)).resolves.toEqual(ingredient);
    expect(ingredients.findOne).toHaveBeenCalledWith(ingredientId, undefined);
  });

  it('UT-RCPI-006: Given an unknown ingredient, When it is fetched, Then throw RECIPE_INGREDIENT_NOT_FOUND', async () => {
    ingredients.findOne.mockResolvedValue(null);

    await expect(service.findOne(ingredientId)).rejects.toMatchObject({
      response: { code: 'RECIPE_INGREDIENT_NOT_FOUND' },
    });
  });

  it('UT-RCPI-007: Given an ingredient of an active recipe, When it is updated, Then check its recipe and save the changes', async () => {
    await expect(
      service.update(ingredientId, { ingredient_name: 'Rice' }),
    ).resolves.toEqual({ ...ingredient, ingredient_name: 'Rice' });
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(ingredients.update).toHaveBeenCalledWith(
      ingredientId,
      { ingredient_name: 'Rice' },
      undefined,
    );
  });

  it('UT-RCPI-008: Given an unknown ingredient, When it is updated, Then throw not found without checking the recipe or writing', async () => {
    ingredients.findOne.mockResolvedValue(null);

    await expect(
      service.update(ingredientId, { ingredient_name: 'Rice' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(recipes.findOne).not.toHaveBeenCalled();
    expect(ingredients.update).not.toHaveBeenCalled();
  });

  it('UT-RCPI-009: Given an ingredient of an inactive recipe, When it is updated, Then throw RECIPE_NOT_FOUND without writing', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(
      service.update(ingredientId, { ingredient_name: 'Rice' }),
    ).rejects.toMatchObject({ response: { code: 'RECIPE_NOT_FOUND' } });
    expect(ingredients.update).not.toHaveBeenCalled();
  });

  it('UT-RCPI-010: Given an ingredient of an active recipe, When it is deleted, Then hard delete and return it', async () => {
    await expect(service.delete(ingredientId)).resolves.toEqual(ingredient);
    expect(ingredients.delete).toHaveBeenCalledWith(ingredientId, undefined);
  });

  it('UT-RCPI-011: Given an unknown ingredient, When it is deleted, Then throw not found without checking the recipe or deleting', async () => {
    ingredients.findOne.mockResolvedValue(null);

    await expect(service.delete(ingredientId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(recipes.findOne).not.toHaveBeenCalled();
    expect(ingredients.delete).not.toHaveBeenCalled();
  });

  it('UT-RCPI-012: Given an ingredient of an inactive recipe, When it is deleted, Then throw RECIPE_NOT_FOUND without deleting', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(service.delete(ingredientId)).rejects.toMatchObject({
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(ingredients.delete).not.toHaveBeenCalled();
  });

  it('UT-RCPI-013: Given a transaction client, When every method runs, Then pass it to every repository call', async () => {
    const tx = {} as Prisma.TransactionClient;

    await service.create(dto, tx);
    await service.findMany(recipeId, tx);
    await service.findOne(ingredientId, tx);
    await service.update(ingredientId, { note: null }, tx);
    await service.delete(ingredientId, tx);

    const calls = [
      ...recipes.findOne.mock.calls,
      ...ingredients.create.mock.calls,
      ...ingredients.findMany.mock.calls,
      ...ingredients.findOne.mock.calls,
      ...ingredients.update.mock.calls,
      ...ingredients.delete.mock.calls,
    ];
    expect(calls).toHaveLength(11);
    for (const call of calls) expect(call.at(-1)).toBe(tx);
  });
});
