import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class CreateMenuItemModifierDTO {
  @IsUUID('all', { message: 'Modifier ID must be a valid UUID.' })
  @ApiProperty({ format: 'uuid' })
  modifier_id!: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    maximum: 9999999999.99,
    multipleOf: 0.01,
    description: 'Additional price in PHP for this menu item modifier.',
  })
  additional_price?: number;
}
