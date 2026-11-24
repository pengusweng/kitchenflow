"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import HandoffImage from "../atoms/handoff-image";

type PhotoViewerProps = {
  photos: string[];
  /** The photo on screen; null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** e.g. "Ticket T-084", for the title and the alt text. */
  subject: string;
};

const NAV =
  "size-10 shrink-0 cursor-pointer rounded-full border-white/20 bg-black/55 text-white hover:bg-black/75 hover:text-white disabled:opacity-0";

// One handoff photo at a time, as large as the screen allows, on a dark stage
// so the photo's own colors read true. Arrow keys and the side buttons step
// through the set.
export default function PhotoViewer({ photos, index, onIndexChange, subject }: PhotoViewerProps) {
  const open = index !== null;
  const current = index ?? 0;
  const src = photos[current];
  const step = (by: number) => {
    const next = current + by;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };
  // Signed URLs open in a new tab; inline placeholders can't, so they don't offer it.
  const linkable = src?.startsWith("http");

  // Arrow keys step through the set wherever focus sits inside the viewer. Capture
  // phase, since the dialog stops the bubbling keydown before it reaches window.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      const next = e.key === "ArrowLeft" ? index - 1 : e.key === "ArrowRight" ? index + 1 : null;
      if (next === null || next < 0 || next >= photos.length) return;
      e.preventDefault();
      onIndexChange(next);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, photos.length, onIndexChange]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onIndexChange(null))}>
      {/* Its own portal and a dark scrim: the shared dialog backdrop is too light to set a photo against. */}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          forceRender
          className="fixed inset-0 isolate z-50 bg-black/80 duration-200 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0"
        />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-[#11161d] text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)] outline-none duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
          <div className="flex items-center justify-between gap-4 py-3 pr-3 pl-5">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-white">{subject} handoff</DialogTitle>
              <DialogDescription className="text-sm text-white/70 tabular-nums">
                Photo {current + 1} of {photos.length}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              {linkable ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-white/85 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Open original
                </a>
              ) : null}
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-10 text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/50"
                  />
                }
              >
                <X aria-hidden="true" className="size-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>

          {/* Holds its size while a photo loads, so the viewer doesn't collapse to its header. */}
          <div className="relative flex min-h-[min(60dvh,32rem)] flex-1 items-center justify-center bg-black">
            {src ? (
              <HandoffImage
                key={src}
                src={src}
                variant="stage"
                alt={`${subject} handoff photo ${current + 1} of ${photos.length}`}
                className="max-h-[calc(100dvh-8rem)] w-full object-contain"
              />
            ) : null}
            {photos.length > 1 ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className={`absolute top-1/2 left-3 -translate-y-1/2 ${NAV}`}
                  disabled={current === 0}
                  onClick={() => step(-1)}
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                  <span className="sr-only">Previous photo</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`absolute top-1/2 right-3 -translate-y-1/2 ${NAV}`}
                  disabled={current === photos.length - 1}
                  onClick={() => step(1)}
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                  <span className="sr-only">Next photo</span>
                </Button>
              </>
            ) : null}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
