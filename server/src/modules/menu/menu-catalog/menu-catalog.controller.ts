import {
  Audit,
  fromParam,
  fromResult,
} from '../../../shared/audit/audit.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { MenuItemSearchDTO } from '../menu-items/dto/find-all-menu-items.dto';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Authenticated } from '../../auth/auth.guard';
import {
  CreateMenuCatalogDocs,
  FindAllMenuCatalogDocs,
  MenuCatalogDocs,
  UpdateMenuCatalogDocs,
} from './docs/menu-catalog.docs';
import { MenuCatalogSetupDTO } from './dto/menu-catalog-setup.dto';
import { UpdateMenuCatalogDTO } from './dto/update-menu-catalog.dto';
import { MenuCatalogService } from './menu-catalog.service';

@Controller('menu-catalog')
@MenuCatalogDocs()
@UseGuards(Authenticated, RolesGuard)
export class MenuCatalogController {
  constructor(private readonly menuCatalogService: MenuCatalogService) {}

  @Post()
  @Audit({
    action: 'MENU_CATALOG_ENTRY_CREATED',
    snapshot: 'create',
    entity: 'menu_items',
    id: fromResult('menu_item_id'),
  })
  @CreateMenuCatalogDocs()
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() dto: MenuCatalogSetupDTO) {
    return this.menuCatalogService.create(dto);
  }

  @Get('brand/:brandId')
  @FindAllMenuCatalogDocs()
  async findAll(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: MenuItemSearchDTO,
  ) {
    return this.menuCatalogService.findAll(brandId, query);
  }

  @Patch(':id')
  @Audit({
    action: 'MENU_CATALOG_ENTRY_UPDATED',
    snapshot: 'update',
    entity: 'menu_items',
    id: fromParam('id'),
  })
  @UpdateMenuCatalogDocs()
  @Roles(UserRole.SUPERADMIN)
  async update(
    @Param('id', ParseUUIDPipe) menuItemId: string,
    @Body() dto: UpdateMenuCatalogDTO,
  ) {
    return this.menuCatalogService.update(menuItemId, dto);
  }
}
