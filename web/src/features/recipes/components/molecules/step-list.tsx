import type { RecipeStep } from "../../utils/recipes";
import RecipePanel, { PanelEmpty } from "../atoms/recipe-panel";

// Numbered in a gutter so the instructions line up and a cook can find
// "step 3" again after looking away at the pan.
export default function StepList({ steps }: { steps: RecipeStep[] }) {
  return (
    <RecipePanel
      id="recipe-steps-heading"
      title="Steps"
      aside={steps.length > 0 ? `${steps.length} ${steps.length === 1 ? "step" : "steps"}` : null}
    >
      {steps.length === 0 ? (
        <PanelEmpty>No steps yet.</PanelEmpty>
      ) : (
        <ol className="py-1.5">
          {steps.map((step) => (
            <li key={step.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5">
              <span
                aria-hidden="true"
                className="inline-flex size-6 items-center justify-center self-start rounded-full bg-surface-hover text-xs font-semibold text-ink tabular-nums"
              >
                {step.number}
              </span>
              <p className="max-w-[65ch] text-sm leading-6 text-pretty text-ink">
                <span className="sr-only">Step {step.number}: </span>
                {step.instruction}
              </p>
            </li>
          ))}
        </ol>
      )}
    </RecipePanel>
  );
}
