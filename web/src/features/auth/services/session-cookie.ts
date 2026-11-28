import { NextResponse } from "next/server";
import type { LoginSession } from "../schemas/loginSessionSchema";

export const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The browser's reply to a successful sign-in: the session body, plus the
 * httpOnly cookie that the API proxy turns into a bearer token.
 */
export function signedInResponse(session: LoginSession): NextResponse {
  const response = NextResponse.json(session, { headers: NO_STORE });
  response.cookies.set("kkfc_session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expires_at),
  });
  return response;
}
