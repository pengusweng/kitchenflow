import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateRecipeIngredientDTO {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Ingredient name must be a string.' })
  @IsNotEmpty({ message: 'Ingredient name cannot be empty.' })
  @MaxLength(255, {
    message: 'Ingredient name must be at most 255 characters long.',
  })
  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  ingredient_name?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Quantity must be a number with at most 3 decimal places.' },
  )
  @IsPositive({ message: 'Quantity must be greater than 0.' })
  @Max(999_999_999.999, { message: 'Quantity must be at most 999999999.999.' })
  @ApiPropertyOptional({
    exclusiveMinimum: true,
    minimum: 0,
    maximum: 999_999_999.999,
  })
  quantity?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Unit code must be a string.' })
  @IsNotEmpty({ message: 'Unit code cannot be empty.' })
  @MaxLength(16, { message: 'Unit code must be at most 16 characters long.' })
  @ApiPropertyOptional({ minLength: 1, maxLength: 16 })
  unit_code?: string;

  @IsOptional()
  @IsString({ message: 'Note must be a string.' })
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Optional preparation note. Null clears it.',
  })
  note?: string | null;
}
