import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { DiscountType } from '@prisma/client';

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
}
