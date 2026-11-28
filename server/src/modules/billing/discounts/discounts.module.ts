import { Module } from '@nestjs/common';
import { OrdersModule } from '../../orders/orders/orders.module';
import { DiscountsController } from './discounts.controller';
import { DiscountsRepository } from './discounts.repository';
import { DiscountsService } from './discounts.service';

@Module({
  imports: [OrdersModule],
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountsRepository],
  exports: [DiscountsService],
})
export class DiscountsModule {}
