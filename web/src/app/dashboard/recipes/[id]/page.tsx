import { Suspense } from "react";
import { requireViewer } from "@/src/features/auth/services/viewer";
import { RECIPE_NOTES_ROLES } from "@/src/features/auth/utils/webRoles";
import RecipeDetail from "@/src/features/recipes/containers/recipe-detail";

// The id and the session are both request-time data, which Cache Components
// only allows behind a Suspense boundary; the dashboard chrome renders first.
export default function Recipe({ params }: PageProps<"/dashboard/recipes/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <RecipeForViewer id={id} />
      ))}
    </Suspense>
  );
}

async function RecipeForViewer({ id }: { id: string }) {
  const user = await requireViewer();
  return <RecipeDetail id={id} canSeeNotes={RECIPE_NOTES_ROLES.has(user.role)} />;
}
