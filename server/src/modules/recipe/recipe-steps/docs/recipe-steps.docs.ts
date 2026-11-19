import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const recipeStepExample = {
  recipe_step_id: '00000000-0000-4000-8000-000000000030',
  recipe_id: '00000000-0000-4000-8000-000000000010',
  step_no: 1,
  instruction: 'Stir-fry the kimchi for 2 minutes.',
  created_at: '2026-11-20T08:00:00.000Z',
  modified_at: '2026-11-20T08:00:00.000Z',
};

export function RecipeStepsDocs() {
  return applyDecorators(
    ApiTags('Recipe Steps'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description: 'Cashier staff cannot read recipe steps.',
    }),
  );
}

export function FindManyRecipeStepsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: "List a recipe's steps (all roles except cashier staff).",
      description:
        'Returns every step of an active recipe, sorted by step_no. Not paginated.',
    }),
    ApiParam({
      name: 'recipeId',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe ID.',
    }),
    ApiResponse({
      status: 200,
      description: "The recipe's steps.",
      content: {
        'application/json': {
          examples: {
            populated: { summary: 'One step', value: [recipeStepExample] },
            empty: { summary: 'No steps', value: [] },
          },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Recipe not found or inactive.' }),
  );
}

export function FindOneRecipeStepDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a recipe step (all roles except cashier staff).',
    }),
    ApiParam({
      name: 'id',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe step ID.',
    }),
    ApiResponse({
      status: 200,
      description: 'The recipe step.',
      content: { 'application/json': { example: recipeStepExample } },
    }),
    ApiResponse({ status: 404, description: 'Recipe step not found.' }),
  );
}
