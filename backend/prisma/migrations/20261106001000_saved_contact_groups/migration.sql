CREATE TABLE "saved_contact_groups" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_contact_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_contact_group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_contact_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_contact_groups_org_id_name_key"
    ON "saved_contact_groups"("org_id", "name");
CREATE INDEX "saved_contact_groups_org_id_created_at_idx"
    ON "saved_contact_groups"("org_id", "created_at");
CREATE UNIQUE INDEX "saved_contact_group_members_group_id_contact_id_key"
    ON "saved_contact_group_members"("group_id", "contact_id");
CREATE INDEX "saved_contact_group_members_contact_id_idx"
    ON "saved_contact_group_members"("contact_id");

ALTER TABLE "saved_contact_groups"
    ADD CONSTRAINT "saved_contact_groups_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_contact_group_members"
    ADD CONSTRAINT "saved_contact_group_members_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "saved_contact_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_contact_group_members"
    ADD CONSTRAINT "saved_contact_group_members_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
