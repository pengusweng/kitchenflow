-- Menu item modifier assignments are now hard deleted, so the soft-delete flag goes.
-- Rows already soft deleted (is_available = false) are removed first; otherwise
-- dropping the column would bring them back as live add-ons.

-- DeleteSoftDeletedRows
DELETE FROM "menu_item_modifiers" WHERE "is_available" = false;

-- AlterTable
ALTER TABLE "menu_item_modifiers" DROP COLUMN "is_available";
