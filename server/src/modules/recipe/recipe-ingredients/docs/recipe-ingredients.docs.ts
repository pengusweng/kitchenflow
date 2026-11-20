import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const recipeIngredientExample = {
  recipe_ingredient_id: '00000000-0000-4000-8000-000000000020',
  recipe_id: '00000000-0000-4000-8000-000000000010',
  ingredient_name: 'Kimchi',
  quantity: '150',
  unit_code: 'g',
  note: 'Chopped',
  modified_at: '2026-11-20T08:00:00.000Z',
};

export function RecipeIngredientsDocs() {
  return applyDecorators(
    ApiTags('Recipe Ingredients'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description: 'Cashier staff cannot read recipe ingredients.',
    }),
  );
}

export function FindManyRecipeIngredientsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: "List a recipe's ingredients (all roles except cashier staff).",
      description:
        'Returns every ingredient of an active recipe, sorted by ingredient name. Not paginated.',
    }),
    ApiParam({
      name: 'recipeId',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe ID.',
    }),
    ApiResponse({
      status: 200,
      description: "The recipe's ingredients.",
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'One ingredient',
              value: [recipeIngredientExample],
            },
            empty: { summary: 'No ingredients', value: [] },
          },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Recipe not found or inactive.' }),
  );
}

export function FindOneRecipeIngredientDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a recipe ingredient (all roles except cashier staff).',
    }),
    ApiParam({
      name: 'id',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe ingredient ID.',
    }),
    ApiResponse({
      status: 200,
      description: 'The recipe ingredient.',
      content: { 'application/json': { example: recipeIngredientExample } },
    }),
    ApiResponse({ status: 404, description: 'Recipe ingredient not found.' }),
  );
}
