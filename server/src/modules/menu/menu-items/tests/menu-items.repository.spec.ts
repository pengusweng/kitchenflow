import { MenuItemsRepository } from '../menu-items.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

describe('MenuItemsRepository availability', () => {
  it.each([true, false])(
    'UT-MI-010: sets availability to %s only for an active item and preserves other fields',
    async (availability) => {
      const item = {
        menu_item_id: 'menu-id',
        is_active: true,
        is_available: availability,
      };
      const update = jest.fn().mockResolvedValue(item);
      const prisma = { menuItem: { update } };
      const repository = new MenuItemsRepository(
        prisma as unknown as PrismaService,
      );

      await expect(
        repository.updateAvailability(item.menu_item_id, availability),
      ).resolves.toBe(item);
      expect(update).toHaveBeenCalledWith({
        where: { menu_item_id: item.menu_item_id, is_active: true },
        data: { is_available: availability },
      });
    },
  );
});

describe('MenuItemsRepository listing', () => {
  function setup(counts: number[] = [0, 0]) {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn();
    counts.forEach((value) => count.mockResolvedValueOnce(value));
    const prisma = {
      menuItem: { findMany, count },
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };
    return {
      findMany,
      count,
      repository: new MenuItemsRepository(prisma as unknown as PrismaService),
    };
  }

  it('UT-MI-013: matches every search term on name or code and counts each status for the search', async () => {
    const { findMany, count, repository } = setup([4, 1]);
    const search = {
      AND: ['cheese', 'rice'].map((term) => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      })),
    };

    await expect(
      repository.findAllByBrand('brand-id', 0, 10, {
        status: 'inactive',
        search: 'cheese  rice',
      }),
    ).resolves.toEqual({
      menuItems: [],
      counts: { all: 5, active: 4, inactive: 1 },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { brand_id: 'brand-id', ...search, is_active: false },
      }),
    );
    expect(count).toHaveBeenNthCalledWith(1, {
      where: { brand_id: 'brand-id', ...search, is_active: true },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: { brand_id: 'brand-id', ...search, is_active: false },
    });
  });

  it('UT-MI-014: omits the activation filter for status all', async () => {
    const { findMany, repository } = setup();
    await repository.findAll(0, 10, { status: 'all' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { is_active: undefined } }),
    );
  });
});
