import {
  BadRequestException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';

describe('Payments HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let currentRole: UserRole;
  const callerId = '00000000-0000-4000-8000-000000000002';
  const orderId = '00000000-0000-4000-8000-000000000010';
  const paymentId = '00000000-0000-4000-8000-000000000020';
  const body = {
    payment_method: 'CASH',
    amount: 250,
    amount_tendered: 300,
  };
  const payment = {
    payment_id: paymentId,
    order_id: orderId,
    received_by_id: callerId,
    received_by_name: 'Juan Dela Cruz',
    payment_method: 'CASH',
    payment_reference: null,
    amount: '250.00',
    amount_tendered: '300.00',
  };
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const createRoles: UserRole[] = [
    UserRole.CASHIER_STAFF,
    UserRole.SUPERVISOR,
    UserRole.SUPERADMIN,
  ];
  const readRoles: UserRole[] = [UserRole.SUPERVISOR, UserRole.SUPERADMIN];
  const nonCreateRoles = Object.values(UserRole).filter(
    (role) => !createRoles.includes(role),
  );
  const nonReadRoles = Object.values(UserRole).filter(
    (role) => !readRoles.includes(role),
  );

  const send = (path: string, method: string, payload?: unknown) =>
    fetch(`${url}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  const readPaths = ['', `/order/${orderId}`, `/${paymentId}`];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
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
    url = (await app.getUrl()) + '/payments';
  });

  beforeEach(() => {
    currentRole = UserRole.SUPERVISOR;
    service.create.mockReset().mockResolvedValue(payment);
    service.findAll.mockReset().mockResolvedValue({ data: [], meta: {} });
    service.findOne.mockReset().mockResolvedValue(payment);
  });
  afterAll(async () => app?.close());

  it('IT-PAY-001: Given a valid body, When a payment is posted, Then pass the trimmed body, order ID and session user to the service and return 201', async () => {
    const response = await send(`/order/${orderId}`, 'POST', {
      payment_method: 'E_WALLET',
      amount: 250,
      amount_tendered: 250,
      payment_reference: '  GC-1234  ',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(payment);
    expect(service.create).toHaveBeenCalledWith(
      {
        payment_method: 'E_WALLET',
        amount: 250,
        amount_tendered: 250,
        payment_reference: 'GC-1234',
      },
      orderId,
      callerId,
    );
  });

  it.each([
    { amount: 250, amount_tendered: 300 },
    { ...body, payment_method: 'CHEQUE' },
    { ...body, amount: 0 },
    { ...body, amount: 250.123 },
    { ...body, amount: '250' },
    { payment_method: 'CASH', amount: 250 },
    { ...body, amount_tendered: 0 },
    { ...body, amount: 10_000_000_000 },
    { ...body, payment_reference: 'x'.repeat(256) },
    { ...body, received_by_id: callerId },
  ])(
    'IT-PAY-002: Given the invalid body %j, When a payment is posted, Then reject it before the service',
    async (payload) => {
      const response = await send(`/order/${orderId}`, 'POST', payload);

      expect(response.status).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('IT-PAY-003: Given a non-UUID order ID, When a payment is posted, Then reject it before the service', async () => {
    const response = await send('/order/not-a-uuid', 'POST', body);

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'ORDER_NOT_FOUND', NotFoundException],
    [400, 'INSUFFICIENT_AMOUNT_TENDERED', BadRequestException],
    [400, 'AMOUNT_TENDERED_MISMATCH', BadRequestException],
  ] as const)(
    'IT-PAY-004: Given the service rejects with %i %s, When a payment is posted, Then return it unchanged',
    async (status, code, Exception) => {
      service.create.mockRejectedValue(new Exception({ code, message: code }));

      const response = await send(`/order/${orderId}`, 'POST', body);

      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code });
    },
  );

  it.each(createRoles)(
    'IT-PAY-005: Given the %s role, When a payment is posted, Then return 201',
    async (role) => {
      currentRole = role;

      expect((await send(`/order/${orderId}`, 'POST', body)).status).toBe(201);
    },
  );

  it.each(nonCreateRoles)(
    'IT-PAY-006: Given the %s role, When a payment is posted, Then return 403 without calling the service',
    async (role) => {
      currentRole = role;

      expect((await send(`/order/${orderId}`, 'POST', body)).status).toBe(403);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('IT-PAY-007: Given filters, When payments are listed, Then pass the parsed query to the service', async () => {
    const response = await send(
      `?page=2&limit=5&payment_method=CARD&received_by_id=${callerId}` +
        '&from=2026-11-01&to=2026-11-27&search=%20juan%20&sortBy=amount&sortOrder=desc',
      'GET',
    );

    expect(response.status).toBe(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        payment_method: 'CARD',
        received_by_id: callerId,
        from: '2026-11-01',
        to: '2026-11-27',
        search: 'juan',
        sortBy: 'amount',
        sortOrder: 'desc',
      }),
    );
  });

  it.each([
    'payment_method=CHEQUE',
    'received_by_id=not-a-uuid',
    'from=2026-13-01',
    'to=11/27/2026',
    'sortBy=name',
    'sortOrder=up',
    'page=0',
    'limit=101',
    `search=${'x'.repeat(101)}`,
    'unknown=1',
  ])(
    'IT-PAY-008: Given the invalid query %s, When payments are listed, Then reject it before the service',
    async (query) => {
      const response = await send(`?${query}`, 'GET');

      expect(response.status).toBe(400);
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('IT-PAY-009: Given an order ID, When its payment is fetched, Then look it up by order_id', async () => {
    const response = await send(`/order/${orderId}`, 'GET');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payment);
    expect(service.findOne).toHaveBeenCalledWith({ order_id: orderId });
  });

  it('IT-PAY-010: Given a payment ID, When the payment is fetched, Then look it up by payment_id', async () => {
    const response = await send(`/${paymentId}`, 'GET');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payment);
    expect(service.findOne).toHaveBeenCalledWith({ payment_id: paymentId });
  });

  it('IT-PAY-011: Given a non-UUID ID, When a payment is fetched by order or by ID, Then reject it before the service', async () => {
    expect((await send('/order/not-a-uuid', 'GET')).status).toBe(400);
    expect((await send('/not-a-uuid', 'GET')).status).toBe(400);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('IT-PAY-012: Given no matching payment, When it is fetched by order or by ID, Then return 404', async () => {
    service.findOne.mockRejectedValue(
      new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found.',
      }),
    );

    for (const path of [`/order/${orderId}`, `/${paymentId}`]) {
      const response = await send(path, 'GET');
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        code: 'PAYMENT_NOT_FOUND',
      });
    }
  });

  it.each(readRoles)(
    'IT-PAY-013: Given the %s role, When payments are read, Then allow every read endpoint',
    async (role) => {
      currentRole = role;

      for (const path of readPaths) {
        expect((await send(path, 'GET')).status).toBe(200);
      }
    },
  );

  it.each(nonReadRoles)(
    'IT-PAY-014: Given the %s role, When payments are read, Then deny every read endpoint without calling the service',
    async (role) => {
      currentRole = role;

      for (const path of readPaths) {
        expect((await send(path, 'GET')).status).toBe(403);
      }
      expect(service.findAll).not.toHaveBeenCalled();
      expect(service.findOne).not.toHaveBeenCalled();
    },
  );
});
