import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../../auth/auth.guard';
import { RecipeIngredientsController } from '../recipe-ingredients.controller';
import { RecipeIngredientsService } from '../recipe-ingredients.service';

describe('Recipe ingredients HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const callerId = '00000000-0000-4000-8000-000000000002';
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const ingredientId = '00000000-0000-4000-8000-000000000020';
  const ingredient = {
    recipe_ingredient_id: ingredientId,
    recipe_id: recipeId,
    ingredient_name: 'Kimchi',
    quantity: '150',
    unit_code: 'g',
    note: null,
  };
  const service = {
    findMany: jest.fn(),
    findOne: jest.fn(),
  };
  const readRoles = Object.values(UserRole).filter(
    (role) => role !== UserRole.CASHIER_STAFF,
  );

  const send = (path: string, method = 'GET') =>
    fetch(`${url}${path}`, { method });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecipeIngredientsController],
      providers: [{ provide: RecipeIngredientsService, useValue: service }],
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
    url = (await app.getUrl()) + '/recipe-ingredients';
  });

  beforeEach(() => {
    currentRole = UserRole.KITCHEN_STAFF;
    service.findMany.mockReset().mockResolvedValue([ingredient]);
    service.findOne.mockReset().mockResolvedValue(ingredient);
  });
  afterAll(async () => app?.close());

  it('IT-RCPI-001: Given a recipe ID, When its ingredients are listed, Then return the ingredients of the recipe', async () => {
    const response = await send(`/recipe/${recipeId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([ingredient]);
    expect(service.findMany).toHaveBeenCalledWith(recipeId);
  });

  it('IT-RCPI-002: Given an ingredient ID, When one ingredient is fetched, Then return it', async () => {
    const response = await send(`/${ingredientId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(ingredient);
    expect(service.findOne).toHaveBeenCalledWith(ingredientId);
  });

  it('IT-RCPI-003: Given a non-UUID ID, When either read endpoint is called, Then return 400 without calling the service', async () => {
    expect((await send('/recipe/not-a-uuid')).status).toBe(400);
    expect((await send('/not-a-uuid')).status).toBe(400);
    expect(service.findMany).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('IT-RCPI-004: Given a missing recipe or ingredient, When either read endpoint is called, Then return 404', async () => {
    service.findMany.mockRejectedValue(new NotFoundException());
    service.findOne.mockRejectedValue(new NotFoundException());

    expect((await send(`/recipe/${recipeId}`)).status).toBe(404);
    expect((await send(`/${ingredientId}`)).status).toBe(404);
  });

  it('IT-RCPI-005: Given a cashier, When recipe ingredients are read, Then deny both read endpoints without calling the service', async () => {
    currentRole = UserRole.CASHIER_STAFF;

    expect((await send(`/recipe/${recipeId}`)).status).toBe(403);
    expect((await send(`/${ingredientId}`)).status).toBe(403);
    expect(service.findMany).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each(readRoles)(
    'IT-RCPI-006: Given the %s role, When recipe ingredients are read, Then allow both read endpoints',
    async (role) => {
      currentRole = role;

      expect((await send(`/recipe/${recipeId}`)).status).toBe(200);
      expect((await send(`/${ingredientId}`)).status).toBe(200);
    },
  );

  it.each(['POST', 'PATCH', 'DELETE'])(
    'IT-RCPI-007: Given the %s method, When it is sent to recipe ingredients, Then return 404 because only reads are exposed',
    async (method) => {
      expect((await send('', method)).status).toBe(404);
      expect((await send(`/${ingredientId}`, method)).status).toBe(404);
    },
  );
});
