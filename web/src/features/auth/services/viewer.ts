import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCookie } from "./auth.service";

/**
 * The signed-in user, for server components that change what they render by role.
 * Sends anyone without a valid session to /login. Reads the request's cookies, so
 * under Cache Components the caller must sit inside a Suspense boundary.
 */
export async function requireViewer() {
  const token = (await cookies()).get("kkfc_session")?.value;
  if (!token) redirect("/login");

  const user = await validateCookie(token);
  if (!user) redirect("/login");

  return user;
}
