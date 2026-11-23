import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

export class KitchenTicketDateParamsDTO {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-22',
    description:
      'An Asia/Manila calendar date (YYYY-MM-DD); tickets created on that day are returned.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use the YYYY-MM-DD format.',
  })
  @IsISO8601(
    { strict: true },
    { message: 'date must be a valid calendar date.' },
  )
  date: string;
}
