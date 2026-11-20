import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateRecipeIngredientDTO } from '../../recipe-ingredients/dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDTO } from '../../recipe-ingredients/dto/update-recipe-ingredient.dto';
import { CreateRecipeStepDTO } from '../../recipe-steps/dto/create-recipe-step.dto';
import { UpdateRecipeStepDTO } from '../../recipe-steps/dto/update-recipe-step.dto';
import { UpdateRecipeDTO } from '../../recipes/dto/update-recipe.dto';

export class UpdateRecipeIngredientItemDTO extends UpdateRecipeIngredientDTO {
  @IsUUID('all', { message: 'Recipe ingredient ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Ingredient of this recipe to change.',
  })
  recipe_ingredient_id!: string;
}

export class UpdateRecipeStepItemDTO extends UpdateRecipeStepDTO {
  @IsUUID('all', { message: 'Recipe step ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Step of this recipe to change.',
  })
  recipe_step_id!: string;
}

export class RecipeIngredientMutationsDTO {
  @IsOptional()
  @IsArray({ message: 'Ingredients to create must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDTO)
  @ApiPropertyOptional({ type: [CreateRecipeIngredientDTO] })
  create?: CreateRecipeIngredientDTO[];

  @IsOptional()
  @IsArray({ message: 'Ingredients to update must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeIngredientItemDTO)
  @ApiPropertyOptional({ type: [UpdateRecipeIngredientItemDTO] })
  update?: UpdateRecipeIngredientItemDTO[];

  @IsOptional()
  @IsArray({ message: 'Ingredients to delete must be an array.' })
  @IsUUID('all', {
    each: true,
    message: 'Each ingredient to delete must be a valid UUID.',
  })
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'IDs of ingredients of this recipe to delete.',
  })
  delete?: string[];
}

export class RecipeStepMutationsDTO {
  @IsOptional()
  @IsArray({ message: 'Steps to create must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDTO)
  @ApiPropertyOptional({ type: [CreateRecipeStepDTO] })
  create?: CreateRecipeStepDTO[];

  @IsOptional()
  @IsArray({ message: 'Steps to update must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeStepItemDTO)
  @ApiPropertyOptional({ type: [UpdateRecipeStepItemDTO] })
  update?: UpdateRecipeStepItemDTO[];

  @IsOptional()
  @IsArray({ message: 'Steps to delete must be an array.' })
  @IsUUID('all', {
    each: true,
    message: 'Each step to delete must be a valid UUID.',
  })
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'IDs of steps of this recipe to delete.',
  })
  delete?: string[];
}

// Recipe deletion is not part of this payload; deactivation has its own route.
export class UpdateFullRecipeDTO extends UpdateRecipeDTO {
  @IsOptional()
  @IsObject({
    message:
      'Ingredients must be an object of create, update and delete lists.',
  })
  @ValidateNested()
  @Type(() => RecipeIngredientMutationsDTO)
  @ApiPropertyOptional({
    type: RecipeIngredientMutationsDTO,
    description:
      'Ingredient changes. Afterwards the recipe needs at least one ingredient, with unique names.',
  })
  ingredients?: RecipeIngredientMutationsDTO;

  @IsOptional()
  @IsObject({
    message: 'Steps must be an object of create, update and delete lists.',
  })
  @ValidateNested()
  @Type(() => RecipeStepMutationsDTO)
  @ApiPropertyOptional({
    type: RecipeStepMutationsDTO,
    description:
      'Step changes. Afterwards steps are renumbered 1, 2, 3… in the order of their step numbers, so gaps close automatically; duplicate numbers are rejected.',
  })
  steps?: RecipeStepMutationsDTO;
}
