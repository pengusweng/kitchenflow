import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRecipeDTO {
  @IsUUID('all', { message: 'Brand ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Active brand that owns the recipe.',
  })
  brand_id!: string;

  @IsString({ message: 'Code must be a string.' })
  @IsNotEmpty({ message: 'Code is required and cannot be empty.' })
  @MaxLength(64, { message: 'Code must be at most 64 characters long.' })
  @ApiProperty({
    minLength: 1,
    maxLength: 64,
    description: 'Unique client-supplied recipe code.',
    example: 'RCP-GC-KIMCHI-FRIED-RICE',
  })
  code!: string;

  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required and cannot be empty.' })
  @MaxLength(150, { message: 'Name must be at most 150 characters long.' })
  @ApiProperty({
    minLength: 1,
    maxLength: 150,
    description: 'Recipe display name.',
    example: 'Kimchi Fried Rice',
  })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Formulation notes must be a string.' })
  @MaxLength(5000, {
    message: 'Formulation notes must be at most 5000 characters long.',
  })
  @ApiPropertyOptional({
    type: String,
    maxLength: 5000,
    nullable: true,
    description: 'Restricted formulation notes.',
  })
  formulation_notes?: string | null;
}
