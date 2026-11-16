import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../../auth/auth.guard';
import { RecipesController } from '../recipes.controller';
import { RecipesService } from '../recipes.service';

describe('Recipes HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const recipeId = '00000000-0000-4000-8000-000000000001';
  const callerId = '00000000-0000-4000-8000-000000000002';
  const brandId = '00000000-0000-4000-8000-000000000003';
  const service = { findMany: jest.fn(), findOne: jest.fn() };
  const allowedRoles = Object.values(UserRole).filter(
    (role) => role !== UserRole.CASHIER_STAFF,
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [{ provide: RecipesService, useValue: service }],
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
    service.findMany.mockReset().mockResolvedValue({ data: [], meta: {} });
    service.findOne.mockReset().mockResolvedValue({ recipe_id: recipeId });
  });
  afterAll(async () => app?.close());

  it('IT-RCP-001: Given a non-cashier role, When recipes are listed with filters, Then pass the caller id and parsed query to the service', async () => {
    const response = await fetch(
      `${url}?page=2&limit=5&status=all&search=kimchi&brand_id=${brandId}&sortBy=name&sortOrder=desc`,
    );

    expect(response.status).toBe(200);
    expect(service.findMany).toHaveBeenCalledWith(
      callerId,
      expect.objectContaining({
        page: 2,
        limit: 5,
        status: 'all',
        search: 'kimchi',
        brand_id: brandId,
        sortBy: 'name',
        sortOrder: 'desc',
      }),
    );
  });

  it('IT-RCP-002: Given no query, When recipes are listed, Then default to active recipes', async () => {
    await fetch(url);

    expect(service.findMany).toHaveBeenCalledWith(
      callerId,
      expect.objectContaining({ status: 'active' }),
    );
  });

  it.each([
    'status=bogus',
    'brand_id=not-a-uuid',
    'sortBy=password',
    'sortOrder=sideways',
    'unknown=1',
  ])(
    'IT-RCP-003: Given the invalid query %s, When recipes are listed, Then reject it before the service',
    async (query) => {
      const response = await fetch(`${url}?${query}`);

      expect(response.status).toBe(400);
      expect(service.findMany).not.toHaveBeenCalled();
    },
  );

  it('IT-RCP-004: Given a non-cashier role, When one recipe is fetched, Then pass the caller id and recipe id to the service', async () => {
    const response = await fetch(`${url}/${recipeId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recipe_id: recipeId });
    expect(service.findOne).toHaveBeenCalledWith(callerId, recipeId);
  });

  it('IT-RCP-005: Given a malformed recipe id, When one recipe is fetched, Then reject it before the service', async () => {
    const response = await fetch(`${url}/not-a-uuid`);

    expect(response.status).toBe(400);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('IT-RCP-006: Given an unknown recipe, When one recipe is fetched, Then return 404', async () => {
    service.findOne.mockRejectedValue(new NotFoundException());

    expect((await fetch(`${url}/${recipeId}`)).status).toBe(404);
  });

  it.each(allowedRoles)(
    'IT-RCP-007: Given the %s role, When recipes are read, Then allow both endpoints',
    async (role) => {
      currentRole = role;

      expect((await fetch(url)).status).toBe(200);
      expect((await fetch(`${url}/${recipeId}`)).status).toBe(200);
    },
  );

  it('IT-RCP-008: Given a cashier, When recipes are read, Then deny both endpoints without calling the service', async () => {
    currentRole = UserRole.CASHIER_STAFF;

    expect((await fetch(url)).status).toBe(403);
    expect((await fetch(`${url}/${recipeId}`)).status).toBe(403);
    expect(service.findMany).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('IT-RCP-009: Given a PATCH request, When a recipe is updated over HTTP, Then the route does not exist', async () => {
    const response = await fetch(`${url}/${recipeId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });

    expect(response.status).toBe(404);
  });
});
