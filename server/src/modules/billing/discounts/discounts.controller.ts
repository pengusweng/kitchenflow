import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  Authenticated,
  type AuthenticatedRequest,
} from '../../auth/auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Audit, fromResult } from '../../../shared/audit/audit.decorator';
import { ApplyDiscountDocs, DiscountsDocs } from './docs/discounts.docs';
import { DiscountsService } from './discounts.service';
import { ApplyDiscountDTO } from './dto/apply-discount.dto';

@Controller('discounts')
@DiscountsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.CASHIER_STAFF, UserRole.SUPERADMIN)
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post('order/:id')
  @ApplyDiscountDocs()
  @Audit({
    action: 'ORDER_DISCOUNT_APPLIED',
    snapshot: 'create',
    entity: 'order_discounts',
    id: fromResult('order_discount_id'),
  })
  apply(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: ApplyDiscountDTO,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.discounts.apply(dto, orderId, request.session.user.user_id);
  }
}
