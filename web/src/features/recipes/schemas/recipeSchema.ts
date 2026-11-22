import { z } from "zod";

// Prisma sends Decimal(12, 3) quantities as strings ("250" or "250.000"); keep them as text.
const quantitySchema = z.union([z.string(), z.number()]).transform(String);

/** A recipe row. formulation_notes only comes back to recipe managers and superadmins. */
export const recipeRecordSchema = z.object({
  recipe_id: z.uuid(),
  brand_id: z.uuid(),
  code: z.string(),
  name: z.string(),
  version: z.number().int(),
  is_active: z.boolean(),
  formulation_notes: z.string().nullable().optional(),
  created_at: z.iso.datetime(),
  modified_at: z.iso.datetime(),
});

const statusCountsSchema = z.object({
  all: z.number().int(),
  active: z.number().int(),
  inactive: z.number().int(),
});

/** GET /api/recipes */
export const recipesPageSchema = z.object({
  data: z.array(recipeRecordSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    counts: statusCountsSchema,
  }),
});

export const ingredientRecordSchema = z.object({
  recipe_ingredient_id: z.uuid(),
  ingredient_name: z.string(),
  quantity: quantitySchema,
  unit_code: z.string(),
  note: z.string().nullable(),
});

export const stepRecordSchema = z.object({
  recipe_step_id: z.uuid(),
  step_no: z.number().int(),
  instruction: z.string(),
});

/** POST /api/recipes and PATCH /api/recipes/:id: the recipe with its ingredients and steps. */
export const authoredRecipeSchema = recipeRecordSchema.extend({
  ingredients: z.array(ingredientRecordSchema),
  steps: z.array(stepRecordSchema),
});

/** DELETE /api/recipes/:id and PATCH /api/recipes/:id/reactivate. */
export const recipeStatusSchema = z.object({ recipe_id: z.uuid(), is_active: z.boolean() });

/** GET /api/recipe-histories/recipe/:recipeId, newest version first. Snapshots are the rows as saved. */
export const recipeHistorySchema = z.object({
  recipe_history_id: z.uuid(),
  version: z.number().int(),
  recipe_snapshot: z.object({
    code: z.string(),
    name: z.string(),
    formulation_notes: z.string().nullable().optional(),
  }),
  ingredients_snapshot: z.array(ingredientRecordSchema),
  steps_snapshot: z.array(stepRecordSchema),
  created_at: z.iso.datetime(),
});

/** GET /api/menu-items?recipe_id=… keeps only these fields of each item. */
export const recipeMenuItemsSchema = z.object({
  data: z.array(
    z.object({
      menu_item_id: z.uuid(),
      code: z.string(),
      name: z.string(),
      is_active: z.boolean(),
    }),
  ),
  meta: z.object({ total: z.number().int() }),
});

export type RecipeRecord = z.infer<typeof recipeRecordSchema>;
export type RecipesPage = z.infer<typeof recipesPageSchema>;
export type IngredientRecord = z.infer<typeof ingredientRecordSchema>;
export type StepRecord = z.infer<typeof stepRecordSchema>;
export type AuthoredRecipe = z.infer<typeof authoredRecipeSchema>;
export type RecipeHistoryRecord = z.infer<typeof recipeHistorySchema>;
export type RecipeMenuItems = z.infer<typeof recipeMenuItemsSchema>;
