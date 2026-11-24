import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRecipeHistoryDTO {
  @IsUUID('all', { message: 'Recipe ID must be a valid UUID.' })
  @ApiProperty({
    format: 'uuid',
    description: 'Active recipe to snapshot at its current version.',
  })
  recipe_id!: string;
}
