import { ApiProperty } from '@nestjs/swagger';
import { UnitDimension } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateUnitDTO {
  @IsString({ message: 'Code must be a string.' })
  @IsNotEmpty({ message: 'Code is required and cannot be empty.' })
  @MaxLength(16, { message: 'Code must be at most 16 characters long.' })
  @ApiProperty({
    minLength: 1,
    maxLength: 16,
    description: 'Unique client-supplied unit code.',
    example: 'kg',
  })
  code!: string;

  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required and cannot be empty.' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long.' })
  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    description: 'Unit display name.',
    example: 'Kilogram',
  })
  name!: string;

  @IsEnum(UnitDimension, {
    message: 'Dimension must be one of: MASS, VOLUME, COUNT.',
  })
  @ApiProperty({
    enum: UnitDimension,
    description: 'What the unit measures.',
    example: UnitDimension.MASS,
  })
  dimension!: UnitDimension;

  @IsNumber(
    { maxDecimalPlaces: 6 },
    { message: 'to_base must be a number with at most 6 decimal places.' },
  )
  @IsPositive({ message: 'to_base must be greater than 0.' })
  @Max(999_999_999_999, { message: 'to_base must be at most 999999999999.' })
  @ApiProperty({
    exclusiveMinimum: true,
    minimum: 0,
    maximum: 999_999_999_999,
    description:
      'Multiplier that converts one of this unit into the base unit of its dimension.',
    example: 1000,
  })
  to_base!: number;
}
