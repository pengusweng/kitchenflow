import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module';
import { OrdersModule } from '../../orders/orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsDataModule } from './payments-data.module';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PaymentsDataModule, OrdersModule, UsersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
