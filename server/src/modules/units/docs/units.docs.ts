import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const unitExample = {
  code: 'kg',
  name: 'Kilogram',
  dimension: 'MASS',
  to_base: '1000',
};

const codeParam = ApiParam({
  name: 'code',
  schema: { type: 'string', maxLength: 16 },
  description: 'Unit code.',
  example: 'kg',
});

export function UnitsDocs() {
  return applyDecorators(
    ApiTags('Units'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 401, description: 'Missing or expired session.' }),
    ApiResponse({
      status: 403,
      description:
        'Cashier staff cannot read units; only recipe managers and superadmins can change them.',
    }),
  );
}

export function CreateUnitDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a unit (recipe manager, superadmin).',
      description:
        'Provide a unique code, a name, a dimension, and to_base, the multiplier into the base unit of that dimension.',
    }),
    ApiResponse({
      status: 201,
      description: 'Created unit.',
      content: { 'application/json': { example: unitExample } },
    }),
    ApiResponse({
      status: 409,
      description: 'The unit code is already taken.',
    }),
  );
}

export function FindAllUnitsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List units (all roles except cashier staff).',
      description:
        'Supports page, limit, search on code and name, and dimension. Units are ordered by dimension, then to_base, then code.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated units in data, with page, limit, total, and totalPages in meta.',
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'One matching unit',
              value: {
                data: [unitExample],
                meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
              },
            },
            empty: {
              summary: 'No matching units',
              value: {
                data: [],
                meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
              },
            },
          },
        },
      },
    }),
  );
}

export function FindOneUnitDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a unit (all roles except cashier staff).' }),
    codeParam,
    ApiResponse({
      status: 200,
      description: 'The unit.',
      content: { 'application/json': { example: unitExample } },
    }),
    ApiResponse({ status: 404, description: 'Unit not found.' }),
  );
}

export function UpdateUnitDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a unit (recipe manager, superadmin).',
      description:
        'Updates name, dimension, or to_base. Omitted fields are unchanged. The code cannot be changed.',
    }),
    codeParam,
    ApiResponse({
      status: 200,
      description: 'Updated unit.',
      content: { 'application/json': { example: unitExample } },
    }),
    ApiResponse({ status: 404, description: 'Unit not found.' }),
  );
}

export function DeleteUnitDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a unit (recipe manager, superadmin).',
      description:
        'Permanently deletes the unit. Units used by any recipe ingredient cannot be deleted.',
    }),
    codeParam,
    ApiResponse({
      status: 200,
      description: 'Deleted unit.',
      content: { 'application/json': { example: unitExample } },
    }),
    ApiResponse({ status: 404, description: 'Unit not found.' }),
    ApiResponse({
      status: 409,
      description: 'Unit is used by recipe ingredients.',
    }),
  );
}
