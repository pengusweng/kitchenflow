import type { BrandResponse } from "../schemas/brandSchema";

export type BrandStatus = "active" | "inactive";
export type BrandStatusFilter = "all" | BrandStatus;

export type Brand = {
  id: string;
  code: string;
  name: string;
  /** A display URL, or null when the brand has no logo. */
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
    // Write responses carry the stored key (uploads/…) rather than a URL; never use that as an image source.
    logoUrl: brand.logo_url && /^https?:\/\//.test(brand.logo_url) ? brand.logo_url : null,
    status: brand.is_active ? "active" : "inactive",
    createdAt: dateTime.format(new Date(brand.created_at)),
    modifiedAt: dateTime.format(new Date(brand.modified_at)),
  };
}
