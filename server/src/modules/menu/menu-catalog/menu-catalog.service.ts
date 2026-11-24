import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderChannel, Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { assertValidPagination } from '../../../shared/assertions/assert-valid-pagination';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { StorageService } from '../../../shared/storage/storage.service';
import { AssetsService } from '../../assets/assets.service';
import { BrandsRepository } from '../../brands/brands.repository';
import { RecipesRepository } from '../../recipe/recipes/recipes.repository';
import { MenuChannelsRepository } from '../menu-channels/menu-channels.repository';
import { MenuItemModifiersRepository } from '../menu-item-modifiers/menu-item-modifiers.repository';
import { MenuItemSearchDTO } from '../menu-items/dto/find-all-menu-items.dto';
import { MenuItemsRepository } from '../menu-items/menu-items.repository';
import { ModifiersRepository } from '../modifiers/modifiers.repository';
import { FindMenuCatalogDTO, UPLOAD_KEY } from './dto/catalog-menu-item.dto';
import { MenuCatalogSetupDTO } from './dto/menu-catalog-setup.dto';
import {
  MenuChannelMutationsDTO,
  MenuItemModifierMutationsDTO,
  UpdateMenuCatalogDTO,
} from './dto/update-menu-catalog.dto';
import { MenuCatalogRepository } from './menu-catalog.repository';

/** Internal channels always use the base price, so only delivery ones get overrides. */
const OVERRIDE_CHANNELS: OrderChannel[] = [
  OrderChannel.GRABFOOD,
  OrderChannel.FOODPANDA,
];

@Injectable()
export class MenuCatalogService {
  private readonly logger = new Logger(MenuCatalogService.name);

  constructor(
    private readonly menuCatalogRepository: MenuCatalogRepository,
    private readonly brandsRepository: BrandsRepository,
    private readonly modifiersRepository: ModifiersRepository,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly menuChannelsRepository: MenuChannelsRepository,
    private readonly menuItemModifiersRepository: MenuItemModifiersRepository,
    private readonly recipesRepository: RecipesRepository,
    private readonly assets: AssetsService,
  ) {}

  async create(
    dto: MenuCatalogSetupDTO,
    actorId: string,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Creating menu catalog entry for ${dto.menu_item.name}`);

    await this.assertOwnedImage(dto.menu_item.img_url, actorId);
    await this.assertActiveModifiers(
      dto.menu_item_modifier.map((m) => m.modifier_id),
      tx,
    );

    const menuItem = await this.menuCatalogRepository.create(dto, tx);

    this.logger.log(`Created menu catalog entry ${menuItem.menu_item_id}`);
    return this.withImageUrl(menuItem);
  }

  async findAll(
    brandId: string,
    { page, limit, search }: MenuItemSearchDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Listing menu catalog: brand=${brandId}, page=${page}, limit=${limit}, search=${search ? 'yes' : 'no'}`,
    );

    const brand = await this.brandsRepository.findOneBrand(brandId, true, tx);
    assertExists(brand, 'Brand', brandId, this.logger);

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { menuItems, total } = await this.menuCatalogRepository.findMany(
      brand.brand_id,
      skip,
      limit,
      search,
      tx,
    );

    this.logger.log(
      `Listed menu catalog: page=${page}, returned=${menuItems.length}, total=${total}`,
    );

    return {
      data: await Promise.all(
        menuItems.map((menuItem) => this.withImageUrl(menuItem)),
      ),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Every brand's menu for the menu page, with the counts its filter chips show. */
  async findCatalog(query: FindMenuCatalogDTO, tx?: Prisma.TransactionClient) {
    const { page, limit } = query;
    this.logger.debug(
      `Listing menu catalog: brand=${query.brand_id ?? 'all'}, status=${query.status}, availability=${query.availability}, page=${page}, limit=${limit}, search=${query.search ? 'yes' : 'no'}`,
    );

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { entries, total, groups } =
      await this.menuCatalogRepository.findCatalog(query, skip, limit, tx);

    const brands: Record<string, { total: number; unavailable: number }> = {
      all: { total: 0, unavailable: 0 },
    };
    const availability = { all: 0, available: 0, unavailable: 0 };
    for (const { brand_id, is_available, count } of groups) {
      for (const key of ['all', brand_id]) {
        const bucket = (brands[key] ??= { total: 0, unavailable: 0 });
        bucket.total += count;
        if (!is_available) bucket.unavailable += count;
      }
      if (query.brand_id && brand_id !== query.brand_id) continue;
      availability.all += count;
      availability[is_available ? 'available' : 'unavailable'] += count;
    }

    this.logger.log(
      `Listed menu catalog: page=${page}, returned=${entries.length}, total=${total}`,
    );
    return {
      data: await Promise.all(entries.map((entry) => this.withImageUrl(entry))),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts: { brands, availability },
      },
    };
  }

  async update(menuItemId: string, dto: UpdateMenuCatalogDTO, actorId: string) {
    this.logger.debug(`Editing menu catalog entry ${menuItemId}`);
    this.assertHasChanges(dto);
    if (dto.menu_item?.img_url !== undefined) {
      await this.assertOwnedImage(dto.menu_item.img_url, actorId);
    }

    const {
      menu_item: itemDto = {},
      menu_channel: channels = {},
      menu_item_modifier: modifiers = {},
    } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await this.menuItemsRepository.findOneMenuItemByUID(
        menuItemId,
        true,
        tx,
      );
      assertExists(current, 'MenuItem', menuItemId, this.logger);

      if (itemDto.recipe_id !== undefined) {
        const recipe = await this.recipesRepository.findOne(
          itemDto.recipe_id,
          true,
          false,
          tx,
        );
        assertExists(recipe, 'Recipe', itemDto.recipe_id, this.logger);
      }

      // Always written, so modified_at moves even when only children change.
      await this.menuItemsRepository.updateMenuItem(menuItemId, itemDto, tx);
      await this.applyChannelMutations(menuItemId, channels, tx);
      await this.applyModifierMutations(menuItemId, modifiers, tx);

      return this.menuCatalogRepository.findEntry(menuItemId, tx);
    });

    this.logger.log(`Edited menu catalog entry ${result.menu_item_id}`);
    return this.withImageUrl(result);
  }

  private async applyChannelMutations(
    menuItemId: string,
    mutations: MenuChannelMutationsDTO,
    tx: Prisma.TransactionClient,
  ) {
    const { create = [], update = [], delete: remove = [] } = mutations;
    const current = await this.menuChannelsRepository.findManyByMenuItem(
      menuItemId,
      false,
      undefined,
      tx,
    );

    const targets = [...update.map((c) => c.menu_item_channel_id), ...remove];
    this.assertDistinctTargets(targets, 'CONFLICTING_CHANNEL_MUTATIONS');
    const currentIds = new Set(current.map((c) => c.menu_item_channel_id));
    for (const id of targets) {
      assertExists(
        currentIds.has(id) ? id : null,
        'MenuItemChannel',
        id,
        this.logger,
      );
    }

    const invalid = create.find(
      (c) => !OVERRIDE_CHANNELS.includes(c.order_channel),
    );
    if (invalid) {
      this.logger.warn(`Invalid order channel: ${invalid.order_channel}`);
      throw new BadRequestException({
        code: 'INVALID_ORDER_CHANNEL',
        message: 'Only Grab Food or Foodpanda is allowed for Menu Item Channel',
      });
    }

    const removed = new Set(remove);
    const finalChannels = [
      ...current
        .filter((c) => !removed.has(c.menu_item_channel_id))
        .map((c) => c.order_channel),
      ...create.map((c) => c.order_channel),
    ];
    if (new Set(finalChannels).size !== finalChannels.length) {
      this.logger.warn('Duplicate order channel on a menu item.');
      throw new BadRequestException({
        code: 'DUPLICATE_ORDER_CHANNEL',
        message: 'A menu item can have only one override per order channel',
      });
    }

    // Deletes first, so a channel can be removed and re-added in one request.
    for (const id of remove) {
      await this.menuChannelsRepository.deletePermanently(id, tx);
    }
    for (const { menu_item_channel_id, ...changes } of update) {
      await this.menuChannelsRepository.updateOverride(
        menu_item_channel_id,
        changes,
        tx,
      );
    }
    for (const channel of create) {
      await this.menuChannelsRepository.create(
        { ...channel, menu_item_id: menuItemId },
        tx,
      );
    }
  }

  private async applyModifierMutations(
    menuItemId: string,
    mutations: MenuItemModifierMutationsDTO,
    tx: Prisma.TransactionClient,
  ) {
    const { create = [], update = [], delete: remove = [] } = mutations;
    const current = await this.menuItemModifiersRepository.findManyForMenuItem(
      menuItemId,
      tx,
    );

    const targets = [...update.map((m) => m.menu_item_modifier_id), ...remove];
    this.assertDistinctTargets(targets, 'CONFLICTING_MODIFIER_MUTATIONS');
    const currentIds = new Set(current.map((m) => m.menu_item_modifier_id));
    for (const id of targets) {
      assertExists(
        currentIds.has(id) ? id : null,
        'MenuItemModifier',
        id,
        this.logger,
      );
    }

    const removed = new Set(remove);
    const updates = new Map(update.map((m) => [m.menu_item_modifier_id, m]));
    const finalModifierIds = [
      ...current
        .filter((m) => !removed.has(m.menu_item_modifier_id))
        .map(
          (m) =>
            updates.get(m.menu_item_modifier_id)?.modifier_id ?? m.modifier_id,
        ),
      ...create.map((m) => m.modifier_id),
    ];
    if (new Set(finalModifierIds).size !== finalModifierIds.length) {
      this.logger.warn('Duplicate modifier on a menu item.');
      throw new BadRequestException({
        code: 'DUPLICATE_MENU_ITEM_MODIFIER',
        message: 'A modifier can be assigned to a menu item only once',
      });
    }
    // Only newly referenced modifiers are checked; existing assignments keep
    // working even if their modifier was retired since.
    await this.assertActiveModifiers(
      [
        ...create.map((m) => m.modifier_id),
        ...update
          .map((m) => m.modifier_id)
          .filter((id): id is string => id !== undefined),
      ],
      tx,
    );

    for (const id of remove) {
      await this.menuItemModifiersRepository.delete(id, tx);
    }
    for (const { menu_item_modifier_id, ...changes } of update) {
      await this.menuItemModifiersRepository.update(
        menu_item_modifier_id,
        changes,
        tx,
      );
    }
    if (create.length > 0) {
      await this.menuItemModifiersRepository.createMany(menuItemId, create, tx);
    }
  }

  // An uploaded photo is referenced by its key; only its uploader may use it,
  // and it has to exist. Plain URLs are taken as given.
  private async assertOwnedImage(imgUrl: string, actorId: string) {
    if (!UPLOAD_KEY.test(imgUrl)) return;
    try {
      await this.assets.download(actorId, imgUrl, false);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      this.logger.warn(`Upload ${imgUrl} is missing or not the caller's`);
      throw new NotFoundException({
        code: 'ASSET_NOT_FOUND',
        message: 'The uploaded photo was not found. Upload it again.',
      });
    }
  }

  private async assertActiveModifiers(
    modifierIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    for (const modifierId of new Set(modifierIds)) {
      const modifier = await this.modifiersRepository.findOne(
        { modifier_id: modifierId },
        true,
        tx,
      );
      assertExists(modifier, 'Modifier', modifierId, this.logger);
    }
  }

  // An empty edit would still bump modified_at and write an audit row.
  private assertHasChanges(dto: UpdateMenuCatalogDTO) {
    const { menu_item, menu_channel, menu_item_modifier } = dto;
    const hasItemChange = Object.values(menu_item ?? {}).some(
      (value) => value !== undefined,
    );
    const hasMutation = [menu_channel, menu_item_modifier].some(
      (mutations) =>
        mutations !== undefined &&
        [mutations.create, mutations.update, mutations.delete].some(
          (list) => (list?.length ?? 0) > 0,
        ),
    );
    if (!hasItemChange && !hasMutation) {
      this.logger.warn('Menu catalog update had no changes.');
      throw new BadRequestException({
        code: 'NO_MENU_CATALOG_CHANGES',
        message: 'Send at least one change to the menu item',
      });
    }
  }

  private assertDistinctTargets(ids: string[], code: string) {
    if (new Set(ids).size !== ids.length) {
      this.logger.warn(`Same item targeted more than once: ${code}`);
      throw new BadRequestException({
        code,
        message: 'Each item can be updated or deleted only once per request',
      });
    }
  }

  /** Swaps a stored upload key for a download URL; external URLs pass through. */
  private async withImageUrl<T extends { img_url: string }>(menuItem: T) {
    return {
      ...menuItem,
      img_url: menuItem.img_url.startsWith('uploads/')
        ? await this.storage.createDownloadUrl(menuItem.img_url, false)
        : menuItem.img_url,
    };
  }
}
