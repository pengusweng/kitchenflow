"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { formatBytes, LOGO_ACCEPT, type SelectedLogo } from "../../utils/logo";

type LogoFieldProps = {
  id: string;
  logo: SelectedLogo | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  invalid?: boolean;
};

const ACTION = "h-10 cursor-pointer px-4 font-semibold";

// Drop zone and file picker in one. The round preview matches how the logo
// sits in the brand details, so what you pick is what everyone will see.
export default function LogoField({ id, logo, onSelect, onRemove, invalid = false }: LogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        // Moving onto a child fires dragleave too; only reset once the pointer leaves the zone.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "flex items-center gap-4 rounded-lg border border-dashed bg-field p-4 transition-colors duration-150",
        dragging
          ? "border-primary bg-primary/6"
          : invalid
            ? "border-destructive"
            : logo
              ? "border-solid border-input"
              : "border-input",
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-describedby={`${id}-message`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = ""; // picking the same file again should still fire
        }}
      />

      <div
        className={cn(
          "grid size-16 shrink-0 place-items-center overflow-hidden rounded-full transition-colors duration-150",
          logo ? "border border-hairline bg-card" : "bg-muted text-ink-muted",
          dragging && !logo && "bg-primary/12 text-primary-ink",
        )}
      >
        {logo ? (
          // A local object URL for the picked file; next/image can't optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.previewUrl} alt="Logo preview" className="size-full object-cover" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-6" strokeWidth={1.75} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {logo ? (
          <>
            <p className="min-w-0 text-sm leading-5">
              <span className="block truncate font-semibold text-ink">{logo.file.name}</span>
              <span className="text-ink-muted tabular-nums">{formatBytes(logo.file.size)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="lg" className={ACTION} onClick={pick}>
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className={`${ACTION} text-ink-muted hover:text-ink`}
                onClick={onRemove}
              >
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-5 text-ink-muted">
              {dragging ? (
                <span className="font-semibold text-ink">Drop to use this image</span>
              ) : (
                <>
                  <span className="font-semibold text-ink">Drag an image here</span> or choose one from this device.
                </>
              )}
            </p>
            <div>
              <Button type="button" variant="outline" size="lg" className={ACTION} onClick={pick}>
                Choose image
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
