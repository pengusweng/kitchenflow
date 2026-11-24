import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDefined,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateMenuChannelDTO } from '../../menu-channels/dto/create-menu-channel.dto';
import { CreateMenuItemModifierDTO } from '../../menu-item-modifiers/dto/create-menu-item-modifier.dto';
import { CatalogMenuItemDTO } from './catalog-menu-item.dto';

export class MenuChannelSetupDTO extends OmitType(CreateMenuChannelDTO, [
  'menu_item_id',
] as const) {}

export class MenuCatalogSetupDTO {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CatalogMenuItemDTO)
  @ApiProperty({ type: CatalogMenuItemDTO })
  menu_item!: CatalogMenuItemDTO;

  @IsArray()
  @ArrayUnique((channel: MenuChannelSetupDTO) => channel.order_channel)
  @ValidateNested({ each: true })
  @Type(() => MenuChannelSetupDTO)
  @ApiProperty({
    type: [MenuChannelSetupDTO],
    description: 'Channel overrides. Use an empty array when none are needed.',
  })
  menu_channel!: MenuChannelSetupDTO[];

  @IsArray()
  @ArrayUnique((modifier: CreateMenuItemModifierDTO) => modifier.modifier_id)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemModifierDTO)
  @ApiProperty({
    type: [CreateMenuItemModifierDTO],
    description:
      'Existing modifiers to assign. Use an empty array when none are needed.',
  })
  menu_item_modifier!: CreateMenuItemModifierDTO[];
}
