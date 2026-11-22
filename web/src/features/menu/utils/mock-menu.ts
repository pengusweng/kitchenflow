// Placeholder data until the page is wired to the menu items API. Records use
// the API's snake_case shape so wiring it up only swaps the data source; the
// page itself only ever sees `toMenuItem` output.
import type { Channel, MenuBrand, MenuItem } from "./menu";

type MenuItemChannelRecord = { order_channel: Channel; price: string; is_available: boolean };

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
};

// Brand order here is the order of the brand chips and the table's grouping.
export const MOCK_BRANDS: MenuBrand[] = [
  { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" },
  { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" },
  { id: "b-kk", code: "KK", name: "King Kungs Kafe", accent: "#5C4033" },
];

type Seed = {
  name: string;
  price: number;
  description?: string;
  serving?: string;
  available?: boolean;
  active?: boolean;
  /** Channels the item can't currently be ordered on. */
  off?: Channel[];
};

const SEEDS: Record<string, Seed[]> = {
  GC: [
    { name: "Kimchi Fried Rice", price: 189.5, description: "Aged kimchi, pork belly and a fried egg.", serving: "1 bowl" },
    { name: "Bibimbap", price: 245, description: "Rice, seasoned vegetables, beef and gochujang.", serving: "1 stone bowl" },
    { name: "Japchae", price: 210, serving: "Good for 2" },
    { name: "Tteokbokki", price: 175, description: "Rice cakes in sweet chili sauce with fish cake." },
    { name: "Yangnyeom Chicken", price: 295, serving: "6 pieces" },
    { name: "Soy Garlic Chicken", price: 295, serving: "6 pieces", available: false },
    { name: "Kimbap", price: 165, serving: "10 slices" },
    { name: "Bulgogi Rice Bowl", price: 265, serving: "1 bowl" },
    { name: "Sundubu Jjigae", price: 255, description: "Soft tofu stew, served bubbling.", off: ["FOODPANDA"] },
    { name: "Mandu", price: 160, serving: "8 pieces" },
    { name: "Kimchi Pancake", price: 180 },
    { name: "Samgyeopsal Set", price: 395, serving: "Good for 2", active: false },
    { name: "Cheese Ramyeon", price: 195, serving: "1 pot" },
    { name: "Hotteok", price: 95, description: "Brown sugar and seed filled pancake.", serving: "2 pieces" },
  ],
  AI: [
    { name: "Chicken Inasal Paa", price: 185, description: "Leg quarter grilled over charcoal.", serving: "With rice" },
    { name: "Chicken Inasal Pecho", price: 199, description: "Breast quarter grilled over charcoal.", serving: "With rice", available: false },
    { name: "Pork Liempo Inasal", price: 235, serving: "With rice" },
    { name: "Inasal na Bangus", price: 220, description: "Boneless milkfish, lemongrass and annatto." },
    { name: "Pork Barbecue", price: 150, serving: "3 skewers" },
    { name: "Sinigang na Baboy", price: 260, serving: "Good for 2" },
    { name: "Kare-Kare", price: 320, serving: "Good for 2", available: false },
    { name: "Chicken Sisig", price: 210, serving: "Sizzling plate", available: false },
    { name: "Garlic Rice", price: 45, serving: "1 cup" },
    { name: "Java Rice", price: 50, serving: "1 cup" },
    { name: "Halo-Halo", price: 140, description: "Shaved ice, leche flan and ube.", off: ["GRABFOOD", "FOODPANDA"] },
    { name: "Leche Flan", price: 85, serving: "1 slice" },
  ],
  KK: [
    { name: "Americano", price: 120, serving: "12 oz" },
    { name: "Cafe Latte", price: 150, serving: "12 oz" },
    { name: "Spanish Latte", price: 165, serving: "12 oz" },
    { name: "Ube Latte", price: 175, serving: "12 oz", available: false },
    { name: "Matcha Latte", price: 170, serving: "12 oz" },
    { name: "Caramel Macchiato", price: 175, serving: "12 oz" },
    { name: "Iced Mocha", price: 170, serving: "16 oz" },
    { name: "Calamansi Cooler", price: 110, serving: "16 oz" },
    { name: "Ensaymada", price: 85, description: "Buttered brioche with queso de bola." },
    { name: "Banana Bread", price: 95, serving: "1 slice" },
    { name: "Ham & Cheese Croissant", price: 145 },
    { name: "Ube Cheese Pandesal", price: 120, serving: "4 pieces", active: false },
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
  };
}
