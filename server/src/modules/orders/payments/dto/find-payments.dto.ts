import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsIn,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationDTO } from '../../../../shared/dto/pagination.dto';
import { SORT_ORDERS, type SortOrder } from '../../../users/dto/find-users.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PAYMENT_SORT_FIELDS = [
  'paid_at',
  'amount',
  'payment_method',
  'created_at',
] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];

export class FindPaymentsDTO extends PaginationDTO {
  // Blank or whitespace-only searches are treated as no search.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'juan GC-1234',
    description:
      "Case-insensitive partial match on payment_reference and the receiver's username, first_name, and last_name. Each space-separated term must match at least one of those fields.",
  })
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(PaymentMethod, {
    message: `payment_method must be one of: ${Object.values(PaymentMethod).join(', ')}.`,
  })
  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Only return payments made with this method.',
  })
  payment_method?: PaymentMethod;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('all', { message: 'received_by_id must be a valid UUID.' })
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only return payments received by this user.',
  })
  received_by_id?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Matches(DATE_PATTERN, { message: 'from must use the YYYY-MM-DD format.' })
  @IsISO8601(
    { strict: true },
    { message: 'from must be a valid calendar date.' },
  )
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-01',
    description:
      'Only return payments whose Asia/Manila paid date (paid_at) is on or after this date.',
  })
  from?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Matches(DATE_PATTERN, { message: 'to must use the YYYY-MM-DD format.' })
  @IsISO8601({ strict: true }, { message: 'to must be a valid calendar date.' })
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-14',
    description:
      'Only return payments whose Asia/Manila paid date (paid_at) is on or before this date. Must not be before from.',
  })
  to?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(PAYMENT_SORT_FIELDS, {
    message: `sortBy must be one of: ${PAYMENT_SORT_FIELDS.join(', ')}.`,
  })
  @ApiPropertyOptional({
    enum: PAYMENT_SORT_FIELDS,
    description:
      'Column to sort by. Omit for most recent payments first. Ties fall back to payment_id.',
  })
  sortBy?: PaymentSortField;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(SORT_ORDERS, { message: 'sortOrder must be asc or desc.' })
  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    default: 'asc',
    description: 'Sort direction for sortBy. Ignored when sortBy is omitted.',
  })
  sortOrder?: SortOrder;
}
