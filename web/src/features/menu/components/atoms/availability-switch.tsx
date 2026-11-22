import { Ban } from "lucide-react";
import { cn } from "cn";

type AvailabilitySwitchProps = {
  /** The item's name, so each switch in the table has its own accessible name. */
  itemName: string;
  available: boolean;
  onChange: (available: boolean) => void;
};

// The page's main control. On is quiet ink, the same fill as a selected chip,
// so a page of available items stays calm; off drops to a bare track and a
// danger-toned "Unavailable" with an icon, so the exceptions are what the eye
// lands on and the state never rests on color alone. Pressing stretches the
// knob toward where it's going, the same gesture as the theme switch.
// Phones show only the track; the row repeats "Unavailable" under the name.
export default function AvailabilitySwitch({ itemName, available, onChange }: AvailabilitySwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={`${itemName} available`}
      onClick={() => onChange(!available)}
      className="group -mx-1.5 inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out-quart",
          available
            ? "bg-ink group-hover:bg-[color-mix(in_oklab,var(--ink),var(--card)_14%)]"
            : "bg-hairline ring-1 ring-ink/10 ring-inset group-hover:bg-[color-mix(in_oklab,var(--hairline),var(--ink)_8%)]",
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full shadow-[0_1px_2px_oklch(0.2_0.03_255/0.22),0_2px_6px_-1px_oklch(0.2_0.03_255/0.18)]",
            "transition-[translate,width,background-color] duration-260 ease-out-quart group-active:w-6 motion-reduce:transition-none",
            available ? "translate-x-4 bg-card group-active:translate-x-3" : "bg-white",
          )}
        />
      </span>
      {available ? (
        <span aria-hidden="true" className="hidden text-sm text-ink-muted sm:inline">
          Available
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="hidden items-center gap-1.5 text-sm font-semibold text-danger-ink sm:inline-flex"
        >
          <Ban className="size-3.5" strokeWidth={2.5} />
          Unavailable
        </span>
      )}
    </button>
  );
}
