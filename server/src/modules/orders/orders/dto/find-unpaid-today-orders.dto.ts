import { PickType } from '@nestjs/swagger';
import { FindAllOrdersDTO } from './find-all-orders.dto';

/** Query for GET /orders/unpaid/today: pagination plus an order_code search. */
export class FindUnpaidTodayOrdersDTO extends PickType(FindAllOrdersDTO, [
  'page',
  'limit',
  'search',
] as const) {}
