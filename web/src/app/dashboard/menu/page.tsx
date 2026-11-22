import { Suspense } from "react";
import MenuPage from "@/src/features/menu/containers/menu";

// The page reads the brand from the URL (useSearchParams), which needs a Suspense boundary.
export default function Menu() {
  return (
    <Suspense>
      <MenuPage />
    </Suspense>
  );
}
