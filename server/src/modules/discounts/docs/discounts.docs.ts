import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const discountExample = {
  order_discount_id: '3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d',
  order_id: '0f1e2d3c-4b5a-4968-8776-655443322110',
  applied_by_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  discount_type: 'SENIOR_CITIZEN',
  id_number: 'OSCA-2026-001234',
  holder_name: 'Juan Dela Cruz',
  diners: 1,
  holders: 1,
  vat_exempt_amount: '60',
  discount_amount: '100',
  applied_at: '2026-11-28T04:15:00.000Z',
  total: '400',
};

export function DiscountsDocs() {
  return applyDecorators(
    ApiTags('Discounts'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid UUID or body.' }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
  );
}

export function ApplyDiscountDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Apply a senior citizen or PWD discount to an order',
      description:
        'For confirmed, unpaid dine-in and takeaway orders, one discount per order. Only the holders’ share of the bill is discounted: subtotal ÷ diners × holders (both default to 1, i.e. the whole order). VAT (12%) comes off that share first, then 20% of the VAT-exclusive amount. The order total becomes the new amount due, which the payment must match.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Order UUID.' }),
    ApiResponse({
      status: 201,
      description: 'The saved discount and the order’s new total.',
      schema: { example: discountExample },
    }),
    ApiResponse({
      status: 400,
      description:
        'Invalid UUID or body, HOLDERS_EXCEED_DINERS, or DISCOUNT_NOT_ALLOWED_FOR_PLATFORM for a GrabFood or Foodpanda order.',
    }),
    ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND.' }),
    ApiResponse({
      status: 409,
      description:
        'ORDER_NOT_CONFIRMED, ORDER_CANCELLED, ORDER_ALREADY_PAID, ORDER_ALREADY_REFUNDED or ORDER_ALREADY_DISCOUNTED.',
    }),
  );
}
