import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnitDimension } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUnitDTO {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long.' })
  @ApiPropertyOptional({ minLength: 1, maxLength: 50 })
  name?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsEnum(UnitDimension, {
    message: 'Dimension must be one of: MASS, VOLUME, COUNT.',
  })
  @ApiPropertyOptional({ enum: UnitDimension })
  dimension?: UnitDimension;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber(
    { maxDecimalPlaces: 6 },
    { message: 'to_base must be a number with at most 6 decimal places.' },
  )
  @IsPositive({ message: 'to_base must be greater than 0.' })
  @Max(999_999_999_999, { message: 'to_base must be at most 999999999999.' })
  @ApiPropertyOptional({
    exclusiveMinimum: true,
    minimum: 0,
    maximum: 999_999_999_999,
  })
  to_base?: number;
}
