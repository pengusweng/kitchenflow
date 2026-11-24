import type { ReactNode } from "react";

type RecipePanelProps = {
  id: string;
  title: string;
  /** Right of the title: a count, a tag or a link. */
  aside?: ReactNode;
  children: ReactNode;
};

// One section of the recipe page. The same card as the tables, so the page
// reads as part of the dashboard rather than a separate document.
export default function RecipePanel({ id, title, aside, children }: RecipePanelProps) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-hairline bg-card">
      <header className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-3 md:px-5">
        <h2 id={id} className="font-semibold text-ink">
          {title}
        </h2>
        {aside ? <div className="text-[0.8125rem] text-ink-muted tabular-nums">{aside}</div> : null}
      </header>
      <div className="px-4 md:px-5">{children}</div>
    </section>
  );
}

/** The line a panel shows when it has nothing to list. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="py-5 text-sm text-ink-muted">{children}</p>;
}

/** Why a panel's list isn't shown: still loading, failed, or not available to this role. */
export type PanelNotice = { text: string; kind: "loading" | "error" | "info" };

export function PanelMessage({ notice }: { notice: PanelNotice }) {
  return (
    <p
      role={notice.kind === "error" ? "alert" : notice.kind === "loading" ? "status" : undefined}
      className={`py-5 text-sm ${notice.kind === "error" ? "text-danger-ink dark:text-destructive" : "text-ink-muted"}`}
    >
      {notice.text}
    </p>
  );
}
