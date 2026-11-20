"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import { logoProblem, type SelectedLogo } from "../../utils/logo";
import FormField from "../molecules/form-field";
import LogoField from "../molecules/logo-field";

type CreateBrandModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

// Static for now: the form holds its values locally and submitting does nothing
// until it is wired to POST /api/brands.
export default function CreateBrandModal({ open, onOpenChange }: CreateBrandModalProps) {
  const { isPrompting } = usePin();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [logo, setLogo] = useState<SelectedLogo | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Every preview URL is released as soon as it is replaced, removed, or the form resets.
  const replaceLogo = (next: SelectedLogo | null) => {
    if (logo) URL.revokeObjectURL(logo.previewUrl);
    setLogo(next);
  };

  const selectLogo = (file: File) => {
    const problem = logoProblem(file);
    setLogoError(problem);
    if (!problem) replaceLogo({ file, previewUrl: URL.createObjectURL(file) });
  };

  const reset = () => {
    replaceLogo(null);
    setLogoError(null);
    setName("");
    setCode("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The PIN prompt sits on top of this dialog; its Escape and clicks must not close the form beneath it.
        if (!next && isPrompting) return;
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
        <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => e.preventDefault()}>
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
              error={logoError ?? undefined}
            >
              <LogoField
                id="create-brand-logo"
                logo={logo}
                onSelect={selectLogo}
                onRemove={() => {
                  replaceLogo(null);
                  setLogoError(null);
                }}
                invalid={Boolean(logoError)}
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-4">
              <FormField id="create-brand-name" label="Name">
                <Input
                  id="create-brand-name"
                  autoComplete="off"
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <FormField id="create-brand-code" label="Code" hint="Up to 4 characters.">
                <Input
                  id="create-brand-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  aria-describedby="create-brand-code-message"
                  className="font-mono tracking-[0.08em] uppercase"
                />
              </FormField>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4">
            <DialogClose
              render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" size="lg" className="h-10 px-4 font-semibold">
              Create brand
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
