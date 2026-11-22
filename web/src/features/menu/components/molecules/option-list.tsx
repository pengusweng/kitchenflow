import { Ban } from "lucide-react";
import { cn } from "cn";

export type Option = {
  key: string;
  label: string;
  /** A second line under the label, e.g. a modifier's note. */
  hint?: string | null;
  /** Already formatted, e.g. "₱161.00" or "+₱35.00". */
  price: string;
  available: boolean;
};

type OptionListProps = {
  id: string;
  title: string;
  options: Option[];
  empty: string;
  /** The item itself is off, so none of these can be ordered whatever they say. */
  paused?: boolean;
};

// One priced, switchable thing per row: channels and modifiers read the same
// way. "Off" carries an icon and the danger tone, and its price steps back,
// so the rows that can't be sold are the ones the eye finds.
export default function OptionList({ id, title, options, empty, paused = false }: OptionListProps) {
  const on = options.filter((option) => option.available).length;

  return (
    <section aria-labelledby={id} className="mt-7">
      <h4 id={id} className="mb-1 flex items-baseline justify-between gap-4 text-sm font-semibold text-ink">
        {title}
        {options.length > 0 ? (
          <span className="text-[0.8125rem] font-normal text-ink-muted tabular-nums">
            {paused
              ? "Paused with the item"
              : on === options.length
                ? `All ${options.length} on`
                : `${on} of ${options.length} on`}
          </span>
        ) : null}
      </h4>

      {options.length === 0 ? (
        <p className="border-t border-hairline py-3 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul>
          {options.map((option) => (
            <li
              key={option.key}
              className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-x-4 border-t border-hairline py-3 text-sm"
            >
              <div className="min-w-0">
                <p className={option.available ? "text-ink" : "text-ink-muted"}>{option.label}</p>
                {option.hint ? (
                  <p className="mt-0.5 text-[0.8125rem] leading-5 text-pretty text-ink-muted">{option.hint}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "text-right whitespace-nowrap tabular-nums slashed-zero",
                  option.available ? "text-ink" : "text-ink-muted",
                )}
              >
                {option.price}
              </span>
              {option.available ? (
                <span className="text-right text-ink-muted">On</span>
              ) : (
                <span className="text-right font-semibold whitespace-nowrap text-danger-ink">
                  <Ban aria-hidden="true" className="mr-1 inline size-3.5 align-[-0.125rem]" strokeWidth={2.5} />
                  Off
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
