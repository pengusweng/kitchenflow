import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PaymentsRepository, PaymentUniqueKey } from './payments.repository';
import { assertExists } from '../../shared/assertions/assert-exists';
import { OrdersRepository } from '../orders/orders/orders.repository';
import { CreatePaymentDTO } from './dto/payment.dto';
import { UsersRepository } from '../users/users.repository';
import {
  Order,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { FindPaymentsDTO } from './dto/find-payments.dto';
import { assertValidPagination } from '../../shared/assertions/assert-valid-pagination';
import { isPlatformChannel } from './payment-rules';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /** Saves the payment and marks its order PAID, both or neither. */
  async create(
    dto: CreatePaymentDTO,
    orderId: string,
    receivedByID: string,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return this.recordPayment(dto, orderId, receivedByID, tx);
    }

    return this.ordersRepository.transaction((tx) =>
      this.recordPayment(dto, orderId, receivedByID, tx),
    );
  }

  private async recordPayment(
    dto: CreatePaymentDTO,
    orderId: string,
    receivedByID: string,
    tx: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Creating payment for ${orderId}, received by ${receivedByID}`,
    );

    const order = await this.ordersRepository.findById(orderId, tx);
    const user = await this.usersRepository.findOne(receivedByID, true, tx);

    assertExists(order, 'Order', orderId, this.logger);
    assertExists(user, 'UserId', receivedByID, this.logger);

    this.assertPayable(order);
    this.assertMethodFitsChannel(dto.payment_method, order.order_channel);
    this.assertAmountMatchesTotal(dto.amount, order.total);

    if (dto.payment_method === PaymentMethod.CASH) {
      this.validateCashPayment(dto.amount, dto.amount_tendered);
    } else {
      this.assertExistingPaymentReference(
        dto.payment_method,
        dto.payment_reference,
      );

      this.validateExactPayment(dto.amount, dto.amount_tendered);
    }

    const payment = await this.paymentsRepository.create(
      dto,
      orderId,
      receivedByID,
      tx,
    );
    await this.ordersRepository.markPaid(orderId, tx);

    this.logger.log(
      `Created payment ${payment.payment_id} for order ${orderId}, received by ${receivedByID}`,
    );

    return payment;
  }

  async findOne(key: PaymentUniqueKey) {
    const id = 'payment_id' in key ? key.payment_id : key.order_id;
    this.logger.debug(`Finding payment by ${JSON.stringify(key)}`);

    const payment = await this.paymentsRepository.findOne(key);
    assertExists(payment, 'Payment', id, this.logger);

    this.logger.log(
      `Found payment ${payment.payment_id} for order ${payment.order_id}`,
    );

    return payment;
  }

  async findAll(dto: FindPaymentsDTO) {
    const { page, limit, ...filters } = dto;

    this.assertValidInputDate(dto.from, dto.to, this.logger);

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    this.logger.debug(
      `Listing all payments: skip=${skip}, take=${limit}, filters=${JSON.stringify(filters)}`,
    );

    const { payments, total } = await this.paymentsRepository.findAll(dto);

    this.logger.log(
      `Listed payments with filters=${JSON.stringify(filters)}, returned=${payments.length}, total=${total}`,
    );

    return {
      data: payments,
      meta: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  // Customers pay after the order is confirmed, at any point until it is paid.
  private assertPayable(order: Order) {
    if (order.status === OrderStatus.DRAFT) {
      this.logger.warn(`Order ${order.order_id} is not confirmed yet`);

      throw new ConflictException({
        code: 'ORDER_NOT_CONFIRMED',
        message: 'Order must be confirmed before it is paid.',
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      this.logger.warn(`Order ${order.order_id} is cancelled`);

      throw new ConflictException({
        code: 'ORDER_CANCELLED',
        message: 'Cancelled orders cannot be paid.',
      });
    }

    if (order.payment_status === PaymentStatus.PAID) {
      this.logger.warn(`Order ${order.order_id} is already paid`);

      throw new ConflictException({
        code: 'ORDER_ALREADY_PAID',
        message: 'Order already has a payment record.',
      });
    }

    if (order.payment_status === PaymentStatus.REFUNDED) {
      this.logger.warn(`Order ${order.order_id} is already refunded`);

      throw new ConflictException({
        code: 'ORDER_ALREADY_REFUNDED',
        message: 'Order is already refunded.',
      });
    }
  }

  private assertMethodFitsChannel(
    paymentMethod: PaymentMethod,
    channel: OrderChannel,
  ) {
    const platformSettled = paymentMethod === PaymentMethod.PLATFORM_SETTLED;

    if (isPlatformChannel(channel) && !platformSettled) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_NOT_ALLOWED',
        message: `${channel} orders can only be ${PaymentMethod.PLATFORM_SETTLED}.`,
      });
    }

    if (!isPlatformChannel(channel) && platformSettled) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_NOT_ALLOWED',
        message: `Only GrabFood and Foodpanda orders can be ${PaymentMethod.PLATFORM_SETTLED}.`,
      });
    }
  }

  // The total is the subtotal less any senior citizen or PWD discount.
  private assertAmountMatchesTotal(amount: number, total: Prisma.Decimal) {
    if (!total.equals(amount)) {
      throw new BadRequestException({
        code: 'AMOUNT_DOES_NOT_MATCH_TOTAL',
        message: `Amount must equal the order total of ${total.toFixed(2)}.`,
      });
    }
  }

  private validateCashPayment(amount: number, amountTendered: number) {
    if (amountTendered < amount) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_AMOUNT_TENDERED',
        message: 'Amount tendered must not be less than amount.',
      });
    }
  }

  private validateExactPayment(amount: number, amountTendered: number) {
    if (amountTendered !== amount) {
      throw new BadRequestException({
        code: 'AMOUNT_TENDERED_MISMATCH',
        message:
          'Amount tendered must equal amount for card, e-wallet and platform-settled payments.',
      });
    }
  }

  private assertValidInputDate(from?: string, to?: string, logger?: Logger) {
    if (from === undefined || to === undefined) {
      return;
    }

    if (from > to) {
      logger?.warn(`Invalid date range. from=${from}, to=${to}.`);

      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'From must be on or before to.',
      });
    }
  }

  private assertExistingPaymentReference(
    paymentMethod: PaymentMethod,
    paymentReference?: string,
  ) {
    if (!paymentReference) {
      this.logger.warn(`No payment reference found for ${paymentMethod}`);

      throw new BadRequestException({
        code: 'PAYMENT_REFERENCE_REQUIRED',
        message: `Payment reference is required for ${paymentMethod} payments.`,
      });
    }
  }
}
