-- Resource scopes (messages, contacts) are now enforced on the Developer API.
-- Before this, every key could reach every resource, so grant both to existing
-- keys to keep current integrations working. read/write are left as they are.
UPDATE "api_keys"
SET "scopes" = ARRAY(
  SELECT DISTINCT unnest("scopes" || ARRAY['messages', 'contacts']::text[])
)
WHERE NOT ("scopes" @> ARRAY['messages', 'contacts']::text[]);
