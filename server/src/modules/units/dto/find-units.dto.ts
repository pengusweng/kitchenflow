import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UnitDimension } from '@prisma/client';
import { IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PaginationDTO } from '../../../shared/dto/pagination.dto';

export class FindUnitsDTO extends PaginationDTO {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'search must be a single string.' })
  @MaxLength(100, { message: 'search must be at most 100 characters.' })
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'gram',
    description: 'Case-insensitive partial match on unit code and name.',
  })
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(UnitDimension, {
    message: 'dimension must be one of: MASS, VOLUME, COUNT.',
  })
  @ApiPropertyOptional({
    enum: UnitDimension,
    description: 'Only return units of this dimension.',
  })
  dimension?: UnitDimension;
}
