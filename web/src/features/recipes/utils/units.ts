import type { UnitDimension, UnitResponse } from "../schemas/unitSchema";

/** A unit as the recipe form uses it. */
export type Unit = { code: string; name: string; dimension: UnitDimension };

export type UnitGroup = { dimension: UnitDimension; label: string; units: Unit[] };

/** How each dimension is labelled, and the base unit its conversions are counted in (to_base = 1). */
export const DIMENSIONS: Record<UnitDimension, { label: string; base: string; baseName: string }> = {
  MASS: { label: "Weight", base: "g", baseName: "grams" },
  VOLUME: { label: "Volume", base: "ml", baseName: "millilitres" },
  COUNT: { label: "Count", base: "pc", baseName: "pieces" },
};

const DIMENSION_ORDER: UnitDimension[] = ["MASS", "VOLUME", "COUNT"];

/** The seeded units, shown until GET /units answers (and if it can't). */
export const SEEDED_UNITS: Unit[] = [
  { code: "g", name: "Gram", dimension: "MASS" },
  { code: "kg", name: "Kilogram", dimension: "MASS" },
  { code: "ml", name: "Milliliter", dimension: "VOLUME" },
  { code: "l", name: "Liter", dimension: "VOLUME" },
  { code: "tsp", name: "Teaspoon", dimension: "VOLUME" },
  { code: "tbsp", name: "Tablespoon", dimension: "VOLUME" },
  { code: "pc", name: "Piece", dimension: "COUNT" },
];

export function toUnit(unit: UnitResponse): Unit {
  return { code: unit.code, name: unit.name, dimension: unit.dimension };
}

/** Units grouped by what they measure, in the API's order within each group; empty groups are left out. */
export function groupUnits(units: Unit[]): UnitGroup[] {
  return DIMENSION_ORDER.map((dimension) => ({
    dimension,
    label: DIMENSIONS[dimension].label,
    units: units.filter((unit) => unit.dimension === dimension),
  })).filter((group) => group.units.length > 0);
}

// The same limits as CreateUnitDTO.
export const UNIT_LIMITS = { code: 16, name: 50, maxToBase: 999_999_999_999 };

export type UnitFormValues = { code: string; name: string; dimension: UnitDimension; toBase: string };
export type UnitFormErrors = Partial<Record<keyof UnitFormValues, string>>;

/** The POST /units body (CreateUnitDTO). */
export type CreateUnitPayload = { code: string; name: string; dimension: UnitDimension; to_base: number };

export function emptyUnitForm(): UnitFormValues {
  return { code: "", name: "", dimension: "VOLUME", toBase: "" };
}

const NUMBER = /^(\d+(\.\d*)?|\.\d+)$/;

/** A positive decimal with a bounded number of places, or what's wrong with it. */
export function parseDecimal(
  text: string,
  { places, max, what }: { places: number; max: number; what: string },
): { value: number } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: `Enter ${what}.` };
  if (!NUMBER.test(trimmed)) return { error: "Use a number, like 250 or 0.5." };
  if ((trimmed.split(".")[1] ?? "").length > places) return { error: `Use at most ${places} decimal places.` };
  const value = Number(trimmed);
  if (value <= 0) return { error: "Must be more than 0." };
  if (value > max) return { error: "That amount is too large." };
  return { value };
}

const parseToBase = (text: string) =>
  parseDecimal(text, { places: 6, max: UNIT_LIMITS.maxToBase, what: "how much one unit is" });

/** Unit codes are matched ignoring case, so "Cup" can't sit beside "cup" in the picker. */
export function validateUnitForm(values: UnitFormValues, existingCodes: Set<string>): UnitFormErrors {
  const errors: UnitFormErrors = {};
  const code = values.code.trim();
  const name = values.name.trim();

  if (!code) errors.code = "Enter a code, like cup.";
  else if (/\s/.test(code)) errors.code = "Leave out spaces, like fl-oz.";
  else if (code.length > UNIT_LIMITS.code) errors.code = `Keep it to ${UNIT_LIMITS.code} characters.`;
  else if (existingCodes.has(code.toLowerCase())) errors.code = "There's already a unit with this code.";
  if (!name) errors.name = "Enter a name, like Cup.";
  else if (name.length > UNIT_LIMITS.name) errors.name = `Keep it to ${UNIT_LIMITS.name} characters.`;
  const toBase = parseToBase(values.toBase);
  if ("error" in toBase) errors.toBase = toBase.error;

  return errors;
}

/** Call only once validateUnitForm finds nothing. */
export function toCreateUnitPayload(values: UnitFormValues): CreateUnitPayload {
  const toBase = parseToBase(values.toBase);
  if ("error" in toBase) throw new Error(`Invalid conversion: ${toBase.error}`);
  return { code: values.code.trim(), name: values.name.trim(), dimension: values.dimension, to_base: toBase.value };
}
