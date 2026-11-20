import {
  BadRequestException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaExceptionFilter } from '../../../../shared/filters/prisma-exception.filter';
import { Authenticated } from '../../../auth/auth.guard';
import { RecipeAuthoringController } from '../recipe-authoring.controller';
import { RecipeAuthoringService } from '../recipe-authoring.service';

describe('Recipe authoring HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const callerId = '00000000-0000-4000-8000-000000000002';
  const brandId = '00000000-0000-4000-8000-000000000001';
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const body = {
    brand_id: brandId,
    code: 'RCP-GC-KIMCHI-FRIED-RICE',
    name: 'Kimchi Fried Rice',
    formulation_notes: 'Restricted notes.',
    ingredients: [{ ingredient_name: 'Kimchi', quantity: 150, unit_code: 'g' }],
    steps: [{ step_no: 1, instruction: 'Stir-fry the kimchi.' }],
  };
  const created = {
    recipe_id: recipeId,
    brand_id: brandId,
    code: body.code,
    name: body.name,
    version: 1,
    is_active: true,
    formulation_notes: body.formulation_notes,
    created_at: '2026-11-21T00:00:00.000Z',
    modified_at: '2026-11-21T00:00:00.000Z',
    ingredients: [
      {
        ...body.ingredients[0],
        recipe_ingredient_id: '00000000-0000-4000-8000-000000000020',
        recipe_id: recipeId,
        quantity: '150',
        note: null,
        modified_at: '2026-11-21T00:00:00.000Z',
      },
    ],
    steps: [
      {
        ...body.steps[0],
        recipe_step_id: '00000000-0000-4000-8000-000000000030',
        recipe_id: recipeId,
        created_at: '2026-11-21T00:00:00.000Z',
        modified_at: '2026-11-21T00:00:00.000Z',
      },
    ],
  };
  const service = { create: jest.fn(), update: jest.fn() };
  const ingredientId = '00000000-0000-4000-8000-000000000020';
  const stepId = '00000000-0000-4000-8000-000000000030';
  const updateBody = {
    name: 'Kimchi Rice',
    ingredients: {
      create: [{ ingredient_name: 'Egg', quantity: 1, unit_code: 'pc' }],
      update: [{ recipe_ingredient_id: ingredientId, quantity: 200 }],
      delete: [],
    },
    steps: {
      update: [{ recipe_step_id: stepId, instruction: 'Heat the pan.' }],
      delete: [stepId],
    },
  };
  const duplicateCode = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on code',
    { code: 'P2002', clientVersion: '7.8.0' },
  );
  const writeRoles: UserRole[] = [UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER];
  const deniedRoles = Object.values(UserRole).filter(
    (role) => !writeRoles.includes(role),
  );

  const post = (payload: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  const patch = (id: string, payload: unknown) =>
    fetch(`${url}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecipeAuthoringController],
      providers: [
        { provide: RecipeAuthoringService, useValue: service },
        { provide: APP_FILTER, useClass: PrismaExceptionFilter },
      ],
    })
      .overrideGuard(Authenticated)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<{
            session: { user: { user_id: string; role: UserRole } };
          }>();
          request.session = { user: { user_id: callerId, role: currentRole } };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    url = (await app.getUrl()) + '/recipes';
  });

  beforeEach(() => {
    currentRole = UserRole.RECIPE_MANAGER;
    service.create.mockReset().mockResolvedValue(created);
    service.update.mockReset().mockResolvedValue(created);
  });
  afterAll(async () => app?.close());

  it('IT-RCPA-001: Given a valid full recipe, When it is posted, Then return 201 with the recipe, ingredients and steps', async () => {
    const response = await post(body);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it.each([
    ['missing ingredients', { ...body, ingredients: undefined }],
    ['empty ingredients', { ...body, ingredients: [] }],
    ['missing steps', { ...body, steps: undefined }],
    ['empty steps', { ...body, steps: [] }],
  ])(
    'IT-RCPA-002: Given %s, When the recipe is posted, Then return 400 without calling the service',
    async (_label, payload) => {
      expect((await post(payload)).status).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'an ingredient with zero quantity',
      { ...body, ingredients: [{ ...body.ingredients[0], quantity: 0 }] },
    ],
    [
      'an ingredient without a unit code',
      {
        ...body,
        ingredients: [{ ingredient_name: 'Kimchi', quantity: 150 }],
      },
    ],
    [
      'a step numbered 0',
      { ...body, steps: [{ ...body.steps[0], step_no: 0 }] },
    ],
    [
      'a step with an empty instruction',
      { ...body, steps: [{ step_no: 1, instruction: '' }] },
    ],
    [
      'an unknown field inside an ingredient',
      { ...body, ingredients: [{ ...body.ingredients[0], cost: 10 }] },
    ],
  ])(
    'IT-RCPA-003: Given %s, When the recipe is posted, Then return 400 without calling the service',
    async (_label, payload) => {
      expect((await post(payload)).status).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('IT-RCPA-004: Given invalid recipe fields, When the recipe is posted, Then return 400 without calling the service', async () => {
    expect((await post({ ...body, brand_id: 'not-a-uuid' })).status).toBe(400);
    expect((await post({ ...body, code: '' })).status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('IT-RCPA-005: Given the service rejects the recipe, When it is posted, Then return its 404 or 400 status', async () => {
    service.create.mockRejectedValueOnce(new NotFoundException());
    expect((await post(body)).status).toBe(404);

    service.create.mockRejectedValueOnce(new BadRequestException());
    expect((await post(body)).status).toBe(400);
  });

  it.each(deniedRoles)(
    'IT-RCPA-006: Given the %s role, When a recipe is posted, Then return 403 without calling the service',
    async (role) => {
      currentRole = role;

      expect((await post(body)).status).toBe(403);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it.each(writeRoles)(
    'IT-RCPA-007: Given the %s role, When a recipe is posted, Then return 201',
    async (role) => {
      currentRole = role;

      expect((await post(body)).status).toBe(201);
    },
  );

  it('IT-RCPA-008: Given a duplicate recipe code, When a recipe is posted, Then return 409 DUPLICATE_RESOURCE', async () => {
    service.create.mockRejectedValue(duplicateCode);

    const response = await post(body);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'DUPLICATE_RESOURCE' });
  });

  it('IT-RCPA-009: Given recipe fields and ingredient and step mutations, When the recipe is patched, Then return 200 and pass them to the service', async () => {
    const response = await patch(recipeId, updateBody);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(created);
    expect(service.update).toHaveBeenCalledWith(recipeId, updateBody);
  });

  it('IT-RCPA-010: Given a non-UUID recipe ID, When the recipe is patched, Then return 400 without calling the service', async () => {
    expect((await patch('not-a-uuid', { name: 'x' })).status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a non-UUID ingredient to delete',
      { ingredients: { delete: ['not-a-uuid'] } },
    ],
    [
      'an ingredient update without its ID',
      { ingredients: { update: [{ quantity: 1 }] } },
    ],
    [
      'an ingredient update with zero quantity',
      {
        ingredients: {
          update: [{ recipe_ingredient_id: ingredientId, quantity: 0 }],
        },
      },
    ],
    [
      'a new step numbered 0',
      { steps: { create: [{ step_no: 0, instruction: 'x' }] } },
    ],
    [
      'a step update with an empty instruction',
      { steps: { update: [{ recipe_step_id: stepId, instruction: '' }] } },
    ],
    ['an unknown mutation key', { steps: { replace: [] } }],
    ['ingredients sent as a plain array', { ingredients: [] }],
    ['an empty recipe name', { name: '' }],
  ])(
    'IT-RCPA-011: Given %s, When the recipe is patched, Then return 400 without calling the service',
    async (_label, payload) => {
      expect((await patch(recipeId, payload)).status).toBe(400);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it('IT-RCPA-012: Given the service rejects the edit, When the recipe is patched, Then return its 404, 400 or 409 status', async () => {
    service.update.mockRejectedValueOnce(new NotFoundException());
    expect((await patch(recipeId, { name: 'x' })).status).toBe(404);

    service.update.mockRejectedValueOnce(new BadRequestException());
    expect((await patch(recipeId, { name: 'x' })).status).toBe(400);

    service.update.mockRejectedValueOnce(duplicateCode);
    expect((await patch(recipeId, { code: 'TAKEN' })).status).toBe(409);
  });

  it.each(deniedRoles)(
    'IT-RCPA-013: Given the %s role, When a recipe is patched, Then return 403 without calling the service',
    async (role) => {
      currentRole = role;

      expect((await patch(recipeId, { name: 'x' })).status).toBe(403);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it.each(writeRoles)(
    'IT-RCPA-014: Given the %s role, When a recipe is patched, Then return 200',
    async (role) => {
      currentRole = role;

      expect((await patch(recipeId, { name: 'x' })).status).toBe(200);
    },
  );
});
