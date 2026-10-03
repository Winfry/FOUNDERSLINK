-- CreateEnum
CREATE TYPE "Role" AS ENUM ('founder', 'investor', 'expert');

-- CreateEnum
CREATE TYPE "JourneyType" AS ENUM ('startup', 'sme');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('idea', 'informal', 'registered_business_name', 'limited_company');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'founder',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "journey_type" "JourneyType" NOT NULL,
    "business_status" "BusinessStatus" NOT NULL,
    "business_name" TEXT,
    "description" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "funding_amount_kes" INTEGER,
    "use_of_funds" TEXT,
    "stage" TEXT,
    "instruments" TEXT[],
    "months_trading" INTEGER,
    "monthly_revenue_band" TEXT,
    "has_employees" BOOLEAN,
    "already_have" TEXT[],
    "women_owned" BOOLEAN,
    "youth_owned" BOOLEAN,
    "pwd_owned" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "founder_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "founder_profiles_user_id_key" ON "founder_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "founder_profiles" ADD CONSTRAINT "founder_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
