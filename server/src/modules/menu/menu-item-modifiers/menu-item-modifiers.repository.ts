import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateMenuItemModifierDTO } from './dto/create-menu-item-modifier.dto';
import { UpdateMenuItemModifierDTO } from './dto/update-menu-item-modifier.dto';

@Injectable()
export class MenuItemModifiersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    menuItemId: string,
    modifiers: CreateMenuItemModifierDTO[],
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.createManyAndReturn({
      data: modifiers.map((modifier) => ({
        menu_item_id: menuItemId,
        modifier_id: modifier.modifier_id,
        additional_price: modifier.additional_price,
      })),
    });
  }

  async findOne(
    menuItemModifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.findUnique({
      where: { menu_item_modifier_id: menuItemModifierId },
    });
  }

  async findOneWithModifier(
    menuItemModifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.findUnique({
      where: { menu_item_modifier_id: menuItemModifierId },
      include: { modifier: true },
    });
  }

  async findAll(
    skip: number,
    take: number,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const itemsQuery = tx.menuItemModifier.findMany({
      skip,
      take,
      orderBy: [{ created_at: 'desc' }, { menu_item_modifier_id: 'asc' }],
    });
    const totalQuery = tx.menuItemModifier.count();

    const [menuItemModifiers, total] =
      tx === this.prisma
        ? await this.prisma.$transaction([itemsQuery, totalQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([itemsQuery, totalQuery]);

    return { menuItemModifiers, total };
  }

  async findManyForMenuItem(
    menuItemId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.findMany({
      include: { modifier: true },
      where: { menu_item_id: menuItemId },
    });
  }

  async update(
    menuItemModifierId: string,
    dto: UpdateMenuItemModifierDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.update({
      where: { menu_item_modifier_id: menuItemModifierId },
      data: {
        additional_price: dto.additional_price,
        modifier_id: dto.modifier_id,
        modified_at: new Date(),
      },
    });
  }

  async delete(
    menuItemModifierId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.menuItemModifier.delete({
      where: {
        menu_item_modifier_id: menuItemModifierId,
      },
    });
  }
}
