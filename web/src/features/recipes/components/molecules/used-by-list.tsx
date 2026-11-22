import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { RecipeUse } from "../../utils/recipes";
import RecipePanel, { PanelEmpty } from "../atoms/recipe-panel";

type UsedByListProps = {
  items: RecipeUse[];
  /** The brand's menu, where these items can be found and switched off. */
  menuHref: string;
};

// What changes if this recipe changes: worth seeing before an edit or a deactivation.
export default function UsedByList({ items, menuHref }: UsedByListProps) {
  return (
    <RecipePanel
      id="recipe-used-by-heading"
      title="Used by"
      aside={
        items.length > 0 ? (
          <Link
            href={menuHref}
            className="inline-flex items-center gap-0.5 rounded-sm font-semibold text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Open menu
            <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          </Link>
        ) : null
      }
    >
      {items.length === 0 ? (
        <PanelEmpty>No menu items use this recipe.</PanelEmpty>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 border-t border-hairline py-2.5 first:border-t-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-ink">{item.name}</span>
                <span className="font-mono text-xs break-words text-ink-muted">{item.code}</span>
              </span>
              {item.active ? null : (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-hairline px-2 text-xs font-semibold text-ink-muted">
                  Inactive
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </RecipePanel>
  );
}
