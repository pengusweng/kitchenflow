import { NextResponse } from "next/server";
import { z } from "zod";
import { pinSetupSchema } from "@/src/features/auth/schemas/loginSchema";
import { loginSessionSchema } from "@/src/features/auth/schemas/loginSessionSchema";
import { NO_STORE as headers, signedInResponse } from "@/src/features/auth/services/session-cookie";

// The API's answers that the PIN setup step shows to the superadmin.
const setupErrorSchema = z.object({
  code: z.enum(["INVALID_CREDENTIALS", "PIN_SETUP_NOT_ALLOWED", "EXISTING_PIN_FOUND"]),
  message: z.string(),
});

/** A superadmin's first PIN, confirmed with their password; signs them in like /api/auth/login. */
export async function POST(request: Request) {
  const input = pinSetupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      { message: input.error.issues.map((issue) => issue.message) },
      { status: 400, headers },
    );
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ message: "Sign-in is unavailable." }, { status: 503, headers });
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL("/api/auth/pin-setup", apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input.data),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach the server." }, { status: 502, headers });
  }

  const body: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    if (upstream.status === 400 && body) {
      return NextResponse.json(body, { status: 400, headers });
    }
    const known = setupErrorSchema.safeParse(body);
    if (known.success) {
      return NextResponse.json(known.data, { status: upstream.status, headers });
    }
    if (upstream.status === 401) {
      return NextResponse.json(
        { code: "INVALID_CREDENTIALS", message: "Invalid username or password." },
        { status: 401, headers },
      );
    }
    return NextResponse.json({ message: "Unable to save your PIN." }, { status: 502, headers });
  }

  const session = loginSessionSchema.safeParse(body);
  if (!session.success || Date.parse(session.data.expires_at) <= Date.now()) {
    return NextResponse.json(
      { message: "The server returned an invalid login response." },
      { status: 502, headers },
    );
  }

  return signedInResponse(session.data);
}
