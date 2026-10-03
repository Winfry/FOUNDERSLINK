-- AlterTable
ALTER TABLE "circles" ADD COLUMN     "paybill_number" TEXT;

-- AlterTable
ALTER TABLE "payment_records" ADD COLUMN     "payer_label" TEXT,
ALTER COLUMN "member_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "circles_paybill_number_key" ON "circles"("paybill_number");

