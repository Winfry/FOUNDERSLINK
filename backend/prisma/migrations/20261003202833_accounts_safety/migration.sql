-- AlterTable
ALTER TABLE "users" ADD COLUMN     "message_permission" TEXT NOT NULL DEFAULT 'anyone',
ADD COLUMN     "notification_channel" TEXT NOT NULL DEFAULT 'in_app',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phone_verified_at" TIMESTAMP(3),
ADD COLUMN     "preferred_language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "share_contact" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "phone_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "phone_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_codes_user_id_key" ON "phone_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporter_id_reported_user_id_key" ON "reports"("reporter_id", "reported_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "phone_codes" ADD CONSTRAINT "phone_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

