import { Prisma } from '@prisma/client';
import { seniorDiscount } from '../discount-rules';

describe('seniorDiscount', () => {
  it.each([
    {
      subtotal: '560.00',
      vatExempt: '60.00',
      discount: '100.00',
      total: '400.00',
    },
    {
      subtotal: '189.00',
      vatExempt: '20.25',
      discount: '33.75',
      total: '135.00',
    },
    {
      subtotal: '250.00',
      vatExempt: '26.79',
      discount: '44.64',
      total: '178.57',
    },
    { subtotal: '0.00', vatExempt: '0.00', discount: '0.00', total: '0.00' },
  ])(
    'UT-DSC-001: discounts a subtotal of $subtotal to $total',
    ({ subtotal, vatExempt, discount, total }) => {
      const result = seniorDiscount(new Prisma.Decimal(subtotal));

      expect(result.vatExempt.toFixed(2)).toBe(vatExempt);
      expect(result.discount.toFixed(2)).toBe(discount);
      expect(result.total.toFixed(2)).toBe(total);
    },
  );

  it.each(['0.01', '99.99', '333.33', '1234.57'])(
    'UT-DSC-002: the parts of a %s subtotal add back up to it exactly',
    (subtotal) => {
      const { vatExempt, discount, total } = seniorDiscount(
        new Prisma.Decimal(subtotal),
      );

      expect(total.plus(vatExempt).plus(discount).toFixed(2)).toBe(subtotal);
    },
  );

  it.each([
    {
      holders: 1,
      diners: 4,
      vatExempt: '26.79',
      discount: '44.64',
      total: '928.57',
    },
    {
      holders: 2,
      diners: 4,
      vatExempt: '53.57',
      discount: '89.29',
      total: '857.14',
    },
    {
      holders: 1,
      diners: 3,
      vatExempt: '35.71',
      discount: '59.52',
      total: '904.77',
    },
    {
      holders: 4,
      diners: 4,
      vatExempt: '107.14',
      discount: '178.57',
      total: '714.29',
    },
  ])(
    'UT-DSC-008: discounts only $holders of $diners diners’ share of a 1000 bill, leaving $total',
    ({ holders, diners, vatExempt, discount, total }) => {
      const result = seniorDiscount(
        new Prisma.Decimal('1000.00'),
        holders,
        diners,
      );

      expect(result.vatExempt.toFixed(2)).toBe(vatExempt);
      expect(result.discount.toFixed(2)).toBe(discount);
      expect(result.total.toFixed(2)).toBe(total);
      expect(
        result.total.plus(result.vatExempt).plus(result.discount).toFixed(2),
      ).toBe('1000.00');
    },
  );
});
