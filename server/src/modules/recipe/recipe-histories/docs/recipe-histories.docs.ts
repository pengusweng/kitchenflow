import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const recipeHistoryExample = {
  recipe_history_id: '00000000-0000-4000-8000-000000000040',
  recipe_id: '00000000-0000-4000-8000-000000000010',
  version: 2,
  recipe_snapshot: {
    recipe_id: '00000000-0000-4000-8000-000000000010',
    brand_id: '00000000-0000-4000-8000-000000000001',
    code: 'RCP-GC-KIMCHI-FRIED-RICE',
    name: 'Kimchi Fried Rice',
    version: 2,
    is_active: true,
    formulation_notes: 'Restricted notes.',
  },
  ingredients_snapshot: [
    {
      recipe_ingredient_id: '00000000-0000-4000-8000-000000000020',
      ingredient_name: 'Kimchi',
      quantity: '150',
      unit_code: 'g',
      note: null,
    },
  ],
  steps_snapshot: [
    {
      recipe_step_id: '00000000-0000-4000-8000-000000000030',
      step_no: 1,
      instruction: 'Stir-fry the kimchi for 2 minutes.',
    },
  ],
  created_at: '2026-11-20T08:00:00.000Z',
};

export function RecipeHistoriesDocs() {
  return applyDecorators(
    ApiTags('Recipe Histories'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description:
        'Only recipe managers and superadmins can access recipe histories.',
    }),
  );
}

export function CreateRecipeHistoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Snapshot a recipe at its current version (recipe managers and superadmins).',
      description:
        'Saves the recipe, its ingredients and its steps as they are now, read in one transaction. One snapshot per recipe version.',
    }),
    ApiResponse({
      status: 201,
      description: 'The saved snapshot.',
      content: { 'application/json': { example: recipeHistoryExample } },
    }),
    ApiResponse({ status: 404, description: 'Recipe not found or inactive.' }),
    ApiResponse({
      status: 409,
      description: 'This recipe version already has a snapshot.',
    }),
  );
}

export function FindOneRecipeHistoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a recipe history (recipe managers and superadmins).',
    }),
    ApiParam({
      name: 'id',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe history ID.',
    }),
    ApiResponse({
      status: 200,
      description: 'The snapshot.',
      content: { 'application/json': { example: recipeHistoryExample } },
    }),
    ApiResponse({ status: 404, description: 'Recipe history not found.' }),
  );
}
