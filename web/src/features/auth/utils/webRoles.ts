export const WEB_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN", "RECIPE_MANAGER", "SUPERVISOR", "KITCHEN_HEAD"]);

/** Roles allowed into Staff Accounts (user management). */
export const STAFF_ACCOUNT_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN"]);

/** Roles allowed into Brands. */
export const BRAND_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN"]);
