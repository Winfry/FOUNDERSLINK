-- AlterTable
ALTER TABLE "vetting_applications" ADD COLUMN     "first_approved_by" UUID,
ADD COLUMN     "recheck_due_at" TIMESTAMP(3),
ADD COLUMN     "recheck_reason" TEXT;

