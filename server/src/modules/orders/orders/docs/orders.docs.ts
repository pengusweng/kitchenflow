import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  OrderResponseDTO,
  OrdersPageResponseDTO,
  UnpaidOrdersPageResponseDTO,
  VerifyOrderResponseDTO,
  CreateOrderConflictResponseDTO,
} from '../dto/order-response.dto';

export function OrdersDocs() {
  return applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiResponse({
      status: 400,
      description:
        'Invalid UUID/body, unavailable catalog data, or invalid channel/payment requirements.',
    }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
    ApiResponse({
      status: 404,
      description: 'Order not found.',
    }),
    ApiResponse({
      status: 409,
      description:
        'Duplicate identity, conflicting replay, invalid lifecycle state or concurrent request; retry concurrency conflicts with the same order ID.',
    }),
  );
}

export function FindOneOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get an order by UUID',
      description:
        'Returns the saved order with items and kitchen ticket in any status. Kitchen head and kitchen staff may also read orders.',
    }),
    ApiParam({
      name: 'orderId',
      format: 'uuid',
      description: 'Order UUID.',
    }),
    ApiResponse({ status: 200, type: OrderResponseDTO }),
  );
}

export function CreateOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create an order draft',
      description:
        "Requires a client UUID, channel and 1-100 lines. Lines may contain menu items from multiple active brands in one order and kitchen ticket. The order code is ORD- plus the day's Asia/Manila order number, shared across every brand. DINE_IN requires a table reference; GRABFOOD/FOODPANDA require store and external order references. Replays with identical payload return the existing order, which may already be confirmed.",
    }),
    ApiResponse({
      status: 201,
      type: OrderResponseDTO,
      description:
        'Created draft or existing order on an identical replay. Platform drafts are created as PAID. No ticket until confirmation.',
    }),
    ApiResponse({
      status: 409,
      type: CreateOrderConflictResponseDTO,
      description:
        'DUPLICATE_PLATFORM_ORDER blocks a second draft and includes the existing_order. ORDER_ID_CONFLICT rejects a changed payload. ORDER_RETRY_REQUIRED means retry the same UUID and payload.',
    }),
  );
}

export function VerifyOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Validate a draft without saving',
      description:
        'Returns current catalog prices and recipe IDs; does not reserve prices or stock. Only drafts can be verified. Send no body.',
    }),
    ApiParam({
      name: 'orderId',
      format: 'uuid',
      description: 'Order UUID.',
    }),
    ApiResponse({
      status: 200,
      type: VerifyOrderResponseDTO,
      description:
        'Returns current catalog prices and recipe IDs; does not reserve prices or stock. Only drafts can be verified.',
    }),
  );
}

export function ConfirmOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm an order and create its kitchen ticket',
      description:
        'Saves current catalog snapshots, the subtotal and a QUEUED ticket atomically. Dine-in and takeaway orders stay UNPAID until a payment is recorded through POST /payments/order/{orderId}. GrabFood and Foodpanda orders get a PLATFORM_SETTLED payment for the subtotal and are marked PAID. Repeated confirmation returns the saved order and ticket without creating another payment. Send no body.',
    }),
    ApiParam({
      name: 'orderId',
      format: 'uuid',
      description: 'Order UUID.',
    }),
    ApiResponse({
      status: 200,
      type: OrderResponseDTO,
      description:
        'The confirmed order with its subtotal, payment status and kitchen ticket.',
    }),
    ApiResponse({
      status: 503,
      description: 'Kitchen ticket sequence unavailable or invalid.',
    }),
  );
}

export function CancelOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancel a draft order',
      description:
        'Cancels only a draft order without a kitchen ticket. Requires a nonblank reason. Repeated cancellation of the same draft returns the original saved result. Orders with kitchen tickets must be cancelled through kitchen fulfillment. No refund is performed.',
    }),
    ApiParam({
      name: 'orderId',
      format: 'uuid',
      description: 'Order UUID.',
    }),
    ApiResponse({
      status: 200,
      type: OrderResponseDTO,
      description:
        'Cancelled draft order with cancellation actor, reason and timestamp. Its kitchen ticket remains null.',
    }),
  );
}

export function FindAllOrdersDocs() {
  return applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List orders',
      description:
        'For the back-office orders list. Paginated with page (default 1) and limit (default 10, maximum 100). Optional search (order_code, case-insensitive partial), status, payment_status and an Asia/Manila from/to order_date range; filters combine using AND. Sorted by created_at descending, then order_id ascending. Rows have no lines or kitchen ticket; read one order through GET /orders/{orderId} for those.',
    }),
    ApiResponse({
      status: 200,
      type: OrdersPageResponseDTO,
      description:
        'A page of orders plus pagination meta with per-status counts. Returns an empty data array when nothing matches.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid query parameters, or from after to.',
    }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
  );
}

export function FindUnpaidTodayOrdersDocs() {
  return applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiOperation({
      summary: "List today's unpaid orders",
      description:
        'Orders whose order_date is today in Asia/Manila and whose payment_status is UNPAID. Drafts and cancelled orders are excluded. Paginated with page (default 1) and limit (default 10, maximum 100); optional search is a case-insensitive partial match on order_code. Sorted by created_at ascending, then order_id ascending, so the longest-waiting order comes first. Rows have the same shape as GET /orders.',
    }),
    ApiResponse({
      status: 200,
      type: UnpaidOrdersPageResponseDTO,
      description:
        "A page of today's unpaid orders plus pagination meta. Returns an empty data array when nothing matches.",
    }),
    ApiResponse({ status: 400, description: 'Invalid query parameters.' }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
  );
}
