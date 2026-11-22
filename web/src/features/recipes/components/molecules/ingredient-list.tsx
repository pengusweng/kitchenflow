import { formatQuantity, type RecipeIngredient } from "../../utils/recipes";
import RecipePanel, { PanelEmpty } from "../atoms/recipe-panel";

// Amount first, right-aligned on one edge, so a cook scanning down the list
// reads "250 g, 80 g, 1 tbsp" without hunting for each number.
export default function IngredientList({ ingredients }: { ingredients: RecipeIngredient[] }) {
  return (
    <RecipePanel
      id="recipe-ingredients-heading"
      title="Ingredients"
      aside={ingredients.length > 0 ? `${ingredients.length} ${ingredients.length === 1 ? "item" : "items"}` : null}
    >
      {ingredients.length === 0 ? (
        <PanelEmpty>No ingredients yet.</PanelEmpty>
      ) : (
        <ul>
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-hairline py-2.5 text-sm first:border-t-0"
            >
              <span className="text-right font-semibold whitespace-nowrap text-ink">
                {formatQuantity(ingredient.quantity)}{" "}
                <span className="font-normal text-ink-muted">{ingredient.unit}</span>
              </span>
              <span className="min-w-0">
                <span className="text-ink">{ingredient.name}</span>
                {ingredient.note ? <span className="block text-[0.8125rem] text-ink-muted">{ingredient.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </RecipePanel>
  );
}
