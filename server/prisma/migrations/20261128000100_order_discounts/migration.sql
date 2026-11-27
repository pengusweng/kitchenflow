-- CreateEnum
CREATE TYPE "discount_types" AS ENUM ('SENIOR_CITIZEN', 'PWD');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: no order has a discount yet, so the amount due is the subtotal.
UPDATE "orders" SET "total" = "subtotal";

-- CreateTable
CREATE TABLE "order_discounts" (
    "order_discount_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "applied_by_id" UUID NOT NULL,
    "discount_type" "discount_types" NOT NULL,
    "id_number" VARCHAR(64) NOT NULL,
    "holder_name" VARCHAR(255) NOT NULL,
    "vat_exempt_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "applied_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_discounts_pkey" PRIMARY KEY ("order_discount_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_discounts_order_id_key" ON "order_discounts"("order_id");

-- AddForeignKey
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
