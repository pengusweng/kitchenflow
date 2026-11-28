import { Suspense } from "react";
import KitchenOverviewPage from "@/src/features/kitchen-overview/containers/kitchen-overview";

// Kitchen Overview reads ?brand, ?stage, ?day, and ?ticket from the URL.
export default function KitchenOverview() {
  return (
    <Suspense fallback={null}>
      <KitchenOverviewPage />
    </Suspense>
  );
}
