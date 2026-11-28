import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useEffectEvent, useLayoutEffect, useState } from "react";
import { ApiError } from "@/src/lib/api-error";
import { loginSchema, type LoginUser } from "../schemas/loginSchema";
import type { LoginSession } from "../schemas/loginSessionSchema";
import { login, setupPin } from "../services/auth.service";

/** Superadmins sign in in two steps; this is the second one. */
export type PinStep = {
  error: string | null;
  /** Locked out or no PIN set up: retrying here cannot succeed. */
  blocked: boolean;
};

/** A superadmin without a PIN chooses one, confirmed with their password, before signing in. */
export type PinSetupStep = {
  error: string | null;
};

// The PIN errors that keep the operator on the PIN step.
function pinErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case "INVALID_PIN":
      return "Incorrect PIN. Try again.";
    case "PIN_LOCKED": {
      const minutes = Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60));
      return `Too many incorrect attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    }
    case "PIN_NOT_CONFIGURED":
      return "This account has no PIN set up, so it can't sign in yet. Contact your system administrator.";
    default:
      return null;
  }
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to sign in. Please try again.";

// What the PIN setup step tells the superadmin for each refusal it can recover from.
function pinSetupErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "That password isn't right. Enter the password you signed in with.";
    default:
      return error.message;
  }
}

export function useLogin(onSuccess: (session: LoginSession) => void) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState<PinStep | null>(null);
  const [pinSetup, setPinSetup] = useState<PinSetupStep | null>(null);
  const loginMutation = useMutation({
    mutationFn: ({ credentials, pin }: { credentials: LoginUser; pin?: string }) => login(credentials, pin),
    retry: false,
    onSuccess,
  });
  const setupMutation = useMutation({
    mutationFn: setupPin,
    retry: false,
    onSuccess,
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await loginMutation.mutateAsync({ credentials: value });
      } catch (error) {
        if (error instanceof ApiError && error.code === "PIN_REQUIRED") {
          setPinStep({ error: null, blocked: false });
          return;
        }
        if (error instanceof ApiError && error.code === "PIN_SETUP_REQUIRED") {
          setPinSetup({ error: null });
          return;
        }
        setServerError(errorMessage(error));
      }
    },
  });

  /** Resolves true when signed in, false when the PIN step shows an error instead. */
  async function submitPin(pin: string): Promise<boolean> {
    setPinStep({ error: null, blocked: false });
    try {
      await loginMutation.mutateAsync({ credentials: form.state.values, pin });
      return true;
    } catch (error) {
      // The password stopped working between steps: send them back to fix it.
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        setPinStep(null);
        setServerError(error.message);
        return false;
      }
      // The PIN was removed between steps: set up a new one instead.
      if (error instanceof ApiError && error.code === "PIN_SETUP_REQUIRED") {
        setPinStep(null);
        setPinSetup({ error: null });
        return false;
      }
      const code = error instanceof ApiError ? error.code : undefined;
      setPinStep({
        error: pinErrorMessage(error) ?? errorMessage(error),
        blocked: code === "PIN_LOCKED" || code === "PIN_NOT_CONFIGURED",
      });
      return false;
    }
  }

  function cancelPin() {
    setPinStep(null);
    setServerError(null);
  }

  /**
   * Saves the first PIN, confirmed with the account password, and signs in.
   * Resolves true when signed in, false when the setup step shows an error instead.
   */
  async function submitPinSetup({ pin, password }: { pin: string; password: string }): Promise<boolean> {
    setPinSetup({ error: null });
    try {
      await setupMutation.mutateAsync({ username: form.state.values.username, password, pin });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === "EXISTING_PIN_FOUND") {
        // Someone set it up meanwhile (another tab, or a superadmin reset): sign in with it.
        setPinSetup(null);
        setPinStep({ error: "This account already has a PIN. Enter it to sign in.", blocked: false });
        return false;
      }
      if (error instanceof ApiError && error.code === "PIN_SETUP_NOT_ALLOWED") {
        setPinSetup(null);
        setServerError(error.message);
        return false;
      }
      setPinSetup({ error: pinSetupErrorMessage(error) });
      return false;
    }
  }

  function cancelPinSetup() {
    setPinSetup(null);
    setServerError(null);
  }

  // Cache Components keeps this page alive (hidden) after navigating away, so clear
  // the credentials and "Opening dashboard…" state before it can be shown again.
  const resetOnHide = useEffectEvent(() => {
    form.reset();
    loginMutation.reset();
    setupMutation.reset();
    setServerError(null);
    setPinStep(null);
    setPinSetup(null);
  });
  useLayoutEffect(() => () => resetOnHide(), []);

  return {
    form,
    serverError,
    session: loginMutation.data ?? setupMutation.data,
    pinStep,
    pinPending: loginMutation.isPending,
    submitPin,
    cancelPin,
    pinSetup,
    pinSetupPending: setupMutation.isPending,
    submitPinSetup,
    cancelPinSetup,
  };
}
