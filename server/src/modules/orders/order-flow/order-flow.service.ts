import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { PaymentsService } from '../../billing/payments/payments.service';
import { DiscountsService } from '../../billing/discounts/discounts.service';

@Injectable()
export class OrderFlowService {
  private readonly logger = new Logger(OrderFlowService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly orderItems: OrderItemsService,
    private readonly payment: PaymentsService,
    private readonly discount: DiscountsService,
  ) {}
}
