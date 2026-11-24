import { Prisma } from '@prisma/client';
import { safeMenuProjection } from './safe-menu.interceptor';

describe('Safe MENU projection', () => {
  it('UT-SAFE-001: drops entire confidential relations and unknown fields at every nesting level', () => {
    const recipe = {
      instructions: 'secret',
      notes: 'private',
      components: [{ quantity: 15 }],
    };
    expect(
      safeMenuProjection({
        data: [
          {
            menu_item_id: 'menu',
            recipe_id: 'recipe',
            recipe,
            recipe_snapshot: recipe,
            recipe_components_recipe: recipe.components,
            instructions: 'secret',
            notes: 'private',
            expected_output_quantity: 20,
            future_secret: 'private',
            modifier: {
              modifier_id: 'modifier',
              name: 'Extra',
              inventory_item_id: 'ingredient',
              quantity: 10,
            },
            menu_item: { name: 'Nested menu', recipe },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    ).toEqual({
      data: [
        {
          menu_item_id: 'menu',
          recipe_id: 'recipe',
          modifier: { modifier_id: 'modifier', name: 'Extra' },
          menu_item: { name: 'Nested menu' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('UT-SAFE-002: preserves prices, timestamps, nulls and availability', () => {
    const value = {
      base_price: new Prisma.Decimal('10.50'),
      created_at: new Date(),
      description: null,
      is_available: false,
    };
    expect(safeMenuProjection(value)).toEqual(value);
    expect(safeMenuProjection({ name: { instructions: 'hidden' } })).toEqual(
      {},
    );
  });

  it('UT-SAFE-003: preserves list status counts and modifier usage without the recipe', () => {
    const counts = { all: 3, active: 2, inactive: 1 };
    const menuItem = {
      menu_item_id: 'menu',
      name: 'Bibimbap',
      is_active: true,
    };
    expect(
      safeMenuProjection({
        data: [
          { modifier_id: 'a', _count: { menu_item_modifiers_modifier: 6 } },
          {
            modifier_id: 'b',
            menu_item_modifiers_modifier: [
              {
                menu_item_modifier_id: 'link',
                additional_price: '35',
                menu_item: { ...menuItem, recipe: { notes: 'private' } },
              },
            ],
          },
        ],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1, counts },
      }),
    ).toEqual({
      data: [
        { modifier_id: 'a', _count: { menu_item_modifiers_modifier: 6 } },
        {
          modifier_id: 'b',
          menu_item_modifiers_modifier: [
            {
              menu_item_modifier_id: 'link',
              additional_price: '35',
              menu_item: menuItem,
            },
          ],
        },
      ],
      meta: { page: 1, limit: 10, total: 2, totalPages: 1, counts },
    });
  });
});
