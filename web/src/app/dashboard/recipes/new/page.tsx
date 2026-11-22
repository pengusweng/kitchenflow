import { Suspense } from "react";
import { requireViewer } from "@/src/features/auth/services/viewer";
import { RECIPE_AUTHOR_ROLES } from "@/src/features/auth/utils/webRoles";
import RecipeAuthorRestricted from "@/src/features/recipes/components/organisms/recipe-author-restricted";
import NewRecipe from "@/src/features/recipes/containers/new-recipe";

// A static segment, so /recipes/new wins over /recipes/[id].
export default function NewRecipePage() {
  return (
    <Suspense fallback={null}>
      <NewRecipeForViewer />
    </Suspense>
  );
}

async function NewRecipeForViewer() {
  const user = await requireViewer();
  // Same roles as POST /recipes; the API refuses everyone else anyway.
  if (!RECIPE_AUTHOR_ROLES.has(user.role)) return <RecipeAuthorRestricted />;
  return <NewRecipe />;
}
