// Placeholder data until the page is wired to the menu items API. Records use
// the API's snake_case shape so wiring it up only swaps the data source; the
// page itself only ever sees `toMenuItem` output.
import type { Channel, MenuBrand, MenuItem } from "./menu";

type MenuItemChannelRecord = { order_channel: Channel; price: string; is_available: boolean };

type ModifierRecord = {
  modifier_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type MenuItemModifierRecord = {
  menu_item_modifier_id: string;
  additional_price: string;
  is_available: boolean;
  modifier: ModifierRecord;
};

export type MenuItemRecord = {
  menu_item_id: string;
  brand_id: string;
  code: string;
  name: string;
  description: string | null;
  serving_description: string | null;
  recipe: { name: string };
  img_url: string | null;
  base_price: string;
  is_available: boolean;
  is_active: boolean;
  menu_item_channels: MenuItemChannelRecord[];
  menu_item_modifiers: MenuItemModifierRecord[];
};

// Brand order here is the order of the brand chips and the table's grouping.
export const MOCK_BRANDS: MenuBrand[] = [
  { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" },
  { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" },
  { id: "b-kk", code: "KK", name: "King Kungs Kafe", accent: "#5C4033" },
];

type ModifierSeed = {
  code: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  active?: boolean;
};

// Shared modifiers, keyed by code. Availability here is per item in the API;
// the mock applies it to every item that offers the modifier.
const MODIFIERS: Record<string, ModifierSeed> = {
  "EXTRA-RICE": { code: "EXTRA-RICE", name: "Extra rice", price: 35 },
  "ADD-CHEESE": { code: "ADD-CHEESE", name: "Add cheese", price: 45, description: "Melted mozzarella on top." },
  "FRIED-EGG": { code: "FRIED-EGG", name: "Fried egg", price: 25, available: false },
  "EXTRA-SPICY": { code: "EXTRA-SPICY", name: "Extra spicy", price: 0 },
  "NO-SESAME": { code: "NO-SESAME", name: "No sesame", price: 0, description: "For sesame allergies; flag on the ticket." },
  "GARLIC-RICE": { code: "GARLIC-RICE", name: "Upgrade to garlic rice", price: 15 },
  "EXTRA-OIL": { code: "EXTRA-OIL", name: "Extra chicken oil", price: 0 },
  "ATCHARA": { code: "ATCHARA", name: "Atchara side", price: 20, description: "Pickled green papaya." },
  "SPICY-VINEGAR": { code: "SPICY-VINEGAR", name: "Spicy vinegar", price: 0 },
  "LECHE-FLAN": { code: "LECHE-FLAN", name: "Extra leche flan", price: 30 },
  "OAT-MILK": { code: "OAT-MILK", name: "Oat milk", price: 40, available: false },
  "EXTRA-SHOT": { code: "EXTRA-SHOT", name: "Extra espresso shot", price: 45 },
  "UPSIZE": { code: "UPSIZE", name: "Upsize to 16 oz", price: 30 },
  "LESS-SUGAR": { code: "LESS-SUGAR", name: "Less sugar", price: 0 },
  "CARAMEL": { code: "CARAMEL", name: "Caramel drizzle", price: 25, active: false },
  "WARM-UP": { code: "WARM-UP", name: "Warm it up", price: 0 },
};

const RICE_MEAL = ["EXTRA-RICE", "FRIED-EGG", "EXTRA-SPICY"];
const INASAL = ["GARLIC-RICE", "EXTRA-OIL", "ATCHARA", "SPICY-VINEGAR"];
const COFFEE = ["EXTRA-SHOT", "OAT-MILK", "UPSIZE", "LESS-SUGAR", "CARAMEL"];
const PASTRY = ["WARM-UP"];

type Seed = {
  name: string;
  price: number;
  description?: string;
  serving?: string;
  available?: boolean;
  active?: boolean;
  /** Channels the item can't currently be ordered on. */
  off?: Channel[];
  /** Modifier codes offered on this item. */
  mods?: string[];
};

const SEEDS: Record<string, Seed[]> = {
  GC: [
    { name: "Kimchi Fried Rice", price: 189.5, description: "Aged kimchi, pork belly and a fried egg.", serving: "1 bowl", mods: RICE_MEAL },
    { name: "Bibimbap", price: 245, description: "Rice, seasoned vegetables, beef and gochujang.", serving: "1 stone bowl", mods: ["FRIED-EGG", "EXTRA-SPICY", "NO-SESAME"] },
    { name: "Japchae", price: 210, serving: "Good for 2", mods: ["NO-SESAME"] },
    { name: "Tteokbokki", price: 175, description: "Rice cakes in sweet chili sauce with fish cake.", mods: ["ADD-CHEESE", "FRIED-EGG", "EXTRA-SPICY"] },
    { name: "Yangnyeom Chicken", price: 295, serving: "6 pieces", mods: ["EXTRA-RICE", "EXTRA-SPICY", "NO-SESAME"] },
    { name: "Soy Garlic Chicken", price: 295, serving: "6 pieces", available: false, mods: ["EXTRA-RICE", "NO-SESAME"] },
    { name: "Kimbap", price: 165, serving: "10 slices" },
    { name: "Bulgogi Rice Bowl", price: 265, serving: "1 bowl", mods: RICE_MEAL },
    { name: "Sundubu Jjigae", price: 255, description: "Soft tofu stew, served bubbling.", off: ["FOODPANDA"], mods: ["EXTRA-RICE", "EXTRA-SPICY"] },
    { name: "Mandu", price: 160, serving: "8 pieces" },
    { name: "Kimchi Pancake", price: 180 },
    { name: "Samgyeopsal Set", price: 395, serving: "Good for 2", active: false, mods: ["EXTRA-RICE"] },
    { name: "Cheese Ramyeon", price: 195, serving: "1 pot", mods: ["ADD-CHEESE", "FRIED-EGG", "EXTRA-SPICY"] },
    { name: "Hotteok", price: 95, description: "Brown sugar and seed filled pancake.", serving: "2 pieces" },
  ],
  AI: [
    { name: "Chicken Inasal Paa", price: 185, description: "Leg quarter grilled over charcoal.", serving: "With rice", mods: INASAL },
    { name: "Chicken Inasal Pecho", price: 199, description: "Breast quarter grilled over charcoal.", serving: "With rice", available: false, mods: INASAL },
    { name: "Pork Liempo Inasal", price: 235, serving: "With rice", mods: INASAL },
    { name: "Inasal na Bangus", price: 220, description: "Boneless milkfish, lemongrass and annatto.", mods: INASAL },
    { name: "Pork Barbecue", price: 150, serving: "3 skewers", mods: ["GARLIC-RICE", "SPICY-VINEGAR"] },
    { name: "Sinigang na Baboy", price: 260, serving: "Good for 2" },
    { name: "Kare-Kare", price: 320, serving: "Good for 2", available: false },
    { name: "Chicken Sisig", price: 210, serving: "Sizzling plate", available: false, mods: ["FRIED-EGG", "GARLIC-RICE"] },
    { name: "Garlic Rice", price: 45, serving: "1 cup" },
    { name: "Java Rice", price: 50, serving: "1 cup" },
    { name: "Halo-Halo", price: 140, description: "Shaved ice, leche flan and ube.", off: ["GRABFOOD", "FOODPANDA"], mods: ["LECHE-FLAN"] },
    { name: "Leche Flan", price: 85, serving: "1 slice" },
  ],
  KK: [
    { name: "Americano", price: 120, serving: "12 oz", mods: ["EXTRA-SHOT", "UPSIZE"] },
    { name: "Cafe Latte", price: 150, serving: "12 oz", mods: COFFEE },
    { name: "Spanish Latte", price: 165, serving: "12 oz", mods: COFFEE },
    { name: "Ube Latte", price: 175, serving: "12 oz", available: false, mods: COFFEE },
    { name: "Matcha Latte", price: 170, serving: "12 oz", mods: ["OAT-MILK", "UPSIZE", "LESS-SUGAR"] },
    { name: "Caramel Macchiato", price: 175, serving: "12 oz", mods: COFFEE },
    { name: "Iced Mocha", price: 170, serving: "16 oz", mods: COFFEE },
    { name: "Calamansi Cooler", price: 110, serving: "16 oz", mods: ["LESS-SUGAR"] },
    { name: "Ensaymada", price: 85, description: "Buttered brioche with queso de bola.", mods: PASTRY },
    { name: "Banana Bread", price: 95, serving: "1 slice", mods: PASTRY },
    { name: "Ham & Cheese Croissant", price: 145, mods: PASTRY },
    { name: "Ube Cheese Pandesal", price: 120, serving: "4 pieces", active: false, mods: PASTRY },
  ],
};

// Delivery platforms charge their commission back as a markup.
const DELIVERY_MARKUP = 1.15;

function toCode(brand: string, name: string) {
  return `${brand}-${name.toUpperCase().replace(/&/g, "AND").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function toRecord(brand: MenuBrand, seed: Seed, index: number): MenuItemRecord {
  const deliveryPrice = Math.round(seed.price * DELIVERY_MARKUP);
  return {
    menu_item_id: `mi-${brand.code.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    brand_id: brand.id,
    code: toCode(brand.code, seed.name),
    name: seed.name,
    description: seed.description ?? null,
    serving_description: seed.serving ?? null,
    recipe: { name: seed.name },
    img_url: null,
    base_price: seed.price.toFixed(2),
    is_available: seed.available ?? true,
    is_active: seed.active ?? true,
    menu_item_channels: (["DINE_IN", "TAKEAWAY", "GRABFOOD", "FOODPANDA"] as const).map((channel) => ({
      order_channel: channel,
      price: (channel === "GRABFOOD" || channel === "FOODPANDA" ? deliveryPrice : seed.price).toFixed(2),
      is_available: !seed.off?.includes(channel),
    })),
    menu_item_modifiers: (seed.mods ?? []).map((code) => {
      const mod = MODIFIERS[code];
      return {
        menu_item_modifier_id: `mim-${brand.code.toLowerCase()}-${index + 1}-${code.toLowerCase()}`,
        additional_price: mod.price.toFixed(2),
        is_available: mod.available ?? true,
        modifier: {
          modifier_id: `mod-${code.toLowerCase()}`,
          code: mod.code,
          name: mod.name,
          description: mod.description ?? null,
          is_active: mod.active ?? true,
        },
      };
    }),
  };
}

export const MOCK_MENU_ITEMS: MenuItemRecord[] = MOCK_BRANDS.flatMap((brand) =>
  SEEDS[brand.code].map((seed, i) => toRecord(brand, seed, i)),
);

export function toMenuItem(record: MenuItemRecord, brands: MenuBrand[]): MenuItem {
  const brand = brands.find((b) => b.id === record.brand_id);
  if (!brand) throw new Error(`Menu item ${record.code} belongs to an unknown brand.`);
  return {
    id: record.menu_item_id,
    code: record.code,
    name: record.name,
    brand,
    description: record.description,
    servingDescription: record.serving_description,
    recipe: record.recipe.name,
    imageUrl: record.img_url,
    basePrice: Number(record.base_price),
    available: record.is_available,
    active: record.is_active,
    channels: record.menu_item_channels.map((c) => ({
      channel: c.order_channel,
      price: Number(c.price),
      available: c.is_available,
    })),
    // An inactive modifier is retired everywhere, so it isn't an option on any item.
    modifiers: record.menu_item_modifiers
      .filter((m) => m.modifier.is_active)
      .map((m) => ({
        id: m.menu_item_modifier_id,
        code: m.modifier.code,
        name: m.modifier.name,
        description: m.modifier.description,
        price: Number(m.additional_price),
        available: m.is_available,
      })),
  };
}
