-- Track when a recipe ingredient was last changed; existing rows start at the migration time.

-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "modified_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
