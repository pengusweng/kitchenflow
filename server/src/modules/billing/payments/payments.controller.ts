import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import {
  CreatePaymentDocs,
  FindAllPaymentsDocs,
  FindOnePaymentDocs,
  FindPaymentByOrderDocs,
  PaymentsDocs,
} from './docs/payments.docs';
import { PaymentsService } from './payments.service';
import { Audit, fromResult } from '../../../shared/audit/audit.decorator';
import { CreatePaymentDTO } from './dto/payment.dto';
import { FindPaymentsDTO } from './dto/find-payments.dto';

@Controller('payments')
@PaymentsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.SUPERADMIN)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('order/:id')
  @Roles(UserRole.SUPERVISOR, UserRole.CASHIER_STAFF, UserRole.SUPERADMIN)
  @CreatePaymentDocs()
  @Audit({
    action: 'PAYMENT_CREATED',
    snapshot: 'create',
    entity: 'payments',
    id: fromResult('payment_id'),
  })
  async create(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentDTO,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.create(dto, orderId, request.session.user.user_id);
  }

  @Get()
  @FindAllPaymentsDocs()
  findAll(@Query() query: FindPaymentsDTO) {
    return this.payments.findAll(query);
  }

  @Get('order/:id')
  @FindPaymentByOrderDocs()
  findByOrder(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.payments.findOne({ order_id: orderId });
  }

  @Get(':id')
  @FindOnePaymentDocs()
  findOne(@Param('id', ParseUUIDPipe) paymentId: string) {
    return this.payments.findOne({ payment_id: paymentId });
  }
}
