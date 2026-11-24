import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateMenuChannelDTO } from '../../menu-channels/dto/create-menu-channel.dto';
import { CreateMenuItemModifierDTO } from '../../menu-item-modifiers/dto/create-menu-item-modifier.dto';
import { UpdateMenuItemModifierDTO } from '../../menu-item-modifiers/dto/update-menu-item-modifier.dto';
import { UpdateCatalogMenuItemDTO } from './catalog-menu-item.dto';
import { MenuChannelSetupDTO } from './menu-catalog-setup.dto';

// A channel's order_channel is fixed; delete it and create another instead.
export class UpdateMenuChannelItemDTO extends PartialType(
  PickType(CreateMenuChannelDTO, ['price', 'is_available'] as const),
  { skipNullProperties: false },
) {
  @IsUUID('all', { message: 'Menu item channel ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Channel override of this menu item to change.',
  })
  menu_item_channel_id!: string;
}

export class UpdateMenuItemModifierItemDTO extends UpdateMenuItemModifierDTO {
  @IsUUID('all', { message: 'Menu item modifier ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Modifier assignment of this menu item to change.',
  })
  menu_item_modifier_id!: string;
}

export class MenuChannelMutationsDTO {
  @IsOptional()
  @IsArray({ message: 'Channels to create must be an array.' })
  @ArrayUnique((channel: MenuChannelSetupDTO) => channel.order_channel, {
    message: 'Each channel to create must be a different order channel.',
  })
  @ValidateNested({ each: true })
  @Type(() => MenuChannelSetupDTO)
  @ApiPropertyOptional({ type: [MenuChannelSetupDTO] })
  create?: MenuChannelSetupDTO[];

  @IsOptional()
  @IsArray({ message: 'Channels to update must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateMenuChannelItemDTO)
  @ApiPropertyOptional({ type: [UpdateMenuChannelItemDTO] })
  update?: UpdateMenuChannelItemDTO[];

  @IsOptional()
  @IsArray({ message: 'Channels to delete must be an array.' })
  @IsUUID('all', {
    each: true,
    message: 'Each channel to delete must be a valid UUID.',
  })
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'IDs of channel overrides of this menu item to delete.',
  })
  delete?: string[];
}

export class MenuItemModifierMutationsDTO {
  @IsOptional()
  @IsArray({ message: 'Modifiers to assign must be an array.' })
  @ArrayUnique((modifier: CreateMenuItemModifierDTO) => modifier.modifier_id, {
    message: 'Each modifier to assign must be different.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemModifierDTO)
  @ApiPropertyOptional({ type: [CreateMenuItemModifierDTO] })
  create?: CreateMenuItemModifierDTO[];

  @IsOptional()
  @IsArray({ message: 'Modifier assignments to update must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateMenuItemModifierItemDTO)
  @ApiPropertyOptional({ type: [UpdateMenuItemModifierItemDTO] })
  update?: UpdateMenuItemModifierItemDTO[];

  @IsOptional()
  @IsArray({ message: 'Modifier assignments to delete must be an array.' })
  @IsUUID('all', {
    each: true,
    message: 'Each modifier assignment to delete must be a valid UUID.',
  })
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'IDs of modifier assignments of this menu item to delete.',
  })
  delete?: string[];
}

// Same shape as MenuCatalogSetupDTO, with every part optional and the child
// lists replaced by create/update/delete mutations. Deactivating the menu item
// is not part of this payload; it has its own route.
export class UpdateMenuCatalogDTO {
  @IsOptional()
  @IsObject({ message: 'Menu item changes must be an object.' })
  @ValidateNested()
  @Type(() => UpdateCatalogMenuItemDTO)
  @ApiPropertyOptional({
    type: UpdateCatalogMenuItemDTO,
    description: 'Menu item fields to change. The brand cannot be changed.',
  })
  menu_item?: UpdateCatalogMenuItemDTO;

  @IsOptional()
  @IsObject({
    message: 'Channels must be an object of create, update and delete lists.',
  })
  @ValidateNested()
  @Type(() => MenuChannelMutationsDTO)
  @ApiPropertyOptional({
    type: MenuChannelMutationsDTO,
    description:
      'Channel override changes. Only GRABFOOD and FOODPANDA can be added, and afterwards each order channel can appear at most once.',
  })
  menu_channel?: MenuChannelMutationsDTO;

  @IsOptional()
  @IsObject({
    message: 'Modifiers must be an object of create, update and delete lists.',
  })
  @ValidateNested()
  @Type(() => MenuItemModifierMutationsDTO)
  @ApiPropertyOptional({
    type: MenuItemModifierMutationsDTO,
    description:
      'Modifier assignment changes. Every modifier assigned must exist and be active, and afterwards each modifier can be assigned at most once.',
  })
  menu_item_modifier?: MenuItemModifierMutationsDTO;
}
