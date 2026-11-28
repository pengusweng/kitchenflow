import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import {
  FindAllOrdersDocs,
  FindUnpaidTodayOrdersDocs,
} from './docs/orders.docs';
import { FindAllOrdersDTO } from './dto/find-all-orders.dto';
import { FindUnpaidTodayOrdersDTO } from './dto/find-unpaid-today-orders.dto';
import { OrdersService } from './orders.service';

/**
 * The back-office order lists. Order actions stay on OrdersController; this
 * is read-only.
 */
@Controller('orders')
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.CASHIER_STAFF, UserRole.SUPERADMIN)
export class AllOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @FindAllOrdersDocs()
  @Get()
  findAll(@Query() query: FindAllOrdersDTO) {
    return this.orders.findOverview(query);
  }

  @FindUnpaidTodayOrdersDocs()
  @Get('unpaid/today')
  findUnpaidToday(@Query() query: FindUnpaidTodayOrdersDTO) {
    return this.orders.findUnpaidToday(query);
  }
}
