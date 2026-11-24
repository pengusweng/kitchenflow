import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MenuCatalogSetupDTO } from '../dto/menu-catalog-setup.dto';
import { UpdateMenuCatalogDTO } from '../dto/update-menu-catalog.dto';

const menuItemExample = {
  menu_item_id: '00000000-0000-4000-8000-000000000001',
  brand_id: '00000000-0000-4000-8000-000000000002',
  recipe_id: '00000000-0000-4000-8000-000000000003',
  img_url: 'https://example.com/cheese-rice.jpg',
  code: 'CHEESE-RICE',
  name: 'Cheese Rice',
  description: 'Rice topped with melted cheese.',
  serving_description: 'One bowl',
  base_price: '100',
  is_available: true,
  is_active: true,
  created_at: '2026-10-30T08:00:00.000Z',
  modified_at: '2026-10-30T08:00:00.000Z',
};

const menuCatalogItemExample = {
  ...menuItemExample,
  menuChannels: [
    {
      menu_item_channel_id: '00000000-0000-4000-8000-000000000004',
      menu_item_id: menuItemExample.menu_item_id,
      order_channel: 'GRABFOOD',
      price: '120',
      is_available: true,
      created_at: menuItemExample.created_at,
      modified_at: menuItemExample.modified_at,
    },
  ],
  menuItemModifiers: [
    {
      menu_item_modifier_id: '00000000-0000-4000-8000-000000000005',
      menu_item_id: menuItemExample.menu_item_id,
      modifier_id: '00000000-0000-4000-8000-000000000006',
      additional_price: '20',
      created_at: menuItemExample.created_at,
      modified_at: menuItemExample.modified_at,
      modifier: {
        modifier_id: '00000000-0000-4000-8000-000000000006',
        code: 'EXTRA-CHEESE',
        name: 'Extra Cheese',
        description: 'An extra serving of cheese.',
        is_active: true,
        created_at: menuItemExample.created_at,
        modified_at: menuItemExample.modified_at,
      },
    },
  ],
};

// What create, update and the cross-brand list return: the item with its recipe.
const menuCatalogEntryExample = {
  ...menuCatalogItemExample,
  recipe: {
    recipe_id: menuItemExample.recipe_id,
    name: 'Cheese Rice',
    is_active: true,
  },
};

export function MenuCatalogDocs() {
  return applyDecorators(
    ApiTags('Menu catalog'),
    ApiBearerAuth(),
    ApiResponse({
      status: 400,
      description:
        'Invalid UUID, payload, or query; unsupported pagination range; or a supplied brand ID that conflicts with the resource brand.',
    }),
    ApiResponse({
      status: 401,
      description: 'Missing, invalid, or expired bearer session.',
    }),
    ApiResponse({
      status: 403,
      description: 'Role access denied.',
    }),
  );
}

export function CreateMenuCatalogDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a menu item with channels and modifiers (superadmin).',
      description:
        "Superadmins can create entries across brands. Supply menu_item with brand_id, recipe_id, img_url, a unique code, name, and base_price. img_url is an image URL, or the key POST /api/assets returned for a photo the caller uploaded. menu_channel and menu_item_modifier are required arrays; use empty arrays when none are needed. Channel entries contain order_channel, price, and optional is_available; each channel must be unique. Modifier assignments contain an existing active modifier_id and optional additional_price (default 0); each modifier_id must be unique. Child entries omit menu_item_id because it is assigned from the new item. The item, channel overrides, and assignments are created in one transaction; any failed write rolls back the creation. Returns the created menu item with its recipe (recipe_id, name, is_active), menuChannels and menuItemModifiers, including each assignment's modifier record and name. All created children are returned, including channels with is_available set to false; omitted children are represented by empty arrays.",
    }),
    ApiBody({ type: MenuCatalogSetupDTO }),
    ApiResponse({
      status: 201,
      description:
        'Created menu item with all saved channels and modifier assignments, including nested modifier details.',
      content: {
        'application/json': { example: menuCatalogEntryExample },
      },
    }),
    ApiResponse({
      status: 404,
      description:
        'Brand not found (BRAND_NOT_FOUND), a modifier is missing or inactive (MODIFIER_NOT_FOUND), or the uploaded photo is missing or was uploaded by someone else (ASSET_NOT_FOUND).',
    }),
    ApiResponse({
      status: 409,
      description:
        'Menu item code or another unique value already exists (DUPLICATE_RESOURCE).',
    }),
  );
}

export function FindAllMenuCatalogDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List a brand menu catalog with channels and modifier details.',
      description:
        'Available to all authenticated users across brands. The brand must be active. Supports page (default 1), limit (default 10, maximum 100), and search. search is a case-insensitive partial match on menu item name and code; every space-separated term must match one of them. Returns active menu items, including items that are currently unavailable. Each item includes menuChannels containing available channel overrides and menuItemModifiers containing available assignments. Each assignment includes its modifier record, including modifier.name, alongside assignment fields such as additional_price. Missing channels or assignments are returned as empty arrays. Returns data and meta containing page, limit, total, and totalPages; total counts matching menu items. Uploaded image keys are resolved to download URLs in img_url. An empty catalog returns data: [].',
    }),
    ApiParam({
      name: 'brandId',
      format: 'uuid',
      description: 'Active brand UUID.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated menu items with menuChannels and menuItemModifiers, including nested modifier details.',
      content: {
        'application/json': {
          examples: {
            populated: {
              summary: 'Menu item with a channel override and modifier',
              value: {
                data: [menuCatalogItemExample],
                meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
              },
            },
            empty: {
              summary: 'Brand with no active menu items',
              value: {
                data: [],
                meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Brand not found or inactive (BRAND_NOT_FOUND).',
    }),
  );
}

export function UpdateMenuCatalogDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Edit a menu item with its channel and modifier changes in one call (superadmin). Does not deactivate the item.',
      description:
        'Same shape as the create payload, with every part optional. menu_item holds the item fields to change; the brand cannot be changed, and img_url takes an image URL or the key of a photo the caller uploaded through POST /api/assets. menu_channel and menu_item_modifier each take create, update and delete lists. Channel create entries are new GRABFOOD or FOODPANDA overrides; update entries take menu_item_channel_id with price and/or is_available; delete removes the override entirely, so that channel can be added again. Modifier create entries assign an active modifier_id with an optional additional_price; update entries take menu_item_modifier_id with additional_price and/or a replacement modifier_id; delete removes the assignment. Each ID can be updated or deleted once per request, and every ID must belong to this menu item. Afterwards each order channel and each modifier can appear at most once. Deletes run before updates and creates, and everything runs in one transaction; any failure rolls back the whole edit. Returns the menu item with its recipe, all its menuChannels (including unavailable ones) and menuItemModifiers.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Menu item ID.' }),
    ApiBody({ type: UpdateMenuCatalogDTO }),
    ApiResponse({
      status: 200,
      description:
        'Menu item updated, returned with its channels and modifier assignments.',
      content: {
        'application/json': { example: menuCatalogEntryExample },
      },
    }),
    ApiResponse({
      status: 404,
      description:
        'Menu item not found or inactive (MENU_ITEM_NOT_FOUND); the uploaded photo is missing or was uploaded by someone else (ASSET_NOT_FOUND); a channel or modifier assignment ID does not belong to it (MENU_ITEM_CHANNEL_NOT_FOUND, MENU_ITEM_MODIFIER_NOT_FOUND); or a recipe or modifier being assigned is missing or inactive (RECIPE_NOT_FOUND, MODIFIER_NOT_FOUND).',
    }),
    ApiResponse({
      status: 400,
      description:
        'Invalid request; no changes sent (NO_MENU_CATALOG_CHANGES); an ID targeted twice (CONFLICTING_CHANNEL_MUTATIONS, CONFLICTING_MODIFIER_MUTATIONS); a non-delivery channel added (INVALID_ORDER_CHANNEL); or the edit would repeat an order channel or modifier (DUPLICATE_ORDER_CHANNEL, DUPLICATE_MENU_ITEM_MODIFIER).',
    }),
    ApiResponse({
      status: 409,
      description:
        'Menu item code or another unique value already exists (DUPLICATE_RESOURCE).',
    }),
  );
}

export function FindMenuCatalogDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List every brand menu with recipes, channels and modifiers.',
      description:
        'Available to all authenticated users; this is the menu page. Optional brand_id narrows it to one brand. status picks active (default), inactive or all items; availability picks all (default), available or unavailable. search is a case-insensitive partial match on name and code; every space-separated term must match one of them. Sorted by brand name, then item name. Each item includes its recipe (recipe_id, name, is_active), every channel override in menuChannels (including unavailable ones) and its menuItemModifiers with their modifier records. Uploaded image keys are resolved to download URLs in img_url. meta.counts.brands holds total and unavailable items per brand_id plus "all", ignoring the brand and availability filters; meta.counts.availability holds all, available and unavailable counts for the chosen brand, ignoring the availability filter. Both honour search and status.',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated menu items with filter counts.',
      content: {
        'application/json': {
          example: {
            data: [menuCatalogEntryExample],
            meta: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
              counts: {
                brands: {
                  all: { total: 1, unavailable: 0 },
                  [menuItemExample.brand_id]: { total: 1, unavailable: 0 },
                },
                availability: { all: 1, available: 1, unavailable: 0 },
              },
            },
          },
        },
      },
    }),
  );
}
