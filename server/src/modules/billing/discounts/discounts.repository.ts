import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApplyDiscountDTO } from './dto/apply-discount.dto';

@Injectable()
export class DiscountsRepository {
  create(
    dto: ApplyDiscountDTO,
    amounts: {
      vat_exempt_amount: Prisma.Decimal;
      discount_amount: Prisma.Decimal;
    },
    orderId: string,
    appliedById: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.orderDiscount.create({
      data: {
        ...dto,
        ...amounts,
        order_id: orderId,
        applied_by_id: appliedById,
      },
    });
  }
}
