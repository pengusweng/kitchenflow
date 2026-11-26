import { Injectable, Logger } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { assertExists } from '../../../shared/assertions/assert-exists';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async findOne(paymentId: string) {
    this.logger.debug(`Finding payment ${paymentId}`);

    const payment = await this.paymentsRepository.findOne(paymentId);

    assertExists(payment, 'Payment', paymentId, this.logger);

    this.logger.log(
      `Found payment ${payment.payment_id} createdAt: ${payment.created_at.toDateString()}`,
    );

    return payment;
  }
}
