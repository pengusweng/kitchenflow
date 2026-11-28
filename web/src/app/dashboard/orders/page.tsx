import { Suspense } from "react";
import OrdersPage from "@/src/features/orders/containers/orders";

// Orders reads initial filter parameters from the URL (?from, ?to, ?payment, ?brand, ?status).
export default function Orders() {
  return (
    <Suspense fallback={null}>
      <OrdersPage />
    </Suspense>
  );
}
