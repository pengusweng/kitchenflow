import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import BrandMark from "@/src/components/ui/atoms/brand-mark";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";
import type { BrandRecipeRow } from "../../hooks/useWorkspaceData";
import { kitchenHref, menuHref, recipesHref, type BrandOperationRow, type WorkspaceBrand } from "../../utils/workspace";

type MetricLinkProps = {
  label: string;
  brandName: string;
  value: number | null;
  href: string;
  isLoading: boolean;
  isError: boolean;
  highlightIfPositive?: boolean;
};

function MetricLink({ label, brandName, value, href, isLoading, isError, highlightIfPositive }: MetricLinkProps) {
  const emphasized = highlightIfPositive && value !== null && value > 0;
  const reading = isLoading ? "Loading" : isError || value === null ? "Unavailable" : value.toLocaleString();

  return (
    <Link
      href={href}
      aria-label={`${label} for ${brandName}, ${reading}`}
      className="group -mx-2 flex min-w-0 min-h-12 flex-col justify-between gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted"
    >
      <span className="flex items-start justify-between gap-1 text-xs font-medium text-ink-muted group-hover:text-ink">
        <span>{label}</span>
        <ChevronRight
          className="mt-px size-3.5 shrink-0"
          aria-hidden="true"
        />
      </span>

      <span className="block">
        {isLoading ? (
          <SkeletonBar className="h-6 w-10" />
        ) : isError || value === null ? (
          <span className="text-lg font-semibold tabular-nums text-ink-muted" aria-label="Unavailable">
            —
          </span>
        ) : (
          <span
            className={cn(
              "text-xl font-semibold tracking-tight tabular-nums",
              emphasized ? "text-primary-ink" : "text-ink",
            )}
          >
            {value.toLocaleString()}
          </span>
        )}
      </span>
    </Link>
  );
}

function BrandCard({ brand, children }: { brand: WorkspaceBrand; children: ReactNode }) {
  return (
    <article className="relative flex min-w-0 flex-col gap-2.5 rounded-xl border border-hairline bg-card px-4 py-3">
      <div className="flex min-h-20 flex-col items-center justify-center">
        <h3 className="flex w-full min-w-0 justify-center">
          <BrandMark code={brand.code} name={brand.name} logoUrl={brand.logoUrl} />
        </h3>
        {!brand.isActive ? (
          <span className="text-xs text-ink-muted">
            Inactive
          </span>
        ) : null}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 border-t border-hairline pt-2">{children}</div>
    </article>
  );
}

type BrandOperationsSectionProps =
  | {
      mode: "operations";
      day?: string;
      rows: BrandOperationRow[];
      brandsLoading: boolean;
      brandsError: string | null;
      kitchenLoading: boolean;
      kitchenError: boolean;
      menuLoading: boolean;
      menuError: boolean;
      onRetry: () => void;
    }
  | {
      mode: "recipes";
      rows: BrandRecipeRow[];
      brandsLoading: boolean;
      brandsError: string | null;
      onRetry: () => void;
    };

export default function BrandOperationsSection(props: BrandOperationsSectionProps) {
  const { brandsLoading, brandsError, onRetry } = props;

  return (
    <section aria-labelledby="workspace-brands-heading" className="space-y-2">
      <h2 id="workspace-brands-heading" className="text-base font-semibold tracking-tight text-ink">
        Your brands
      </h2>

      {brandsLoading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2.5 rounded-xl border border-hairline bg-card px-4 py-3">
              <div className="flex h-20 items-center justify-center">
                <SkeletonBar className="h-12 w-36 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-2">
                <SkeletonBar className="h-10 w-full" />
                <SkeletonBar className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : brandsError && props.rows.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-4 text-sm">
          <span className="text-danger-ink">{brandsError}</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted"
          >
            Try again
          </button>
        </div>
      ) : props.rows.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-card px-5 py-6 text-sm text-ink-muted">
          No restaurant brands are available.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] gap-3">
          {props.mode === "operations"
            ? props.rows.map((row) => (
                <BrandCard key={row.brand.id} brand={row.brand}>
                  <MetricLink
                    label="Active tickets"
                    brandName={row.brand.name}
                    value={row.activeTickets}
                    href={kitchenHref({ day: props.day, brandCode: row.brand.code })}
                    isLoading={props.kitchenLoading}
                    isError={props.kitchenError}
                  />
                  <MetricLink
                    label="Unavailable items"
                    brandName={row.brand.name}
                    value={row.unavailableItems}
                    href={menuHref({ brandCode: row.brand.code, availability: "unavailable" })}
                    isLoading={props.menuLoading}
                    isError={props.menuError}
                    highlightIfPositive
                  />
                </BrandCard>
              ))
            : props.rows.map((row) => (
                <BrandCard key={row.brand.id} brand={row.brand}>
                  <MetricLink
                    label="Active"
                    brandName={row.brand.name}
                    value={row.active}
                    href={recipesHref({ brandCode: row.brand.code, status: "active" })}
                    isLoading={row.isLoading}
                    isError={row.isError}
                  />
                  <MetricLink
                    label="Inactive"
                    brandName={row.brand.name}
                    value={row.inactive}
                    href={recipesHref({ brandCode: row.brand.code, status: "inactive" })}
                    isLoading={row.isLoading}
                    isError={row.isError}
                  />
                </BrandCard>
              ))}
        </div>
      )}
    </section>
  );
}
