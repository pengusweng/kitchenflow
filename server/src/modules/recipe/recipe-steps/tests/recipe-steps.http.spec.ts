import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../../auth/auth.guard';
import { RecipeStepsController } from '../recipe-steps.controller';
import { RecipeStepsService } from '../recipe-steps.service';

describe('Recipe steps HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const callerId = '00000000-0000-4000-8000-000000000002';
  const recipeId = '00000000-0000-4000-8000-000000000010';
  const stepId = '00000000-0000-4000-8000-000000000030';
  const step = {
    recipe_step_id: stepId,
    recipe_id: recipeId,
    step_no: 1,
    instruction: 'Stir-fry the kimchi.',
    created_at: '2026-11-20T00:00:00.000Z',
    modified_at: '2026-11-20T00:00:00.000Z',
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
      controllers: [RecipeStepsController],
      providers: [{ provide: RecipeStepsService, useValue: service }],
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
    url = (await app.getUrl()) + '/recipe-steps';
  });

  beforeEach(() => {
    currentRole = UserRole.KITCHEN_STAFF;
    service.findMany.mockReset().mockResolvedValue([step]);
    service.findOne.mockReset().mockResolvedValue(step);
  });
  afterAll(async () => app?.close());

  it('IT-RCPS-001: Given a recipe ID, When its steps are listed, Then return the steps of the recipe', async () => {
    const response = await send(`/recipe/${recipeId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([step]);
    expect(service.findMany).toHaveBeenCalledWith(recipeId);
  });

  it('IT-RCPS-002: Given a step ID, When one step is fetched, Then return it', async () => {
    const response = await send(`/${stepId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(step);
    expect(service.findOne).toHaveBeenCalledWith(stepId);
  });

  it('IT-RCPS-003: Given a non-UUID ID, When either read endpoint is called, Then return 400 without calling the service', async () => {
    expect((await send('/recipe/not-a-uuid')).status).toBe(400);
    expect((await send('/not-a-uuid')).status).toBe(400);
    expect(service.findMany).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('IT-RCPS-004: Given a missing recipe or step, When either read endpoint is called, Then return 404', async () => {
    service.findMany.mockRejectedValue(new NotFoundException());
    service.findOne.mockRejectedValue(new NotFoundException());

    expect((await send(`/recipe/${recipeId}`)).status).toBe(404);
    expect((await send(`/${stepId}`)).status).toBe(404);
  });

  it('IT-RCPS-005: Given a cashier, When recipe steps are read, Then deny both read endpoints without calling the service', async () => {
    currentRole = UserRole.CASHIER_STAFF;

    expect((await send(`/recipe/${recipeId}`)).status).toBe(403);
    expect((await send(`/${stepId}`)).status).toBe(403);
    expect(service.findMany).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each(readRoles)(
    'IT-RCPS-006: Given the %s role, When recipe steps are read, Then allow both read endpoints',
    async (role) => {
      currentRole = role;

      expect((await send(`/recipe/${recipeId}`)).status).toBe(200);
      expect((await send(`/${stepId}`)).status).toBe(200);
    },
  );

  it.each(['POST', 'PATCH', 'DELETE'])(
    'IT-RCPS-007: Given the %s method, When it is sent to recipe steps, Then return 404 because only reads are exposed',
    async (method) => {
      expect((await send('', method)).status).toBe(404);
      expect((await send(`/${stepId}`, method)).status).toBe(404);
    },
  );
});
