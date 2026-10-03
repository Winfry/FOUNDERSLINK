-- AlterTable
ALTER TABLE "expert_profiles" ADD COLUMN     "office_hours_per_month" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "services" TEXT[];

-- CreateTable
CREATE TABLE "office_hours" (
    "id" UUID NOT NULL,
    "expert_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "office_hours_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "office_hours" ADD CONSTRAINT "office_hours_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_hours" ADD CONSTRAINT "office_hours_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

