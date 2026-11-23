import type { Modifier } from "./modifiers";

export type ModifierFormValues = {
  name: string;
  code: string;
  description: string;
};

export type ModifierFormErrors = Partial<Record<keyof ModifierFormValues, string>>;

/** Field ids in form order, so a failed save can move focus to the first problem. */
export const FIELD_ORDER = ["name", "code", "description"] as const;

// Same limits as the modifiers API.
export const LIMITS = { name: 150, code: 64, description: 2000 };

export function emptyFormValues(): ModifierFormValues {
  return { name: "", code: "", description: "" };
}

export function toFormValues(modifier: Modifier): ModifierFormValues {
  return { name: modifier.name, code: modifier.code, description: modifier.description ?? "" };
}

/** Problems to fix before saving; empty when the form can be saved. `takenCodes` are other modifiers' codes. */
export function validateModifierForm(values: ModifierFormValues, takenCodes: Set<string>): ModifierFormErrors {
  const errors: ModifierFormErrors = {};
  const name = values.name.trim();
  const code = values.code.trim();

  if (!name) errors.name = "Enter the modifier's name.";
  else if (name.length > LIMITS.name) errors.name = `Keep the name to ${LIMITS.name} characters.`;

  if (!code) errors.code = "Enter a code.";
  else if (code.length > LIMITS.code) errors.code = `Keep the code to ${LIMITS.code} characters.`;
  else if (takenCodes.has(code.toUpperCase())) errors.code = "Another modifier already uses this code.";

  if (values.description.trim().length > LIMITS.description)
    errors.description = `Keep the description to ${LIMITS.description} characters.`;

  return errors;
}

export function hasErrors(errors: ModifierFormErrors) {
  return Object.keys(errors).length > 0;
}

export function hasFormChanges(modifier: Modifier, values: ModifierFormValues) {
  return (
    values.name.trim() !== modifier.name ||
    values.code.trim().toUpperCase() !== modifier.code ||
    values.description.trim() !== (modifier.description ?? "")
  );
}

/** The modifier as it reads after saving a valid form. */
export function applyModifierEdit(modifier: Modifier, values: ModifierFormValues, now: string): Modifier {
  return {
    ...modifier,
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    description: values.description.trim() || null,
    modifiedAt: now,
  };
}

/** A new modifier from a valid form. It starts active and on no menu items. */
export function newModifier(id: string, values: ModifierFormValues, now: string): Modifier {
  const blank: Modifier = {
    id,
    code: "",
    name: "",
    description: null,
    active: true,
    createdAt: now,
    modifiedAt: now,
    uses: [],
  };
  return applyModifierEdit(blank, values, now);
}
