-- One immutable snapshot per recipe version: the recipe row, its ingredients and its steps as JSONB.

-- CreateTable
CREATE TABLE "recipe_histories" (
    "recipe_history_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "recipe_snapshot" JSONB NOT NULL,
    "ingredients_snapshot" JSONB NOT NULL,
    "steps_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_histories_pkey" PRIMARY KEY ("recipe_history_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_histories_recipe_id_version_key" ON "recipe_histories"("recipe_id", "version");

-- AddForeignKey
ALTER TABLE "recipe_histories" ADD CONSTRAINT "recipe_histories_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("recipe_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
