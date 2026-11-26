-- One payment per order. Fails if an order already has more than one payment.

-- DropIndex
DROP INDEX "payments_order_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
