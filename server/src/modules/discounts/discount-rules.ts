import { Prisma } from '@prisma/client';

const VAT_RATE = new Prisma.Decimal('1.12');
const DISCOUNT_RATE = new Prisma.Decimal('0.20');

function toCentavos(amount: Prisma.Decimal) {
  return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Senior citizen / PWD discount. Only the holders' share of a shared bill is
 * discounted: subtotal ÷ diners × holders. VAT comes off that share first,
 * then 20% of what is left. The VAT exemption is derived from the rounded
 * VAT-exclusive amount, so total + vatExempt + discount always adds back up
 * to the subtotal.
 */
export function seniorDiscount(
  subtotal: Prisma.Decimal,
  holders = 1,
  diners = 1,
) {
  const share = toCentavos(subtotal.dividedBy(diners).times(holders));

  const vatExclusive = toCentavos(share.dividedBy(VAT_RATE));
  const vatExempt = share.minus(vatExclusive);
  const discount = toCentavos(vatExclusive.times(DISCOUNT_RATE));

  return {
    vatExempt,
    discount,
    total: subtotal.minus(vatExempt).minus(discount),
  };
}
