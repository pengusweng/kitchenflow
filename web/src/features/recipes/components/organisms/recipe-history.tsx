import { ChevronDown } from "lucide-react";
import { describeChanges, type RecipeVersion } from "../../utils/recipe-history";
import { formatQuantity, formatRecipeDate } from "../../utils/recipes";
import RecipePanel, { PanelEmpty } from "../atoms/recipe-panel";

// Every saved version, newest first, each saying what changed from the one
// before. Opening a version shows the recipe as it was then.
export default function RecipeHistory({ versions }: { versions: RecipeVersion[] }) {
  const rows = versions
    .map((version, index) => ({ version, changes: describeChanges(versions[index - 1], version) }))
    .reverse();

  return (
    <RecipePanel
      id="recipe-history-heading"
      title="History"
      aside={versions.length > 0 ? `${versions.length} ${versions.length === 1 ? "version" : "versions"}` : null}
    >
      {rows.length === 0 ? (
        <PanelEmpty>No saved versions yet.</PanelEmpty>
      ) : (
        <ol>
          {rows.map(({ version, changes }, index) => (
            <li key={version.version} className="border-t border-hairline first:border-t-0">
              <details className="group">
                <summary className="-mx-2 my-1 grid cursor-pointer list-none grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-start gap-x-2 rounded-md px-2 py-2 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
                  <span className="pt-px text-sm font-semibold text-ink tabular-nums">
                    <span className="sr-only">Version </span>v{version.version}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-5 text-pretty text-ink">{changes.join(" · ")}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                      <time dateTime={version.savedAt}>{formatRecipeDate(version.savedAt)}</time>
                      {index === 0 ? <span className="font-semibold text-primary-ink">Current</span> : null}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="mt-0.5 size-4 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <VersionSnapshot version={version} />
              </details>
            </li>
          ))}
        </ol>
      )}
    </RecipePanel>
  );
}

// The recipe as that version saved it, compact: a reference, not something to cook from.
function VersionSnapshot({ version }: { version: RecipeVersion }) {
  return (
    <div className="mb-3 ml-[2.75rem] grid gap-3 border-l-2 border-hairline pl-3 text-[0.8125rem] leading-5">
      <p className="text-ink">
        {version.name} <span className="font-mono text-xs break-words text-ink-muted">{version.code}</span>
      </p>
      <div>
        <h3 className="text-xs font-semibold text-ink-muted">Ingredients</h3>
        {version.ingredients.length === 0 ? (
          <p className="text-ink-muted">None</p>
        ) : (
          <ul className="mt-1 grid gap-0.5">
            {version.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="text-ink">
                <span className="font-semibold tabular-nums">
                  {formatQuantity(ingredient.quantity)} {ingredient.unit}
                </span>{" "}
                {ingredient.name}
                {ingredient.note ? <span className="text-ink-muted">, {ingredient.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-ink-muted">Steps</h3>
        {version.steps.length === 0 ? (
          <p className="text-ink-muted">None</p>
        ) : (
          <ol className="mt-1 grid list-decimal gap-1 pl-4 marker:text-ink-muted">
            {version.steps.map((step) => (
              <li key={step.id} className="text-pretty text-ink">
                {step.instruction}
              </li>
            ))}
          </ol>
        )}
      </div>
      {version.formulationNotes ? (
        <div>
          <h3 className="text-xs font-semibold text-ink-muted">Formulation notes</h3>
          <p className="whitespace-pre-line text-ink">{version.formulationNotes}</p>
        </div>
      ) : null}
    </div>
  );
}
