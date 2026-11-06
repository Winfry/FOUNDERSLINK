-- A report can be marked as handled by an admin, with how and why
-- (FINAL_VERIFICATION 25: every report ever made counted as open).

-- AlterTable
ALTER TABLE "message_reports" ADD COLUMN     "handled_at" TIMESTAMP(3),
ADD COLUMN     "handled_by" UUID,
ADD COLUMN     "handled_note" TEXT,
ADD COLUMN     "handled_outcome" TEXT;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "handled_at" TIMESTAMP(3),
ADD COLUMN     "handled_by" UUID,
ADD COLUMN     "handled_note" TEXT,
ADD COLUMN     "handled_outcome" TEXT;
