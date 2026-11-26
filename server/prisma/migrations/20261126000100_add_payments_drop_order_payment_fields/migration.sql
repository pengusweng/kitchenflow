-- AlterTable
ALTER TABLE "orders" DROP COLUMN "payment_method",
DROP COLUMN "payment_reference";

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "received_by_id" UUID NOT NULL,
    "payment_method" "payment_methods" NOT NULL,
    "payment_reference" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_tendered" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

