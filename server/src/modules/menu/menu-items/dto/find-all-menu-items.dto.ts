import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationDTO } from '../../../../shared/dto/pagination.dto';

export const MENU_ITEM_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export type MenuItemStatusFilter = (typeof MENU_ITEM_STATUS_FILTERS)[number];

/** Search shared by the menu item and menu catalog listings. */
export class MenuItemSearchDTO extends PaginationDTO {
  // Blank or whitespace-only searches are treated as no search.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'cheese rice',
    description:
      'Case-insensitive partial match on name and code. Each space-separated term must match at least one of those fields.',
  })
  search?: string;
}

export class FindAllMenuItemsDTO extends MenuItemSearchDTO {
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'activeOnly must be true or false.' })
  @ApiPropertyOptional({
    default: true,
    description:
      'True returns only active menu items; false includes active and inactive menu items. Ignored when status is supplied.',
  })
  activeOnly: boolean = true;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(MENU_ITEM_STATUS_FILTERS, {
    message: 'status must be one of: all, active, inactive.',
  })
  @ApiPropertyOptional({
    enum: MENU_ITEM_STATUS_FILTERS,
    description:
      'Which menu items to return: active only, inactive only, or all. Takes precedence over activeOnly; omit it to keep the activeOnly behaviour.',
  })
  status?: MenuItemStatusFilter;
}
