"use client";

import { cn } from "cn";
import { ImageOff } from "lucide-react";
import { useState } from "react";

type HandoffImageProps = {
  src: string;
  alt: string;
  /** A grid thumbnail, or the photo on the viewer's dark stage. */
  variant: "thumb" | "stage";
  className?: string;
};

// A handoff photo from storage. Signed URLs come from a remote host and can be
// slow or expire, so it holds a quiet placeholder until the photo has loaded
// and says so plainly when it can't. Give it a key of its src so a new photo
// starts loading fresh.
export default function HandoffImage({ src, alt, variant, className }: HandoffImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const stage = variant === "stage";

  if (state === "failed") {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt ? `${alt} could not load` : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 text-center",
          stage ? "size-full text-sm text-white/75" : "size-full text-xs text-ink-muted",
          className,
        )}
      >
        <ImageOff aria-hidden="true" className={stage ? "size-6" : "size-4"} />
        {stage ? "This photo couldn't load. Close and reopen the ticket to try again." : "Couldn't load"}
      </span>
    );
  }

  return (
    <>
      {state === "loading" ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 grid place-items-center",
            stage ? "text-sm text-white/60" : "animate-pulse bg-surface-hover motion-reduce:animate-none",
          )}
        >
          {stage ? "Loading photo…" : null}
        </span>
      ) : null}
      {/* Signed storage URLs from the API, not build-time assets, so next/image adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // A photo already in the cache can finish before React attaches onLoad.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && state === "loading") setState("loaded");
        }}
        src={src}
        alt={alt}
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        className={cn(
          "transition-opacity duration-200 motion-reduce:transition-none",
          state === "loaded" ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
