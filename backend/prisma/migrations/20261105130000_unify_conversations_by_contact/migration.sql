-- Keep one WhatsApp conversation per contact within each organization, even
-- when the contact messages from another WhatsApp session.
CREATE TEMP TABLE "_conversation_merge_map" AS
WITH normalized AS (
  SELECT
    id,
    org_id,
    contact_phone,
    CASE
      WHEN regexp_replace(contact_phone, '[^0-9]', '', 'g') <> ''
        THEN '+' || regexp_replace(contact_phone, '[^0-9]', '', 'g')
      ELSE contact_phone
    END AS normalized_phone,
    deleted_at,
    last_message_at,
    created_at
  FROM conversations
  WHERE session_id IS NOT NULL
),
ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY org_id, normalized_phone
      ORDER BY (deleted_at IS NULL) DESC, last_message_at DESC NULLS LAST, created_at, id
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY org_id, normalized_phone
      ORDER BY (deleted_at IS NULL) DESC, last_message_at DESC NULLS LAST, created_at, id
    ) AS position
  FROM normalized
)
SELECT id AS duplicate_id, keeper_id
FROM ranked
WHERE position > 1;

-- A conversation can have at most one label, survey, and AI summary of each
-- kind. Remove duplicates that will collide when their conversation IDs merge.
DELETE FROM conversation_labels
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      label.id,
      row_number() OVER (
        PARTITION BY COALESCE(merge.keeper_id, label.conversation_id), label.name
        ORDER BY (merge.duplicate_id IS NULL) DESC, label.created_at, label.id
      ) AS position
    FROM conversation_labels AS label
    LEFT JOIN "_conversation_merge_map" AS merge
      ON merge.duplicate_id = label.conversation_id
  ) AS ranked
  WHERE position > 1
);

DELETE FROM csat_surveys
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      survey.id,
      row_number() OVER (
        PARTITION BY COALESCE(merge.keeper_id, survey.conversation_id)
        ORDER BY (merge.duplicate_id IS NULL) DESC, survey.sent_at DESC, survey.created_at DESC, survey.id
      ) AS position
    FROM csat_surveys AS survey
    LEFT JOIN "_conversation_merge_map" AS merge
      ON merge.duplicate_id = survey.conversation_id
  ) AS ranked
  WHERE position > 1
);

DELETE FROM ai_conversation_summaries
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      summary.id,
      row_number() OVER (
        PARTITION BY COALESCE(merge.keeper_id, summary.conversation_id)
        ORDER BY (merge.duplicate_id IS NULL) DESC, summary.generated_at DESC, summary.id
      ) AS position
    FROM ai_conversation_summaries AS summary
    LEFT JOIN "_conversation_merge_map" AS merge
      ON merge.duplicate_id = summary.conversation_id
  ) AS ranked
  WHERE position > 1
);

-- Repoint all conversation history and feature records before removing
-- duplicate conversation rows.
UPDATE messages AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE conversation_labels AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE sla_trackings AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE sla_breach_logs AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE csat_surveys AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE chatbot_sessions AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE ai_conversation_summaries AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE ai_reply_logs AS item
SET conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.conversation_id = merge.duplicate_id;

UPDATE kb_misses AS item
SET last_conversation_id = merge.keeper_id
FROM "_conversation_merge_map" AS merge
WHERE item.last_conversation_id = merge.duplicate_id;

-- Preserve the latest conversation context and unread counts on each keeper.
UPDATE conversations AS keeper
SET
  contact_phone = CASE
    WHEN regexp_replace(keeper.contact_phone, '[^0-9]', '', 'g') <> ''
      THEN '+' || regexp_replace(keeper.contact_phone, '[^0-9]', '', 'g')
    ELSE keeper.contact_phone
  END,
  session_id = COALESCE((
    SELECT source.session_id
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
    ORDER BY source.last_message_at DESC NULLS LAST, source.updated_at DESC, source.id
    LIMIT 1
  ), keeper.session_id),
  contact_id = COALESCE(keeper.contact_id, (
    SELECT source.contact_id
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
      AND source.contact_id IS NOT NULL
    ORDER BY source.last_message_at DESC NULLS LAST, source.updated_at DESC, source.id
    LIMIT 1
  )),
  last_message_at = (
    SELECT max(source.last_message_at)
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
  ),
  last_message_body = (
    SELECT source.last_message_body
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
      AND source.last_message_at IS NOT NULL
    ORDER BY source.last_message_at DESC, source.updated_at DESC, source.id
    LIMIT 1
  ),
  unread_count = (
    SELECT sum(source.unread_count)
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
  ),
  assigned_to_id = COALESCE(keeper.assigned_to_id, (
    SELECT source.assigned_to_id
    FROM conversations AS source
    LEFT JOIN "_conversation_merge_map" AS source_merge
      ON source_merge.duplicate_id = source.id
    WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
      AND source.assigned_to_id IS NOT NULL
    ORDER BY source.last_message_at DESC NULLS LAST, source.updated_at DESC, source.id
    LIMIT 1
  )),
  deleted_at = CASE
    WHEN EXISTS (
      SELECT 1
      FROM conversations AS source
      LEFT JOIN "_conversation_merge_map" AS source_merge
        ON source_merge.duplicate_id = source.id
      WHERE COALESCE(source_merge.keeper_id, source.id) = keeper.id
        AND source.deleted_at IS NULL
    ) THEN NULL
    ELSE keeper.deleted_at
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE keeper.session_id IS NOT NULL
  AND keeper.id NOT IN (
  SELECT duplicate_id FROM "_conversation_merge_map"
);

DELETE FROM conversations
WHERE id IN (SELECT duplicate_id FROM "_conversation_merge_map");

UPDATE conversations
SET contact_phone = CASE
  WHEN regexp_replace(contact_phone, '[^0-9]', '', 'g') <> ''
    THEN '+' || regexp_replace(contact_phone, '[^0-9]', '', 'g')
  ELSE contact_phone
END
WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX "conversations_org_id_contact_phone_whatsapp_key"
  ON conversations("org_id", "contact_phone")
  WHERE "session_id" IS NOT NULL;

DROP TABLE "_conversation_merge_map";
