import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MenuItemModifiersRepository } from './menu-item-modifiers.repository';
import { MenuItemsRepository } from '../menu-items/menu-items.repository';
import { ModifiersRepository } from '../modifiers/modifiers.repository';
import { CreateMenuItemModifierDTO } from './dto/create-menu-item-modifier.dto';
import { UpdateMenuItemModifierDTO } from './dto/update-menu-item-modifier.dto';
import { FindAllMenuItemModifiersDTO } from './dto/find-all-menu-item-modifiers.dto';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { assertValidPagination } from '../../../shared/assertions/assert-valid-pagination';

@Injectable()
export class MenuItemModifiersService {
  private readonly logger = new Logger(MenuItemModifiersService.name);

  constructor(
    private readonly menuItemModifiersRepository: MenuItemModifiersRepository,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly modifiersRepository: ModifiersRepository,
  ) {}
  async createMany(
    menuItemId: string,
    modifiers: CreateMenuItemModifierDTO[],
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Creating ${modifiers.length} modifiers for menu item ${menuItemId}`,
    );

    const menuItem = await this.menuItemsRepository.findOneMenuItemByUID(
      menuItemId,
      true,
      tx,
    );

    assertExists(menuItem, 'MenuItem', menuItemId, this.logger);

    // validate each modifier
    for (const mod of modifiers) {
      const modifier = await this.modifiersRepository.findOne(
        { modifier_id: mod.modifier_id },
        true,
        tx,
      );

      assertExists(modifier, 'Modifier', mod.modifier_id, this.logger);
    }

    const menuItemModifiers = await this.menuItemModifiersRepository.createMany(
      menuItemId,
      modifiers,
      tx,
    );

    this.logger.log(`Created ${menuItemModifiers.length} for ${menuItemId}`);

    return menuItemModifiers;
  }

  async findOne(
    menuItemModifierId: string,
    activeOnly = true,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Finding menu item modifier ${menuItemModifierId}`);

    const menuItemModifier =
      await this.menuItemModifiersRepository.findOneWithModifier(
        menuItemModifierId,
        activeOnly,
        tx,
      );

    assertExists(
      menuItemModifier,
      'MenuItemModifier',
      menuItemModifierId,
      this.logger,
    );

    this.logger.log(`Found menu item modifier ${menuItemModifierId}`);
    return menuItemModifier;
  }

  async findManyForMenuItem(
    menuItemId: string,
    activeOnly = true,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Finding modifiers for menu item ${menuItemId}, activeOnly=${activeOnly}`,
    );

    const menuItem = await this.menuItemsRepository.findOneMenuItemByUID(
      menuItemId,
      true,
      tx,
    );
    assertExists(menuItem, 'MenuItem', menuItemId, this.logger);

    const menuItemModifiers =
      await this.menuItemModifiersRepository.findManyForMenuItem(
        menuItemId,
        activeOnly,
        tx,
      );

    this.logger.log(
      `Found ${menuItemModifiers.length} modifier assignments for menu item ${menuItemId}`,
    );
    return menuItemModifiers;
  }

  async findAll(
    { page, limit, activeOnly }: FindAllMenuItemModifiersDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Listing menu item modifiers: page=${page}, limit=${limit}, activeOnly=${activeOnly}`,
    );

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { menuItemModifiers, total } =
      await this.menuItemModifiersRepository.findAll(
        skip,
        limit,
        activeOnly,
        tx,
      );

    this.logger.log(
      `Listed menu item modifiers: page=${page}, returned=${menuItemModifiers.length}, total=${total}`,
    );

    return {
      data: menuItemModifiers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    menuItemModifierId: string,
    dto: UpdateMenuItemModifierDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating menu item modifier ${menuItemModifierId}`);

    const menuItemModifier = await this.menuItemModifiersRepository.findOne(
      menuItemModifierId,
      true,
      tx,
    );

    assertExists(
      menuItemModifier,
      'MenuItemModifier',
      menuItemModifierId,
      this.logger,
    );

    await this.assertActiveReferences(
      menuItemModifier.menu_item_id,
      menuItemModifier.modifier_id,
      tx,
    );

    const updated = await this.menuItemModifiersRepository.update(
      menuItemModifier.menu_item_modifier_id,
      dto,
      tx,
    );

    this.logger.log(`Updated menu item modifier ${menuItemModifierId}`);
    return updated;
  }

  async delete(menuItemModifierId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deactivating menu item modifier ${menuItemModifierId}`);

    const menuItemModifier = await this.menuItemModifiersRepository.findOne(
      menuItemModifierId,
      true,
      tx,
    );
    assertExists(
      menuItemModifier,
      'MenuItemModifier',
      menuItemModifierId,
      this.logger,
    );

    const deleted = await this.menuItemModifiersRepository.delete(
      menuItemModifier.menu_item_modifier_id,
      tx,
    );

    this.logger.log(`Deactivated menu item modifier ${menuItemModifierId}`);
    return deleted;
  }

  private async assertActiveReferences(
    menuItemId: string,
    modifierId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const menuItem = await this.menuItemsRepository.findOneMenuItemByUID(
      menuItemId,
      true,
      tx,
    );
    assertExists(menuItem, 'MenuItem', menuItemId, this.logger);

    const modifier = await this.modifiersRepository.findOne(
      { modifier_id: modifierId },
      true,
      tx,
    );
    assertExists(modifier, 'Modifier', modifierId, this.logger);
  }
}
