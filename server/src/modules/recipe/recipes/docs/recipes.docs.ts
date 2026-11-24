import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const recipeExample = {
  recipe_id: '00000000-0000-4000-8000-000000000010',
  brand_id: '00000000-0000-4000-8000-000000000001',
  code: 'RCP-GC-KIMCHI-FRIED-RICE',
  name: 'Kimchi Fried Rice',
  version: 1,
  is_active: true,
  created_at: '2026-10-31T08:00:00.000Z',
  modified_at: '2026-10-31T08:00:00.000Z',
};

export function RecipesDocs() {
  return applyDecorators(
    ApiTags('Recipes'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description: 'Cashier staff cannot read recipes.',
    }),
  );
}

export function FindManyRecipesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List recipes (all roles except cashier staff).',
      description:
        'Supports page, limit, status (active by default, inactive, or all), search on code and name, brand_id, sortBy, and sortOrder. Formulation notes are only included for recipe managers and superadmins.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated recipes in data. meta holds page, limit, total, totalPages, and counts of all, active, and inactive recipes matching the filters.',
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'One matching recipe',
              value: {
                data: [recipeExample],
                meta: {
                  page: 1,
                  limit: 10,
                  total: 1,
                  totalPages: 1,
                  counts: { all: 1, active: 1, inactive: 0 },
                },
              },
            },
            empty: {
              summary: 'No matching recipes',
              value: {
                data: [],
                meta: {
                  page: 1,
                  limit: 10,
                  total: 0,
                  totalPages: 0,
                  counts: { all: 0, active: 0, inactive: 0 },
                },
              },
            },
          },
        },
      },
    }),
  );
}

export function FindOneRecipeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a recipe (all roles except cashier staff).',
      description:
        'Returns the recipe whether it is active or inactive. Formulation notes are only included for recipe managers and superadmins.',
    }),
    ApiParam({
      name: 'id',
      schema: { type: 'string', format: 'uuid' },
      description: 'Recipe ID.',
    }),
    ApiResponse({
      status: 200,
      description: 'The recipe.',
      content: { 'application/json': { example: recipeExample } },
    }),
    ApiResponse({ status: 404, description: 'Recipe not found.' }),
  );
}
