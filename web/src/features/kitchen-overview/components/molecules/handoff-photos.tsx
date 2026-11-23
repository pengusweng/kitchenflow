import { Expand } from "lucide-react";
import { CHANNEL_LABEL } from "@/src/features/orders/utils/orders";
import type { KitchenTicket } from "../../utils/tickets";

type HandoffPhotosProps = {
  ticket: KitchenTicket;
  /** Opens the viewer at this photo. */
  onOpen: (index: number) => void;
};

// What the bag looked like when the rider took it, for any delivery complaint
// later. Each thumbnail opens the photo full size.
export default function HandoffPhotos({ ticket, onOpen }: HandoffPhotosProps) {
  const photos = ticket.handoffPhotos;
  return (
    <section aria-labelledby="handoff-photos-heading" className="mt-5">
      <h3 id="handoff-photos-heading" className="mb-1 text-sm font-semibold text-ink">
        Handoff photos
        {photos.length > 0 ? (
          <span className="ml-2 font-normal text-ink-muted tabular-nums">{photos.length}</span>
        ) : null}
      </h3>
      <div className="border-t border-hairline pt-3">
        {photos.length === 0 ? (
          <p className="text-sm leading-5 text-ink-muted">
            No photos were taken when this {CHANNEL_LABEL[ticket.channel]} order was handed over.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((src, index) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => onOpen(index)}
                  aria-label={`Open handoff photo ${index + 1} of ${photos.length}`}
                  className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg border border-hairline bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  {/* Signed storage URLs from the API, not build-time assets, so next/image adds nothing here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-md bg-black/55 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Expand className="size-3.5" strokeWidth={2.25} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
