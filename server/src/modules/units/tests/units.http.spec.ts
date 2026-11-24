import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import { UnitsController } from '../units.controller';
import { UnitsService } from '../units.service';

describe('Units HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const callerId = '00000000-0000-4000-8000-000000000002';
  const unit = {
    code: 'kg',
    name: 'Kilogram',
    dimension: 'MASS',
    to_base: '1000',
  };
  const body = {
    code: 'kg',
    name: 'Kilogram',
    dimension: 'MASS',
    to_base: 1000,
  };
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const readRoles = Object.values(UserRole).filter(
    (role) => role !== UserRole.CASHIER_STAFF,
  );
  const writeRoles: UserRole[] = [UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER];
  const readOnlyRoles = readRoles.filter((role) => !writeRoles.includes(role));

  const send = (path: string, method: string, payload?: unknown) =>
    fetch(`${url}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [{ provide: UnitsService, useValue: service }],
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
    url = (await app.getUrl()) + '/units';
  });

  beforeEach(() => {
    currentRole = UserRole.RECIPE_MANAGER;
    service.create.mockReset().mockResolvedValue(unit);
    service.findAll.mockReset().mockResolvedValue({ data: [], meta: {} });
    service.findOne.mockReset().mockResolvedValue(unit);
    service.update.mockReset().mockResolvedValue(unit);
    service.delete.mockReset().mockResolvedValue(unit);
  });
  afterAll(async () => app?.close());

  it('IT-UNIT-001: Given a valid body, When a unit is created, Then pass it to the service and return 201', async () => {
    const response = await send('', 'POST', body);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(unit);
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it.each([
    { ...body, code: '' },
    { ...body, code: 'x'.repeat(17) },
    { ...body, name: 'x'.repeat(51) },
    { ...body, dimension: 'WEIGHT' },
    { ...body, to_base: 0 },
    { ...body, to_base: '1000' },
    { ...body, to_base: 0.1234567 },
    { ...body, extra: true },
    { name: 'Kilogram', dimension: 'MASS', to_base: 1000 },
  ])(
    'IT-UNIT-002: Given the invalid body %j, When a unit is created, Then reject it before the service',
    async (payload) => {
      const response = await send('', 'POST', payload);

      expect(response.status).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('IT-UNIT-003: Given a duplicate code, When a unit is created, Then return 409', async () => {
    service.create.mockRejectedValue(new ConflictException());

    expect((await send('', 'POST', body)).status).toBe(409);
  });

  it('IT-UNIT-004: Given filters, When units are listed, Then pass the parsed query to the service', async () => {
    const response = await send(
      '?page=2&limit=5&search=gram&dimension=MASS',
      'GET',
    );

    expect(response.status).toBe(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        search: 'gram',
        dimension: 'MASS',
      }),
    );
  });

  it.each(['dimension=WEIGHT', 'limit=101', 'page=0', 'unknown=1'])(
    'IT-UNIT-005: Given the invalid query %s, When units are listed, Then reject it before the service',
    async (query) => {
      const response = await send(`?${query}`, 'GET');

      expect(response.status).toBe(400);
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('IT-UNIT-006: Given a unit code, When one unit is fetched, Then return it', async () => {
    const response = await send('/kg', 'GET');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(unit);
    expect(service.findOne).toHaveBeenCalledWith('kg');
  });

  it('IT-UNIT-007: Given an unknown unit, When it is fetched, updated, or deleted, Then return 404', async () => {
    service.findOne.mockRejectedValue(new NotFoundException());
    service.update.mockRejectedValue(new NotFoundException());
    service.delete.mockRejectedValue(new NotFoundException());

    expect((await send('/zz', 'GET')).status).toBe(404);
    expect((await send('/zz', 'PATCH', { name: 'X' })).status).toBe(404);
    expect((await send('/zz', 'DELETE')).status).toBe(404);
  });

  it('IT-UNIT-008: Given a partial body, When a unit is updated, Then pass the code and changes to the service', async () => {
    const response = await send('/kg', 'PATCH', {
      name: 'Kilo',
      to_base: 1000,
    });

    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith('kg', {
      name: 'Kilo',
      to_base: 1000,
    });
  });

  it.each([
    { code: 'kilo' },
    { name: '' },
    { dimension: 'WEIGHT' },
    { to_base: -1 },
  ])(
    'IT-UNIT-009: Given the invalid body %j, When a unit is updated, Then reject it before the service',
    async (payload) => {
      const response = await send('/kg', 'PATCH', payload);

      expect(response.status).toBe(400);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it('IT-UNIT-010: Given an unused unit, When it is deleted, Then return the deleted unit', async () => {
    const response = await send('/kg', 'DELETE');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(unit);
    expect(service.delete).toHaveBeenCalledWith('kg');
  });

  it('IT-UNIT-011: Given a unit used by recipe ingredients, When it is deleted, Then return 409', async () => {
    service.delete.mockRejectedValue(
      new ConflictException({ code: 'UNIT_IN_USE' }),
    );

    const response = await send('/kg', 'DELETE');

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'UNIT_IN_USE' });
  });

  it.each(readRoles)(
    'IT-UNIT-012: Given the %s role, When units are read, Then allow both read endpoints',
    async (role) => {
      currentRole = role;

      expect((await send('', 'GET')).status).toBe(200);
      expect((await send('/kg', 'GET')).status).toBe(200);
    },
  );

  it('IT-UNIT-013: Given a cashier, When units are read, Then deny both read endpoints without calling the service', async () => {
    currentRole = UserRole.CASHIER_STAFF;

    expect((await send('', 'GET')).status).toBe(403);
    expect((await send('/kg', 'GET')).status).toBe(403);
    expect(service.findAll).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each(writeRoles)(
    'IT-UNIT-014: Given the %s role, When units are changed, Then allow create, update, and delete',
    async (role) => {
      currentRole = role;

      expect((await send('', 'POST', body)).status).toBe(201);
      expect((await send('/kg', 'PATCH', { name: 'Kilo' })).status).toBe(200);
      expect((await send('/kg', 'DELETE')).status).toBe(200);
    },
  );

  it.each([...readOnlyRoles, UserRole.CASHIER_STAFF])(
    'IT-UNIT-015: Given the %s role, When units are changed, Then deny create, update, and delete without calling the service',
    async (role) => {
      currentRole = role;

      expect((await send('', 'POST', body)).status).toBe(403);
      expect((await send('/kg', 'PATCH', { name: 'Kilo' })).status).toBe(403);
      expect((await send('/kg', 'DELETE')).status).toBe(403);
      expect(service.create).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
    },
  );
});
