-- Replace free-text recipe instructions with structured ingredients and steps.
-- Drops recipes.instructions, notes and serving_description; existing values are not carried over.

-- CreateEnum
CREATE TYPE "material_categories" AS ENUM ('RAW', 'PREPARED', 'PACKAGING');

-- CreateEnum
CREATE TYPE "unit_dimension" AS ENUM ('MASS', 'VOLUME', 'COUNT');

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "instructions",
DROP COLUMN "notes",
DROP COLUMN "serving_description",
ADD COLUMN     "formulation_notes" VARCHAR(5000);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "recipe_ingredient_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(16) NOT NULL,
    "note" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("recipe_ingredient_id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "recipe_step_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "instruction" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("recipe_step_id")
);

-- CreateTable
CREATE TABLE "units" (
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "dimension" "unit_dimension" NOT NULL,
    "to_base" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_unit_idx" ON "recipe_ingredients"("unit");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipe_id_step_no_key" ON "recipe_steps"("recipe_id", "step_no");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_unit_fkey" FOREIGN KEY ("unit") REFERENCES "units"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

