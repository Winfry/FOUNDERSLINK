-- Where an expert practises, when her licence runs out, and the qualification
-- of a certified expert (shared/professions).
ALTER TABLE "expert_profiles" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'KE',
ADD COLUMN "licence_expires_at" TIMESTAMP(3),
ADD COLUMN "qualification" TEXT,
ADD COLUMN "qualification_body" TEXT;
