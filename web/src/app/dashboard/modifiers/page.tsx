import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCookie } from "@/src/features/auth/services/auth.service";
import { MODIFIER_ROLES } from "@/src/features/auth/utils/webRoles";
import ModifiersAccessRestricted from "@/src/features/modifiers/components/organisms/modifiers-access-restricted";
import ModifiersPage from "@/src/features/modifiers/containers/modifiers";

// The role check reads the session cookie, which Cache Components only allows
// behind a Suspense boundary; the dashboard chrome renders without waiting on it.
export default function Modifiers() {
  return (
    <Suspense fallback={null}>
      <RequireModifierAccess>
        <ModifiersPage />
      </RequireModifierAccess>
    </Suspense>
  );
}

async function RequireModifierAccess({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("kkfc_session")?.value;
  if (!token) redirect("/login");

  const user = await validateCookie(token);
  if (!user) redirect("/login");
  if (!MODIFIER_ROLES.has(user.role)) return <ModifiersAccessRestricted />;

  return children;
}
