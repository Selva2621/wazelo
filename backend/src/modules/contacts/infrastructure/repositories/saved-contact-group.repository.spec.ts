import { PrismaService } from "@/infrastructure/database/prisma.service";
import {
  CreateSavedContactGroupInput,
  SavedContactGroupRepository,
} from "./saved-contact-group.repository";

describe("SavedContactGroupRepository", () => {
  it("moves selected contacts out of their previous groups before creating memberships", async () => {
    const tx = {
      savedContactGroupMember: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      savedContactGroup: {
        create: jest
          .fn()
          .mockResolvedValueOnce({
            id: "new-group",
            name: "New group",
            createdAt: new Date("2026-11-06T00:00:00Z"),
          })
          .mockResolvedValueOnce({
            id: "new-group-002",
            name: "New group - 002",
            createdAt: new Date("2026-11-06T00:00:00Z"),
          }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const repository = new SavedContactGroupRepository(prisma);
    const groups: CreateSavedContactGroupInput[] = [
      { name: "New group", contactIds: ["contact-1", "contact-2"] },
      { name: "New group - 002", contactIds: ["contact-3"] },
    ];

    await repository.createManyGroups("org-1", groups);

    expect(tx.savedContactGroupMember.deleteMany).toHaveBeenCalledWith({
      where: {
        contactId: { in: ["contact-1", "contact-2", "contact-3"] },
      },
    });
    expect(tx.savedContactGroupMember.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(tx.savedContactGroup.create.mock.invocationCallOrder[0]);
    expect(tx.savedContactGroupMember.createMany).toHaveBeenCalledTimes(2);
  });
});
