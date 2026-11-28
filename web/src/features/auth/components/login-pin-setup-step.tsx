"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PinInput, { PIN_LENGTH } from "@/src/features/pin/components/molecules/pin-input";
import PasswordInput from "@/src/features/staff/components/molecules/password-input";
import { pinSetupSchema } from "../schemas/loginSchema";
import type { PinSetupStep } from "../hooks/useLogin";

type LoginPinSetupStepProps = {
  username: string;
  step: PinSetupStep;
  pending: boolean;
  redirecting: boolean;
  onSubmit: (values: { pin: string; password: string }) => Promise<boolean>;
  onBack: () => void;
};

type Field = "pin" | "confirm" | "password";

// Checked here so the superadmin sees which field to fix before anything is sent.
function validate(username: string, pin: string, confirm: string, password: string): { field: Field; message: string } | null {
  if (pin.length !== PIN_LENGTH) return { field: "pin", message: "Enter a 4-digit PIN." };
  if (confirm !== pin) return { field: "confirm", message: "The PINs don't match. Enter the same PIN twice." };
  if (!password) return { field: "password", message: "Enter your password to confirm it's you." };
  const parsed = pinSetupSchema.safeParse({ username, password, pin });
  if (!parsed.success) return { field: "password", message: parsed.error.issues[0]?.message ?? "Check your password." };
  return null;
}

// Shown instead of the PIN step when a superadmin has no PIN yet. Same card and
// rhythm as the other sign-in steps, so setup reads as part of signing in.
export default function LoginPinSetupStep({ username, step, pending, redirecting, onSubmit, onBack }: LoginPinSetupStepProps) {
  const pinRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [invalid, setInvalid] = useState<{ field: Field; message: string } | null>(null);
  // Editing any field dismisses the last attempt's server error.
  const [edited, setEdited] = useState(false);
  const serverError = edited ? null : step.error;
  const error = invalid?.message ?? serverError;
  const busy = pending || redirecting;

  useEffect(() => {
    pinRef.current?.focus();
  }, []);

  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setEdited(true);
      setInvalid(null);
    };
  }

  async function submit() {
    if (busy) return;
    const problem = validate(username, pin, confirm, password);
    if (problem) {
      setInvalid(problem);
      ({ pin: pinRef, confirm: confirmRef, password: passwordRef })[problem.field].current?.focus();
      return;
    }
    setEdited(false);
    if (await onSubmit({ pin, password })) return;
    // A wrong password is the only refusal that keeps this step: let them retype it.
    setPassword("");
    requestAnimationFrame(() => passwordRef.current?.focus());
  }

  const describedBy = (field: Field) => (error && (invalid ? invalid.field === field : field === "password") ? "login-pin-setup-error" : undefined);

  return (
    <div className="motion-safe:animate-page-in">
      <header>
        <h1 id="login-title" className="text-3xl leading-tight font-semibold tracking-[-0.01em] text-ink">
          Set up your PIN
        </h1>
        <p className="mt-2 text-base leading-6 text-pretty text-ink-muted">
          Superadmin accounts sign in with a 4-digit PIN. Choose one, then confirm it with your password.
        </p>
      </header>

      <form
        noValidate
        aria-label="Set up PIN"
        className="mt-8 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex min-h-14 items-center gap-3 rounded-[10px] border border-hairline bg-field py-1.5 pr-1.5 pl-3.5">
          <UserRound aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
          <p className="min-w-0 flex-1 truncate text-base text-ink">
            <span className="sr-only">Signing in as</span> {username.trim()}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onBack}
            aria-label="Change account"
            className="h-11 cursor-pointer px-3 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink"
          >
            Change
          </Button>
        </div>

        <div className="grid gap-2">
          <p aria-hidden="true" className="text-sm leading-5 font-medium text-ink">New PIN</p>
          <PinInput
            ref={pinRef}
            stretch
            label="New 4-digit PIN"
            value={pin}
            onChange={edit(setPin)}
            onComplete={() => confirmRef.current?.focus()}
            invalid={invalid?.field === "pin"}
            disabled={busy}
            describedBy={describedBy("pin")}
          />
        </div>

        <div className="grid gap-2">
          <p aria-hidden="true" className="text-sm leading-5 font-medium text-ink">Confirm PIN</p>
          <PinInput
            ref={confirmRef}
            stretch
            label="Confirm 4-digit PIN"
            value={confirm}
            onChange={edit(setConfirm)}
            onComplete={() => passwordRef.current?.focus()}
            invalid={invalid?.field === "confirm"}
            disabled={busy}
            describedBy={describedBy("confirm")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pin-setup-password" className="leading-5 text-ink">Password</Label>
          <PasswordInput
            ref={passwordRef}
            id="pin-setup-password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => edit(setPassword)(event.target.value)}
            disabled={busy}
            aria-invalid={invalid?.field === "password" || Boolean(serverError) || undefined}
            aria-describedby={describedBy("password")}
          />
        </div>

        {error && (
          <p
            id="login-pin-setup-error"
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-5 text-danger-ink motion-safe:animate-rise"
          >
            <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="mt-1 h-12 w-full cursor-pointer text-base font-semibold disabled:opacity-80"
        >
          {busy && <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />}
          {redirecting ? "Opening dashboard…" : pending ? "Saving PIN…" : "Save PIN and sign in"}
        </Button>
      </form>
    </div>
  );
}
