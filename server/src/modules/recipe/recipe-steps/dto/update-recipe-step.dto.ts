import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateRecipeStepDTO {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsInt({ message: 'Step number must be an integer.' })
  @Min(1, { message: 'Step number must be at least 1.' })
  @Max(2_147_483_647, { message: 'Step number must be at most 2147483647.' })
  @ApiPropertyOptional({ minimum: 1, maximum: 2_147_483_647 })
  step_no?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'Instruction must be a string.' })
  @IsNotEmpty({ message: 'Instruction cannot be empty.' })
  @MaxLength(2000, {
    message: 'Instruction must be at most 2000 characters long.',
  })
  @ApiPropertyOptional({ minLength: 1, maxLength: 2000 })
  instruction?: string;
}
