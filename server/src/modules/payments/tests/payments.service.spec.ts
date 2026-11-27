import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { OrdersRepository } from '../../orders/orders/orders.repository';
import { UsersRepository } from '../../users/users.repository';
import { FindPaymentsDTO } from '../dto/find-payments.dto';
import { CreatePaymentDTO } from '../dto/payment.dto';
import { PaymentsRepository } from '../payments.repository';
import { PaymentsService } from '../payments.service';

describe('PaymentsService', () => {
  const orderId = 'order';
  const receivedById = 'cashier';
  const tx = {} as Prisma.TransactionClient;

  let paymentsRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
  };
  let ordersRepository: {
    findById: jest.Mock;
    markPaid: jest.Mock;
    transaction: jest.Mock;
  };
  let usersRepository: { findOne: jest.Mock };
  let service: PaymentsService;

  // Non-cash payments carry a reference by default, as the service requires.
  function payment(
    payment_method: PaymentMethod,
    amount_tendered: number,
  ): CreatePaymentDTO {
    return payment_method === PaymentMethod.CASH
      ? { payment_method, amount: 250, amount_tendered }
      : {
          payment_method,
          amount: 250,
          amount_tendered,
          payment_reference: 'REF-1234',
        };
  }

  // A confirmed, unpaid dine-in order with a subtotal and total of 250 pesos.
  function order(overrides: object = {}) {
    return {
      order_id: orderId,
      status: OrderStatus.CONFIRMED,
      order_channel: OrderChannel.DINE_IN,
      payment_status: PaymentStatus.UNPAID,
      subtotal: new Prisma.Decimal(250),
      total: new Prisma.Decimal(250),
      ...overrides,
    };
  }

  // Platform-settled payments only belong to GrabFood and Foodpanda orders.
  function orderPaidWith(method: PaymentMethod) {
    return method === PaymentMethod.PLATFORM_SETTLED
      ? order({ order_channel: OrderChannel.GRABFOOD })
      : order();
  }

  function expectNothingWritten() {
    expect(paymentsRepository.create).not.toHaveBeenCalled();
    expect(ordersRepository.markPaid).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    paymentsRepository = {
      create: jest.fn(
        (dto: CreatePaymentDTO, order_id: string, received_by_id: string) =>
          Promise.resolve({
            payment_id: 'payment',
            ...dto,
            order_id,
            received_by_id,
            received_by_name: 'Juan Dela Cruz',
          }),
      ),
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ payments: [], total: 0 }),
    };
    ordersRepository = {
      findById: jest.fn().mockResolvedValue(order()),
      markPaid: jest.fn().mockResolvedValue({}),
      transaction: jest.fn(
        (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => work(tx),
      ),
    };
    usersRepository = {
      findOne: jest.fn().mockResolvedValue({ user_id: receivedById }),
    };
    service = new PaymentsService(
      paymentsRepository as unknown as PaymentsRepository,
      ordersRepository as unknown as OrdersRepository,
      usersRepository as unknown as UsersRepository,
    );
  });

  it('UT-PAY-001: rejects a payment for a missing order without writing', async () => {
    ordersRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(payment(PaymentMethod.CASH, 250), orderId, receivedById),
    ).rejects.toBeInstanceOf(NotFoundException);
    expectNothingWritten();
  });

  it('UT-PAY-002: rejects a payment received by a missing or inactive user without writing', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(payment(PaymentMethod.CASH, 250), orderId, receivedById),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(usersRepository.findOne).toHaveBeenCalledWith(
      receivedById,
      true,
      tx,
    );
    expectNothingWritten();
  });

  it.each([250, 300])(
    'UT-PAY-003: accepts cash when %d pesos are tendered for 250 pesos',
    async (tendered) => {
      const dto = payment(PaymentMethod.CASH, tendered);

      await expect(
        service.create(dto, orderId, receivedById, tx),
      ).resolves.toMatchObject({
        order_id: orderId,
        received_by_id: receivedById,
        amount: 250,
        amount_tendered: tendered,
      });
      expect(ordersRepository.findById).toHaveBeenCalledWith(orderId, tx);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        receivedById,
        true,
        tx,
      );
      expect(paymentsRepository.create).toHaveBeenCalledWith(
        dto,
        orderId,
        receivedById,
        tx,
      );
    },
  );

  it('UT-PAY-004: rejects short cash with INSUFFICIENT_AMOUNT_TENDERED without writing', async () => {
    const result = service.create(
      payment(PaymentMethod.CASH, 200),
      orderId,
      receivedById,
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_AMOUNT_TENDERED' },
    });
    expectNothingWritten();
  });

  it.each([
    PaymentMethod.CARD,
    PaymentMethod.E_WALLET,
    PaymentMethod.PLATFORM_SETTLED,
  ])('UT-PAY-005: accepts an exact %s payment', async (method) => {
    ordersRepository.findById.mockResolvedValue(orderPaidWith(method));
    const dto = payment(method, 250);

    await expect(
      service.create(dto, orderId, receivedById),
    ).resolves.toMatchObject({ payment_method: method, amount_tendered: 250 });
    expect(paymentsRepository.create).toHaveBeenCalledWith(
      dto,
      orderId,
      receivedById,
      tx,
    );
  });

  it.each([
    [PaymentMethod.CARD, 300],
    [PaymentMethod.CARD, 200],
    [PaymentMethod.E_WALLET, 300],
    [PaymentMethod.E_WALLET, 200],
    [PaymentMethod.PLATFORM_SETTLED, 300],
    [PaymentMethod.PLATFORM_SETTLED, 200],
  ])(
    'UT-PAY-006: rejects %s with %d pesos tendered for 250 pesos as AMOUNT_TENDERED_MISMATCH',
    async (method, tendered) => {
      ordersRepository.findById.mockResolvedValue(orderPaidWith(method));
      const result = service.create(
        payment(method, tendered),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'AMOUNT_TENDERED_MISMATCH' },
      });
      expectNothingWritten();
    },
  );

  it.each([
    [PaymentStatus.PAID, 'ORDER_ALREADY_PAID'],
    [PaymentStatus.REFUNDED, 'ORDER_ALREADY_REFUNDED'],
  ])(
    'UT-PAY-014: rejects a payment for a %s order as %s without writing',
    async (payment_status, code) => {
      ordersRepository.findById.mockResolvedValue(order({ payment_status }));
      const result = service.create(
        payment(PaymentMethod.CASH, 250),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toMatchObject({ response: { code } });
      expectNothingWritten();
    },
  );

  it.each([
    [PaymentMethod.CARD, undefined],
    [PaymentMethod.CARD, ''],
    [PaymentMethod.E_WALLET, undefined],
    [PaymentMethod.E_WALLET, ''],
    [PaymentMethod.PLATFORM_SETTLED, undefined],
    [PaymentMethod.PLATFORM_SETTLED, ''],
  ])(
    'UT-PAY-015: rejects %s with payment reference %p as PAYMENT_REFERENCE_REQUIRED without writing',
    async (method, payment_reference) => {
      ordersRepository.findById.mockResolvedValue(orderPaidWith(method));
      const result = service.create(
        { ...payment(method, 250), payment_reference },
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'PAYMENT_REFERENCE_REQUIRED' },
      });
      expectNothingWritten();
    },
  );

  it('UT-PAY-016: accepts cash without a payment reference', async () => {
    const dto = payment(PaymentMethod.CASH, 300);

    await expect(
      service.create(dto, orderId, receivedById),
    ).resolves.toMatchObject({ payment_method: PaymentMethod.CASH });
    expect(dto).not.toHaveProperty('payment_reference');
    expect(paymentsRepository.create).toHaveBeenCalledWith(
      dto,
      orderId,
      receivedById,
      tx,
    );
  });

  it('UT-PAY-017: saves the payment and marks the order PAID in a new transaction', async () => {
    await service.create(
      payment(PaymentMethod.CASH, 300),
      orderId,
      receivedById,
    );

    expect(ordersRepository.transaction).toHaveBeenCalledTimes(1);
    expect(paymentsRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      orderId,
      receivedById,
      tx,
    );
    expect(ordersRepository.markPaid).toHaveBeenCalledWith(orderId, tx);
  });

  it('UT-PAY-018: reuses the given transaction instead of opening one', async () => {
    await service.create(
      payment(PaymentMethod.CASH, 300),
      orderId,
      receivedById,
      tx,
    );

    expect(ordersRepository.transaction).not.toHaveBeenCalled();
    expect(ordersRepository.markPaid).toHaveBeenCalledWith(orderId, tx);
  });

  it.each([
    [OrderStatus.DRAFT, 'ORDER_NOT_CONFIRMED'],
    [OrderStatus.CANCELLED, 'ORDER_CANCELLED'],
  ])(
    'UT-PAY-019: rejects a payment for a %s order as %s without writing',
    async (status, code) => {
      ordersRepository.findById.mockResolvedValue(order({ status }));
      const result = service.create(
        payment(PaymentMethod.CASH, 250),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toMatchObject({ response: { code } });
      expectNothingWritten();
    },
  );

  it.each([
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.COMPLETED,
  ])('UT-PAY-020: accepts a payment for a %s order', async (status) => {
    ordersRepository.findById.mockResolvedValue(order({ status }));

    await expect(
      service.create(payment(PaymentMethod.CASH, 250), orderId, receivedById),
    ).resolves.toMatchObject({ order_id: orderId });
    expect(ordersRepository.markPaid).toHaveBeenCalledWith(orderId, tx);
  });

  it.each([
    [PaymentMethod.CASH, OrderChannel.GRABFOOD],
    [PaymentMethod.CARD, OrderChannel.FOODPANDA],
    [PaymentMethod.PLATFORM_SETTLED, OrderChannel.DINE_IN],
    [PaymentMethod.PLATFORM_SETTLED, OrderChannel.TAKEAWAY],
  ])(
    'UT-PAY-021: rejects a %s payment for a %s order as PAYMENT_METHOD_NOT_ALLOWED without writing',
    async (method, order_channel) => {
      ordersRepository.findById.mockResolvedValue(order({ order_channel }));
      const result = service.create(
        payment(method, 250),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'PAYMENT_METHOD_NOT_ALLOWED' },
      });
      expectNothingWritten();
    },
  );

  it.each(['249.99', '250.01'])(
    'UT-PAY-022: rejects 250 pesos for a total of %s as AMOUNT_DOES_NOT_MATCH_TOTAL without writing',
    async (total) => {
      ordersRepository.findById.mockResolvedValue(
        order({ total: new Prisma.Decimal(total) }),
      );
      const result = service.create(
        payment(PaymentMethod.CASH, 300),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'AMOUNT_DOES_NOT_MATCH_TOTAL' },
      });
      expectNothingWritten();
    },
  );

  it('UT-PAY-023: charges the discounted total, not the subtotal', async () => {
    ordersRepository.findById.mockResolvedValue(
      order({
        subtotal: new Prisma.Decimal('350.00'),
        total: new Prisma.Decimal('250.00'),
      }),
    );

    await expect(
      service.create(payment(PaymentMethod.CASH, 250), orderId, receivedById),
    ).resolves.toMatchObject({ amount: 250 });
    expect(ordersRepository.markPaid).toHaveBeenCalledWith(orderId, tx);
  });

  describe('findOne', () => {
    const saved = {
      payment_id: 'payment',
      order_id: orderId,
      received_by_name: 'Juan Dela Cruz',
    };

    it.each([{ payment_id: 'payment' }, { order_id: orderId }])(
      'UT-PAY-007: finds a payment by %o',
      async (key) => {
        paymentsRepository.findOne.mockResolvedValue(saved);

        await expect(service.findOne(key)).resolves.toEqual(saved);
        expect(paymentsRepository.findOne).toHaveBeenCalledWith(key);
      },
    );

    it.each([{ payment_id: 'missing' }, { order_id: 'missing' }])(
      'UT-PAY-008: returns PAYMENT_NOT_FOUND when nothing matches %o',
      async (key) => {
        paymentsRepository.findOne.mockResolvedValue(null);
        const result = service.findOne(key);

        await expect(result).rejects.toBeInstanceOf(NotFoundException);
        await expect(result).rejects.toMatchObject({
          response: { code: 'PAYMENT_NOT_FOUND' },
        });
      },
    );
  });

  describe('findAll', () => {
    function query(overrides: Partial<FindPaymentsDTO> = {}) {
      return Object.assign(new FindPaymentsDTO(), overrides);
    }

    it('UT-PAY-009: returns the page with pagination metadata', async () => {
      const page = Array.from({ length: 5 }, (_, index) => ({
        payment_id: `payment-${index}`,
      }));
      paymentsRepository.findAll.mockResolvedValue({
        payments: page,
        total: 25,
      });
      const dto = query({
        page: 2,
        limit: 10,
        payment_method: PaymentMethod.CASH,
      });

      await expect(service.findAll(dto)).resolves.toEqual({
        data: page,
        meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
      });
      expect(paymentsRepository.findAll).toHaveBeenCalledWith(dto);
    });

    it('UT-PAY-010: returns an empty page when nothing matches', async () => {
      await expect(service.findAll(query())).resolves.toEqual({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it('UT-PAY-011: rejects a from date after the to date without querying', async () => {
      const result = service.findAll(
        query({ from: '2026-11-27', to: '2026-11-01' }),
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'INVALID_DATE_RANGE' },
      });
      expect(paymentsRepository.findAll).not.toHaveBeenCalled();
    });

    it.each([
      { from: '2026-11-27', to: '2026-11-27' },
      { from: '2026-11-01', to: undefined },
      { from: undefined, to: '2026-11-27' },
    ])('UT-PAY-012: accepts from=$from and to=$to', async (range) => {
      const dto = query(range);

      await expect(service.findAll(dto)).resolves.toMatchObject({
        data: [],
      });
      expect(paymentsRepository.findAll).toHaveBeenCalledWith(dto);
    });

    it('UT-PAY-013: rejects a page beyond the supported offset without querying', async () => {
      const result = service.findAll(query({ page: 21_474_838, limit: 100 }));

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
      });
      expect(paymentsRepository.findAll).not.toHaveBeenCalled();
    });
  });
});
