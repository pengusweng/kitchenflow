import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { requireTestDatabase } from '../src/shared/testing/catalog.fixture';

async function readFixture(
  path: string,
): Promise<Record<string, string> | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Record<string, string>;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function createKitchenAccount(
  prisma: Prisma.TransactionClient,
  password: string,
  passwordHash: string,
) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const kitchen = await prisma.user.create({
    data: {
      username: `kds_${suffix}`,
      first_name: 'Kitchen',
      last_name: 'Tester',
      role: 'KITCHEN_HEAD',
      password_hash: passwordHash,
    },
  });
  return {
    POS_KITCHEN_ID: kitchen.user_id,
    POS_KITCHEN_USERNAME: kitchen.username,
    POS_KITCHEN_PASSWORD: password,
  };
}

async function main() {
  requireTestDatabase();
  const database = new URL(process.env.TEST_DATABASE_URL!);
  const databaseId = `${database.host}${database.pathname}`;
  const orders = process.argv.includes('--orders');
  const path = resolve(
    __dirname,
    `../../mobile/.fixtures/${orders ? 'order' : 'pos'}-flow.json`,
  );
  const prisma = new PrismaService();
  try {
    const existing = await readFixture(path);
    if (existing && existing.POS_DATABASE !== databaseId) {
      throw new Error('Fixture belongs to a different test database.');
    }
    if (process.argv[2] === 'cleanup') {
      const fixture = existing;
      if (!fixture) return;
      await prisma.$transaction(async (tx) => {
        const orderWhere = { brand_id: fixture.POS_BRAND_ID };
        await tx.orderItemModifier.deleteMany({
          where: { order_item: { order: orderWhere } },
        });
        await tx.orderItemQcRejection.deleteMany({
          where: { order_item: { order: orderWhere } },
        });
        await tx.kitchenTicketQcAttempt.deleteMany({
          where: { kitchen_ticket: { order: orderWhere } },
        });
        await tx.handoff.deleteMany({
          where: { kitchen_ticket: { order: orderWhere } },
        });
        await tx.kitchenTicket.deleteMany({ where: { order: orderWhere } });
        await tx.orderItem.deleteMany({ where: { order: orderWhere } });
        await tx.order.deleteMany({ where: orderWhere });
        await tx.orderDailyCounter.deleteMany({ where: orderWhere });
        await tx.menuItemChannel.deleteMany({
          where: { menu_item: { brand_id: fixture.POS_BRAND_ID } },
        });
        await tx.menuItem.deleteMany({
          where: { brand_id: fixture.POS_BRAND_ID },
        });
        await tx.recipe.deleteMany({
          where: { recipe_id: fixture.POS_RECIPE_ID },
        });
        const userIds = [
          fixture.POS_USER_ID,
          fixture.POS_MANAGER_ID,
          fixture.POS_KITCHEN_ID,
        ].filter(Boolean);
        await tx.auditLog.deleteMany({ where: { actor_id: { in: userIds } } });
        await tx.userSession.deleteMany({
          where: { user_id: { in: userIds } },
        });
        await tx.userPinCredential.deleteMany({
          where: { user_id: { in: userIds } },
        });
        await tx.user.deleteMany({ where: { user_id: { in: userIds } } });
        await tx.brand.deleteMany({
          where: { brand_id: fixture.POS_BRAND_ID },
        });
      });
      await unlink(path);
      console.log('Removed only the mobile POS fixtures and their sessions.');
      return;
    }
    if (process.argv[2] !== 'prepare')
      throw new Error('Expected prepare or cleanup.');
    // The temporary database can be recreated at the same URL while its
    // manifest persists locally. Check the fixture brand before reusing it.
    const brandExists =
      existing?.POS_BRAND_ID &&
      (await prisma.brand.findUnique({
        where: { brand_id: existing.POS_BRAND_ID },
        select: { brand_id: true },
      }));
    if (existing && brandExists) {
      if (
        orders &&
        !(
          existing.POS_KITCHEN_ID &&
          existing.POS_KITCHEN_USERNAME &&
          existing.POS_KITCHEN_PASSWORD
        )
      ) {
        const password = randomBytes(18).toString('base64url');
        const kitchen = await createKitchenAccount(
          prisma,
          password,
          await argon2.hash(password),
        );
        await writeFile(
          path,
          JSON.stringify({ ...existing, ...kitchen }, null, 2),
        );
        console.log(
          'Added the kitchen account to the existing order fixtures.',
        );
      } else {
        console.log('Using existing mobile test fixtures.');
      }
      return;
    }
    const password = randomBytes(18).toString('base64url');
    const passwordHash = await argon2.hash(password);
    const suffix = randomUUID();
    const fixture = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          code: suffix.slice(0, 4).toUpperCase(),
          name: orders ? 'Order flow test brand' : 'POS flow test brand',
        },
      });
      const manager = orders
        ? await tx.user.create({
            data: {
              username: `sup_${suffix.replaceAll('-', '').slice(0, 12)}`,
              first_name: 'Order',
              last_name: 'Tester',
              role: 'SUPERVISOR',

              password_hash: passwordHash,
            },
          })
        : null;
      const user = await tx.user.create({
        data: {
          username: `pos_${suffix.replaceAll('-', '').slice(0, 12)}`,
          first_name: 'POS',
          last_name: 'Tester',
          role: 'CASHIER_STAFF',

          password_hash: passwordHash,
        },
      });
      const kitchen = orders
        ? await createKitchenAccount(tx, password, passwordHash)
        : null;
      const recipe = await tx.recipe.create({
        data: {
          brand_id: brand.brand_id,
          code: `pos-${suffix}`,
          name: 'POS test recipe',
          formulation_notes: 'Integration test fixture',
        },
      });
      const items: { menu_item_id: string }[] = [];
      for (const available of [true, false]) {
        const item = await tx.menuItem.create({
          data: {
            brand_id: brand.brand_id,
            recipe_id: recipe.recipe_id,
            code: `pos-${available}-${suffix}`,
            name: available ? 'POS flow meal' : 'POS unavailable meal',
            img_url: '',
            base_price: 100,
            is_available: available,
          },
        });
        await tx.menuItemChannel.createMany({
          data: [
            {
              menu_item_id: item.menu_item_id,
              order_channel: 'DINE_IN',
              price: 100,
            },
            {
              menu_item_id: item.menu_item_id,
              order_channel: 'TAKEAWAY',
              price: 125,
            },
            ...(orders
              ? [
                  {
                    menu_item_id: item.menu_item_id,
                    order_channel: 'GRABFOOD' as const,
                    price: 150,
                  },
                ]
              : []),
          ],
        });
        items.push(item);
      }
      return {
        ENV: 'test',
        API_URL: process.env.MOBILE_TEST_API_URL ?? 'http://10.0.2.2:3001/api',
        TEST_USERNAME: user.username,
        TEST_PASSWORD: password,
        POS_DATABASE: databaseId,
        POS_USER_ID: user.user_id,
        ...kitchen,
        ...(manager
          ? {
              POS_MANAGER_ID: manager.user_id,
              POS_MANAGER_USERNAME: manager.username,
              POS_MANAGER_PASSWORD: password,
            }
          : {}),
        POS_BRAND_ID: brand.brand_id,
        POS_RECIPE_ID: recipe.recipe_id,
        POS_MENU_ITEM_ID: items[0].menu_item_id,
        POS_UNAVAILABLE_ITEM_ID: items[1].menu_item_id,
      };
    });
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(fixture, null, 2));
    console.log(
      `Prepared isolated fixtures in mobile/.fixtures/${orders ? 'order' : 'pos'}-flow.json.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
