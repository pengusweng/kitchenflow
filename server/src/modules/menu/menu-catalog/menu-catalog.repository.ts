import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { MenuItemsRepository } from '../menu-items/menu-items.repository';
import { MenuChannelsRepository } from '../menu-channels/menu-channels.repository';
import { ModifiersRepository } from '../modifiers/modifiers.repository';
import { MenuItemModifiersRepository } from '../menu-item-modifiers/menu-item-modifiers.repository';
import { FindMenuCatalogDTO } from './dto/catalog-menu-item.dto';
import { MenuCatalogSetupDTO } from './dto/menu-catalog-setup.dto';

/** A menu item with what the menu page shows of it: recipe, channel overrides and add-ons. */
const ENTRY_INCLUDE = {
  recipe: { select: { recipe_id: true, name: true, is_active: true } },
  menu_item_channels_menu_item: { orderBy: { order_channel: 'asc' } },
  menu_item_modifiers_menu_item: {
    include: { modifier: true },
    orderBy: { modifier: { name: 'asc' } },
  },
} satisfies Prisma.MenuItemInclude;

type EntryRow = Prisma.MenuItemGetPayload<{ include: typeof ENTRY_INCLUDE }>;

// Same child names as the brand catalog, so every catalog response reads alike.
function toEntry({
  menu_item_channels_menu_item: menuChannels,
  menu_item_modifiers_menu_item: menuItemModifiers,
  ...menuItem
}: EntryRow) {
  return { ...menuItem, menuChannels, menuItemModifiers };
}

export type CatalogEntry = ReturnType<typeof toEntry>;

@Injectable()
export class MenuCatalogRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly menuChannelsRepository: MenuChannelsRepository,
    private readonly modifiersRepository: ModifiersRepository,
    private readonly menuItemsModifiersRepository: MenuItemModifiersRepository,
  ) {}

  async create(dto: MenuCatalogSetupDTO, tx?: Prisma.TransactionClient) {
    return this.inTransaction(tx, async (tx) => {
      const menuItem = await this.menuItemsRepository.createMenuItem(
        dto.menu_item,
        tx,
      );

      for (const channel of dto.menu_channel) {
        await this.menuChannelsRepository.create(
          { ...channel, menu_item_id: menuItem.menu_item_id },
          tx,
        );
      }

      if (dto.menu_item_modifier.length > 0) {
        await this.menuItemsModifiersRepository.createMany(
          menuItem.menu_item_id,
          dto.menu_item_modifier,
          tx,
        );
      }

      return this.findEntry(menuItem.menu_item_id, tx);
    });
  }

  /** One menu item, active or not, with its recipe, channels and add-ons. */
  async findEntry(
    menuItemId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<CatalogEntry> {
    const row = await tx.menuItem.findUnique({
      where: { menu_item_id: menuItemId },
      include: ENTRY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'MenuItem not found.',
      });
    }
    return toEntry(row);
  }

  /**
   * One page of every brand's menu, brand then name order, plus item counts
   * per brand and availability. The counts honour search and status but not
   * the brand or availability filters (availability counts do honour the
   * brand), so each filter chip can say what picking it would show.
   */
  async findCatalog(
    { brand_id, status, availability, search }: FindMenuCatalogDTO,
    skip: number,
    take: number,
    tx?: Prisma.TransactionClient,
  ) {
    const base: Prisma.MenuItemWhereInput = {
      ...(status === 'all' ? {} : { is_active: status === 'active' }),
      ...this.menuItemsRepository.searchWhere(search),
    };
    const where: Prisma.MenuItemWhereInput = {
      ...base,
      ...(brand_id ? { brand_id } : {}),
      ...(availability === 'all'
        ? {}
        : { is_available: availability === 'available' }),
    };

    return this.inTransaction(tx, async (tx) => {
      const rows = await tx.menuItem.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [
          { brand: { name: 'asc' } },
          { name: 'asc' },
          { menu_item_id: 'asc' },
        ],
        skip,
        take,
      });
      const total = await tx.menuItem.count({ where });
      const groups = await tx.menuItem.groupBy({
        by: ['brand_id', 'is_available'],
        where: base,
        _count: { _all: true },
      });

      return {
        entries: rows.map(toEntry),
        total,
        groups: groups.map((group) => ({
          brand_id: group.brand_id,
          is_available: group.is_available,
          count: group._count._all,
        })),
      };
    });
  }

  async findMany(
    brandId: string,
    skip: number,
    take: number,
    search?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.inTransaction(tx, async (tx) => {
      const { menuItems, counts } =
        await this.menuItemsRepository.findAllByBrand(
          brandId,
          skip,
          take,
          { status: 'active', search },
          tx,
        );

      const items = await Promise.all(
        menuItems.map(async (menuItem) => {
          const menuChannels =
            await this.menuChannelsRepository.findManyByMenuItem(
              menuItem.menu_item_id,
              false,
              undefined,
              tx,
            );
          const menuItemModifiers =
            await this.menuItemsModifiersRepository.findManyForMenuItem(
              menuItem.menu_item_id,
              tx,
            );

          return { ...menuItem, menuChannels, menuItemModifiers };
        }),
      );

      return { menuItems: items, total: counts.active };
    });
  }

  // Joins the caller's transaction when given; otherwise opens its own.
  private inTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return tx ? fn(tx) : this.prisma.$transaction(fn);
  }
}
