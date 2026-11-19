import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRecipeIngredientDTO {
  @IsUUID('all', { message: 'Recipe ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Recipe the ingredient belongs to.',
  })
  recipe_id!: string;

  @IsString({ message: 'Ingredient name must be a string.' })
  @IsNotEmpty({ message: 'Ingredient name is required and cannot be empty.' })
  @MaxLength(255, {
    message: 'Ingredient name must be at most 255 characters long.',
  })
  @ApiProperty({
    minLength: 1,
    maxLength: 255,
    description: 'Ingredient display name.',
    example: 'Kimchi',
  })
  ingredient_name!: string;

  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Quantity must be a number with at most 3 decimal places.' },
  )
  @IsPositive({ message: 'Quantity must be greater than 0.' })
  @Max(999_999_999.999, { message: 'Quantity must be at most 999999999.999.' })
  @ApiProperty({
    exclusiveMinimum: true,
    minimum: 0,
    maximum: 999_999_999.999,
    description: 'Amount of the ingredient, in the given unit.',
    example: 150,
  })
  quantity!: number;

  @IsString({ message: 'Unit code must be a string.' })
  @IsNotEmpty({ message: 'Unit code is required and cannot be empty.' })
  @MaxLength(16, { message: 'Unit code must be at most 16 characters long.' })
  @ApiProperty({
    minLength: 1,
    maxLength: 16,
    description: 'Code of an existing unit.',
    example: 'g',
  })
  unit_code!: string;

  @IsOptional()
  @IsString({ message: 'Note must be a string.' })
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Optional preparation note.',
    example: 'Chopped',
  })
  note?: string | null;
}
