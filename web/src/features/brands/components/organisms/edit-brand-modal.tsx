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
import { changedFields, hasChanges, useEditBrand } from "../../hooks/useEditBrand";
import type { BrandResponse } from "../../schemas/brandSchema";
import type { Brand } from "../../utils/brands";
import { fieldError } from "../../utils/form";
import FormField, { fieldMessageId } from "../molecules/form-field";
import LogoField, { type LogoPreview } from "../molecules/logo-field";

type EditBrandModalProps = {
  brand: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (brand: BrandResponse) => void;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

export default function EditBrandModal({ brand, open, onOpenChange, onSaved }: EditBrandModalProps) {
  const { isPrompting } = usePin();

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
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-lg ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts from the saved values. */}
        {brand ? <EditBrandForm brand={brand} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditBrandForm({ brand, onSaved }: { brand: Brand; onSaved: (brand: BrandResponse) => void }) {
  const { form, logo, removeLogo, serverError, remove, select } = useEditBrand(brand, onSaved);

  let preview: LogoPreview | null = null;
  if (logo.logo) preview = { url: logo.logo.previewUrl, name: logo.logo.file.name, size: logo.logo.file.size };
  else if (brand.logoUrl && !removeLogo) preview = { url: brand.logoUrl, name: "Current logo" };

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Edit brand</DialogTitle>
        <DialogClose
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          Update {brand.name}&apos;s name, code, or logo.
        </DialogDescription>

        <FormField
          id="edit-brand-logo"
          label="Logo"
          hint={removeLogo && !logo.logo ? "The logo will be removed when you save." : "JPG or PNG, up to 5 MB."}
          error={logo.error ?? undefined}
        >
          <LogoField
            id="edit-brand-logo"
            preview={preview}
            onSelect={select}
            onRemove={remove}
            invalid={Boolean(logo.error)}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-4">
          <form.Field name="name">
            {(field) => {
              const error = fieldError(field.state.meta);
              return (
                <FormField id="edit-brand-name" label="Name" error={error}>
                  <Input
                    id="edit-brand-name"
                    autoComplete="off"
                    maxLength={150}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={fieldMessageId("edit-brand-name", Boolean(error))}
                  />
                </FormField>
              );
            }}
          </form.Field>

          <form.Field name="code">
            {(field) => {
              const error = fieldError(field.state.meta);
              return (
                <FormField id="edit-brand-code" label="Code" hint="Up to 4 characters." error={error}>
                  <Input
                    id="edit-brand-code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={4}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby="edit-brand-code-message"
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
        <DialogClose render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}>
          Cancel
        </DialogClose>
        <form.Subscribe
          selector={(state) => ({
            submitting: state.isSubmitting,
            changed: hasChanges(
              changedFields(brand, state.values, removeLogo && !logo.logo && brand.logoUrl !== null),
              logo.logo,
            ),
          })}
        >
          {({ submitting, changed }) => (
            <Button
              type="submit"
              size="lg"
              className="h-10 px-4 font-semibold"
              disabled={submitting || !changed}
              aria-busy={submitting}
            >
              {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
