import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OrderChannel,
  Prisma,
  PrismaClient,
  UnitDimension,
} from '@prisma/client';
import { getDatabaseUrl } from '../src/database/database.config';
import { seedUsers } from './seed-test';

config({ path: ['.env', '../.env'], quiet: true });

interface SeedBrand {
  code: string;
  name: string;
  logo_url: string | null;
}

interface SeedUnit {
  code: string;
  name: string;
  dimension: UnitDimension;
  to_base: number;
}

interface SeedRecipeIngredient {
  ingredient_name: string;
  quantity: number;
  unit: string;
  note?: string;
}

interface SeedRecipe {
  code: string;
  brand_code: string;
  name: string;
  version: number;
  formulation_notes: string | null;
  is_active: boolean;
  ingredients: SeedRecipeIngredient[];
  steps: string[];
}

interface SeedMenuItem {
  code: string;
  brand_code: string;
  recipe_code: string;
  name: string;
  description: string | null;
  serving_description: string | null;
  base_price: number;
  img_url: string;
  is_available?: boolean;
  is_active: boolean;
  channels: {
    order_channel: OrderChannel;
    price: number;
    is_available: boolean;
  }[];
}

interface SeedModifier {
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface SeedMenuItemModifier {
  menu_item_code: string;
  modifier_code: string;
  additional_price: number;
  is_available?: boolean;
}

function loadSeedData() {
  const raw = readFileSync(
    join(__dirname, 'seed-data', 'kkfc-sprint1-seed-data.json'),
    'utf8',
  );
  const data = JSON.parse(raw) as {
    brands: SeedBrand[];
    units: SeedUnit[];
    recipes: SeedRecipe[];
    menu_items: SeedMenuItem[];
    modifiers: SeedModifier[];
    menu_item_modifiers: SeedMenuItemModifier[];
  };

  for (const brand of data.brands) {
    if (!/^[A-Z]{2}$/.test(brand.code)) {
      throw new Error(
        `Invalid brand code in seed data: ${JSON.stringify(brand.code)}. Expected 2 uppercase letters.`,
      );
    }
    if (!brand.name) {
      throw new Error(
        `Missing brand name in seed data for code ${brand.code}.`,
      );
    }
  }

  return data;
}

export async function seedDatabase(prisma: Prisma.TransactionClient) {
  const { brands, units, recipes, menu_items, modifiers, menu_item_modifiers } =
    loadSeedData();

  const brandIds = new Map<string, string>();
  for (const brand of brands) {
    // Create missing fixtures without replacing existing data or IDs.
    const saved = await prisma.brand.upsert({
      where: { code: brand.code },
      update: {},
      create: {
        code: brand.code,
        name: brand.name,
        logo_url: brand.logo_url,
      },
    });
    brandIds.set(brand.code, saved.brand_id);
  }

  console.log(`Seeded brands: ${brands.map((b) => b.code).join(', ')}`);
  await seedUsers(prisma);

  const unitCodes = new Set<string>();
  for (const unit of units) {
    await prisma.unit.upsert({
      where: { code: unit.code },
      update: {},
      create: unit,
    });
    unitCodes.add(unit.code);
  }
  console.log(`Seeded ${units.length} units.`);

  const recipeIds = new Map<string, { recipe_id: string; brand_id: string }>();
  let ingredientCount = 0;
  let stepCount = 0;
  for (const recipe of recipes) {
    const brand_id = brandIds.get(recipe.brand_code);
    if (!brand_id) {
      throw new Error(`Unknown brand code in seed data: ${recipe.brand_code}`);
    }
    const data = {
      code: recipe.code,
      brand_id,
      version: recipe.version,
      name: recipe.name,
      formulation_notes: recipe.formulation_notes,
    };
    const saved = await prisma.recipe.upsert({
      where: { code_version: { code: recipe.code, version: recipe.version } },
      update: {},
      create: { ...data, is_active: recipe.is_active },
    });
    recipeIds.set(recipe.code, saved);

    // Ingredients and steps are edited as a set, so only seed them when the
    // recipe has none; per-row restores would undo deliberate edits.
    const { recipe_id } = saved;
    if ((await prisma.recipeIngredient.count({ where: { recipe_id } })) === 0) {
      for (const ingredient of recipe.ingredients) {
        if (!unitCodes.has(ingredient.unit)) {
          throw new Error(
            `Unknown unit in recipe ${recipe.code}: ${ingredient.unit}`,
          );
        }
      }
      await prisma.recipeIngredient.createMany({
        data: recipe.ingredients.map((ingredient) => ({
          recipe_id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit_code: ingredient.unit,
          note: ingredient.note ?? null,
        })),
      });
      ingredientCount += recipe.ingredients.length;
    }
    if ((await prisma.recipeStep.count({ where: { recipe_id } })) === 0) {
      await prisma.recipeStep.createMany({
        data: recipe.steps.map((instruction, index) => ({
          recipe_id,
          step_no: index + 1,
          instruction,
        })),
      });
      stepCount += recipe.steps.length;
    }
  }

  console.log(
    `Seeded ${recipes.length} recipes (${ingredientCount} new ingredients, ${stepCount} new steps).`,
  );

  const menuItemIds = new Map<string, string>();
  for (const item of menu_items) {
    const brand_id = brandIds.get(item.brand_code);
    if (!brand_id) {
      throw new Error(
        `Unknown brand code in menu seed data: ${item.brand_code}`,
      );
    }
    const recipe = recipeIds.get(item.recipe_code);
    if (!recipe || recipe.brand_id !== brand_id) {
      throw new Error(
        `Menu item ${item.code} must reference a recipe in its brand: ${item.recipe_code}`,
      );
    }
    const data = {
      code: item.code,
      brand_id,
      recipe_id: recipe.recipe_id,
      name: item.name,
      description: item.description,
      serving_description: item.serving_description,
      base_price: item.base_price,
      img_url: item.img_url,
      is_available: item.is_available ?? true,
    };
    const saved = await prisma.menuItem.upsert({
      where: { code: item.code },
      update: {},
      create: { ...data, is_active: item.is_active },
    });
    menuItemIds.set(item.code, saved.menu_item_id);

    for (const channel of item.channels) {
      if (
        channel.order_channel !== OrderChannel.GRABFOOD &&
        channel.order_channel !== OrderChannel.FOODPANDA
      ) {
        continue;
      }
      if (!(channel.price > item.base_price)) {
        throw new Error(
          `Channel price must exceed base price for ${item.code}: ${channel.order_channel}`,
        );
      }
      await prisma.menuItemChannel.upsert({
        where: {
          menu_item_id_order_channel: {
            menu_item_id: saved.menu_item_id,
            order_channel: channel.order_channel,
          },
        },
        update: {},
        create: { ...channel, menu_item_id: saved.menu_item_id },
      });
    }
  }
  console.log(
    `Seeded ${menu_items.length} menu items with GrabFood and Foodpanda channel overrides.`,
  );

  const modifierIds = new Map<string, string>();
  for (const modifier of modifiers) {
    const saved = await prisma.modifier.upsert({
      where: { code: modifier.code },
      update: {},
      create: modifier,
    });
    modifierIds.set(modifier.code, saved.modifier_id);
  }

  for (const assignment of menu_item_modifiers) {
    const menu_item_id = menuItemIds.get(assignment.menu_item_code);
    const modifier_id = modifierIds.get(assignment.modifier_code);
    if (!menu_item_id || !modifier_id) {
      throw new Error(
        `Unknown menu item or modifier in seed assignment: ${assignment.menu_item_code}, ${assignment.modifier_code}`,
      );
    }
    await prisma.menuItemModifier.upsert({
      where: { menu_item_id_modifier_id: { menu_item_id, modifier_id } },
      update: {},
      create: {
        menu_item_id,
        modifier_id,
        additional_price: assignment.additional_price,
        is_available: assignment.is_available ?? true,
      },
    });
  }
  console.log(
    `Seeded ${modifiers.length} modifiers and ${menu_item_modifiers.length} menu item modifier assignments.`,
  );
}

async function main() {
  const pool = new Pool({ connectionString: getDatabaseUrl(process.env) });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.$transaction(seedDatabase, { timeout: 60_000 });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
