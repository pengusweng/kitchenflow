import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { assertValidPagination } from '../../../shared/assertions/assert-valid-pagination';
import { StorageService } from '../../../shared/storage/storage.service';
import { BrandsRepository } from '../../brands/brands.repository';
import { MenuItemSearchDTO } from '../menu-items/dto/find-all-menu-items.dto';
import { ModifiersRepository } from '../modifiers/modifiers.repository';
import { MenuCatalogSetupDTO } from './dto/menu-catalog-setup.dto';
import { MenuCatalogRepository } from './menu-catalog.repository';

@Injectable()
export class MenuCatalogService {
  private readonly logger = new Logger(MenuCatalogService.name);

  constructor(
    private readonly menuCatalogRepository: MenuCatalogRepository,
    private readonly brandsRepository: BrandsRepository,
    private readonly modifiersRepository: ModifiersRepository,
    private readonly storage: StorageService,
  ) {}

  async create(dto: MenuCatalogSetupDTO, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Creating menu catalog entry for ${dto.menu_item.name}`);

    for (const { modifier_id } of dto.menu_item_modifier) {
      const modifier = await this.modifiersRepository.findOneModifierByUID(
        modifier_id,
        true,
        tx,
      );
      assertExists(modifier, 'Modifier', modifier_id, this.logger);
    }

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
