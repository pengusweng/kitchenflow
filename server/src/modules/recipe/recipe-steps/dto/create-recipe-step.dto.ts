import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecipeStepDTO {
  @IsInt({ message: 'Step number must be an integer.' })
  @Min(1, { message: 'Step number must be at least 1.' })
  @Max(2_147_483_647, { message: 'Step number must be at most 2147483647.' })
  @ApiProperty({
    minimum: 1,
    maximum: 2_147_483_647,
    description: 'Position of the step in the recipe. Unique per recipe.',
    example: 1,
  })
  step_no!: number;

  @IsString({ message: 'Instruction must be a string.' })
  @IsNotEmpty({ message: 'Instruction is required and cannot be empty.' })
  @MaxLength(2000, {
    message: 'Instruction must be at most 2000 characters long.',
  })
  @ApiProperty({
    minLength: 1,
    maxLength: 2000,
    description: 'What to do in this step.',
    example: 'Stir-fry the kimchi for 2 minutes.',
  })
  instruction!: string;
}
