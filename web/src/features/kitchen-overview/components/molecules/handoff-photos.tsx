import { Expand } from "lucide-react";
import { CHANNEL_LABEL } from "@/src/features/orders/utils/orders";
import type { KitchenTicket, Loadable } from "../../utils/tickets";
import HandoffImage from "../atoms/handoff-image";

type HandoffPhotosProps = {
  ticket: KitchenTicket;
  /** Signed URLs, loaded when the ticket opens. */
  photos: Loadable<string[]>;
  /** Opens the viewer at this photo. */
  onOpen: (index: number) => void;
};

// What the bag looked like when the rider took it, for any delivery complaint
// later. Each thumbnail opens the photo full size.
export default function HandoffPhotos({ ticket, photos: { data, loading, error }, onOpen }: HandoffPhotosProps) {
  const photos = data ?? [];
  return (
    <section aria-labelledby="handoff-photos-heading" className="mt-5">
      <h3 id="handoff-photos-heading" className="mb-1 text-sm font-semibold text-ink">
        Handoff photos
        {photos.length > 0 ? (
          <span className="ml-2 font-normal text-ink-muted tabular-nums">{photos.length}</span>
        ) : null}
      </h3>
      <div className="border-t border-hairline pt-3">
        {error ? (
          <p className="text-sm leading-5 text-danger-ink">{error}</p>
        ) : loading ? (
          <ul className="grid grid-cols-3 gap-2" aria-label="Loading handoff photos">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="aspect-[4/3] animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none"
              />
            ))}
          </ul>
        ) : photos.length === 0 ? (
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
                  <HandoffImage
                    key={src}
                    src={src}
                    alt=""
                    variant="thumb"
                    className="size-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.03]"
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
