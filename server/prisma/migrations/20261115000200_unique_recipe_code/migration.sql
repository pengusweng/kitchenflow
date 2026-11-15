-- One row per recipe code; version is bumped in place instead of adding rows.
-- Fails if two existing recipes share a code (older versions must be removed first).

-- DropIndex
DROP INDEX "recipes_code_version_key";

-- CreateIndex
CREATE UNIQUE INDEX "recipes_code_key" ON "recipes"("code");
