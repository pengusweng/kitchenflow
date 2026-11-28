import { Module } from '@nestjs/common';
import { DiscountsModule } from '../../billing/discounts/discounts.module';
import { PaymentsModule } from '../../billing/payments/payments.module';
import { KitchenFulfillmentModule } from '../../kitchen/kitchen-fulfillment/kitchen-fulfillment.module';
import { OrderItemsModule } from '../order-items/order-items.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderFlowController } from './order-flow.controller';
import { OrderFlowService } from './order-flow.service';

/**
 * Coordinates flows that span orders, billing and the kitchen. Nothing may
 * import this module, so the dependencies only ever point away from it.
 */
@Module({
  imports: [
    OrdersModule,
    OrderItemsModule,
    PaymentsModule,
    DiscountsModule,
    KitchenFulfillmentModule,
  ],
  controllers: [OrderFlowController],
  providers: [OrderFlowService],
})
export class OrderFlowModule {}
