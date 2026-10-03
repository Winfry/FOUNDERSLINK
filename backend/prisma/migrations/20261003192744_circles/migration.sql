-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "circle_id" UUID;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "circle_id" UUID;

-- AlterTable
ALTER TABLE "funders" ADD COLUMN     "serves_groups" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "circles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "sector" TEXT,
    "county" TEXT,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "contribution_amount_kes" INTEGER,
    "contribution_frequency" TEXT,
    "registration_status" TEXT NOT NULL DEFAULT 'unregistered',
    "registration_number" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_members" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_invites" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "max_uses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_goals" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "target_amount_kes" INTEGER,
    "target_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "goal_id" UUID,
    "amount_kes" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "mpesa_receipt" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "matched_status" TEXT NOT NULL DEFAULT 'matched',
    "note" TEXT,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_notes" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'note',
    "held_at" TIMESTAMP(3),
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_decisions" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "circle_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_votes" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "choice" TEXT NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "circle_members_circle_id_user_id_key" ON "circle_members"("circle_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "circle_invites_token_key" ON "circle_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_circle_id_mpesa_receipt_key" ON "payment_records"("circle_id", "mpesa_receipt");

-- CreateIndex
CREATE UNIQUE INDEX "circle_votes_decision_id_user_id_key" ON "circle_votes"("decision_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_circle_id_key" ON "conversations"("circle_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_goals" ADD CONSTRAINT "circle_goals_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "circle_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_notes" ADD CONSTRAINT "circle_notes_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_notes" ADD CONSTRAINT "circle_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_decisions" ADD CONSTRAINT "circle_decisions_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_votes" ADD CONSTRAINT "circle_votes_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "circle_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_votes" ADD CONSTRAINT "circle_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

