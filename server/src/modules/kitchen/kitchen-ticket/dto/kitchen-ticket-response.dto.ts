import { ApiProperty } from '@nestjs/swagger';
import { OrderChannel } from '@prisma/client';
import { OrderTicketResponseDTO } from '../../../orders/orders/dto/order-response.dto';

export class KitchenTicketItemModifierDTO {
  @ApiProperty({ type: String, format: 'uuid' })
  order_item_modifier_id: string;

  @ApiProperty({ type: String, format: 'uuid' })
  modifier_id: string;

  @ApiProperty({ type: String })
  modifier_name: string;
}

export class KitchenTicketItemDTO {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description:
      'Order item UUID. Use as order_item_id when rejecting a QC attempt.',
  })
  order_item_id: string;

  @ApiProperty({ type: String, format: 'uuid' })
  menu_item_id: string;

  @ApiProperty({ type: String })
  item_name: string;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    description: 'Number of portions; QC portion_number ranges from 1 to this.',
  })
  quantity: number;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ type: [KitchenTicketItemModifierDTO] })
  modifiers: KitchenTicketItemModifierDTO[];
}

export class KitchenTicketWithItemsDTO extends OrderTicketResponseDTO {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: "The order's brand.",
  })
  brand_id: string;

  @ApiProperty({
    enum: OrderChannel,
    description: 'Where the order came from.',
  })
  order_channel: OrderChannel;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date-time',
    description:
      'When the order was confirmed and sent to the kitchen; null only for orders never confirmed.',
  })
  order_confirmed_at: string | null;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description:
      'Failed QC attempts so far. A ticket back at FOR_CHECKING with one or more is a recheck.',
  })
  qc_failure_count: number;

  @ApiProperty({
    type: [KitchenTicketItemDTO],
    description:
      "The ticket's order items. Prices and recipe snapshots are not included.",
  })
  order_items: KitchenTicketItemDTO[];
}
