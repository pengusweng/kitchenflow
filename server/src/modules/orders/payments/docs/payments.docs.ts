import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

export function PaymentsDocs() {
  return applyDecorators(
    ApiTags('Payments'),
    ApiBearerAuth(),
    ApiParam({
      name: 'brandId',
      format: 'uuid',
      description: 'Brand UUID. Allowed roles may operate on any brand.',
    }),
    ApiParam({
      name: 'orderId',
      format: 'uuid',
      description: 'Order UUID belonging to brandId.',
    }),
    ApiResponse({ status: 400, description: 'Invalid UUID or body.' }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid or expired bearer session.',
    }),
    ApiResponse({ status: 403, description: 'Role access denied.' }),
    ApiResponse({
      status: 404,
      description: 'Order not found in the requested brand.',
    }),
  );
}
