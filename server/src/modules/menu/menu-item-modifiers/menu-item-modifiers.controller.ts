import { Audit, fromParam } from '../../../shared/audit/audit.decorator';
import { UseInterceptors as UseMenuInterceptors } from '@nestjs/common';
import { SafeMenuInterceptor } from '../safe-menu.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenuItemModifiersService } from './menu-item-modifiers.service';
import { Authenticated } from '../../auth/auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UpdateMenuItemModifierDTO } from './dto/update-menu-item-modifier.dto';
import { FindAllMenuItemModifiersDTO } from './dto/find-all-menu-item-modifiers.dto';
import {
  MenuItemModifiersDocs,
  FindAllMenuItemModifiersDocs,
  FindMenuItemModifiersForMenuItemDocs,
  FindOneMenuItemModifierDocs,
  UpdateMenuItemModifierDocs,
  DeleteMenuItemModifierDocs,
} from './docs/menu-item-modifiers.docs';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseMenuInterceptors(SafeMenuInterceptor)
@Controller('menu-item-modifiers')
@MenuItemModifiersDocs()
@UseGuards(Authenticated, RolesGuard)
export class MenuItemModifiersController {
  constructor(
    private readonly menuItemModifiersService: MenuItemModifiersService,
  ) {}

  @Get()
  @FindAllMenuItemModifiersDocs()
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  async findAll(@Query() query: FindAllMenuItemModifiersDTO) {
    return this.menuItemModifiersService.findAll(query);
  }

  @Get('menu-item/:menuItemId')
  @FindMenuItemModifiersForMenuItemDocs()
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  async findManyForMenuItem(
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.menuItemModifiersService.findManyForMenuItem(menuItemId);
  }

  @Get(':id')
  @FindOneMenuItemModifierDocs()
  async findOne(@Param('id', ParseUUIDPipe) menuItemModifierId: string) {
    return this.menuItemModifiersService.findOne(menuItemModifierId);
  }

  @Patch(':id')
  @Audit({
    action: 'MENU_ITEM_MODIFIER_UPDATED',
    snapshot: 'update',
    entity: 'menu_item_modifiers',
    id: fromParam('id'),
  })
  @UpdateMenuItemModifierDocs()
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) menuItemModifierId: string,
    @Body() dto: UpdateMenuItemModifierDTO,
  ) {
    return this.menuItemModifiersService.update(menuItemModifierId, dto);
  }

  @Delete(':id')
  @Audit({
    action: 'MENU_ITEM_MODIFIER_DEACTIVATED',
    snapshot: 'update',
    entity: 'menu_item_modifiers',
    id: fromParam('id'),
  })
  @DeleteMenuItemModifierDocs()
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  async delete(@Param('id', ParseUUIDPipe) menuItemModifierId: string) {
    return this.menuItemModifiersService.delete(menuItemModifierId);
  }
}
