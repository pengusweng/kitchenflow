import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateMenuItemDTO } from '../../menu-items/dto/create-menu-item.dto';
import { MenuItemSearchDTO } from '../../menu-items/dto/find-all-menu-items.dto';

/** The key POST /assets returns: uploads/<uploader id>/<uuid>.<jpg|png>. */
export const UPLOAD_KEY =
  /^uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png)$/;

const isUploadKey = (value: unknown) =>
  typeof value === 'string' && UPLOAD_KEY.test(value);

// The catalog takes the photo as a URL, or as the key of an image the caller
// uploaded through POST /assets first, so a new item and its photo can be
// saved without a multipart request.
export class CatalogMenuItemDTO extends OmitType(CreateMenuItemDTO, [
  'img_url',
] as const) {
  @ValidateIf((_object, value: unknown) => !isUploadKey(value))
  @IsUrl({}, { message: 'Image must be a URL or an uploaded image key.' })
  @MaxLength(2048, {
    message: 'Image URL must be at most 2048 characters long.',
  })
  @ApiProperty({
    maxLength: 2048,
    description:
      'Image URL, or the key POST /api/assets returned for an image you uploaded.',
    example: 'uploads/00000000-0000-4000-8000-000000000001/photo-id.jpg',
  })
  img_url!: string;
}

export class UpdateCatalogMenuItemDTO extends PartialType(
  OmitType(CatalogMenuItemDTO, ['brand_id'] as const),
  { skipNullProperties: false },
) {}

export const CATALOG_STATUS_FILTERS = ['active', 'inactive', 'all'] as const;
export const CATALOG_AVAILABILITY_FILTERS = [
  'all',
  'available',
  'unavailable',
] as const;
export type CatalogStatusFilter = (typeof CATALOG_STATUS_FILTERS)[number];
export type CatalogAvailabilityFilter =
  (typeof CATALOG_AVAILABILITY_FILTERS)[number];

export class FindMenuCatalogDTO extends MenuItemSearchDTO {
  @IsOptional()
  @IsUUID('all', { message: 'brand_id must be a valid UUID.' })
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only this brand. Omit for every brand.',
  })
  brand_id?: string;

  @IsIn(CATALOG_STATUS_FILTERS, {
    message: 'status must be one of: active, inactive, all.',
  })
  @ApiPropertyOptional({ enum: CATALOG_STATUS_FILTERS, default: 'active' })
  status: CatalogStatusFilter = 'active';

  @IsIn(CATALOG_AVAILABILITY_FILTERS, {
    message: 'availability must be one of: all, available, unavailable.',
  })
  @ApiPropertyOptional({ enum: CATALOG_AVAILABILITY_FILTERS, default: 'all' })
  availability: CatalogAvailabilityFilter = 'all';
}
