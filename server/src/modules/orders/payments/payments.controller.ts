import { Controller, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PaymentsDocs } from './docs/payments.docs';
import { PaymentsService } from './payments.service';

@Controller('brands/:brandId/orders/:orderId/payments')
@PaymentsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.CASHIER_STAFF, UserRole.SUPERADMIN)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
}
