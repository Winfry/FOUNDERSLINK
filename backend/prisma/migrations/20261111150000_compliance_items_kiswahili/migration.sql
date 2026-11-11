-- Kiswahili wording for compliance items, shown to members who chose Kiswahili.
ALTER TABLE "compliance_items" ADD COLUMN "title_sw" TEXT,
ADD COLUMN "why_sw" TEXT,
ADD COLUMN "when_to_get_help_sw" TEXT;
