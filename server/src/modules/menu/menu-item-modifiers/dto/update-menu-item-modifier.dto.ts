import { PartialType } from '@nestjs/swagger';
import { CreateMenuItemModifierDTO } from './create-menu-item-modifier.dto';

export class UpdateMenuItemModifierDTO extends PartialType(
  CreateMenuItemModifierDTO,
  { skipNullProperties: false },
) {}
