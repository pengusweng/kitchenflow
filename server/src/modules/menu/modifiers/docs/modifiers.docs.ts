import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const modifierExample = {
  modifier_id: '00000000-0000-4000-8000-000000000001',
  code: 'MOD-EXTRA-RICE',
  name: 'Extra rice',
  description: 'An extra serving of rice.',
  is_active: true,
  created_at: '2026-10-31T08:00:00.000Z',
  modified_at: '2026-10-31T08:00:00.000Z',
};

export function ModifiersDocs() {
  return applyDecorators(
    ApiTags('Modifiers'),
    ApiBearerAuth(),
    ApiResponse({ status: 400, description: 'Invalid parameters or payload.' }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid, or expired bearer session.',
    }),
    ApiResponse({
      status: 403,
      description: 'Only superadmins and recipe managers can access modifiers.',
    }),
  );
}

export function CreateModifierDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a modifier.',
      description: 'Creates an active modifier with a unique code and name.',
    }),
    ApiResponse({
      status: 201,
      description: 'Created modifier.',
      content: { 'application/json': { example: modifierExample } },
    }),
    ApiResponse({
      status: 409,
      description: 'Modifier code is already taken.',
    }),
  );
}

export function FindAllModifiersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List modifiers.',
      description:
        "status filters by modifier state (active by default, inactive, or all). search does a case-insensitive partial match on code and name; every space-separated term must match one of them, and a blank search is ignored. brand_id limits results to modifiers offered on at least one of that brand's menu items. sortBy (name, code, created_at, modified_at) with sortOrder (asc or desc) orders the results; without sortBy the newest modifiers come first. Each modifier carries _count.menu_item_modifiers_modifier, the number of menu items that offer it.",
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated modifiers in data. meta holds page, limit, total, and totalPages for the requested status, plus counts of all, active, and inactive modifiers matching the search and brand (counts ignore the status filter).',
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'One matching modifier',
              value: {
                data: [
                  {
                    ...modifierExample,
                    _count: { menu_item_modifiers_modifier: 6 },
                  },
                ],
                meta: {
                  page: 1,
                  limit: 10,
                  total: 1,
                  totalPages: 1,
                  counts: { all: 2, active: 1, inactive: 1 },
                },
              },
            },
            empty: {
              summary: 'No matching modifiers',
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

export function FindOneModifierDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a modifier by code or UUID.',
      description:
        "UUID-shaped identifiers are treated as modifier IDs; other identifiers are codes. activeOnly defaults to true; false permits inactive modifiers. menu_item_modifiers_modifier lists every menu item that offers the modifier, by item name, with that item's additional_price and is_available.",
    }),
    ApiParam({
      name: 'id',
      type: String,
      description: 'Modifier code or UUID.',
    }),
    ApiQuery({
      name: 'activeOnly',
      required: false,
      type: Boolean,
      schema: { default: true },
      description: 'False permits active and inactive modifiers.',
    }),
    ApiResponse({
      status: 200,
      description: 'Modifier details with the menu items that offer it.',
      content: {
        'application/json': {
          example: {
            ...modifierExample,
            menu_item_modifiers_modifier: [
              {
                menu_item_modifier_id: '00000000-0000-4000-8000-000000000002',
                additional_price: '35',
                is_available: true,
                menu_item: {
                  menu_item_id: '00000000-0000-4000-8000-000000000003',
                  brand_id: '00000000-0000-4000-8000-000000000004',
                  code: 'GC-BIBIMBAP',
                  name: 'Bibimbap',
                  is_active: true,
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Modifier not found under the activeOnly filter.',
    }),
  );
}

export function UpdateModifierDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a modifier.',
      description: 'Updates an active modifier.',
    }),
    ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } }),
    ApiResponse({
      status: 200,
      description: 'Updated modifier with its original creation timestamp.',
      content: {
        'application/json': {
          example: {
            ...modifierExample,
            name: 'Extra rice (large)',
            modified_at: '2026-10-31T09:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Modifier not found or inactive.',
    }),
    ApiResponse({
      status: 409,
      description: 'Modifier code is already taken.',
    }),
  );
}

export function ReactivateModifierDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reactivate a modifier.',
      description:
        'Reactivates an inactive modifier while preserving its existing references.',
    }),
    ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } }),
    ApiResponse({
      status: 200,
      description: 'Reactivated modifier with is_active set to true.',
      content: {
        'application/json': {
          example: {
            ...modifierExample,
            is_active: true,
            modified_at: '2026-10-31T09:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Modifier not found.' }),
    ApiResponse({ status: 409, description: 'Modifier is already active.' }),
  );
}

export function DeleteModifierDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Deactivate a modifier.',
      description:
        'Soft deletes an active modifier by setting is_active to false. Existing references are preserved.',
    }),
    ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } }),
    ApiResponse({
      status: 200,
      description: 'Preserved modifier with is_active set to false.',
      content: {
        'application/json': {
          example: {
            ...modifierExample,
            is_active: false,
            modified_at: '2026-10-31T09:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Modifier not found or inactive.',
    }),
  );
}
