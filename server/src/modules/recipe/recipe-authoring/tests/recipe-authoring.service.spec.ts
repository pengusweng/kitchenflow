import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { UnitsRepository } from '../../../units/units.repository';
import { RecipeIngredientsRepository } from '../../recipe-ingredients/recipe-ingredients.repository';
import { RecipeStepsRepository } from '../../recipe-steps/recipe-steps.repository';
import { RecipeHistoriesService } from '../../recipe-histories/recipe-histories.service';
import { RecipeIngredientsService } from '../../recipe-ingredients/recipe-ingredients.service';
import { RecipeStepsService } from '../../recipe-steps/recipe-steps.service';
import { RecipesService } from '../../recipes/recipes.service';
import { CreateFullRecipeDTO } from '../dto/create-full-recipe.dto';
import { RecipeAuthoringService } from '../recipe-authoring.service';

describe('RecipeAuthoringService', () => {
  const brandId = '00000000-0000-4000-8000-000000000001';
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const tx = { marker: 'tx' } as unknown as Prisma.TransactionClient;
  const recipeFields = {
    brand_id: brandId,
    code: 'RCP-GC-KIMCHI-FRIED-RICE',
    name: 'Kimchi Fried Rice',
    formulation_notes: 'Restricted notes.',
  };
  const ingredientsDto = [
    { ingredient_name: 'Kimchi', quantity: 150, unit_code: 'g', note: null },
  ];
  const stepsDto = [
    { step_no: 1, instruction: 'Stir-fry the kimchi.' },
    { step_no: 2, instruction: 'Add the rice.' },
  ];
  const dto: CreateFullRecipeDTO = {
    ...recipeFields,
    ingredients: ingredientsDto,
    steps: stepsDto,
  };
  const recipe = {
    ...recipeFields,
    recipe_id: recipeId,
    version: 1,
    is_active: true,
    created_at: new Date('2026-11-21T00:00:00.000Z'),
    modified_at: new Date('2026-11-21T00:00:00.000Z'),
  };
  const createdIngredients = [
    {
      ...ingredientsDto[0],
      recipe_ingredient_id: '00000000-0000-4000-8000-000000000020',
      recipe_id: recipeId,
    },
  ];
  const createdSteps = stepsDto.map((step, index) => ({
    ...step,
    recipe_step_id: `00000000-0000-4000-8000-00000000003${index}`,
    recipe_id: recipeId,
  }));

  let prisma: { $transaction: jest.Mock };
  let recipes: jest.Mocked<Pick<RecipesService, 'create'>>;
  let ingredients: jest.Mocked<Pick<RecipeIngredientsService, 'createMany'>>;
  let steps: jest.Mocked<Pick<RecipeStepsService, 'createMany'>>;
  let histories: jest.Mocked<Pick<RecipeHistoriesService, 'create'>>;
  let service: RecipeAuthoringService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    prisma = {
      $transaction: jest.fn(
        (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    recipes = { create: jest.fn().mockResolvedValue(recipe) };
    ingredients = {
      createMany: jest.fn().mockResolvedValue(createdIngredients),
    };
    steps = { createMany: jest.fn().mockResolvedValue(createdSteps) };
    histories = { create: jest.fn().mockResolvedValue({}) };
    service = new RecipeAuthoringService(
      prisma as unknown as PrismaService,
      recipes as unknown as RecipesService,
      ingredients as unknown as RecipeIngredientsService,
      steps as unknown as RecipeStepsService,
      histories as unknown as RecipeHistoriesService,
      {} as RecipeIngredientsRepository,
      {} as RecipeStepsRepository,
      {} as UnitsRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('UT-RCPA-001: Given a full recipe, When it is authored, Then return the recipe with its created ingredients and steps', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      ...recipe,
      ingredients: createdIngredients,
      steps: createdSteps,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('UT-RCPA-002: Given a full recipe, When it is authored, Then create the recipe row without the ingredients and steps arrays', async () => {
    await service.create(dto);

    expect(recipes.create).toHaveBeenCalledWith(recipeFields, tx);
    const [recipeDto] = recipes.create.mock.calls[0];
    expect(recipeDto).not.toHaveProperty('ingredients');
    expect(recipeDto).not.toHaveProperty('steps');
  });

  it('UT-RCPA-003: Given a full recipe, When it is authored, Then pass the new recipe ID and the same transaction to every write', async () => {
    await service.create(dto);

    expect(ingredients.createMany).toHaveBeenCalledWith(
      recipeId,
      ingredientsDto,
      tx,
    );
    expect(steps.createMany).toHaveBeenCalledWith(recipeId, stepsDto, tx);
    expect(histories.create).toHaveBeenCalledWith({ recipe_id: recipeId }, tx);
  });

  it('UT-RCPA-004: Given a full recipe, When it is authored, Then snapshot the history only after the recipe, ingredients and steps exist', async () => {
    await service.create(dto);

    const order = [
      recipes.create,
      ingredients.createMany,
      steps.createMany,
      histories.create,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('UT-RCPA-005: Given a missing or inactive brand, When a recipe is authored, Then throw without writing ingredients, steps or history', async () => {
    recipes.create.mockRejectedValue(new NotFoundException());

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(ingredients.createMany).not.toHaveBeenCalled();
    expect(steps.createMany).not.toHaveBeenCalled();
    expect(histories.create).not.toHaveBeenCalled();
  });

  it('UT-RCPA-006: Given invalid ingredients, When a recipe is authored, Then throw from the transaction without writing steps or history', async () => {
    ingredients.createMany.mockRejectedValue(new BadRequestException());

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(steps.createMany).not.toHaveBeenCalled();
    expect(histories.create).not.toHaveBeenCalled();
  });

  it('UT-RCPA-007: Given invalid steps, When a recipe is authored, Then throw from the transaction without writing history', async () => {
    steps.createMany.mockRejectedValue(new BadRequestException());

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(histories.create).not.toHaveBeenCalled();
  });

  it('UT-RCPA-008: Given the history snapshot fails, When a recipe is authored, Then throw from the transaction so every write rolls back', async () => {
    histories.create.mockRejectedValue(new Error('snapshot failed'));

    await expect(service.create(dto)).rejects.toThrow('snapshot failed');
  });
});
