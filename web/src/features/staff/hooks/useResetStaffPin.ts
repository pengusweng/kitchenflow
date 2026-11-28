import { useState } from "react";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { PIN_LENGTH } from "@/src/features/pin/components/molecules/pin-input";
import { ApiError } from "@/src/lib/api-error";
import { resetUserPin } from "../services/users.service";
import type { StaffMember } from "../utils/staff";

export type ResetPinField = "pin" | "confirm";

function resetErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Unable to reset the PIN. Please try again.";
  if (error.code === "PIN_NOT_SUPPORTED_FOR_ROLE") return "Only superadmin accounts have a PIN.";
  if (error.code === "USER_NOT_FOUND") return "This account is inactive or no longer exists.";
  if (error.code === "ACCESS_DENIED") return "Only a superadmin can reset PINs.";
  if (error.status === 401) return "Your session has expired. Sign in again to continue.";
  return error.message;
}

/** Validates the new PIN, then asks for the superadmin's own PIN before saving it. */
export function useResetStaffPin(member: StaffMember, onReset: () => void) {
  const { withPin } = usePin();
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<{ field: ResetPinField; message: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function submit(pin: string, confirm: string): Promise<ResetPinField | null> {
    setServerError(null);
    if (pin.length !== PIN_LENGTH) {
      setInvalid({ field: "pin", message: "Enter a 4-digit PIN." });
      return "pin";
    }
    if (confirm !== pin) {
      setInvalid({ field: "confirm", message: "The PINs don't match. Enter the same PIN twice." });
      return "confirm";
    }
    setInvalid(null);

    setSubmitting(true);
    try {
      const done = await withPin((actionPin) => resetUserPin(member.id, pin, actionPin), {
        title: "Confirm with your PIN",
        description: `Enter your own PIN to give ${member.name} a new PIN.`,
      });
      if (done) onReset(); // undefined means the PIN prompt was cancelled: keep the form.
    } catch (error) {
      setServerError(resetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
    return null;
  }

  return {
    submit,
    submitting,
    invalid,
    error: invalid?.message ?? serverError,
    clearErrors: () => {
      setInvalid(null);
      setServerError(null);
    },
  };
}
