import { Module } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';

/**
 * Payment data access only. Orders imports this to record platform payments,
 * while PaymentsModule imports orders, so the two never import each other.
 */
@Module({
  providers: [PaymentsRepository],
  exports: [PaymentsRepository],
})
export class PaymentsDataModule {}
