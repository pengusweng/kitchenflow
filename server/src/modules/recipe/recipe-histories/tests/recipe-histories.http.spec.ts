import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import {
  auditPipelineProviders,
  createAuditSpy,
} from '../../../../shared/testing/audit.testing';
import { AuthService } from '../../../auth/auth.service';
import { RecipeHistoriesController } from '../recipe-histories.controller';
import { RecipeHistoriesService } from '../recipe-histories.service';

const actorId = '11111111-1111-4111-8111-111111111111';
const recipeId = '00000000-0000-4000-8000-000000000010';
const history = {
  recipe_history_id: '00000000-0000-4000-8000-000000000040',
  recipe_id: recipeId,
  version: 2,
  recipe_snapshot: { name: 'Kimchi Fried Rice', formulation_notes: 'Notes.' },
  ingredients_snapshot: [],
  steps_snapshot: [],
  created_at: '2026-11-20T08:00:00.000Z',
};

describe('Recipe histories listing HTTP endpoint', () => {
  let app: INestApplication;
  let url: string;
  let role: UserRole;
  const audit = createAuditSpy();
  const service = {
    create: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
  };
  const auth = {
    validateSession: jest.fn(() =>
      Promise.resolve({
        session_id: 'session',
        user_id: actorId,
        user: { user_id: actorId, role },
      }),
    ),
  };
  const readRoles: UserRole[] = [UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER];
  const deniedRoles = Object.values(UserRole).filter(
    (r) => !readRoles.includes(r),
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecipeHistoriesController],
      providers: [
        { provide: RecipeHistoriesService, useValue: service },
        { provide: AuthService, useValue: auth },
        ...auditPipelineProviders(audit),
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/api/recipe-histories`;
  });

  afterAll(async () => app?.close());

  beforeEach(() => {
    role = UserRole.RECIPE_MANAGER;
    audit.reset();
    service.findMany.mockReset().mockResolvedValue([history]);
  });

  const list = (id = recipeId) =>
    fetch(`${url}/recipe/${id}`, {
      headers: { Authorization: 'Bearer token' },
    });

  it('IT-RCPH-001: Given a recipe manager, When a recipe history is listed, Then return the snapshots and audit RECIPE_HISTORY_LISTED against the recipe', async () => {
    const response = await list();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([history]);
    expect(service.findMany).toHaveBeenCalledWith(recipeId);
    expect(audit.rows()).toEqual([
      expect.objectContaining({
        action: 'RECIPE_HISTORY_LISTED',
        entity_type: 'recipes',
        entity_id: recipeId,
        outcome: 'SUCCESS',
        actor_id: actorId,
      }),
    ]);
  });

  it('IT-RCPH-002: Given a non-UUID recipe ID, When a recipe history is listed, Then return 400 without calling the service', async () => {
    expect((await list('not-a-uuid')).status).toBe(400);
    expect(service.findMany).not.toHaveBeenCalled();
  });

  it('IT-RCPH-003: Given a missing recipe, When its history is listed, Then return 404', async () => {
    service.findMany.mockRejectedValue(new NotFoundException());

    expect((await list()).status).toBe(404);
  });

  it.each(deniedRoles)(
    'IT-RCPH-004: Given the %s role, When a recipe history is listed, Then deny it without calling the service',
    async (denied) => {
      role = denied;

      expect((await list()).status).toBe(403);
      expect(service.findMany).not.toHaveBeenCalled();
    },
  );

  it.each(readRoles)(
    'IT-RCPH-005: Given the %s role, When a recipe history is listed, Then allow it',
    async (allowed) => {
      role = allowed;

      expect((await list()).status).toBe(200);
    },
  );
});
