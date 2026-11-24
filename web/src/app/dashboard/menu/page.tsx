import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCookie } from "@/src/features/auth/services/auth.service";
import { MENU_MANAGER_ROLES } from "@/src/features/auth/utils/webRoles";
import MenuPage from "@/src/features/menu/containers/menu";

// The role check reads the session cookie, and the page reads the brand from
// the URL (useSearchParams); both need a Suspense boundary.
export default function Menu() {
  return (
    <Suspense fallback={null}>
      <MenuForRole />
    </Suspense>
  );
}

// Every dashboard role can switch availability; only some can change the menu itself.
async function MenuForRole() {
  const token = (await cookies()).get("kkfc_session")?.value;
  if (!token) redirect("/login");

  const user = await validateCookie(token);
  if (!user) redirect("/login");

  return <MenuPage canManage={MENU_MANAGER_ROLES.has(user.role)} />;
}
