-- The Founder Copilot (phase 1). Tasks start as suggestions and become
-- real only when the founder approves them; every step is logged.

-- CreateTable
CREATE TABLE "founder_tasks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "source" TEXT NOT NULL DEFAULT 'copilot',
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "done_at" TIMESTAMP(3),

    CONSTRAINT "founder_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "copilot_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "founder_tasks_user_id_status_idx" ON "founder_tasks"("user_id", "status");

-- CreateIndex
CREATE INDEX "copilot_events_user_id_created_at_idx" ON "copilot_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "founder_tasks" ADD CONSTRAINT "founder_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copilot_events" ADD CONSTRAINT "copilot_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
