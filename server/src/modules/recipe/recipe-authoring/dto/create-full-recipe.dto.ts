import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateRecipeIngredientDTO } from '../../recipe-ingredients/dto/create-recipe-ingredient.dto';
import { CreateRecipeStepDTO } from '../../recipe-steps/dto/create-recipe-step.dto';
import { CreateRecipeDTO } from '../../recipes/dto/create-recipe.dto';

export class CreateFullRecipeDTO extends CreateRecipeDTO {
  @ApiProperty({
    type: [CreateRecipeIngredientDTO],
    minItems: 1,
    description:
      'Ingredients of the recipe. Names must be unique and unit codes must exist.',
  })
  @IsArray({ message: 'Ingredients must be an array.' })
  @ArrayNotEmpty({ message: 'Ingredients must contain at least one item.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDTO)
  ingredients!: CreateRecipeIngredientDTO[];

  @ApiProperty({
    type: [CreateRecipeStepDTO],
    minItems: 1,
    description:
      'Steps of the recipe. Step numbers must run 1, 2, 3… with no gaps.',
  })
  @IsArray({ message: 'Steps must be an array.' })
  @ArrayNotEmpty({ message: 'Steps must contain at least one step.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDTO)
  steps!: CreateRecipeStepDTO[];
}
