export const WEB_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN", "RECIPE_MANAGER", "SUPERVISOR", "KITCHEN_HEAD"]);

/** Roles allowed into Staff Accounts (user management). */
export const STAFF_ACCOUNT_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN"]);

/** Roles that see recipe formulation notes; same as the API (RecipesService.hasConfidentialAccess). */
export const RECIPE_NOTES_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN", "RECIPE_MANAGER"]);

/** Roles allowed into Brands. */
export const BRAND_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN"]);

/** Roles that may add and edit recipes; same as the recipe authoring endpoints' @Roles. */
export const RECIPE_AUTHOR_ROLES: ReadonlySet<string> = new Set(["SUPERADMIN", "RECIPE_MANAGER"]);
