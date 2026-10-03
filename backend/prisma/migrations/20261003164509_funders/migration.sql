-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "why" TEXT,
    "institution" TEXT,
    "source_url" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mandate_text" TEXT NOT NULL,
    "journey_types" "JourneyType"[],
    "sectors" TEXT[],
    "stages" TEXT[],
    "counties" TEXT[],
    "instruments" TEXT[],
    "ticket_min_kes" INTEGER NOT NULL,
    "ticket_max_kes" INTEGER NOT NULL,
    "requirements" TEXT[],
    "eligibility" TEXT[],
    "application_fee_kes" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "how_to_apply_url" TEXT,
    "source_url" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funders_name_key" ON "funders"("name");
