import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreatePaymentDTO } from './dto/payment.dto';
import { Prisma } from '@prisma/client';
import { FindPaymentsDTO, PaymentSortField } from './dto/find-payments.dto';
import { SortOrder } from '../../users/dto/find-users.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

function manilaMidnight(date: string): Date {
  return new Date(`${date}T00:00:00+08:00`);
}

// TODO(payments): voids and refunds.
//   Decide first: are refunds needed or only voids? Who may do them
//   (SUPERVISOR/SUPERADMIN + action PIN?) Partial refunds allowed?
//
// TODO(voids): a void = the payment row was an entry mistake; keep the row.
//   - Schema: voided_at, voided_by_id (+ User relation), void_reason on Payment
//     (mirror Order's cancelled_at / cancelled_by_id / cancellation_reason).
//   - void(paymentId, voidedById, reason, tx): only update where voided_at is null.
//   - Reject double voids (409); recalc orders.payment_status in the same tx.
//   - Exclude voided rows from findAll (or add a filter) and from "total paid".
//   - Add void_reason to FORBIDDEN_SNAPSHOT_FIELDS (shared/audit/audit-snapshots.ts).
//
// TODO(refunds): a refund = real money went back; new row, not a column.
//   - Schema: Refund model (refund_id, payment_id, refunded_by_id, amount,
//     reason, refunded_at) with back-relations and @@index([payment_id]).
//   - Sum of refunds for a payment must not exceed its amount.
//   - Reject refunds on voided payments and PLATFORM_SETTLED orders.
//   - Recalc orders.payment_status in the same tx.
//
// TODO(status): one helper computing orders.payment_status:
//   net paid = non-voided payments - their refunds
//   PAID if net paid >= order total, REFUNDED if fully refunded, else UNPAID.
//   Call it after every create payment, void and refund.
@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePaymentDTO,
    orderId: string,
    receivedById: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.payment.create({
      data: {
        ...dto,
        order_id: orderId,
        received_by_id: receivedById,
      },
    });
  }

  async findAll(
    orderId: string,
    skip: number,
    take: number,
    {
      payment_method,
      received_by_id,
      from,
      to,
      sortBy,
      sortOrder,
    }: Pick<
      FindPaymentsDTO,
      | 'payment_method'
      | 'received_by_id'
      | 'from'
      | 'to'
      | 'sortBy'
      | 'sortOrder'
    >,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const where: Prisma.PaymentWhereInput = {
      order_id: orderId,
      payment_method,
      received_by_id,
      paid_at: this.paidAtRange(from, to),
    };

    const paymentsQuery = tx.payment.findMany({
      where,
      skip,
      take,
      orderBy: this.orderBy(sortBy, sortOrder),
    });
    const totalQuery = tx.payment.count({ where });

    const [payments, total] =
      '$transaction' in tx
        ? await tx.$transaction([paymentsQuery, totalQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([paymentsQuery, totalQuery]);

    return { payments, total };
  }

  private orderBy(
    sortBy?: PaymentSortField,
    sortOrder: SortOrder = 'asc',
  ): Prisma.PaymentOrderByWithRelationInput[] {
    const primary: Record<
      PaymentSortField,
      Prisma.PaymentOrderByWithRelationInput[]
    > = {
      paid_at: [{ paid_at: sortOrder }],
      amount: [{ amount: sortOrder }],
      payment_method: [{ payment_method: sortOrder }, { paid_at: 'desc' }],
      created_at: [{ created_at: sortOrder }],
    };
    return [
      ...(sortBy ? primary[sortBy] : [{ paid_at: 'desc' as const }]),
      { payment_id: 'asc' },
    ];
  }

  private paidAtRange(
    from?: string,
    to?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }

    return {
      gte: from ? manilaMidnight(from) : undefined,
      lt: to ? new Date(manilaMidnight(to).getTime() + DAY_MS) : undefined,
    };
  }

  async findOne(
    paymentId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.payment.findUnique({
      where: { payment_id: paymentId },
    });
  }
}
