import { Suspense } from "react";
import { requireViewer } from "@/src/features/auth/services/viewer";
import { RECIPE_AUTHOR_ROLES } from "@/src/features/auth/utils/webRoles";
import RecipesPage from "@/src/features/recipes/containers/recipes";

// The session (who may add recipes) and the brand in the URL (useSearchParams)
// are both request-time data, so the page renders behind a Suspense boundary.
export default function Recipes() {
  return (
    <Suspense fallback={null}>
      <RecipesForViewer />
    </Suspense>
  );
}

async function RecipesForViewer() {
  const user = await requireViewer();
  return <RecipesPage canCreate={RECIPE_AUTHOR_ROLES.has(user.role)} />;
}
