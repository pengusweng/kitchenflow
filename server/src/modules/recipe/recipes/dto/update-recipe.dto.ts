import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Activation is handled separately, so is_active is not updatable here.
export class UpdateRecipeDTO {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Code must be a string.' })
  @IsNotEmpty({ message: 'Code cannot be empty.' })
  @MaxLength(64, { message: 'Code must be at most 64 characters long.' })
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 64,
    description: 'Unique client-supplied recipe code.',
  })
  code?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(150, { message: 'Name must be at most 150 characters long.' })
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Formulation notes must be a string.' })
  @MaxLength(5000, {
    message: 'Formulation notes must be at most 5000 characters long.',
  })
  @ApiPropertyOptional({
    type: String,
    maxLength: 5000,
    nullable: true,
    description: 'Restricted formulation notes. Null clears them.',
  })
  formulation_notes?: string | null;
}
