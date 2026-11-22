import { formatQuantity, type RecipeIngredient, type RecipeStep } from "./recipes";

/**
 * One saved version of a recipe: a recipe_histories row. The API snapshots the
 * recipe, its ingredients and its steps each time it's created or edited, so
 * the newest version always matches the recipe as it is now.
 */
export type RecipeVersion = {
  version: number;
  /** ISO timestamp the version was saved. */
  savedAt: string;
  name: string;
  code: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  formulationNotes: string | null;
};

const nameKey = (name: string) => name.trim().toLowerCase();
const amount = (i: RecipeIngredient) => `${formatQuantity(i.quantity)} ${i.unit}`;

/** "Kimchi" · "Kimchi and Rice" · "Kimchi, Rice and 2 more" */
function listNames(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What changed from one version to the next, as short phrases for the history list.
 * Ingredients match by name (unique per recipe, ignoring case); steps by their wording.
 */
export function describeChanges(previous: RecipeVersion | undefined, next: RecipeVersion): string[] {
  if (!previous) return ["Created"];
  const changes: string[] = [];

  if (previous.name !== next.name) changes.push(`Renamed from “${previous.name}”`);
  if (previous.code !== next.code) changes.push(`Code was ${previous.code}`);

  const before = new Map(previous.ingredients.map((i) => [nameKey(i.name), i]));
  const after = new Map(next.ingredients.map((i) => [nameKey(i.name), i]));
  const added = next.ingredients.filter((i) => !before.has(nameKey(i.name))).map((i) => i.name);
  const removed = previous.ingredients.filter((i) => !after.has(nameKey(i.name))).map((i) => i.name);
  const amounts: string[] = [];
  let notes = 0;
  for (const ingredient of next.ingredients) {
    const old = before.get(nameKey(ingredient.name));
    if (!old) continue;
    if (amount(old) !== amount(ingredient)) amounts.push(`${ingredient.name} ${amount(old)} → ${amount(ingredient)}`);
    else if ((old.note ?? "") !== (ingredient.note ?? "")) notes += 1;
  }
  if (added.length > 0) changes.push(`Added ${listNames(added)}`);
  if (removed.length > 0) changes.push(`Removed ${listNames(removed)}`);
  if (amounts.length > 0)
    changes.push(amounts.length <= 2 ? amounts.join(", ") : `Changed ${plural(amounts.length, "amount", "amounts")}`);
  if (notes > 0) changes.push(`Edited ${plural(notes, "ingredient note", "ingredient notes")}`);

  const oldSteps = previous.steps.map((s) => s.instruction);
  const newSteps = next.steps.map((s) => s.instruction);
  if (oldSteps.join("\n") !== newSteps.join("\n")) {
    const stepsAdded = newSteps.filter((s) => !oldSteps.includes(s)).length;
    const stepsRemoved = oldSteps.filter((s) => !newSteps.includes(s)).length;
    // A step taken out and another put in reads as one step reworded.
    const reworded = Math.min(stepsAdded, stepsRemoved);
    const parts = [
      reworded > 0 ? `reworded ${plural(reworded, "step", "steps")}` : null,
      stepsAdded > reworded ? `added ${plural(stepsAdded - reworded, "step", "steps")}` : null,
      stepsRemoved > reworded ? `removed ${plural(stepsRemoved - reworded, "step", "steps")}` : null,
    ].filter((part): part is string => part !== null);
    const text = parts.length > 0 ? parts.join(", ") : "reordered the steps";
    changes.push(text[0].toUpperCase() + text.slice(1));
  }

  if ((previous.formulationNotes ?? "") !== (next.formulationNotes ?? "")) changes.push("Edited formulation notes");

  return changes.length > 0 ? changes : ["No visible changes"];
}
