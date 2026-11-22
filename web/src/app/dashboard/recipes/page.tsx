import { Suspense } from "react";
import RecipesPage from "@/src/features/recipes/containers/recipes";

// The page reads the brand from the URL (useSearchParams), which needs a Suspense boundary.
export default function Recipes() {
  return (
    <Suspense>
      <RecipesPage />
    </Suspense>
  );
}
