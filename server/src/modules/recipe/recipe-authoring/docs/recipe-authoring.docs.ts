import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

export function RecipeAuthoringDocs() {
  return applyDecorators(
    ApiTags('Recipes'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description: 'Only recipe managers and superadmins can author recipes.',
    }),
  );
}

export function CreateFullRecipeDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Create a recipe with its ingredients and steps, and snapshot it as v1 (recipe managers and superadmins).',
    }),
    ApiResponse({
      status: 201,
      description: 'Recipe created with its ingredients and steps.',
    }),
    ApiResponse({ status: 404, description: 'Brand not found or inactive.' }),
    ApiResponse({
      status: 409,
      description: 'Recipe code is already taken (DUPLICATE_RESOURCE).',
    }),
  );
}

export function UpdateFullRecipeDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Edit a recipe with its ingredient and step changes in one call, bump its version and snapshot it (recipe managers and superadmins). Does not delete the recipe.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Recipe ID.' }),
    ApiResponse({
      status: 200,
      description:
        'Recipe updated, returned with its ingredients and steps. Formulation notes are omitted.',
    }),
    ApiResponse({
      status: 404,
      description:
        'Recipe not found or inactive, or an ingredient or step ID does not belong to it.',
    }),
    ApiResponse({
      status: 400,
      description:
        'Invalid request, no changes sent (NO_RECIPE_CHANGES), or the edit would leave no ingredients or steps, duplicate ingredient names or step numbers, or an unknown unit.',
    }),
    ApiResponse({
      status: 409,
      description: 'Recipe code is already taken (DUPLICATE_RESOURCE).',
    }),
  );
}
