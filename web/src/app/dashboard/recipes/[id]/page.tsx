import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCookie } from "@/src/features/auth/services/auth.service";
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
  const token = (await cookies()).get("kkfc_session")?.value;
  if (!token) redirect("/login");

  const user = await validateCookie(token);
  if (!user) redirect("/login");

  return <RecipeDetail id={id} canSeeNotes={RECIPE_NOTES_ROLES.has(user.role)} />;
}
