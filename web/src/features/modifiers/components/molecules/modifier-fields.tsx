"use client";

import { Input } from "@/src/components/ui/atoms/input";
import Textarea from "@/src/components/ui/atoms/textarea";
import FormField, { fieldMessageId } from "@/src/features/brands/components/molecules/form-field";
import { LIMITS, type ModifierFormErrors, type ModifierFormValues } from "../../utils/modifier-form";

type ModifierFieldsProps = {
  /** Prefixes every field id, e.g. "edit-modifier" gives "edit-modifier-name". */
  idPrefix: string;
  values: ModifierFormValues;
  onChange: (key: keyof ModifierFormValues, value: string) => void;
  errors: ModifierFormErrors;
  codeHint: string;
};

// What the counter sees (name), what the system keys on (code), and a note for staff.
export default function ModifierFields({ idPrefix, values, onChange, errors, codeHint }: ModifierFieldsProps) {
  const id = (name: keyof ModifierFormValues) => `${idPrefix}-${name}`;
  const descriptionHint = "Optional. Shown to staff when they add it to an order.";

  return (
    <>
      <FormField id={id("name")} label="Name" hint="As the counter sees it, e.g. Extra rice." error={errors.name}>
        <Input
          id={id("name")}
          autoComplete="off"
          maxLength={LIMITS.name}
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={fieldMessageId(id("name"), true)}
        />
      </FormField>

      <FormField id={id("code")} label="Code" hint={codeHint} error={errors.code}>
        <Input
          id={id("code")}
          autoComplete="off"
          spellCheck={false}
          maxLength={LIMITS.code}
          value={values.code}
          // Codes are stored uppercase, so they're typed that way too.
          onChange={(e) => onChange("code", e.target.value.toUpperCase())}
          className="font-mono"
          aria-invalid={Boolean(errors.code)}
          aria-describedby={fieldMessageId(id("code"), true)}
        />
      </FormField>

      <FormField id={id("description")} label="Description" hint={descriptionHint} error={errors.description}>
        <Textarea
          id={id("description")}
          maxLength={LIMITS.description}
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={fieldMessageId(id("description"), true)}
        />
      </FormField>
    </>
  );
}
