import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { OrderChannel, Prisma, UserRole } from '@prisma/client';
import { seedDatabase } from './seed';
import {
  TEST_USERS,
  TEST_UNASSIGNED_OWNER,
  TEST_PIN,
  TEST_PIN_ROLES,
  seedUsers,
} from './seed-test';
import * as argon2 from 'argon2';

async function checkHostedCredentials() {
  const keys = ['NODE_ENV', 'DEMO_SEED_PASSWORD', 'DEMO_SEED_PIN'] as const;
  const previous = keys.map((key) => process.env[key]);
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_SEED_PASSWORD;
    delete process.env.DEMO_SEED_PIN;
    const unusedDatabase = {} as Prisma.TransactionClient;
    await assert.rejects(seedUsers(unusedDatabase), /requires DEMO_SEED/);

    const password = randomUUID();
    process.env.DEMO_SEED_PASSWORD = password;
    await assert.rejects(seedUsers(unusedDatabase), /requires DEMO_SEED/);
    process.env.DEMO_SEED_PIN = 'invalid';
    await assert.rejects(seedUsers(unusedDatabase), /exactly four digits/);

    process.env.DEMO_SEED_PIN = '9876';
    const stop = new Error('Stop after checking the first seeded credential');
    const database = {
      user: {
        upsert: async (args: Prisma.UserUpsertArgs) => {
          assert(await argon2.verify(args.create.password_hash, password));
          assert.deepEqual(args.update, {});
          return { user_id: randomUUID(), role: UserRole.SUPERADMIN };
        },
      },
      userPinCredential: {
        upsert: async (args: Prisma.UserPinCredentialUpsertArgs) => {
          assert(await argon2.verify(args.create.pin_hash, '9876'));
          assert.deepEqual(args.update, {});
          throw stop;
        },
      },
    } as unknown as Prisma.TransactionClient;
    await assert.rejects(seedUsers(database), (error) => error === stop);
    console.log('Hosted seed credential checks passed.');
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
}

async function check() {
  await checkHostedCredentials();
  assert.match(
    TEST_PIN,
    /^[0-9]{4}$/,
    'Seed PIN must contain exactly four digits',
  );
  const brands = new Map();
  const users = new Map();
  const pinCredentials = new Map();
  const units = new Map();
  const recipes = new Map();
  const recipeIngredients = new Map();
  const recipeSteps = new Map();
  const menuItems = new Map();
  const menuItemChannels = new Map();
  const modifiers = new Map();
  const menuItemModifiers = new Map();

  function upsert(rows: Map<string, any>, key: string, args: any, id: string) {
    assert.deepEqual(args.update, {}, 'Seeding must preserve existing records');
    const previous = rows.get(key);
    const row = previous
      ? { ...previous, ...args.update }
      : { [id]: randomUUID(), is_active: true, ...args.create };
    rows.set(key, row);
    return row;
  }

  const database = {
    userPinCredential: {
      upsert: async (args: Prisma.UserPinCredentialUpsertArgs) => {
        assert.deepEqual(args.update, {});
        const userId = args.where.user_id!;
        assert.equal(args.create.user_id, userId);
        const user = [...users.values()].find((row) => row.user_id === userId);
        assert(user);
        assert(TEST_PIN_ROLES.has(user.role));
        if (!pinCredentials.has(userId)) {
          pinCredentials.set(userId, {
            failed_attempts: 0,
            locked_until: null,
            ...args.create,
          });
        }
        return pinCredentials.get(userId);
      },
    },
    modifier: {
      upsert: async (args: Prisma.ModifierUpsertArgs) => {
        return upsert(modifiers, args.where.code!, args, 'modifier_id');
      },
    },
    menuItemModifier: {
      upsert: async (args: Prisma.MenuItemModifierUpsertArgs) => {
        const { menu_item_id, modifier_id } =
          args.where.menu_item_id_modifier_id!;
        assert(
          [...menuItems.values()].some(
            (item) => item.menu_item_id === menu_item_id,
          ),
        );
        assert(
          [...modifiers.values()].some(
            (modifier) => modifier.modifier_id === modifier_id,
          ),
        );
        assert(Number(args.create.additional_price) >= 0);
        assert.equal(args.create.menu_item_modifier_id, undefined);
        return upsert(
          menuItemModifiers,
          `${menu_item_id}:${modifier_id}`,
          args,
          'menu_item_modifier_id',
        );
      },
    },
    menuItemChannel: {
      upsert: async (args: Prisma.MenuItemChannelUpsertArgs) => {
        const { menu_item_id, order_channel } =
          args.where.menu_item_id_order_channel!;
        const item = [...menuItems.values()].find(
          (row) => row.menu_item_id === menu_item_id,
        );
        assert(item);
        assert(
          order_channel === OrderChannel.GRABFOOD ||
            order_channel === OrderChannel.FOODPANDA,
        );
        assert(Number(args.create.price) > item.base_price);
        return upsert(
          menuItemChannels,
          `${menu_item_id}:${order_channel}`,
          args,
          'menu_item_channel_id',
        );
      },
    },
    menuItem: {
      upsert: async (args: Prisma.MenuItemUpsertArgs) => {
        const recipe = [...recipes.values()].find(
          (row) => row.recipe_id === args.create.recipe_id,
        );
        assert(recipe);
        assert.equal(recipe.brand_id, args.create.brand_id);
        return upsert(menuItems, args.where.code!, args, 'menu_item_id');
      },
    },
    user: {
      upsert: async (args: Prisma.UserUpsertArgs) =>
        upsert(users, args.where.username!, args, 'user_id'),
    },
    brand: {
      upsert: async (args: Prisma.BrandUpsertArgs) =>
        upsert(brands, args.where.code!, args, 'brand_id'),
    },
    recipe: {
      upsert: async (args: Prisma.RecipeUpsertArgs) => {
        assert(
          [...brands.values()].some(
            (brand) => brand.brand_id === args.create.brand_id,
          ),
        );
        return upsert(recipes, args.where.code!, args, 'recipe_id');
      },
    },
    unit: {
      upsert: async (args: Prisma.UnitUpsertArgs) => {
        assert(Number(args.create.to_base) > 0);
        return upsert(units, args.where.code!, args, 'code');
      },
    },
    recipeIngredient: {
      count: async (args: Prisma.RecipeIngredientCountArgs) =>
        [...recipeIngredients.values()].filter(
          (row) => row.recipe_id === args.where!.recipe_id,
        ).length,
      createMany: async (args: Prisma.RecipeIngredientCreateManyArgs) => {
        const rows = [args.data].flat();
        assert(rows.length > 0, 'Every seed recipe needs ingredients');
        for (const row of rows) {
          assert(
            [...recipes.values()].some((r) => r.recipe_id === row.recipe_id),
          );
          assert(units.has(row.unit_code), `Unknown unit ${row.unit_code}`);
          assert(Number(row.quantity) > 0);
          const id = randomUUID();
          recipeIngredients.set(id, { recipe_ingredient_id: id, ...row });
        }
        return { count: rows.length };
      },
    },
    recipeStep: {
      count: async (args: Prisma.RecipeStepCountArgs) =>
        [...recipeSteps.values()].filter(
          (row) => row.recipe_id === args.where!.recipe_id,
        ).length,
      createMany: async (args: Prisma.RecipeStepCreateManyArgs) => {
        const rows = [args.data].flat();
        assert(rows.length > 0, 'Every seed recipe needs steps');
        rows.forEach((row, index) => {
          assert(
            [...recipes.values()].some((r) => r.recipe_id === row.recipe_id),
          );
          assert.equal(row.step_no, index + 1);
          assert(row.instruction.length > 0);
          const key = `${row.recipe_id}:${row.step_no}`;
          assert(!recipeSteps.has(key), `Duplicate step ${key}`);
          recipeSteps.set(key, row);
        });
        return { count: rows.length };
      },
    },
  } as unknown as Prisma.TransactionClient;

  await seedDatabase(database);
  assert.equal(brands.size, 3);
  assert.equal(users.size, 17);
  assert.equal(pinCredentials.size, 1);
  for (const user of [...TEST_USERS, TEST_UNASSIGNED_OWNER]) {
    assert(
      user.username.length <= 16,
      `Seed username exceeds 16 characters: ${user.username}`,
    );
    const saved = users.get(user.username);
    assert.equal(saved.role, user.role);
    const credential = pinCredentials.get(saved.user_id);
    if (TEST_PIN_ROLES.has(user.role)) {
      assert(credential, `Missing PIN for ${user.username}`);
      assert.notEqual(credential.pin_hash, TEST_PIN);
      assert(await argon2.verify(credential.pin_hash, TEST_PIN));
      assert.equal(credential.failed_attempts, 0);
      assert.equal(credential.locked_until, null);
    } else {
      assert.equal(credential, undefined);
    }
    assert(await argon2.verify(saved.password_hash, user.password));
    assert.equal(saved.password, undefined);
    assert.equal(saved.brand_code, undefined);
    assert.equal(saved.brand_id, undefined);
  }
  assert.equal(units.size, 7);
  assert.equal(recipes.size, 16);
  assert.equal(recipeIngredients.size, 60);
  assert.equal(recipeSteps.size, 34);
  for (const recipe of recipes.values()) {
    assert(
      [...recipeIngredients.values()].some(
        (row) => row.recipe_id === recipe.recipe_id,
      ),
    );
    assert(
      [...recipeSteps.values()].some(
        (row) => row.recipe_id === recipe.recipe_id,
      ),
    );
  }
  assert.equal(menuItems.size, 25);
  assert([...menuItems.values()].every((row) => row.is_available === true));
  assert.equal(menuItemChannels.size, 50);
  assert.equal(modifiers.size, 14);
  assert.equal(menuItemModifiers.size, 34);
  assert.equal(
    new Set(
      [...menuItemModifiers.values()].map((row) => row.menu_item_modifier_id),
    ).size,
    34,
  );
  const noOnions = modifiers.get('MOD-NO-ONIONS');
  assert.equal(noOnions.inventory_item_id, undefined);
  assert.equal(noOnions.quantity, undefined);
  for (const item of menuItems.values()) {
    assert(
      menuItemChannels.has(`${item.menu_item_id}:${OrderChannel.GRABFOOD}`),
    );
    assert(
      menuItemChannels.has(`${item.menu_item_id}:${OrderChannel.FOODPANDA}`),
    );
  }
  assert.equal(
    menuItemChannels.get(
      `${menuItems.get('AI-BATCHOY-SPECIAL').menu_item_id}:${OrderChannel.GRABFOOD}`,
    ).is_available,
    false,
  );
  assert.equal(menuItems.get('GC-MANGO-BINGSU').is_active, false);
  for (const [code, count] of [
    ['GC', 9],
    ['AI', 8],
    ['KK', 8],
  ] as const) {
    assert.equal(
      [...menuItems.values()].filter(
        (item) => item.brand_id === brands.get(code).brand_id,
      ).length,
      count,
    );
  }
  for (const [code, count] of [
    ['GC', 6],
    ['AI', 5],
    ['KK', 5],
  ] as const) {
    const brandId = brands.get(code).brand_id;
    assert.equal(
      [...recipes.values()].filter((recipe) => recipe.brand_id === brandId)
        .length,
      count,
    );
  }
  assert(
    [...recipes.values()].every(
      (recipe) =>
        recipe.type === undefined &&
        recipe.output_inventory_item_id === undefined,
    ),
  );

  const firstRecipe = recipes.get('RCP-AI-PAA-INASAL');
  firstRecipe.is_active = false;
  firstRecipe.formulation_notes = 'Existing formulation notes';
  const firstRecipeId = firstRecipe.recipe_id;
  // Simulate an edit that removed all but one ingredient and step.
  const firstRecipeIngredients = [...recipeIngredients.entries()].filter(
    ([, row]) => row.recipe_id === firstRecipeId,
  );
  firstRecipeIngredients[0][1].quantity = 999;
  firstRecipeIngredients
    .slice(1)
    .forEach(([key]) => recipeIngredients.delete(key));
  recipeSteps.delete(`${firstRecipeId}:2`);
  recipeSteps.get(`${firstRecipeId}:1`).instruction = 'Existing step';
  units.get('tbsp').to_base = 14.787;
  brands.get('GC').name = 'Existing brand';
  const staff = users.get('test_inventory');
  staff.password_hash = await argon2.hash('ChangedPassword123!');
  staff.is_active = false;
  const existingPin = pinCredentials.get(users.get('test_superadmin').user_id);
  existingPin.pin_hash = await argon2.hash('0432');
  existingPin.failed_attempts = 4;
  existingPin.locked_until = new Date('2030-01-01T00:00:00Z');
  modifiers.get('MOD-EXTRA-RICE').name = 'Existing extra rice';
  modifiers.get('MOD-EXTRA-RICE').is_active = false;
  [...menuItemModifiers.values()][0].additional_price = 99;
  const firstChannel = [...menuItemChannels.values()][0];
  firstChannel.is_available = false;
  firstChannel.price = 0;
  menuItems.get('GC-KIMCHI-FRIED-RICE').is_active = false;
  menuItems.get('GC-KIMCHI-FRIED-RICE').is_available = false;
  menuItems.get('GC-KIMCHI-FRIED-RICE').base_price = 100;
  const tables = [
    brands,
    users,
    pinCredentials,
    units,
    recipes,
    recipeIngredients,
    recipeSteps,
    menuItems,
    menuItemChannels,
    modifiers,
    menuItemModifiers,
  ];
  const snapshot = structuredClone(tables.map((rows) => [...rows.entries()]));
  await seedDatabase(database);
  assert.deepEqual(
    tables.map((rows) => [...rows.entries()]),
    snapshot,
  );
  assert(
    await argon2.verify(
      users.get('test_inventory').password_hash,
      'ChangedPassword123!',
    ),
  );

  users.delete('test_ai_kitchen');
  const missingPinUserId = users.get('test_superadmin').user_id;
  pinCredentials.delete(missingPinUserId);
  recipes.delete('RCP-AI-PAA-INASAL');
  // Mirror the onDelete: Cascade on recipe ingredients and steps.
  for (const rows of [recipeIngredients, recipeSteps]) {
    for (const [key, row] of rows) {
      if (row.recipe_id === firstRecipeId) rows.delete(key);
    }
  }
  units.delete('pc');
  const firstAssignmentKey = menuItemModifiers.keys().next().value!;
  menuItemModifiers.delete(firstAssignmentKey);
  await seedDatabase(database);
  assert.equal(users.size, 17);
  assert.equal(pinCredentials.size, 1);
  assert(
    await argon2.verify(
      pinCredentials.get(missingPinUserId).pin_hash,
      TEST_PIN,
    ),
  );
  assert(await argon2.verify(existingPin.pin_hash, '0432'));
  assert.equal(existingPin.failed_attempts, 4);
  assert.equal(
    existingPin.locked_until.toISOString(),
    '2030-01-01T00:00:00.000Z',
  );
  assert.equal(users.get('test_ai_kitchen').brand_id, undefined);
  assert.equal(recipes.size, 16);
  assert(recipes.has('RCP-AI-PAA-INASAL'));
  assert.equal(units.size, 7);
  assert.equal(units.get('tbsp').to_base, 14.787);
  assert.equal(recipeIngredients.size, 60);
  assert.equal(recipeSteps.size, 34);
  assert.equal(menuItemModifiers.size, 34);
  assert(menuItemModifiers.has(firstAssignmentKey));
  assert.equal(modifiers.get('MOD-EXTRA-RICE').is_active, false);
  assert.deepEqual(
    new Set(TEST_USERS.map((user) => user.role)),
    new Set(Object.values(UserRole)),
  );
  assert.equal(
    new Set([...TEST_USERS, TEST_UNASSIGNED_OWNER].map((user) => user.username))
      .size,
    17,
  );
  console.log(
    `Seed checks passed: ${users.size} users with shared brand access, ${menuItemChannels.size} delivery channels, ${modifiers.size} modifiers, ${menuItemModifiers.size} unique menu assignments, preserved existing records, and missing records restored.`,
  );
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
