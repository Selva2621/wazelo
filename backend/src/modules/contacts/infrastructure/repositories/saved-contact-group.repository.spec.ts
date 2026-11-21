import { PrismaService } from "@/infrastructure/database/prisma.service";
import {
  CreateSavedContactGroupInput,
  SavedContactGroupRepository,
} from "./saved-contact-group.repository";

function makeTx() {
  return {
    savedContactGroupMember: {
      findMany: jest.fn().mockResolvedValue([{ groupId: "old-group" }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    savedContactGroup: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function makeRepo(tx: ReturnType<typeof makeTx>) {
  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  };
  return { repository: new SavedContactGroupRepository(prisma as unknown as PrismaService), prisma };
}

describe("SavedContactGroupRepository", () => {
  it("moves contacts out of old groups, bulk-creates groups + members, and retires emptied groups", async () => {
    const tx = makeTx();
    const { repository, prisma } = makeRepo(tx);
    const groups: CreateSavedContactGroupInput[] = [
      { name: "New group - 001", contactIds: ["contact-1", "contact-2"] },
      { name: "New group - 002", contactIds: ["contact-3"] },
    ];

    const created = await repository.createManyGroups("org-1", groups);

    // Removal is scoped to this org's groups and happens before the inserts
    expect(tx.savedContactGroupMember.deleteMany).toHaveBeenCalledWith({
      where: { contactId: { in: ["contact-1", "contact-2", "contact-3"] }, group: { orgId: "org-1" } },
    });
    expect(tx.savedContactGroupMember.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(tx.savedContactGroup.createMany.mock.invocationCallOrder[0]);

    // One statement for groups, one for all memberships (no per-group round trips)
    expect(tx.savedContactGroup.createMany).toHaveBeenCalledTimes(1);
    expect(tx.savedContactGroupMember.createMany).toHaveBeenCalledTimes(1);
    const members = tx.savedContactGroupMember.createMany.mock.calls[0][0].data;
    expect(members).toHaveLength(3);
    expect(members[0].groupId).toBe(created[0].id);
    expect(members[2].groupId).toBe(created[1].id);

    // The old group that lost its members is soft-deleted only if now empty
    expect(tx.savedContactGroup.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-group"] }, deletedAt: null, members: { none: {} } },
      data: { deletedAt: expect.any(Date) },
    });

    // Large saves get a longer transaction than Prisma's 5s default
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ timeout: 60_000 }));
    expect(created.map((g) => g.contactCount)).toEqual([2, 1]);
  });

  it("moving into a group never retires that target group", async () => {
    const tx = makeTx();
    tx.savedContactGroupMember.findMany.mockResolvedValue([{ groupId: "target" }, { groupId: "other" }]);
    const { repository } = makeRepo(tx);

    await repository.moveContacts("org-1", ["c1"], "target");

    expect(tx.savedContactGroup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["other"] } }) }),
    );
  });
});
