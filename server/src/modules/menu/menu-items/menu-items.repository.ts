import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateMenuItemDTO } from './dto/create-menu-item.dto';
import { UpdateMenuItemDTO } from './dto/update-menu-item.dto';
import { MenuItemStatusFilter } from './dto/find-all-menu-items.dto';

export type MenuItemListFilters = {
  status: MenuItemStatusFilter;
  search?: string;
};

@Injectable()
export class MenuItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMenuItem(
    dto: CreateMenuItemDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.create({
      data: dto,
    });
  }

  async findOneMenuItemByUID(
    menuItemId: string,
    activeOnly = true,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.findUnique({
      where: {
        menu_item_id: menuItemId,
        is_active: activeOnly ? true : undefined,
      },
    });
  }

  async findOneMenuItemByCode(
    menuCode: string,
    activeOnly = true,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.findUnique({
      where: {
        code: menuCode,
        is_active: activeOnly ? true : undefined,
      },
    });
  }

  async findAll(
    skip: number,
    take: number,
    filters: MenuItemListFilters,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return this.list(skip, take, {}, filters, undefined, tx);
  }

  async findAllByBrand(
    brandId: string,
    skip: number,
    take: number,
    filters: MenuItemListFilters,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return this.list(
      skip,
      take,
      { brand_id: brandId },
      filters,
      { recipe: { select: { is_active: true } } },
      tx,
    );
  }

  private async list<Include extends Prisma.MenuItemInclude | undefined>(
    skip: number,
    take: number,
    scope: Prisma.MenuItemWhereInput,
    { status, search }: MenuItemListFilters,
    include: Include,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    // Everything except status, which the per-status counts below vary.
    const matchesFilters: Prisma.MenuItemWhereInput = {
      ...scope,
      ...this.searchWhere(search),
    };
    const itemsQuery = tx.menuItem.findMany({
      where: {
        ...matchesFilters,
        is_active: status === 'all' ? undefined : status === 'active',
      },
      include,
      skip,
      take,
      orderBy: [{ created_at: 'desc' }, { menu_item_id: 'asc' }],
    });
    // Per-status counts honour the search but not the status filter, so a
    // client can label every status tab from a single response.
    const activeQuery = tx.menuItem.count({
      where: { ...matchesFilters, is_active: true },
    });
    const inactiveQuery = tx.menuItem.count({
      where: { ...matchesFilters, is_active: false },
    });

    const [menuItems, active, inactive] =
      '$transaction' in tx
        ? await tx.$transaction([itemsQuery, activeQuery, inactiveQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([itemsQuery, activeQuery, inactiveQuery]);

    return { menuItems, counts: { all: active + inactive, active, inactive } };
  }

  // Every whitespace-separated term must match the name or code, so
  // "cheese rice" finds "Cheesy Beef Rice".
  private searchWhere(search?: string): Prisma.MenuItemWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: (['name', 'code'] as const).map((field) => ({
          [field]: { contains: term, mode: 'insensitive' },
        })),
      })),
    };
  }

  async updateMenuItem(
    menuItemId: string,
    dto: UpdateMenuItemDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.update({
      where: {
        menu_item_id: menuItemId,
        is_active: true,
      },
      data: {
        ...dto,
        modified_at: new Date(),
      },
    });
  }

  async updateAvailability(
    menuItemId: string,
    availability: boolean,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.update({
      where: {
        menu_item_id: menuItemId,
        is_active: true,
      },
      data: {
        is_available: availability,
      },
    });
  }

  async reactivateMenuItem(
    menuItemId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.update({
      where: {
        menu_item_id: menuItemId,
        is_active: false,
      },
      data: {
        is_active: true,
        modified_at: new Date(),
      },
    });
  }

  async deleteMenuItem(
    menuItemId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItem.update({
      where: {
        menu_item_id: menuItemId,
        is_active: true,
      },
      data: {
        is_active: false,
        modified_at: new Date(),
      },
    });
  }
}
