-- AlterTable
ALTER TABLE "compliance_items" ADD COLUMN     "applies_when" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "deal_type" TEXT,
ADD COLUMN     "documents_needed" TEXT,
ADD COLUMN     "finance_act_year" INTEGER,
ADD COLUMN     "jurisdiction_level" TEXT NOT NULL DEFAULT 'national',
ADD COLUMN     "next_review_at" TIMESTAMP(3),
ADD COLUMN     "owner" TEXT,
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'business',
ADD COLUMN     "when_to_get_help" TEXT;

-- AlterTable
ALTER TABLE "founder_profiles" ADD COLUMN     "handles_personal_data" BOOLEAN;

-- CreateTable
CREATE TABLE "compliance_status" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_deadlines" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,

    CONSTRAINT "compliance_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_questions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "citations" JSONB NOT NULL,
    "confident" BOOLEAN NOT NULL,
    "engine" TEXT NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_status_entity_type_entity_id_item_id_key" ON "compliance_status"("entity_type", "entity_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_deadlines_entity_type_entity_id_item_id_key" ON "compliance_deadlines"("entity_type", "entity_id", "item_id");

-- AddForeignKey
ALTER TABLE "compliance_status" ADD CONSTRAINT "compliance_status_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "compliance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_status" ADD CONSTRAINT "compliance_status_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_deadlines" ADD CONSTRAINT "compliance_deadlines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "compliance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_deadlines" ADD CONSTRAINT "compliance_deadlines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_questions" ADD CONSTRAINT "compliance_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Move what founders ticked in onboarding into compliance_status, which
-- is now the one place that says what a founder already has.
INSERT INTO "compliance_status" ("id", "entity_type", "entity_id", "item_id", "status", "updated_by", "updated_at")
SELECT gen_random_uuid(), 'business', fp."user_id", have.item_id, 'complete', fp."user_id", NOW()
FROM "founder_profiles" fp
CROSS JOIN LATERAL unnest(fp."already_have") AS have(item_id)
WHERE have.item_id IN (SELECT "id" FROM "compliance_items");

-- AlterTable
ALTER TABLE "founder_profiles" DROP COLUMN "already_have";
