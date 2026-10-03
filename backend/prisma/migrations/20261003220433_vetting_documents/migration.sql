-- CreateTable
CREATE TABLE "vetting_documents" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "rejection_reason" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "delete_after" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vetting_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vetting_documents" ADD CONSTRAINT "vetting_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "vetting_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

