"use client";

import { useRef, useState, type RefObject } from "react";
import { CircleAlert, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PinInput from "@/src/features/pin/components/molecules/pin-input";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { useResetStaffPin } from "../../hooks/useResetStaffPin";
import type { StaffMember } from "../../utils/staff";

type ResetPinModalProps = {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: (member: StaffMember) => void;
};

const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

// Superadmins give a staff member a new PIN; the PIN prompt then asks for their own.
export default function ResetPinModal({ member, open, onOpenChange, onReset }: ResetPinModalProps) {
  const { isPrompting } = usePin();
  const pinRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The PIN prompt sits on top of this dialog; its Escape and clicks must not close the form beneath it.
        if (!next && isPrompting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        initialFocus={pinRef}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-md ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts empty. */}
        {member ? <ResetPinForm member={member} pinRef={pinRef} onReset={() => onReset(member)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type ResetPinFormProps = {
  member: StaffMember;
  pinRef: RefObject<HTMLInputElement | null>;
  onReset: () => void;
};

function ResetPinForm({ member, pinRef, onReset }: ResetPinFormProps) {
  const confirmRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const { submit, submitting, invalid, error, clearErrors } = useResetStaffPin(member, onReset);

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        void submit(pin, confirm).then((field) => {
          if (field) (field === "pin" ? pinRef : confirmRef).current?.focus();
        });
      }}
    >
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Reset PIN</DialogTitle>
        <DialogClose
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          Choose a new 4-digit PIN for {member.name}. It replaces their current PIN and unlocks it if
          they were locked out. Share it with them in person.
        </DialogDescription>

        <div className="grid gap-2">
          <p aria-hidden="true" className="text-sm leading-5 font-semibold text-ink">New PIN</p>
          <PinInput
            ref={pinRef}
            stretch
            label="New 4-digit PIN"
            value={pin}
            onChange={(value) => {
              setPin(value);
              clearErrors();
            }}
            onComplete={() => confirmRef.current?.focus()}
            invalid={invalid?.field === "pin"}
            disabled={submitting}
            describedBy={error ? "reset-pin-error" : undefined}
          />
        </div>

        <div className="grid gap-2">
          <p aria-hidden="true" className="text-sm leading-5 font-semibold text-ink">Confirm PIN</p>
          <PinInput
            ref={confirmRef}
            stretch
            label="Confirm 4-digit PIN"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              clearErrors();
            }}
            invalid={invalid?.field === "confirm"}
            disabled={submitting}
            describedBy={error ? "reset-pin-error" : undefined}
          />
        </div>

        {error ? (
          <p
            id="reset-pin-error"
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-5 text-danger-ink dark:text-destructive"
          >
            <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4">
        <DialogClose render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}>
          Cancel
        </DialogClose>
        <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={submitting} aria-busy={submitting}>
          {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {submitting ? "Resetting…" : "Reset PIN"}
        </Button>
      </DialogFooter>
    </form>
  );
}
