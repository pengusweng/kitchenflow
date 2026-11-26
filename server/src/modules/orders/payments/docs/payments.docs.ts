import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const paymentExample = {
  payment_id: '7d3c2b1a-0f9e-4d8c-b7a6-5e4d3c2b1a0f',
  order_id: '0f1e2d3c-4b5a-4968-8776-655443322110',
  received_by_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  received_by_name: 'Juan Dela Cruz',
  payment_method: 'CASH',
  payment_reference: null,
  amount: '250.00',
  amount_tendered: '300.00',
  paid_at: '2026-11-27T04:15:00.000Z',
  created_at: '2026-11-27T04:15:00.000Z',
};

const idParam = (description: string) =>
  ApiParam({ name: 'id', format: 'uuid', description });

export function PaymentsDocs() {
  return applyDecorators(
    ApiTags('Payments'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid UUID, query or body.' }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
  );
}

export function CreatePaymentDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Record the payment for an order (supervisors, cashier staff and superadmins).',
      description:
        'Cash must have amount_tendered at least amount; card, e-wallet and platform-settled payments must have them equal. The receiving user is the session user.',
    }),
    idParam('Order UUID.'),
    ApiResponse({
      status: 201,
      description: 'The created payment.',
      content: { 'application/json': { example: paymentExample } },
    }),
    ApiResponse({
      status: 404,
      description: 'Order or receiving user not found.',
    }),
  );
}

export function FindAllPaymentsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List payments (supervisors and superadmins).',
      description:
        'Supports page, limit, payment_method, received_by_id, from and to (Asia/Manila paid dates), search, sortBy and sortOrder. Without sortBy the most recent payments come first.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated payments in data, with page, limit, total and totalPages in meta.',
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'One matching payment',
              value: {
                data: [paymentExample],
                meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
              },
            },
            empty: {
              summary: 'No matching payments',
              value: {
                data: [],
                meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
              },
            },
          },
        },
      },
    }),
  );
}

export function FindPaymentByOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: "Get an order's payment (supervisors and superadmins).",
    }),
    idParam('Order UUID.'),
    ApiResponse({
      status: 200,
      description: 'The payment for the order.',
      content: { 'application/json': { example: paymentExample } },
    }),
    ApiResponse({
      status: 404,
      description: 'The order has no payment.',
    }),
  );
}

export function FindOnePaymentDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a payment (supervisors and superadmins).' }),
    idParam('Payment UUID.'),
    ApiResponse({
      status: 200,
      description: 'The payment.',
      content: { 'application/json': { example: paymentExample } },
    }),
    ApiResponse({ status: 404, description: 'Payment not found.' }),
  );
}
