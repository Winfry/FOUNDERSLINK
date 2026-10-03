-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "decline_reason" TEXT,
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "pitch" TEXT,
ADD COLUMN     "proposed_amount_kes" INTEGER,
ADD COLUMN     "vision" TEXT;

