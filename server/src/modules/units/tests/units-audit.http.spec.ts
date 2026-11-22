import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import {
  auditPipelineProviders,
  createAuditSpy,
} from '../../../shared/testing/audit.testing';
import { AuthService } from '../../auth/auth.service';
import { UnitsController } from '../units.controller';
import { UnitsService } from '../units.service';

const actorId = '11111111-1111-4111-8111-111111111111';

const cup = { code: 'cup', name: 'Cup', dimension: 'VOLUME', to_base: '240' };
const body = { code: 'cup', name: 'Cup', dimension: 'VOLUME', to_base: 240 };

// DTO validation and roles are covered by units.http.spec.ts; this spec only
// checks which audit rows unit changes produce. Units are keyed by code, so
// entity_id is always null and the snapshot is what names the unit.
describe('Unit audit logging', () => {
  let app: INestApplication;
  let url: string;
  let role: UserRole;
  const audit = createAuditSpy();
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [
        { provide: UnitsService, useValue: service },
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
    await app.listen(0);
    url = `${await app.getUrl()}/api/units`;
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    role = UserRole.RECIPE_MANAGER;
    audit.reset();
    for (const mock of Object.values(service)) {
      mock.mockReset().mockResolvedValue(cup);
    }
  });

  const call = (method: string, path: string, payload?: unknown) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

  it('IT-UNIT-016: Given a recipe manager, When a unit is created, Then audit UNIT_CREATED with the new unit as after data', async () => {
    audit.findUnique.mockResolvedValueOnce({
      code: 'cup',
      name: 'Cup',
      dimension: 'VOLUME',
      to_base: new Prisma.Decimal(240),
    });

    const response = await call('POST', '', body);

    expect(response.status).toBe(201);
    expect(audit.findUnique).toHaveBeenCalledWith({
      where: { code: 'cup' },
      select: { code: true, name: true, dimension: true, to_base: true },
    });
    expect(audit.rows()).toEqual([
      expect.objectContaining({
        actor_id: actorId,
        action: 'UNIT_CREATED',
        entity_type: 'units',
        entity_id: null,
        outcome: 'SUCCESS',
        after_data: cup,
      }),
    ]);
    expect(audit.rows()[0].before_data ?? null).toBeNull();
  });

  it('IT-UNIT-017: Given a renamed unit, When it is updated, Then audit UNIT_UPDATED with only the changed fields', async () => {
    const stored = {
      code: 'cup',
      name: 'Cup',
      dimension: 'VOLUME',
      to_base: new Prisma.Decimal(240),
    };
    audit.findUnique
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce({ ...stored, name: 'Measuring cup' });

    const response = await call('PATCH', '/cup', { name: 'Measuring cup' });

    expect(response.status).toBe(200);
    expect(audit.rows()).toEqual([
      expect.objectContaining({
        action: 'UNIT_UPDATED',
        entity_id: null,
        outcome: 'SUCCESS',
        before_data: { name: 'Cup' },
        after_data: { name: 'Measuring cup' },
      }),
    ]);
  });

  it('IT-UNIT-018: Given a duplicate code and a supervisor, When units are created, Then audit the conflict and the denial without snapshots', async () => {
    service.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const duplicate = await call('POST', '', body);

    role = UserRole.SUPERVISOR;
    const denied = await call('POST', '', body);

    expect([duplicate.status, denied.status]).toEqual([409, 403]);
    expect(audit.findUnique).not.toHaveBeenCalled();
    expect(audit.rows()).toEqual([
      expect.objectContaining({
        action: 'UNIT_CREATED',
        outcome: 'FAILED',
        reason: 'DUPLICATE_RESOURCE',
      }),
      expect.objectContaining({ action: 'UNIT_CREATED', outcome: 'DENIED' }),
    ]);
    for (const row of audit.rows()) {
      expect([row.before_data ?? null, row.after_data ?? null]).toEqual([
        null,
        null,
      ]);
    }
  });
});
