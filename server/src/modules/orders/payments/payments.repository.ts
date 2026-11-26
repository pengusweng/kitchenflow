import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreatePaymentDTO } from './dto/payment.dto';
import { Prisma } from '@prisma/client';
import { FindPaymentsDTO, PaymentSortField } from './dto/find-payments.dto';
import { SortOrder } from '../../users/dto/find-users.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

const RECEIVED_BY_NAME = {
  received_by: {
    select: {
      first_name: true,
      last_name: true,
    },
  },
} as const;

export type PaymentUniqueKey = { payment_id: string } | { order_id: string };

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
    const payment = await tx.payment.create({
      data: {
        ...dto,
        order_id: orderId,
        received_by_id: receivedById,
      },
      include: RECEIVED_BY_NAME,
    });

    return this.withReceiverName(payment);
  }

  async findAll(
    dto: FindPaymentsDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const skip = (dto.page - 1) * dto.limit;
    const take = dto.limit;

    const where: Prisma.PaymentWhereInput = {
      payment_method: dto.payment_method,
      received_by_id: dto.received_by_id,
      paid_at: this.paidAtRange(dto.from, dto.to),
      ...this.searchWhere(dto.search),
    };

    const paymentsQuery = tx.payment.findMany({
      where,
      skip,
      take,
      orderBy: this.orderBy(dto.sortBy, dto.sortOrder),
      include: RECEIVED_BY_NAME,
    });
    const totalQuery = tx.payment.count({ where });

    const [payments, total] =
      '$transaction' in tx
        ? await tx.$transaction([paymentsQuery, totalQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([paymentsQuery, totalQuery]);

    return {
      payments: payments.map((payment) => this.withReceiverName(payment)),
      total,
    };
  }

  async findOne(
    key: PaymentUniqueKey,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const payment = await tx.payment.findUnique({
      where: key,
      include: RECEIVED_BY_NAME,
    });

    if (!payment) {
      return null;
    }

    return this.withReceiverName(payment);
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

  private searchWhere(search?: string): Prisma.PaymentWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: [
          { payment_reference: { contains: term, mode: 'insensitive' } },
          {
            received_by: {
              OR: (['username', 'first_name', 'last_name'] as const).map(
                (field) => ({
                  [field]: { contains: term, mode: 'insensitive' },
                }),
              ),
            },
          },
        ],
      })),
    };
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

  private withReceiverName<
    T extends { received_by: { first_name: string; last_name: string } },
  >({ received_by, ...rest }: T) {
    return {
      ...rest,
      received_by_name: `${received_by.first_name} ${received_by.last_name}`,
    };
  }
}
