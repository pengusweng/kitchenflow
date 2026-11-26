import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

const INTERNAL_PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.E_WALLET,
  PaymentMethod.CARD,
] as const;

export class CreatePaymentDTO {
  @IsIn(INTERNAL_PAYMENT_METHODS, {
    message: 'Payment method must be CASH, E_WALLET or CARD.',
  })
  @ApiProperty({
    enum: INTERNAL_PAYMENT_METHODS,
    description:
      'CASH, E_WALLET or CARD. PLATFORM_SETTLED is reserved for platform orders and is not accepted.',
  })
  payment_method: PaymentMethod;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with at most 2 decimal places.' },
  )
  @Min(0.01, { message: 'Amount must be greater than zero.' })
  @Max(9999999999.99, { message: 'Amount must not exceed 9999999999.99.' })
  @ApiProperty({
    minimum: 0.01,
    maximum: 9999999999.99,
    multipleOf: 0.01,
    description: 'Amount in PHP applied to the order.',
    example: 250,
  })
  amount: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Amount tendered must be a number with at most 2 decimal places.',
    },
  )
  @Min(0.01, { message: 'Amount tendered must be greater than zero.' })
  @Max(9999999999.99, {
    message: 'Amount tendered must not exceed 9999999999.99.',
  })
  @ApiProperty({
    minimum: 0.01,
    maximum: 9999999999.99,
    multipleOf: 0.01,
    description:
      'Amount handed over by the customer, in PHP. Must not be less than amount; change is amount_tendered minus amount.',
    example: 300,
  })
  amount_tendered: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ApiPropertyOptional({
    maxLength: 255,
    description: 'E-wallet or card reference number. Trimmed.',
  })
  payment_reference?: string;
}
