import { Prisma } from '@prisma/client';
import { OrderItemsRepository } from '../order-items.repository';
import { OrderItemsService } from '../order-items.service';

type Lines = Parameters<OrderItemsService['subtotal']>[0];

describe('OrderItemsService', () => {
  const service = new OrderItemsService(new OrderItemsRepository());

  function line(
    quantity: number,
    unitPrice: string,
    modifierPrices: string[] = [],
  ) {
    return {
      quantity,
      unit_price: new Prisma.Decimal(unitPrice),
      modifiers: modifierPrices.map((price, index) => ({
        modifier_id: `modifier-${index}`,
        modifier_name: `Modifier ${index}`,
        additional_price: new Prisma.Decimal(price),
      })),
    };
  }

  it.each([
    {
      name: '2 items at 189 with a 15 modifier and 1 item at 25 with none',
      lines: [line(2, '189', ['15']), line(1, '25')],
      subtotal: '433.00',
    },
    {
      name: '3 items at 50 with modifiers of 10 and 5',
      lines: [line(3, '50', ['10', '5'])],
      subtotal: '195.00',
    },
    {
      name: '1 item at 0.10 and 1 item at 0.20',
      lines: [line(1, '0.10'), line(1, '0.20')],
      subtotal: '0.30',
    },
    { name: 'no lines', lines: [], subtotal: '0.00' },
  ])(
    'UT-ORD-062: computes a subtotal of $subtotal for $name',
    ({ lines, subtotal }) => {
      const result = service.subtotal(lines as unknown as Lines);

      expect(result.toFixed(2)).toBe(subtotal);
    },
  );
});
