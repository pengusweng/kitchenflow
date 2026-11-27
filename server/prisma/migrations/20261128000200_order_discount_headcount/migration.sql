-- AlterTable: existing discounts covered the whole order, i.e. one holder dining alone.
ALTER TABLE "order_discounts" ADD COLUMN     "diners" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "holders" INTEGER NOT NULL DEFAULT 1;
