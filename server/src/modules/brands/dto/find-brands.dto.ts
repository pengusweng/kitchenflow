import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationDTO } from '../../../shared/dto/pagination.dto';

export const BRAND_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export type BrandStatusFilter = (typeof BRAND_STATUS_FILTERS)[number];

export class FindBrandsDTO extends PaginationDTO {
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'activeOnly must be true or false.' })
  @ApiPropertyOptional({
    default: true,
    description:
      'True returns only active brands; false includes active and inactive brands. Ignored when status is supplied.',
  })
  activeOnly: boolean = true;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(BRAND_STATUS_FILTERS, {
    message: 'status must be one of: all, active, inactive.',
  })
  @ApiPropertyOptional({
    enum: BRAND_STATUS_FILTERS,
    description:
      'Which brands to return: active only, inactive only, or all. Takes precedence over activeOnly; omit it to keep the activeOnly behaviour.',
  })
  status?: BrandStatusFilter;

  // Blank or whitespace-only searches are treated as no search.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'king',
    description:
      'Case-insensitive partial match on name and code. Each space-separated term must match at least one of those fields.',
  })
  search?: string;
}
