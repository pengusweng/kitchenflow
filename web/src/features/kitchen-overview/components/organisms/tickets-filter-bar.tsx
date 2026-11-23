"use client";

import SearchField from "@/src/components/ui/molecules/search-field";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import FilterSelect from "@/src/features/orders/components/molecules/filter-select";
import DayField from "../molecules/day-field";
import { STAGE_LABEL, TICKET_STAGES, type TicketStage } from "../../utils/tickets";

const STAGE_OPTIONS = TICKET_STAGES.map((stage) => ({ value: stage, label: STAGE_LABEL[stage] }));

type TicketsFilterBarProps = {
  /** The day on the board (YYYY-MM-DD), and today's date as its limit. */
  day: string | undefined;
  today: string | undefined;
  /** Undefined means today. */
  onDayChange: (day: string | undefined) => void;
  query: string;
  onQueryChange: (query: string) => void;
  brands: MenuBrand[];
  /** Brand code; undefined means every brand. */
  brand: string | undefined;
  onBrandChange: (brand: string | undefined) => void;
  stage: TicketStage | undefined;
  onStageChange: (stage: TicketStage | undefined) => void;
  resultCount: number;
  /** How many of the results need attention. */
  flaggedCount: number;
  /** Shown when any filter is set. */
  onClear?: () => void;
};

// Same card as the other filter bars: search, the day and the two pickers on
// one line, then the count, with how many need attention called out in red.
export default function TicketsFilterBar({
  day,
  today,
  onDayChange,
  query,
  onQueryChange,
  brands,
  brand,
  onBrandChange,
  stage,
  onStageChange,
  resultCount,
  flaggedCount,
  onClear,
}: TicketsFilterBarProps) {
  // A past day's board is a record of the whole day, so "all" means every ticket.
  const pastDay = day !== undefined && today !== undefined && day < today;
  let count = `${resultCount} open ${resultCount === 1 ? "ticket" : "tickets"}`;
  if (stage === "HANDED_OVER") count = `${resultCount} handed over`;
  else if (pastDay && !stage) count = `${resultCount} ${resultCount === 1 ? "ticket" : "tickets"}`;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-card p-3 md:px-4 2xl:flex-row 2xl:items-center 2xl:gap-x-4">
      <SearchField label="Search ticket or order code" value={query} onChange={onQueryChange} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <DayField value={day} max={today} onChange={onDayChange} />
        <FilterSelect
          label="Filter by brand"
          allLabel="All brands"
          options={brands.map((b) => ({ value: b.code, label: b.name }))}
          value={brand}
          onChange={onBrandChange}
          className="sm:w-48"
        />
        <FilterSelect
          label="Filter by stage"
          allLabel={pastDay ? "All tickets" : "All open tickets"}
          options={STAGE_OPTIONS}
          value={stage}
          onChange={onStageChange}
          className="sm:w-44"
        />
        <div className="flex items-center gap-3 sm:ml-auto 2xl:ml-0">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer rounded-md px-1 text-sm font-semibold whitespace-nowrap text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
            >
              Clear filters
            </button>
          ) : null}
          <p aria-live="polite" className="text-sm whitespace-nowrap text-ink-muted tabular-nums">
            {count}
            {flaggedCount > 0 ? (
              <>
                {" · "}
                <span className="font-semibold text-danger-ink">{flaggedCount} need attention</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
