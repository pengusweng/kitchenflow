import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { StorageModule } from '../../../shared/storage/storage.module';
import { AssetsModule } from '../../assets/assets.module';
import { BrandsModule } from '../../brands/brands.module';
import { RecipesModule } from '../../recipe/recipes/recipes.module';
import { MenuChannelsModule } from '../menu-channels/menu-channels.module';
import { MenuItemModifiersModule } from '../menu-item-modifiers/menu-item-modifiers.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { ModifiersModule } from '../modifiers/modifiers.module';
import { MenuCatalogController } from './menu-catalog.controller';
import { MenuCatalogRepository } from './menu-catalog.repository';
import { MenuCatalogService } from './menu-catalog.service';

@Module({
  imports: [
    PrismaModule,
    AssetsModule,
    BrandsModule,
    ModifiersModule,
    MenuItemsModule,
    MenuItemModifiersModule,
    MenuChannelsModule,
    RecipesModule,
    StorageModule,
  ],
  controllers: [MenuCatalogController],
  providers: [MenuCatalogService, MenuCatalogRepository],
})
export class MenuCatalogModule {}
