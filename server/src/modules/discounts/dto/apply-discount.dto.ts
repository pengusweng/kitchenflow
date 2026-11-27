import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

const MAX_DINERS = 100;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ApplyDiscountDTO {
  @IsEnum(DiscountType, {
    message: `Discount type must be one of: ${Object.values(DiscountType).join(', ')}.`,
  })
  @ApiProperty({ enum: DiscountType })
  discount_type: DiscountType;

  @Transform(trim)
  @IsString()
  @MaxLength(64)
  @Matches(/\S/, { message: 'ID number must not be blank.' })
  @ApiProperty({
    maxLength: 64,
    description: 'OSCA or PWD ID number. Trimmed.',
    example: 'OSCA-2026-001234',
  })
  id_number: string;

  @Transform(trim)
  @IsString()
  @MaxLength(255)
  @Matches(/\S/, { message: 'Holder name must not be blank.' })
  @ApiProperty({
    maxLength: 255,
    description: 'Name on the ID. Trimmed.',
    example: 'Juan Dela Cruz',
  })
  holder_name: string;

  @IsOptional()
  @IsInt({ message: 'Diners must be a whole number.' })
  @Min(1, { message: 'Diners must be at least 1.' })
  @Max(MAX_DINERS, { message: `Diners must not exceed ${MAX_DINERS}.` })
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_DINERS,
    default: 1,
    description:
      'People sharing the bill. Only the holders’ share (subtotal ÷ diners × holders) is discounted.',
    example: 4,
  })
  diners?: number;

  @IsOptional()
  @IsInt({ message: 'Holders must be a whole number.' })
  @Min(1, { message: 'Holders must be at least 1.' })
  @Max(MAX_DINERS, { message: `Holders must not exceed ${MAX_DINERS}.` })
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_DINERS,
    default: 1,
    description:
      'How many of the diners hold a senior citizen or PWD ID. Must not exceed diners.',
    example: 1,
  })
  holders?: number;
}
