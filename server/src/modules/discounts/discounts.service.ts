import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { assertExists } from '../../shared/assertions/assert-exists';
import {
  OrdersRepository,
  type SavedOrder,
} from '../orders/orders/orders.repository';
import { isPlatformChannel } from '../payments/payment-rules';
import { seniorDiscount } from './discount-rules';
import { DiscountsRepository } from './discounts.repository';
import { ApplyDiscountDTO } from './dto/apply-discount.dto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(
    private readonly discountsRepository: DiscountsRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  /** Saves the discount and the order's new amount due, both or neither. */
  async apply(dto: ApplyDiscountDTO, orderId: string, appliedById: string) {
    this.logger.debug(
      `Applying a ${dto.discount_type} discount to order ${orderId}, by ${appliedById}`,
    );

    return this.ordersRepository.transaction(async (tx) => {
      const order = await this.ordersRepository.findById(orderId, tx);
      assertExists(order, 'Order', orderId, this.logger);
      this.assertDiscountable(order);

      const { vatExempt, discount, total } = seniorDiscount(order.subtotal);

      const saved = await this.discountsRepository.create(
        dto,
        { vat_exempt_amount: vatExempt, discount_amount: discount },
        orderId,
        appliedById,
        tx,
      );
      await this.ordersRepository.setTotal(orderId, total, tx);

      this.logger.log(
        `Applied ${dto.discount_type} discount ${saved.order_discount_id} to order ${orderId}; total is now ${total.toFixed(2)}`,
      );

      return { ...saved, total };
    });
  }

  // A discount changes what the customer owes, so it must come before payment.
  private assertDiscountable(order: SavedOrder) {
    if (order.status === OrderStatus.DRAFT) {
      throw new ConflictException({
        code: 'ORDER_NOT_CONFIRMED',
        message: 'Order must be confirmed before it is discounted.',
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException({
        code: 'ORDER_CANCELLED',
        message: 'Cancelled orders cannot be discounted.',
      });
    }

    if (isPlatformChannel(order.order_channel)) {
      throw new BadRequestException({
        code: 'DISCOUNT_NOT_ALLOWED_FOR_PLATFORM',
        message: `${order.order_channel} orders are settled by the platform and cannot be discounted.`,
      });
    }

    if (order.payment_status === PaymentStatus.PAID) {
      throw new ConflictException({
        code: 'ORDER_ALREADY_PAID',
        message: 'Paid orders cannot be discounted.',
      });
    }

    if (order.payment_status === PaymentStatus.REFUNDED) {
      throw new ConflictException({
        code: 'ORDER_ALREADY_REFUNDED',
        message: 'Refunded orders cannot be discounted.',
      });
    }

    if (order.discount_order) {
      throw new ConflictException({
        code: 'ORDER_ALREADY_DISCOUNTED',
        message: 'Order already has a discount.',
      });
    }
  }
}
