import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCookie } from "@/src/features/auth/services/auth.service";
import { BRAND_ROLES } from "@/src/features/auth/utils/webRoles";
import BrandsAccessRestricted from "@/src/features/brands/components/organisms/brands-access-restricted";
import BrandsPage from "@/src/features/brands/containers/brands";

// The role check reads the session cookie, which Cache Components only allows
// behind a Suspense boundary; the dashboard chrome renders without waiting on it.
export default function Brands() {
  return (
    <Suspense fallback={null}>
      <RequireBrandAccess>
        <BrandsPage />
      </RequireBrandAccess>
    </Suspense>
  );
}

async function RequireBrandAccess({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("kkfc_session")?.value;
  if (!token) redirect("/login");

  const user = await validateCookie(token);
  if (!user) redirect("/login");
  if (!BRAND_ROLES.has(user.role)) return <BrandsAccessRestricted />;

  return children;
}
