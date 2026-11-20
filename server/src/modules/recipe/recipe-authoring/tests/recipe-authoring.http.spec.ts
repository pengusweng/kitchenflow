import {
  BadRequestException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
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
  const service = { create: jest.fn() };
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecipeAuthoringController],
      providers: [{ provide: RecipeAuthoringService, useValue: service }],
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
});
