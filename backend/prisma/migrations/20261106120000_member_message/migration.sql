-- What an applicant is told about a decision, kept apart from the admin's
-- reason, which stays internal (FINAL_VERIFICATION section 4, item 12).

-- AlterTable
ALTER TABLE "vetting_applications" ADD COLUMN     "member_message" TEXT;
