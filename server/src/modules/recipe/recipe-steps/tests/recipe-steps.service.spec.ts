import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecipesRepository } from '../../recipes/recipes.repository';
import { RecipeStepsRepository } from '../recipe-steps.repository';
import { RecipeStepsService } from '../recipe-steps.service';

describe('RecipeStepsService', () => {
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const stepId = '00000000-0000-4000-8000-000000000030';
  const recipe = { recipe_id: recipeId, code: 'RCP-1', is_active: true };
  const step = {
    recipe_step_id: stepId,
    recipe_id: recipeId,
    step_no: 1,
    instruction: 'Stir-fry the kimchi.',
    created_at: new Date('2026-11-20T00:00:00.000Z'),
    modified_at: new Date('2026-11-20T00:00:00.000Z'),
  };
  const toSteps = (stepNos: number[]) =>
    stepNos.map((step_no) => ({ step_no, instruction: `Step ${step_no}` }));
  let steps: jest.Mocked<
    Pick<
      RecipeStepsRepository,
      'createMany' | 'findMany' | 'findOne' | 'update' | 'delete'
    >
  >;
  let recipes: jest.Mocked<Pick<RecipesRepository, 'findOne'>>;
  let service: RecipeStepsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    steps = {
      createMany: jest.fn().mockResolvedValue([step]),
      findMany: jest.fn().mockResolvedValue([step]),
      findOne: jest.fn().mockResolvedValue(step),
      update: jest
        .fn()
        .mockResolvedValue({ ...step, instruction: 'Plate the rice.' }),
      delete: jest.fn().mockResolvedValue(step),
    };
    recipes = { findOne: jest.fn().mockResolvedValue(recipe) };
    service = new RecipeStepsService(
      steps as unknown as RecipeStepsRepository,
      recipes as unknown as RecipesRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('UT-RCPS-001: Given unordered sequential steps and an active recipe, When they are created, Then save them in the order sent', async () => {
    const payload = toSteps([2, 1, 3]);

    await expect(service.createMany(recipeId, payload)).resolves.toEqual([
      step,
    ]);
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(steps.createMany).toHaveBeenCalledWith(recipeId, payload, undefined);
  });

  it('UT-RCPS-002: Given ten shuffled steps, When they are created, Then sort the step numbers numerically and accept them', async () => {
    await expect(
      service.createMany(recipeId, toSteps([10, 2, 1, 3, 4, 5, 6, 7, 8, 9])),
    ).resolves.toEqual([step]);
    expect(steps.createMany).toHaveBeenCalled();
  });

  it('UT-RCPS-003: Given duplicate step numbers, When steps are created, Then throw DUPLICATE_STEP_NO before any query', async () => {
    const error = await service
      .createMany(recipeId, toSteps([1, 1, 2]))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error).toMatchObject({ response: { code: 'DUPLICATE_STEP_NO' } });
    expect(recipes.findOne).not.toHaveBeenCalled();
    expect(steps.createMany).not.toHaveBeenCalled();
  });

  it.each([[[1, 3]], [[2, 3]]])(
    'UT-RCPS-004: Given the non-sequential step numbers %j, When steps are created, Then throw NON_SEQUENTIAL_STEP_NUMBERS before any query',
    async (stepNos) => {
      const error = await service
        .createMany(recipeId, toSteps(stepNos))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toMatchObject({
        response: { code: 'NON_SEQUENTIAL_STEP_NUMBERS' },
      });
      expect(recipes.findOne).not.toHaveBeenCalled();
      expect(steps.createMany).not.toHaveBeenCalled();
    },
  );

  it('UT-RCPS-005: Given a missing or inactive recipe, When steps are created, Then throw RECIPE_NOT_FOUND without writing', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(
      service.createMany(recipeId, toSteps([1, 2])),
    ).rejects.toMatchObject({ response: { code: 'RECIPE_NOT_FOUND' } });
    expect(steps.createMany).not.toHaveBeenCalled();
  });

  it('UT-RCPS-006: Given an active recipe, When its steps are listed, Then return the steps of the recipe', async () => {
    await expect(service.findMany(recipeId)).resolves.toEqual([step]);
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(steps.findMany).toHaveBeenCalledWith(recipeId, undefined);
  });

  it('UT-RCPS-007: Given a missing or inactive recipe, When its steps are listed, Then throw RECIPE_NOT_FOUND without querying steps', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(service.findMany(recipeId)).rejects.toMatchObject({
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(steps.findMany).not.toHaveBeenCalled();
  });

  it('UT-RCPS-008: Given an existing step, When it is fetched, Then return it', async () => {
    await expect(service.findOne(stepId)).resolves.toEqual(step);
    expect(steps.findOne).toHaveBeenCalledWith(stepId, undefined);
  });

  it('UT-RCPS-009: Given an unknown step, When it is fetched, Then throw RECIPE_STEP_NOT_FOUND', async () => {
    steps.findOne.mockResolvedValue(null);

    await expect(service.findOne(stepId)).rejects.toMatchObject({
      response: { code: 'RECIPE_STEP_NOT_FOUND' },
    });
  });

  it('UT-RCPS-010: Given a step of an active recipe, When it is updated, Then check its recipe and save the changes', async () => {
    await expect(
      service.update(stepId, { instruction: 'Plate the rice.' }),
    ).resolves.toEqual({ ...step, instruction: 'Plate the rice.' });
    expect(recipes.findOne).toHaveBeenCalledWith(
      recipeId,
      true,
      false,
      undefined,
    );
    expect(steps.update).toHaveBeenCalledWith(
      stepId,
      { instruction: 'Plate the rice.' },
      undefined,
    );
  });

  it('UT-RCPS-011: Given an unknown step, When it is updated, Then throw not found without checking the recipe or writing', async () => {
    steps.findOne.mockResolvedValue(null);

    await expect(
      service.update(stepId, { instruction: 'Plate the rice.' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(recipes.findOne).not.toHaveBeenCalled();
    expect(steps.update).not.toHaveBeenCalled();
  });

  it('UT-RCPS-012: Given a step of an inactive recipe, When it is updated, Then throw RECIPE_NOT_FOUND without writing', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(
      service.update(stepId, { instruction: 'Plate the rice.' }),
    ).rejects.toMatchObject({ response: { code: 'RECIPE_NOT_FOUND' } });
    expect(steps.update).not.toHaveBeenCalled();
  });

  it('UT-RCPS-013: Given a step of an active recipe, When it is deleted, Then hard delete and return it', async () => {
    await expect(service.delete(stepId)).resolves.toEqual(step);
    expect(steps.delete).toHaveBeenCalledWith(stepId, undefined);
  });

  it('UT-RCPS-014: Given an unknown step, When it is deleted, Then throw not found without checking the recipe or deleting', async () => {
    steps.findOne.mockResolvedValue(null);

    await expect(service.delete(stepId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(recipes.findOne).not.toHaveBeenCalled();
    expect(steps.delete).not.toHaveBeenCalled();
  });

  it('UT-RCPS-015: Given a step of an inactive recipe, When it is deleted, Then throw RECIPE_NOT_FOUND without deleting', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(service.delete(stepId)).rejects.toMatchObject({
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(steps.delete).not.toHaveBeenCalled();
  });

  it('UT-RCPS-016: Given a transaction client, When every method runs, Then pass it to every repository call', async () => {
    const tx = {} as Prisma.TransactionClient;

    await service.createMany(recipeId, toSteps([1]), tx);
    await service.findMany(recipeId, tx);
    await service.findOne(stepId, tx);
    await service.update(stepId, { step_no: 2 }, tx);
    await service.delete(stepId, tx);

    const calls = [
      ...recipes.findOne.mock.calls,
      ...steps.createMany.mock.calls,
      ...steps.findMany.mock.calls,
      ...steps.findOne.mock.calls,
      ...steps.update.mock.calls,
      ...steps.delete.mock.calls,
    ];
    expect(calls).toHaveLength(11);
    for (const call of calls) expect(call.at(-1)).toBe(tx);
  });
});
