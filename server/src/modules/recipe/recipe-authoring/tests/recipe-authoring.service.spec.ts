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
import { UpdateFullRecipeDTO } from '../dto/update-full-recipe.dto';
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

  // Existing children used by the update tests.
  const ing1 = '00000000-0000-4000-8000-000000000021';
  const ing2 = '00000000-0000-4000-8000-000000000022';
  const step1 = '00000000-0000-4000-8000-000000000031';
  const step2 = '00000000-0000-4000-8000-000000000032';
  const step3 = '00000000-0000-4000-8000-000000000033';
  const unknownId = '00000000-0000-4000-8000-000000000099';
  const currentIngredients = [
    {
      recipe_ingredient_id: ing1,
      recipe_id: recipeId,
      ingredient_name: 'Kimchi',
      quantity: '150',
      unit_code: 'g',
      note: null,
    },
    {
      recipe_ingredient_id: ing2,
      recipe_id: recipeId,
      ingredient_name: 'Rice',
      quantity: '200',
      unit_code: 'g',
      note: null,
    },
  ];
  const currentSteps = [step1, step2, step3].map((id, index) => ({
    recipe_step_id: id,
    recipe_id: recipeId,
    step_no: index + 1,
    instruction: `Step ${index + 1}`,
  }));
  const finalIngredients = [{ marker: 'final ingredients' }];
  const finalSteps = [{ marker: 'final steps' }];
  const updatedRecipe = { ...recipe, version: 2 };
  const asUpdate = (value: object) => value as UpdateFullRecipeDTO;

  let prisma: { $transaction: jest.Mock };
  let recipes: jest.Mocked<Pick<RecipesService, 'create' | 'update'>>;
  let ingredients: jest.Mocked<Pick<RecipeIngredientsService, 'createMany'>>;
  let steps: jest.Mocked<Pick<RecipeStepsService, 'createMany'>>;
  let histories: jest.Mocked<Pick<RecipeHistoriesService, 'create'>>;
  let ingredientRepo: jest.Mocked<
    Pick<
      RecipeIngredientsRepository,
      'findMany' | 'createMany' | 'update' | 'delete'
    >
  >;
  let stepRepo: jest.Mocked<
    Pick<RecipeStepsRepository, 'findMany' | 'createMany' | 'update' | 'delete'>
  >;
  let units: jest.Mocked<Pick<UnitsRepository, 'findOne'>>;
  let service: RecipeAuthoringService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    prisma = {
      $transaction: jest.fn(
        (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    recipes = {
      create: jest.fn().mockResolvedValue(recipe),
      update: jest.fn().mockResolvedValue(updatedRecipe),
    };
    // First read is the current state, the last read is the returned state.
    ingredientRepo = {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(currentIngredients)
        .mockResolvedValue(finalIngredients),
      createMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    stepRepo = {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(currentSteps)
        .mockResolvedValue(finalSteps),
      createMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    units = { findOne: jest.fn().mockResolvedValue({ code: 'g' }) };
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
      ingredientRepo as unknown as RecipeIngredientsRepository,
      stepRepo as unknown as RecipeStepsRepository,
      units as unknown as UnitsRepository,
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

  const expectNoChildWrites = () => {
    expect(ingredientRepo.delete).not.toHaveBeenCalled();
    expect(ingredientRepo.update).not.toHaveBeenCalled();
    expect(ingredientRepo.createMany).not.toHaveBeenCalled();
    expect(stepRepo.delete).not.toHaveBeenCalled();
    expect(stepRepo.update).not.toHaveBeenCalled();
    expect(stepRepo.createMany).not.toHaveBeenCalled();
    expect(histories.create).not.toHaveBeenCalled();
  };

  it('UT-RCPA-009: Given only recipe field changes, When the recipe is updated, Then bump it in one transaction, snapshot it last and return it with its children', async () => {
    await expect(
      service.update(recipeId, asUpdate({ name: 'Kimchi Rice' })),
    ).resolves.toEqual({
      ...updatedRecipe,
      ingredients: finalIngredients,
      steps: finalSteps,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(recipes.update).toHaveBeenCalledWith(
      recipeId,
      { name: 'Kimchi Rice' },
      tx,
    );
    expect(histories.create).toHaveBeenCalledWith({ recipe_id: recipeId }, tx);
    expect(recipes.update.mock.invocationCallOrder[0]).toBeLessThan(
      histories.create.mock.invocationCallOrder[0],
    );
    expect(ingredientRepo.update).not.toHaveBeenCalled();
    expect(stepRepo.update).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty body', {}],
    [
      'only empty mutation lists',
      { ingredients: { create: [], delete: [] }, steps: { update: [] } },
    ],
  ])(
    'UT-RCPA-010: Given %s, When the recipe is updated, Then throw NO_RECIPE_CHANGES before opening a transaction',
    async (_label, body) => {
      const error = await service
        .update(recipeId, asUpdate(body))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toMatchObject({ response: { code: 'NO_RECIPE_CHANGES' } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('UT-RCPA-011: Given formulation notes set to null, When the recipe is updated, Then treat clearing them as a change', async () => {
    await service.update(recipeId, asUpdate({ formulation_notes: null }));

    expect(recipes.update).toHaveBeenCalledWith(
      recipeId,
      { formulation_notes: null },
      tx,
    );
  });

  it('UT-RCPA-012: Given ingredient create, update and delete, When the recipe is updated, Then delete, update, then create them with the same transaction', async () => {
    const egg = { ingredient_name: 'Egg', quantity: 1, unit_code: 'pc' };

    await service.update(
      recipeId,
      asUpdate({
        ingredients: {
          create: [egg],
          update: [
            { recipe_ingredient_id: ing1, quantity: 200, unit_code: 'g' },
          ],
          delete: [ing2],
        },
      }),
    );

    expect(units.findOne).toHaveBeenCalledWith('pc', tx);
    expect(units.findOne).toHaveBeenCalledWith('g', tx);
    expect(ingredientRepo.delete).toHaveBeenCalledWith(ing2, tx);
    expect(ingredientRepo.update).toHaveBeenCalledWith(
      ing1,
      { quantity: 200, unit_code: 'g' },
      tx,
    );
    expect(ingredientRepo.createMany).toHaveBeenCalledWith(recipeId, [egg], tx);
    const order = [
      ingredientRepo.delete,
      ingredientRepo.update,
      ingredientRepo.createMany,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it.each([
    [
      'an ingredient ID from another recipe',
      { ingredients: { delete: [unknownId] } },
      'RECIPE_INGREDIENT_NOT_FOUND',
    ],
    [
      'a step ID from another recipe',
      { steps: { update: [{ recipe_step_id: unknownId, step_no: 1 }] } },
      'RECIPE_STEP_NOT_FOUND',
    ],
  ])(
    'UT-RCPA-013: Given %s, When the recipe is updated, Then throw %s without writing children or history',
    async (_label, body, code) => {
      const error = await service
        .update(recipeId, asUpdate(body))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error).toMatchObject({ response: { code } });
      expectNoChildWrites();
    },
  );

  it.each([
    [
      'an ingredient both updated and deleted',
      {
        ingredients: {
          update: [{ recipe_ingredient_id: ing1, quantity: 1 }],
          delete: [ing1],
        },
      },
      'CONFLICTING_INGREDIENT_MUTATIONS',
    ],
    [
      'a step deleted twice',
      { steps: { delete: [step1, step1] } },
      'CONFLICTING_STEP_MUTATIONS',
    ],
    [
      'every ingredient deleted',
      { ingredients: { delete: [ing1, ing2] } },
      'RECIPE_INGREDIENTS_REQUIRED',
    ],
    [
      'every step deleted',
      { steps: { delete: [step1, step2, step3] } },
      'RECIPE_STEPS_REQUIRED',
    ],
    [
      'an ingredient renamed to an existing name in another case',
      {
        ingredients: {
          update: [{ recipe_ingredient_id: ing1, ingredient_name: ' RICE ' }],
        },
      },
      'DUPLICATE_INGREDIENT_NAME',
    ],
    [
      'two steps asking for the same number',
      { steps: { create: [{ step_no: 2, instruction: 'Extra.' }] } },
      'DUPLICATE_STEP_NO',
    ],
  ])(
    'UT-RCPA-014: Given %s, When the recipe is updated, Then throw %s without writing children or history',
    async (_label, body, code) => {
      const error = await service
        .update(recipeId, asUpdate(body))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toMatchObject({ response: { code } });
      expectNoChildWrites();
    },
  );

  it('UT-RCPA-015: Given an unknown unit code, When an ingredient is changed, Then throw NON_EXISTING_UNIT without writing', async () => {
    units.findOne.mockResolvedValue(null);

    const error = await service
      .update(
        recipeId,
        asUpdate({
          ingredients: {
            update: [{ recipe_ingredient_id: ing1, unit_code: 'bogus' }],
          },
        }),
      )
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ response: { code: 'NON_EXISTING_UNIT' } });
    expectNoChildWrites();
  });

  it('UT-RCPA-016: Given steps 1, 2, 3, When step 2 is deleted, Then renumber the old step 3 to 2 and leave step 1 alone', async () => {
    await service.update(recipeId, asUpdate({ steps: { delete: [step2] } }));

    expect(stepRepo.delete).toHaveBeenCalledWith(step2, tx);
    expect(stepRepo.update.mock.calls).toEqual([
      [step3, { step_no: -1 }, tx],
      [step3, { step_no: 2, instruction: undefined }, tx],
    ]);
  });

  it('UT-RCPA-017: Given steps 1 and 2 swapped, When the recipe is updated, Then park both on negative numbers before writing the final numbers', async () => {
    await service.update(
      recipeId,
      asUpdate({
        steps: {
          update: [
            { recipe_step_id: step1, step_no: 2 },
            { recipe_step_id: step2, step_no: 1 },
          ],
        },
      }),
    );

    expect(stepRepo.update.mock.calls).toEqual([
      [step2, { step_no: -1 }, tx],
      [step1, { step_no: -2 }, tx],
      [step2, { step_no: 1, instruction: undefined }, tx],
      [step1, { step_no: 2, instruction: undefined }, tx],
    ]);
  });

  it('UT-RCPA-018: Given a new step numbered 99, When the recipe is updated, Then create it as the next step number', async () => {
    await service.update(
      recipeId,
      asUpdate({ steps: { create: [{ step_no: 99, instruction: 'Serve.' }] } }),
    );

    expect(stepRepo.createMany).toHaveBeenCalledWith(
      recipeId,
      [{ step_no: 4, instruction: 'Serve.' }],
      tx,
    );
    expect(stepRepo.update).not.toHaveBeenCalled();
  });

  it('UT-RCPA-019: Given an instruction-only change, When the recipe is updated, Then keep the step number and save the instruction', async () => {
    await service.update(
      recipeId,
      asUpdate({
        steps: {
          update: [{ recipe_step_id: step1, instruction: 'Heat the pan.' }],
        },
      }),
    );

    expect(stepRepo.update.mock.calls).toEqual([
      [step1, { step_no: 1, instruction: 'Heat the pan.' }, tx],
    ]);
  });

  it('UT-RCPA-020: Given a missing or inactive recipe, When it is updated, Then throw without reading or writing its children', async () => {
    recipes.update.mockRejectedValue(new NotFoundException());

    await expect(
      service.update(recipeId, asUpdate({ name: 'x' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ingredientRepo.findMany).not.toHaveBeenCalled();
    expect(stepRepo.findMany).not.toHaveBeenCalled();
    expectNoChildWrites();
  });
});
