import { Suspense } from "react";
import { requireViewer } from "@/src/features/auth/services/viewer";
import { RECIPE_AUTHOR_ROLES } from "@/src/features/auth/utils/webRoles";
import RecipeAuthorRestricted from "@/src/features/recipes/components/organisms/recipe-author-restricted";
import EditRecipe from "@/src/features/recipes/containers/edit-recipe";

// The id and the session are request-time data, so they sit behind Suspense.
export default function EditRecipePage({ params }: PageProps<"/dashboard/recipes/[id]/edit">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <EditRecipeForViewer id={id} />
      ))}
    </Suspense>
  );
}

async function EditRecipeForViewer({ id }: { id: string }) {
  const user = await requireViewer();
  // Same roles as PATCH /recipes/:id; the API refuses everyone else anyway.
  if (!RECIPE_AUTHOR_ROLES.has(user.role)) return <RecipeAuthorRestricted action="edit" />;
  return <EditRecipe id={id} />;
}
