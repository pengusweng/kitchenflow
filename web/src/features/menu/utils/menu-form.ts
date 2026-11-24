import type { MenuItem, MenuModifierOption } from "./menu";

/** A modifier row in the edit form. Removing a saved one only marks it, so it can be undone before saving. */
export type ModifierDraft = {
  /** The item's link to the modifier when saved; `new-<modifier id>` while only in the form. */
  id: string;
  modifierId: string;
  code: string;
  name: string;
  description: string | null;
  /** As typed, e.g. "35" or "35.50". */
  price: string;
  /** False when the modifier has been retired since it was added. */
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
  recipeId: string;
  modifiers: ModifierDraft[];
};

type FieldName = "name" | "code" | "basePrice" | "servingDescription" | "description" | "recipeId";

export type MenuItemFormErrors = Partial<Record<FieldName, string>> & {
  /** Keyed by modifier draft id. */
  modifiers?: Record<string, string>;
};

// Same limits as the menu items API.
export const LIMITS = {
  name: 150,
  code: 64,
  description: 2000,
  servingDescription: 255,
};
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
    recipeId: item.recipe.id,
    modifiers: item.modifiers.map((m) => ({
      id: m.id,
      modifierId: m.modifierId,
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
  return {
    name: "",
    code: "",
    basePrice: "",
    servingDescription: "",
    description: "",
    recipeId: "",
    modifiers: [],
  };
}

/** The brand code plus the name, e.g. "GC" + "Kimchi Rice" gives "GC-KIMCHI-RICE". */
export function suggestCode(brandCode: string | undefined, name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return "";
  return (brandCode ? `${brandCode}-${slug}` : slug).slice(0, LIMITS.code).replace(/-$/, "");
}

/** Modifiers carry no price of their own; each item sets one when it adds the modifier. */
export function newModifierDraft(option: MenuModifierOption): ModifierDraft {
  return {
    id: `new-${option.id}`,
    modifierId: option.id,
    code: option.code,
    name: option.name,
    description: option.description,
    price: "",
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

/** Problems to fix before saving; empty when the form can be saved. Code clashes come back from the API. */
export function validateMenuItemForm(values: MenuItemFormValues): MenuItemFormErrors {
  const errors: MenuItemFormErrors = {};
  const name = values.name.trim();
  const code = values.code.trim();

  if (!name) errors.name = "Enter the item's name.";
  else if (name.length > LIMITS.name) errors.name = `Keep the name to ${LIMITS.name} characters.`;

  if (!code) errors.code = "Enter a code.";
  else if (code.length > LIMITS.code) errors.code = `Keep the code to ${LIMITS.code} characters.`;

  const basePrice = priceProblem(values.basePrice, "a price");
  if (basePrice) errors.basePrice = basePrice;

  if (!values.recipeId) errors.recipeId = "Choose the recipe the kitchen follows.";

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

export type NewMenuItemErrors = MenuItemFormErrors & {
  brand?: string;
  photo?: string;
};

/** Everything the edit form checks, plus what only a new item needs: a brand and a photo. */
export function validateNewMenuItem(
  values: MenuItemFormValues,
  { brand, hasPhoto }: { brand: string | undefined; hasPhoto: boolean },
): NewMenuItemErrors {
  const errors: NewMenuItemErrors = validateMenuItemForm(values);
  if (!brand) {
    errors.brand = "Choose the brand that sells this item.";
    // Recipes come from the brand, so the brand error says it all.
    delete errors.recipeId;
  }
  if (!hasPhoto) errors.photo = "Add a photo. It's what the counter and delivery menus show.";
  return errors;
}

// ---------------------------------------------------------------- payloads

/** The item fields the menu catalog API takes. */
export type MenuItemFieldsPayload = {
  recipe_id: string;
  code: string;
  name: string;
  description: string | null;
  serving_description: string | null;
  base_price: number;
  /** An image URL, or the key POST /assets returned for an uploaded photo. */
  img_url: string;
};

type AddModifier = { modifier_id: string; additional_price: number };

export type CreateMenuItemPayload = {
  menu_item: MenuItemFieldsPayload & { brand_id: string };
  menu_channel: [];
  menu_item_modifier: AddModifier[];
};

/** PATCH /menu-catalog/:id: changed item fields, plus which add-ons to add, reprice and remove. */
export type UpdateMenuItemPayload = {
  menu_item?: Partial<MenuItemFieldsPayload>;
  menu_item_modifier?: {
    create?: AddModifier[];
    update?: { menu_item_modifier_id: string; additional_price: number }[];
    delete?: string[];
  };
};

type ItemFields = Omit<MenuItemFieldsPayload, "img_url">;

function itemFields(values: MenuItemFormValues): ItemFields {
  return {
    recipe_id: values.recipeId,
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    serving_description: values.servingDescription.trim() || null,
    base_price: parsePrice(values.basePrice) ?? 0,
  };
}

const addOnPrice = (draft: ModifierDraft) => parsePrice(draft.price) ?? 0;

/** A new item starts with no channel overrides, so every channel sells it at the base price. */
export function toCreatePayload(brandId: string, values: MenuItemFormValues, imageKey: string): CreateMenuItemPayload {
  return {
    menu_item: { ...itemFields(values), brand_id: brandId, img_url: imageKey },
    menu_channel: [],
    menu_item_modifier: values.modifiers
      .filter((d) => !d.removed)
      .map((d) => ({
        modifier_id: d.modifierId,
        additional_price: addOnPrice(d),
      })),
  };
}

/** Only what changed, so an untouched field is never rewritten. `imageKey` is a newly uploaded photo. */
export function toUpdatePayload(
  item: MenuItem,
  values: MenuItemFormValues,
  imageKey: string | null,
): UpdateMenuItemPayload {
  const next = itemFields(values);
  const current: ItemFields = {
    recipe_id: item.recipe.id,
    code: item.code,
    name: item.name,
    description: item.description,
    serving_description: item.servingDescription,
    base_price: item.basePrice,
  };
  const menuItem: Partial<MenuItemFieldsPayload> = {};
  for (const key of Object.keys(next) as (keyof ItemFields)[]) {
    if (next[key] !== current[key]) Object.assign(menuItem, { [key]: next[key] });
  }
  if (imageKey) menuItem.img_url = imageKey;

  const savedPrice = new Map(item.modifiers.map((m) => [m.id, m.price]));
  const kept = values.modifiers.filter((d) => !d.removed);
  const create = kept
    .filter((d) => d.origin === "new")
    .map((d) => ({
      modifier_id: d.modifierId,
      additional_price: addOnPrice(d),
    }));
  const update = kept
    .filter((d) => d.origin === "saved" && addOnPrice(d) !== savedPrice.get(d.id))
    .map((d) => ({
      menu_item_modifier_id: d.id,
      additional_price: addOnPrice(d),
    }));
  const remove = values.modifiers.filter((d) => d.origin === "saved" && d.removed).map((d) => d.id);

  const modifiers: NonNullable<UpdateMenuItemPayload["menu_item_modifier"]> = {};
  if (create.length) modifiers.create = create;
  if (update.length) modifiers.update = update;
  if (remove.length) modifiers.delete = remove;

  return {
    ...(Object.keys(menuItem).length ? { menu_item: menuItem } : {}),
    ...(Object.keys(modifiers).length ? { menu_item_modifier: modifiers } : {}),
  };
}

export function hasFormChanges(item: MenuItem, values: MenuItemFormValues, imageChanged: boolean) {
  return Object.keys(toUpdatePayload(item, values, imageChanged ? "new-photo" : null)).length > 0;
}
