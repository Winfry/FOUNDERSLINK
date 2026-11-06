-- Chamas are for founders saving together (TEAM_DECISIONS D15). Someone
-- who is not a founder and joined a chama before that rule is taken out of
-- its chat. Nothing else is touched: her membership row, the payments she
-- made and the messages she sent all stay as the chama's history.
DELETE FROM "conversation_members" AS cm
USING "conversations" AS c, "users" AS u
WHERE cm."conversation_id" = c."id"
  AND c."type" = 'circle'
  AND cm."user_id" = u."id"
  AND u."role" <> 'founder';
