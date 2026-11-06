-- Funding comes from investors only: no grants and no loan products
-- (TEAM_DECISIONS D11; FINAL_VERIFICATION section 4, item 6). Choices
-- people edit drop them, so a profile saved with one can be saved again.
-- Past investments in a track record are history and stay as recorded.
UPDATE "founder_profiles" SET "instruments" = array_remove(array_remove("instruments", 'loan'), 'grant')
WHERE "instruments" && ARRAY['loan', 'grant'];
UPDATE "funders" SET "instruments" = array_remove(array_remove("instruments", 'loan'), 'grant')
WHERE "instruments" && ARRAY['loan', 'grant'];
