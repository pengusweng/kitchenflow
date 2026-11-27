import { Prisma } from '@prisma/client';

const VAT_RATE = new Prisma.Decimal('1.12');
const DISCOUNT_RATE = new Prisma.Decimal('0.20');

function toCentavos(amount: Prisma.Decimal) {
  return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Senior citizen / PWD discount on the whole order: VAT comes off first, then
 * 20% of what is left. The VAT exemption and the amount due are derived from
 * the rounded VAT-exclusive amount, so the three parts always add back up to
 * the subtotal.
 */
export function seniorDiscount(subtotal: Prisma.Decimal) {
  const vatExclusive = toCentavos(subtotal.dividedBy(VAT_RATE));
  const vatExempt = subtotal.minus(vatExclusive);
  const discount = toCentavos(vatExclusive.times(DISCOUNT_RATE));

  return { vatExempt, discount, total: vatExclusive.minus(discount) };
}
