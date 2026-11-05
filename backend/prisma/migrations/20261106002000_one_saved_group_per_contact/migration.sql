WITH ranked_memberships AS (
    SELECT
        member."id",
        ROW_NUMBER() OVER (
            PARTITION BY member."contact_id"
            ORDER BY member."created_at", group_record."created_at", group_record."id", member."id"
        ) AS membership_rank
    FROM "saved_contact_group_members" AS member
    INNER JOIN "saved_contact_groups" AS group_record
        ON group_record."id" = member."group_id"
)
DELETE FROM "saved_contact_group_members" AS member
USING ranked_memberships
WHERE member."id" = ranked_memberships."id"
  AND ranked_memberships.membership_rank > 1;

DROP INDEX "saved_contact_group_members_group_id_contact_id_key";
DROP INDEX "saved_contact_group_members_contact_id_idx";
CREATE UNIQUE INDEX "saved_contact_group_members_contact_id_key"
    ON "saved_contact_group_members"("contact_id");
