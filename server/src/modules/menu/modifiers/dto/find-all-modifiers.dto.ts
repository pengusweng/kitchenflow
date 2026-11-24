import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { PaginationDTO } from '../../../../shared/dto/pagination.dto';
import { SORT_ORDERS, type SortOrder } from '../../../users/dto/find-users.dto';

export const MODIFIER_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export type ModifierStatusFilter = (typeof MODIFIER_STATUS_FILTERS)[number];

export const MODIFIER_SORT_FIELDS = [
  'name',
  'code',
  'created_at',
  'modified_at',
] as const;
export type ModifierSortField = (typeof MODIFIER_SORT_FIELDS)[number];

export class FindAllModifiersDTO extends PaginationDTO {
  @IsIn(MODIFIER_STATUS_FILTERS, {
    message: 'status must be one of: all, active, inactive.',
  })
  @ApiPropertyOptional({
    enum: MODIFIER_STATUS_FILTERS,
    default: 'active',
    description:
      'Which modifiers to return: active only (default), inactive only, or all.',
  })
  status: ModifierStatusFilter = 'active';

  // Blank or whitespace-only searches are treated as no search.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'extra rice',
    description:
      'Case-insensitive partial match on modifier code and name. Each space-separated term must match at least one of those fields.',
  })
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('all', { message: 'brand_id must be a valid UUID.' })
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      "Only return modifiers offered on at least one of this brand's menu items. Omit for every brand.",
  })
  brand_id?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(MODIFIER_SORT_FIELDS, {
    message: `sortBy must be one of: ${MODIFIER_SORT_FIELDS.join(', ')}.`,
  })
  @ApiPropertyOptional({
    enum: MODIFIER_SORT_FIELDS,
    description:
      'Column to sort by. Omit for newest modifiers first. Ties fall back to name.',
  })
  sortBy?: ModifierSortField;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(SORT_ORDERS, { message: 'sortOrder must be asc or desc.' })
  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    default: 'asc',
    description: 'Sort direction for sortBy. Ignored when sortBy is omitted.',
  })
  sortOrder?: SortOrder;
}
