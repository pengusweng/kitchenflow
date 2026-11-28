import { OrderChannel } from '@prisma/client';

/** GrabFood and Foodpanda collect the money themselves, so their orders are platform-settled. */
export function isPlatformChannel(channel: OrderChannel): boolean {
  return (
    channel === OrderChannel.GRABFOOD || channel === OrderChannel.FOODPANDA
  );
}
