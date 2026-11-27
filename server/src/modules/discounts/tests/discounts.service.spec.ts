import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  OrderChannel,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { OrdersRepository } from '../../orders/orders/orders.repository';
import { DiscountsService } from '../discounts.service';
import { ApplyDiscountDTO } from '../dto/apply-discount.dto';

describe('DiscountsService', () => {
  const orderId = 'order';
  const appliedById = 'cashier';
  const tx = {} as Prisma.TransactionClient;
  const dto: ApplyDiscountDTO = {
    discount_type: DiscountType.SENIOR_CITIZEN,
    id_number: 'OSCA-2026-001234',
    holder_name: 'Juan Dela Cruz',
  };

  let discountsRepository: { create: jest.Mock };
  let ordersRepository: {
    findById: jest.Mock;
    setTotal: jest.Mock;
    transaction: jest.Mock;
  };
  let service: DiscountsService;

  // A confirmed, unpaid dine-in order with a subtotal of 560 pesos and no discount.
  function order(overrides: object = {}) {
    return {
      order_id: orderId,
      status: OrderStatus.CONFIRMED,
      order_channel: OrderChannel.DINE_IN,
      payment_status: PaymentStatus.UNPAID,
      subtotal: new Prisma.Decimal('560.00'),
      total: new Prisma.Decimal('560.00'),
      discount_order: null,
      ...overrides,
    };
  }

  function expectNothingWritten() {
    expect(discountsRepository.create).not.toHaveBeenCalled();
    expect(ordersRepository.setTotal).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    discountsRepository = {
      create: jest.fn(
        (
          saved: ApplyDiscountDTO,
          amounts: object,
          order_id: string,
          applied_by_id: string,
        ) =>
          Promise.resolve({
            order_discount_id: 'discount',
            ...saved,
            ...amounts,
            order_id,
            applied_by_id,
          }),
      ),
    };
    ordersRepository = {
      findById: jest.fn().mockResolvedValue(order()),
      setTotal: jest.fn().mockResolvedValue({}),
      transaction: jest.fn(
        (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => work(tx),
      ),
    };
    service = new DiscountsService(
      discountsRepository,
      ordersRepository as unknown as OrdersRepository,
    );
  });

  it.each([DiscountType.SENIOR_CITIZEN, DiscountType.PWD])(
    'UT-DSC-003: applies a %s discount and saves the new total in one transaction',
    async (discount_type) => {
      const result = await service.apply(
        { ...dto, discount_type },
        orderId,
        appliedById,
      );

      expect(ordersRepository.transaction).toHaveBeenCalledTimes(1);
      expect(ordersRepository.findById).toHaveBeenCalledWith(orderId, tx);
      expect(discountsRepository.create).toHaveBeenCalledWith(
        { ...dto, discount_type },
        {
          vat_exempt_amount: new Prisma.Decimal('60.00'),
          discount_amount: new Prisma.Decimal('100.00'),
        },
        orderId,
        appliedById,
        tx,
      );
      expect(ordersRepository.setTotal).toHaveBeenCalledWith(
        orderId,
        new Prisma.Decimal('400.00'),
        tx,
      );
      expect(result).toMatchObject({
        order_discount_id: 'discount',
        discount_type,
        total: new Prisma.Decimal('400.00'),
      });
    },
  );

  it.each([
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.COMPLETED,
  ])('UT-DSC-004: accepts a discount on an unpaid %s order', async (status) => {
    ordersRepository.findById.mockResolvedValue(order({ status }));

    await expect(
      service.apply(dto, orderId, appliedById),
    ).resolves.toMatchObject({ order_id: orderId });
  });

  it('UT-DSC-005: rejects a missing order as ORDER_NOT_FOUND without writing', async () => {
    ordersRepository.findById.mockResolvedValue(null);
    const result = service.apply(dto, orderId, appliedById);

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toMatchObject({
      response: { code: 'ORDER_NOT_FOUND' },
    });
    expectNothingWritten();
  });

  it.each([
    [{ status: OrderStatus.DRAFT }, 'ORDER_NOT_CONFIRMED'],
    [{ status: OrderStatus.CANCELLED }, 'ORDER_CANCELLED'],
    [{ payment_status: PaymentStatus.PAID }, 'ORDER_ALREADY_PAID'],
    [{ payment_status: PaymentStatus.REFUNDED }, 'ORDER_ALREADY_REFUNDED'],
    [
      { discount_order: { order_discount_id: 'earlier' } },
      'ORDER_ALREADY_DISCOUNTED',
    ],
  ])(
    'UT-DSC-006: rejects an order with %o as %s without writing',
    async (overrides, code) => {
      ordersRepository.findById.mockResolvedValue(order(overrides));
      const result = service.apply(dto, orderId, appliedById);

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toMatchObject({ response: { code } });
      expectNothingWritten();
    },
  );

  it.each([OrderChannel.GRABFOOD, OrderChannel.FOODPANDA])(
    'UT-DSC-007: rejects a %s order as DISCOUNT_NOT_ALLOWED_FOR_PLATFORM without writing',
    async (order_channel) => {
      ordersRepository.findById.mockResolvedValue(order({ order_channel }));
      const result = service.apply(dto, orderId, appliedById);

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'DISCOUNT_NOT_ALLOWED_FOR_PLATFORM' },
      });
      expectNothingWritten();
    },
  );
});
