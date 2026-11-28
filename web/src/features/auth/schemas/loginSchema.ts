import { z } from "zod";

export const loginSchema = z.object({
  username: z.string()
    .trim()
    .min(1, "Username is required.")
    .max(16, "Username should not exceed 16 characters."),

  password: z.string()
    .min(8, "Password must be at least 8 characters.")
    .max(32, "Password should not exceed 32 characters."),
});

export type LoginUser = z.infer<typeof loginSchema>;

/** A superadmin's first PIN, set while signing in and confirmed with their password. */
export const pinSetupSchema = loginSchema.extend({
  pin: z.string().regex(/^[0-9]{4}$/, "PIN must be exactly 4 digits."),
});

export type PinSetupInput = z.infer<typeof pinSetupSchema>;
