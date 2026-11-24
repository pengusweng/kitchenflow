import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateRecipeStepDTO } from './create-recipe-step.dto';

export class CreateRecipeStepsDTO {
  @ApiProperty({
    type: [CreateRecipeStepDTO],
    minItems: 1,
    description: 'Steps to add. Step numbers must run 1, 2, 3… with no gaps.',
  })
  @IsArray({ message: 'Steps must be an array.' })
  @ArrayNotEmpty({ message: 'Steps must contain at least one step.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDTO)
  steps!: CreateRecipeStepDTO[];
}
