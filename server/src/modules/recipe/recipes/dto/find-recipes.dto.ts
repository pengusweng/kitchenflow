import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { PaginationDTO } from '../../../../shared/dto/pagination.dto';
import { SORT_ORDERS, type SortOrder } from '../../../users/dto/find-users.dto';

export const RECIPE_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export type RecipeStatusFilter = (typeof RECIPE_STATUS_FILTERS)[number];

export const RECIPE_SORT_FIELDS = [
  'name',
  'code',
  'created_at',
  'modified_at',
] as const;
export type RecipeSortField = (typeof RECIPE_SORT_FIELDS)[number];

export class FindRecipesDTO extends PaginationDTO {
  @IsIn(RECIPE_STATUS_FILTERS, {
    message: 'status must be one of: all, active, inactive.',
  })
  @ApiPropertyOptional({
    enum: RECIPE_STATUS_FILTERS,
    default: 'active',
    description:
      'Which recipes to return: active only (default), inactive only, or all.',
  })
  status: RecipeStatusFilter = 'active';

  // Blank or whitespace-only searches are treated as no search.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'kimchi',
    description: 'Case-insensitive partial match on recipe code and name.',
  })
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('all', { message: 'brand_id must be a valid UUID.' })
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Only return recipes owned by this brand. Omit for every brand.',
  })
  brand_id?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(RECIPE_SORT_FIELDS, {
    message: `sortBy must be one of: ${RECIPE_SORT_FIELDS.join(', ')}.`,
  })
  @ApiPropertyOptional({
    enum: RECIPE_SORT_FIELDS,
    description:
      'Column to sort by. Omit for newest recipes first. Ties fall back to name.',
  })
  sortBy?: RecipeSortField;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(SORT_ORDERS, { message: 'sortOrder must be asc or desc.' })
  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    default: 'asc',
    description: 'Sort direction for sortBy. Ignored when sortBy is omitted.',
  })
  sortOrder?: SortOrder;
}
