"use client";

type DayFieldProps = {
  /** The day shown (YYYY-MM-DD); undefined until the browser knows today's date. */
  value: string | undefined;
  /** Today (YYYY-MM-DD): the latest day there is. */
  max: string | undefined;
  /** Undefined means back to today. */
  onChange: (day: string | undefined) => void;
};

// Native date input, like the orders filter: the platform calendar, keyboard
// entry, and the theme's color-scheme for the picker. Away from today, a quiet
// "Today" link comes back to the live board in one click.
export default function DayField({ value, max, onChange }: DayFieldProps) {
  const past = value !== undefined && max !== undefined && value < max;

  return (
    <div className="flex items-center gap-3">
      <input
        type="date"
        aria-label="Day"
        value={value ?? ""}
        max={max}
        required
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-10 min-w-0 flex-1 cursor-pointer rounded-lg border border-hairline bg-field px-2.5 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 sm:w-40 sm:flex-none sm:px-3 md:text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
      />
      {past ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="cursor-pointer rounded-md px-1 text-sm font-semibold whitespace-nowrap text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
        >
          Today
        </button>
      ) : null}
    </div>
  );
}
