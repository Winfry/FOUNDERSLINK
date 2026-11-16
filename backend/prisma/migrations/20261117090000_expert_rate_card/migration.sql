-- What an expert charges: her rate card, shown to members.
ALTER TABLE "expert_profiles" ADD COLUMN "rate_card" JSONB NOT NULL DEFAULT '[]';
