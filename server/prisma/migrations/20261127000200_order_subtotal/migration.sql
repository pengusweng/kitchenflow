-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill orders that already have confirmed line prices.
-- subtotal = sum of quantity × (unit_price + each modifier's additional_price)
UPDATE "orders" AS o
SET "subtotal" = totals."subtotal"
FROM (
  SELECT
    oi."order_id",
    SUM(
      oi."quantity" * (
        oi."unit_price" + COALESCE((
          SELECT SUM(oim."additional_price")
          FROM "order_item_modifiers" AS oim
          WHERE oim."order_item_id" = oi."order_item_id"
        ), 0)
      )
    ) AS "subtotal"
  FROM "order_items" AS oi
  GROUP BY oi."order_id"
) AS totals
WHERE o."order_id" = totals."order_id"
  AND o."status" <> 'DRAFT';
