import type { MenuBrand, MenuItem, MenuItemModifier, MenuModifierOption } from "./menu";

/** A modifier row in the edit form. Removing a saved one only marks it, so it can be undone before saving. */
export type ModifierDraft = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** As typed, e.g. "35" or "35.50". */
  price: string;
  available: boolean;
  /** Already on the item, or added during this edit. */
  origin: "saved" | "new";
  removed: boolean;
};

export type MenuItemFormValues = {
  name: string;
  code: string;
  basePrice: string;
  servingDescription: string;
  description: string;
  recipe: string;
  modifiers: ModifierDraft[];
};

type FieldName = "name" | "code" | "basePrice" | "servingDescription" | "description" | "recipe";

export type MenuItemFormErrors = Partial<Record<FieldName, string>> & {
  /** Keyed by modifier draft id. */
  modifiers?: Record<string, string>;
};

// Same limits as the menu items API.
export const LIMITS = { name: 150, code: 64, description: 2000, servingDescription: 255 };
const MAX_PRICE = 9_999_999_999.99;
const PRICE = /^\d+(\.\d{1,2})?$/;

/** A peso amount with at most two decimals, or null when the text isn't one. */
export function parsePrice(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!PRICE.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= MAX_PRICE ? value : null;
}

/** How a price shows in an input: no trailing ".00", but "35.50" keeps its cents. */
export function priceText(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function toFormValues(item: MenuItem): MenuItemFormValues {
  return {
    name: item.name,
    code: item.code,
    basePrice: priceText(item.basePrice),
    servingDescription: item.servingDescription ?? "",
    description: item.description ?? "",
    recipe: item.recipe,
    modifiers: item.modifiers.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      price: priceText(m.price),
      available: m.available,
      origin: "saved",
      removed: false,
    })),
  };
}

/** A blank form for a new item; the recipe stays empty until a brand is picked. */
export function emptyFormValues(): MenuItemFormValues {
  return { name: "", code: "", basePrice: "", servingDescription: "", description: "", recipe: "", modifiers: [] };
}

/** The brand code plus the name, e.g. "GC" + "Kimchi Rice" gives "GC-KIMCHI-RICE". */
export function suggestCode(brandCode: string | undefined, name: string): string {
  const slug = name.toUpperCase().replace(/&/g, "AND").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return "";
  return (brandCode ? `${brandCode}-${slug}` : slug).slice(0, LIMITS.code).replace(/-$/, "");
}

export function newModifierDraft(option: MenuModifierOption): ModifierDraft {
  return {
    id: `new-${option.id}`,
    code: option.code,
    name: option.name,
    description: option.description,
    price: priceText(option.price),
    available: true,
    origin: "new",
    removed: false,
  };
}

function priceProblem(text: string, what: string): string | undefined {
  if (!text.trim()) return `Enter ${what}.`;
  if (parsePrice(text) === null) return `Enter ${what} like 189 or 189.50.`;
  return undefined;
}

/** Problems to fix before saving; empty when the form can be saved. `takenCodes` are other items' codes. */
export function validateMenuItemForm(values: MenuItemFormValues, takenCodes: Set<string>): MenuItemFormErrors {
  const errors: MenuItemFormErrors = {};
  const name = values.name.trim();
  const code = values.code.trim();

  if (!name) errors.name = "Enter the item's name.";
  else if (name.length > LIMITS.name) errors.name = `Keep the name to ${LIMITS.name} characters.`;

  if (!code) errors.code = "Enter a code.";
  else if (code.length > LIMITS.code) errors.code = `Keep the code to ${LIMITS.code} characters.`;
  else if (takenCodes.has(code.toUpperCase())) errors.code = "Another menu item already uses this code.";

  const basePrice = priceProblem(values.basePrice, "a price");
  if (basePrice) errors.basePrice = basePrice;

  if (!values.recipe) errors.recipe = "Choose the recipe the kitchen follows.";

  if (values.servingDescription.trim().length > LIMITS.servingDescription)
    errors.servingDescription = `Keep this to ${LIMITS.servingDescription} characters.`;
  if (values.description.trim().length > LIMITS.description)
    errors.description = `Keep the description to ${LIMITS.description} characters.`;

  const modifiers: Record<string, string> = {};
  for (const draft of values.modifiers) {
    if (draft.removed) continue;
    const problem = priceProblem(draft.price, "an add-on price");
    if (problem) modifiers[draft.id] = problem;
  }
  if (Object.keys(modifiers).length > 0) errors.modifiers = modifiers;

  return errors;
}

export function hasErrors(errors: MenuItemFormErrors) {
  return Object.keys(errors).length > 0;
}

function sameModifiers(item: MenuItem, drafts: ModifierDraft[]) {
  const kept = drafts.filter((d) => !d.removed);
  if (kept.length !== item.modifiers.length || kept.some((d) => d.origin === "new")) return false;
  return kept.every((d) => {
    const saved = item.modifiers.find((m) => m.id === d.id);
    return saved !== undefined && parsePrice(d.price) === saved.price;
  });
}

export function hasFormChanges(item: MenuItem, values: MenuItemFormValues, imageChanged: boolean) {
  return (
    imageChanged ||
    values.name.trim() !== item.name ||
    values.code.trim().toUpperCase() !== item.code ||
    parsePrice(values.basePrice) !== item.basePrice ||
    values.servingDescription.trim() !== (item.servingDescription ?? "") ||
    values.description.trim() !== (item.description ?? "") ||
    values.recipe !== item.recipe ||
    !sameModifiers(item, values.modifiers)
  );
}

/** The item as it reads after saving a valid form. */
export function applyMenuItemEdit(item: MenuItem, values: MenuItemFormValues, imageUrl: string | null): MenuItem {
  const modifiers: MenuItemModifier[] = values.modifiers
    .filter((d) => !d.removed)
    .map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      price: parsePrice(d.price) ?? 0,
      available: d.available,
    }));

  return {
    ...item,
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    basePrice: parsePrice(values.basePrice) ?? item.basePrice,
    servingDescription: values.servingDescription.trim() || null,
    description: values.description.trim() || null,
    recipe: values.recipe,
    imageUrl,
    modifiers,
  };
}

export type NewMenuItemErrors = MenuItemFormErrors & { brand?: string; photo?: string };

/** Everything the edit form checks, plus what only a new item needs: a brand and a photo. */
export function validateNewMenuItem(
  values: MenuItemFormValues,
  takenCodes: Set<string>,
  { brand, hasPhoto }: { brand: string | undefined; hasPhoto: boolean },
): NewMenuItemErrors {
  const errors: NewMenuItemErrors = validateMenuItemForm(values, takenCodes);
  if (!brand) {
    errors.brand = "Choose the brand that sells this item.";
    // Recipes come from the brand, so the brand error says it all.
    delete errors.recipe;
  }
  if (!hasPhoto) errors.photo = "Add a photo. It's what the counter and delivery menus show.";
  return errors;
}

/** The item as it reads once a valid new-item form is added. New items start active and available. */
export function newMenuItem(id: string, brand: MenuBrand, values: MenuItemFormValues, imageUrl: string): MenuItem {
  const blank: MenuItem = {
    id,
    code: "",
    name: "",
    brand,
    description: null,
    servingDescription: null,
    recipe: "",
    imageUrl: null,
    basePrice: 0,
    available: true,
    active: true,
    // Channel prices are set separately, after the item exists.
    channels: [],
    modifiers: [],
  };
  return applyMenuItemEdit(blank, values, imageUrl);
}
