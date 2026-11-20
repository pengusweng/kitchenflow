import type { BrandResponse } from "../schemas/brandSchema";

export type BrandStatus = "active" | "inactive";
export type BrandStatusFilter = "all" | BrandStatus;

export const BRANDS_PAGE_SIZE = 15;

export type Brand = {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
  status: BrandStatus;
  /** Display-ready, e.g. "Oct 31, 2026, 4:00 PM" (Manila time). */
  createdAt: string;
  modifiedAt: string;
};

const dateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function toBrand(brand: BrandResponse): Brand {
  return {
    id: brand.brand_id,
    code: brand.code,
    name: brand.name,
    logoUrl: brand.logo_url,
    status: brand.is_active ? "active" : "inactive",
    createdAt: dateTime.format(new Date(brand.created_at)),
    modifiedAt: dateTime.format(new Date(brand.modified_at)),
  };
}

// Placeholder responses until the brands API is wired up.
const PLACEHOLDER_BRANDS: BrandResponse[] = [
  {
    brand_id: "00000000-0000-4000-8000-000000000001",
    code: "GC",
    name: "Gamcheon",
    logo_url: null,
    is_active: true,
    created_at: "2026-10-31T08:00:00.000Z",
    modified_at: "2026-10-31T08:00:00.000Z",
  },
  {
    brand_id: "00000000-0000-4000-8000-000000000002",
    code: "AI",
    name: "Aurelia Inasal",
    logo_url: null,
    is_active: true,
    created_at: "2026-10-31T08:00:00.000Z",
    modified_at: "2026-11-02T09:30:00.000Z",
  },
  {
    brand_id: "00000000-0000-4000-8000-000000000003",
    code: "KK",
    name: "King Kungs",
    logo_url: null,
    is_active: false,
    created_at: "2026-10-31T08:00:00.000Z",
    modified_at: "2026-11-10T14:15:00.000Z",
  },
];

export const BRANDS: Brand[] = PLACEHOLDER_BRANDS.map(toBrand);
