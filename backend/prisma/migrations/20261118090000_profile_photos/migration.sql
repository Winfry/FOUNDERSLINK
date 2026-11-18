-- A member's photo (optional). The file is on disk, encrypted; this row
-- says where, and holds the random token in its address.
CREATE TABLE "profile_photos" (
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "profile_photos_token_key" ON "profile_photos"("token");

ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
