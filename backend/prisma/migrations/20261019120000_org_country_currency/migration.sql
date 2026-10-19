-- Org country + currency: phone numbers without a country code are read as the
-- org's country; deals and products default to its currency.
ALTER TABLE "organizations" ADD COLUMN "country" VARCHAR(2) NOT NULL DEFAULT 'IN';
ALTER TABLE "organizations" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'INR';

-- Contacts saved without a "+" (manual, CSV, Shopify) to E.164. Every existing org
-- is IN, so 10-digit and 0-prefixed numbers get +91; 11-13 digits already carry a
-- country code. Skipped when the E.164 form already exists in the org (no duplicates).
UPDATE "contacts" c
SET "phone_number" = n.e164, "updated_at" = now()
FROM (
  SELECT DISTINCT ON (s.org_id, s.e164) s.id, s.org_id, s.e164
  FROM (
    SELECT id, org_id,
      CASE
        WHEN d ~ '^0[0-9]{10}$' THEN '+91' || substr(d, 2)
        WHEN length(d) = 10 THEN '+91' || d
        WHEN length(d) BETWEEN 11 AND 13 THEN '+' || d
      END AS e164
    FROM (
      SELECT id, org_id, regexp_replace(phone_number, '[^0-9]', '', 'g') AS d
      FROM "contacts"
      WHERE deleted_at IS NULL
        AND phone_number !~ '^\+'
        AND phone_number ~ '^[0-9 ()./-]+$'
    ) raw
  ) s
  WHERE s.e164 IS NOT NULL
  ORDER BY s.org_id, s.e164, s.id
) n
WHERE c.id = n.id
  AND NOT EXISTS (
    SELECT 1 FROM "contacts" x
    WHERE x.org_id = n.org_id AND x.phone_number = n.e164 AND x.deleted_at IS NULL
  );
