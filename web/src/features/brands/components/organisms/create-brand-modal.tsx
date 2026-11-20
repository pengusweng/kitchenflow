"use client";

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
import { Input } from "@/src/components/ui/atoms/input";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { useCreateBrand } from "../../hooks/useCreateBrand";
import type { BrandResponse } from "../../schemas/brandSchema";
import { fieldError } from "../../utils/form";
import FormField, { fieldMessageId } from "../molecules/form-field";
import LogoField from "../molecules/logo-field";

type CreateBrandModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (brand: BrandResponse) => void;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

export default function CreateBrandModal({ open, onOpenChange, onCreated }: CreateBrandModalProps) {
  const { isPrompting } = usePin();
  const { form, logo, serverError, reset } = useCreateBrand(onCreated);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The PIN prompt sits on top of this dialog; its Escape and clicks must not close the form beneath it.
        if (!next && (isPrompting || form.state.isSubmitting)) return;
        onOpenChange(next);
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-lg ${SURFACE}`}
      >
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
            <DialogTitle className="text-base font-semibold text-ink">Add brand</DialogTitle>
            <DialogClose
              render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-5 pb-6">
            <DialogDescription className="text-sm leading-relaxed text-ink-muted">
              New brands start active. You can change the name, code, and logo later.
            </DialogDescription>

            <FormField
              id="create-brand-logo"
              label="Logo"
              hint="Optional. JPG or PNG, up to 5 MB."
              error={logo.error ?? undefined}
            >
              <LogoField
                id="create-brand-logo"
                preview={
                  logo.logo
                    ? { url: logo.logo.previewUrl, name: logo.logo.file.name, size: logo.logo.file.size }
                    : null
                }
                onSelect={logo.select}
                onRemove={logo.clear}
                invalid={Boolean(logo.error)}
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-4">
              <form.Field name="name">
                {(field) => {
                  const error = fieldError(field.state.meta);
                  return (
                    <FormField id="create-brand-name" label="Name" error={error}>
                      <Input
                        id="create-brand-name"
                        autoComplete="off"
                        maxLength={150}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={Boolean(error)}
                        aria-describedby={fieldMessageId("create-brand-name", Boolean(error))}
                      />
                    </FormField>
                  );
                }}
              </form.Field>

              <form.Field name="code">
                {(field) => {
                  const error = fieldError(field.state.meta);
                  return (
                    <FormField id="create-brand-code" label="Code" hint="Up to 4 characters." error={error}>
                      <Input
                        id="create-brand-code"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={4}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                        onBlur={field.handleBlur}
                        aria-invalid={Boolean(error)}
                        aria-describedby="create-brand-code-message"
                        className="font-mono tracking-[0.08em] uppercase"
                      />
                    </FormField>
                  );
                }}
              </form.Field>
            </div>

            {serverError ? (
              <p
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-5 text-danger-ink dark:text-destructive"
              >
                <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
                {serverError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4">
            <DialogClose
              render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}
            >
              Cancel
            </DialogClose>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(submitting) => (
                <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={submitting} aria-busy={submitting}>
                  {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                  {submitting ? "Creating…" : "Create brand"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
