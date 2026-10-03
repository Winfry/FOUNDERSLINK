-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('draft', 'submitted', 'in_review', 'needs_info', 'approved', 'rejected', 'suspended', 'banned');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'admin';

-- AlterTable
ALTER TABLE "funders" ADD COLUMN     "claimed_by_user_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'draft';

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organisation_name" TEXT NOT NULL,
    "job_title" TEXT,
    "organisation_website" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profession" TEXT NOT NULL,
    "organisation_name" TEXT,
    "register_body" TEXT,
    "register_number" TEXT,
    "bio" TEXT NOT NULL,
    "sectors" TEXT[],
    "counties" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vetting_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" TEXT,
    "organisation_name" TEXT,
    "organisation_website" TEXT,
    "statement" TEXT,
    "references" TEXT,
    "claims_funder_id" UUID,
    "risk_level" TEXT,
    "risk_signals" TEXT[],
    "submitted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decided_by" UUID,
    "decision_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vetting_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vetting_checks" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "check_type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "checked_by" UUID NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vetting_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_portfolio" (
    "id" UUID NOT NULL,
    "investor_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "stage" TEXT,
    "year" INTEGER,
    "instrument" TEXT,
    "amount_range" TEXT,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "company_consented" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_ventures" (
    "id" UUID NOT NULL,
    "founder_id" UUID NOT NULL,
    "venture_name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "years" TEXT,
    "outcome" TEXT,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "founder_ventures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investor_profiles_user_id_key" ON "investor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_user_id_key" ON "expert_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vetting_applications_user_id_key" ON "vetting_applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "funders_claimed_by_user_id_key" ON "funders"("claimed_by_user_id");

-- AddForeignKey
ALTER TABLE "funders" ADD CONSTRAINT "funders_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vetting_applications" ADD CONSTRAINT "vetting_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vetting_checks" ADD CONSTRAINT "vetting_checks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "vetting_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_portfolio" ADD CONSTRAINT "investor_portfolio_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "founder_ventures" ADD CONSTRAINT "founder_ventures_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

