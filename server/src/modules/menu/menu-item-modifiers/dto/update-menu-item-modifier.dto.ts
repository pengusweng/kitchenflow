import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMenuItemModifierDTO } from './create-menu-item-modifier.dto';

export class UpdateMenuItemModifierDTO extends PartialType(
  OmitType(CreateMenuItemModifierDTO, ['is_available'] as const),
  { skipNullProperties: false },
) {}
