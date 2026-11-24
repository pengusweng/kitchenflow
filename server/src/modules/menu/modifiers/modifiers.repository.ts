import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateModifierDTO } from './dto/create-modifier.dto';
import { Prisma } from '@prisma/client';
import { UpdateModifierDTO } from './dto/update-modifier.dto';
import {
  FindAllModifiersDTO,
  type ModifierSortField,
} from './dto/find-all-modifiers.dto';
import { type SortOrder } from '../../users/dto/find-users.dto';

type ModifierUniqueKey = { modifier_id: string } | { code: string };

@Injectable()
export class ModifiersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createModifier(
    dto: CreateModifierDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.modifier.create({
      data: dto,
    });
  }

  async findOne(
    key: ModifierUniqueKey,
    activeOnly = true,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.modifier.findUnique({
      where: {
        ...key,
        is_active: activeOnly ? true : undefined,
      },
    });
  }

  async findAll(
    skip: number,
    take: number,
    {
      status,
      search,
      brand_id,
      sortBy,
      sortOrder,
    }: Pick<
      FindAllModifiersDTO,
      'status' | 'search' | 'brand_id' | 'sortBy' | 'sortOrder'
    >,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const matchesFilters: Prisma.ModifierWhereInput = {
      ...this.searchWhere(search),
      ...(brand_id
        ? {
            menu_item_modifiers_modifier: { some: { menu_item: { brand_id } } },
          }
        : {}),
    };
    const where: Prisma.ModifierWhereInput = {
      ...matchesFilters,
      is_active: status === 'all' ? undefined : status === 'active',
    };

    const modifiersQuery = tx.modifier.findMany({
      where,
      skip,
      take,
      orderBy: this.orderBy(sortBy, sortOrder),
      // How many menu items offer each one, for the list's usage column.
      include: { _count: { select: { menu_item_modifiers_modifier: true } } },
    });
    // Per-status counts honour the search and brand but not the status filter,
    // so a client can label every status tab from a single response.
    const activeQuery = tx.modifier.count({
      where: { ...matchesFilters, is_active: true },
    });
    const inactiveQuery = tx.modifier.count({
      where: { ...matchesFilters, is_active: false },
    });

    const [modifiers, active, inactive] =
      '$transaction' in tx
        ? await tx.$transaction([modifiersQuery, activeQuery, inactiveQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([modifiersQuery, activeQuery, inactiveQuery]);

    return { modifiers, counts: { all: active + inactive, active, inactive } };
  }

  // Newest first by default. Every sort ends in modifier_id so pages never
  // overlap or skip rows when the sorted values tie.
  private orderBy(
    sortBy?: ModifierSortField,
    sortOrder: SortOrder = 'asc',
  ): Prisma.ModifierOrderByWithRelationInput[] {
    const primary: Record<
      ModifierSortField,
      Prisma.ModifierOrderByWithRelationInput[]
    > = {
      name: [{ name: sortOrder }],
      code: [{ code: sortOrder }],
      created_at: [{ created_at: sortOrder }, { name: 'asc' }],
      modified_at: [{ modified_at: sortOrder }, { name: 'asc' }],
    };
    return [
      ...(sortBy ? primary[sortBy] : [{ created_at: 'desc' as const }]),
      { modifier_id: 'asc' },
    ];
  }

  // Every whitespace-separated term must match the code or name, so
  // "extra rice" finds "Extra garlic rice".
  private searchWhere(search?: string): Prisma.ModifierWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: (['code', 'name'] as const).map((field) => ({
          [field]: { contains: term, mode: 'insensitive' },
        })),
      })),
    };
  }

  /**
   * The menu items that offer the modifier, with each item's price and
   * availability for it. Only menu-safe item fields; never the recipe.
   */
  async findUses(
    modifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.findMany({
      where: { modifier_id: modifierId },
      select: {
        menu_item_modifier_id: true,
        additional_price: true,
        menu_item: {
          select: {
            menu_item_id: true,
            brand_id: true,
            code: true,
            name: true,
            is_active: true,
          },
        },
      },
      orderBy: [
        { menu_item: { name: 'asc' } },
        { menu_item_modifier_id: 'asc' },
      ],
    });
  }

  async updateModifier(
    modifierId: string,
    dto: UpdateModifierDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.modifier.update({
      where: {
        modifier_id: modifierId,
        is_active: true,
      },
      data: {
        ...dto,
        modified_at: new Date(),
      },
    });
  }

  async reactivateModifier(
    modifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.modifier.update({
      where: {
        modifier_id: modifierId,
        is_active: false,
      },
      data: {
        is_active: true,
        modified_at: new Date(),
      },
    });
  }

  async deleteModifier(
    modifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.modifier.update({
      where: {
        modifier_id: modifierId,
        is_active: true,
      },
      data: {
        is_active: false,
        modified_at: new Date(),
      },
    });
  }
}
