-- What each expert specialises in ("land_property", "tax"...), so a member
-- can find, say, an advocate who knows land law.
ALTER TABLE "expert_profiles" ADD COLUMN "practice_areas" TEXT[] DEFAULT ARRAY[]::TEXT[];
