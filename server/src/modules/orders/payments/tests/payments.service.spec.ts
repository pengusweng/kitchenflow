import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { OrdersRepository } from '../../orders/orders.repository';
import { UsersRepository } from '../../../users/users.repository';
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
  let ordersRepository: { findById: jest.Mock };
  let usersRepository: { findOne: jest.Mock };
  let service: PaymentsService;

  function payment(
    payment_method: PaymentMethod,
    amount_tendered: number,
  ): CreatePaymentDTO {
    return { payment_method, amount: 250, amount_tendered };
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
      findById: jest.fn().mockResolvedValue({ order_id: orderId }),
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
    expect(paymentsRepository.create).not.toHaveBeenCalled();
  });

  it('UT-PAY-002: rejects a payment received by a missing or inactive user without writing', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(payment(PaymentMethod.CASH, 250), orderId, receivedById),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(usersRepository.findOne).toHaveBeenCalledWith(
      receivedById,
      true,
      undefined,
    );
    expect(paymentsRepository.create).not.toHaveBeenCalled();
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
    expect(paymentsRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    PaymentMethod.CARD,
    PaymentMethod.E_WALLET,
    PaymentMethod.PLATFORM_SETTLED,
  ])('UT-PAY-005: accepts an exact %s payment', async (method) => {
    const dto = payment(method, 250);

    await expect(
      service.create(dto, orderId, receivedById),
    ).resolves.toMatchObject({ payment_method: method, amount_tendered: 250 });
    expect(paymentsRepository.create).toHaveBeenCalledWith(
      dto,
      orderId,
      receivedById,
      undefined,
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
      const result = service.create(
        payment(method, tendered),
        orderId,
        receivedById,
      );

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'AMOUNT_TENDERED_MISMATCH' },
      });
      expect(paymentsRepository.create).not.toHaveBeenCalled();
    },
  );

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
