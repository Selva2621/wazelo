import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { CAMPAIGN_CONFIG } from "@/common/constants";
import { SavedContactGroupRepository } from "../../infrastructure/repositories/saved-contact-group.repository";
import { ListContactsUseCase } from "./list-contacts.use-case";
import {
  SavedContactGroupsUseCase,
  chunkIntoGroups,
  nextGroupNumber,
} from "./saved-contact-groups.use-case";

function makeUseCase(repo: Record<string, jest.Mock>, scope = {}) {
  const repository: Record<string, jest.Mock> = {
    countActiveContacts: jest.fn(),
    findExistingNames: jest.fn().mockResolvedValue([]),
    moveImpact: jest.fn().mockResolvedValue({ alreadyGrouped: 0, groups: [] }),
    createManyGroups: jest.fn(),
    ...repo,
  };
  const listContacts = { resolveOwnerScope: jest.fn().mockResolvedValue(scope) };
  const useCase = new SavedContactGroupsUseCase(
    repository as unknown as SavedContactGroupRepository,
    listContacts as unknown as ListContactsUseCase,
  );
  return { useCase, repository, listContacts };
}

describe("SavedContactGroupsUseCase", () => {
  it("splits selected contacts into named groups of the default batch size", async () => {
    const batchSize = CAMPAIGN_CONFIG.BATCH_SIZE;
    const contactIds = Array.from({ length: batchSize * 2 + 5 }, (_, i) => `contact-${i}`);
    const { useCase, repository } = makeUseCase({
      countActiveContacts: jest.fn().mockResolvedValue(contactIds.length),
      createManyGroups: jest.fn().mockResolvedValue([]),
    });

    const result = await useCase.create("org-1", "u1", "ADMIN", "Spring leads", contactIds);

    expect(result.batchSize).toBe(batchSize);
    expect(repository.createManyGroups).toHaveBeenCalledWith("org-1", [
      { name: "Spring leads - 001", contactIds: contactIds.slice(0, batchSize) },
      { name: "Spring leads - 002", contactIds: contactIds.slice(batchSize, batchSize * 2) },
      { name: "Spring leads - 003", contactIds: contactIds.slice(batchSize * 2) },
    ]);
  });

  it("honours a custom group size and reports contacts moved out of other groups", async () => {
    const { useCase, repository } = makeUseCase({
      countActiveContacts: jest.fn().mockResolvedValue(5),
      moveImpact: jest.fn().mockResolvedValue({ alreadyGrouped: 2, groups: [{ id: "old", name: "Leads", count: 2 }] }),
      createManyGroups: jest.fn().mockResolvedValue([]),
    });

    const result = await useCase.create("org-1", "u1", "ADMIN", "VIP", ["a", "b", "c", "d", "e"], 2);

    expect(repository.createManyGroups.mock.calls[0][1]).toHaveLength(3);
    expect(result.movedFromGroups).toBe(2);
  });

  it("only accepts contacts the caller can see (employee scope)", async () => {
    const { useCase, repository, listContacts } = makeUseCase(
      { countActiveContacts: jest.fn().mockResolvedValue(1) },
      { ownerId: "u1" },
    );

    await expect(useCase.create("org-1", "u1", "EMPLOYEE", "Mine", ["mine", "someone-elses"]))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(listContacts.resolveOwnerScope).toHaveBeenCalledWith("org-1", "u1", "EMPLOYEE");
    expect(repository.countActiveContacts).toHaveBeenCalledWith("org-1", { ownerId: "u1" }, ["mine", "someone-elses"]);
    expect(repository.createManyGroups).not.toHaveBeenCalled();
  });

  it("rejects an existing group name before creating any groups", async () => {
    const { useCase, repository } = makeUseCase({
      countActiveContacts: jest.fn().mockResolvedValue(1),
      findExistingNames: jest.fn().mockResolvedValue(["Leads"]),
    });
    await expect(useCase.create("org-1", "u1", "ADMIN", "Leads", ["contact-1"]))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.createManyGroups).not.toHaveBeenCalled();
  });

  it("rejects a group size outside 1-1000", async () => {
    const { useCase } = makeUseCase({ countActiveContacts: jest.fn().mockResolvedValue(1) });
    await expect(useCase.create("org-1", "u1", "ADMIN", "X", ["a"], 0)).rejects.toBeInstanceOf(BadRequestException);
    await expect(useCase.create("org-1", "u1", "ADMIN", "X", ["a"], 1001)).rejects.toBeInstanceOf(BadRequestException);
  });

  describe("make groups options", () => {
    it("skips contacts that are already in a group when onlyUngrouped is set", async () => {
      const { useCase, repository } = makeUseCase({
        countActiveContacts: jest.fn().mockResolvedValue(3),
        filterUngrouped: jest.fn().mockResolvedValue(["b", "c"]),
        createManyGroups: jest.fn().mockResolvedValue([]),
      });

      const result = await useCase.create("org-1", "u1", "ADMIN", "VIP", ["a", "b", "c"], 100, {
        mode: "one",
        onlyUngrouped: true,
      });

      expect(repository.createManyGroups).toHaveBeenCalledWith("org-1", [{ name: "VIP", contactIds: ["b", "c"] }]);
      expect(result).toMatchObject({ skippedGrouped: 1, movedFromGroups: 0 });
      expect(repository.moveImpact).not.toHaveBeenCalled();
    });

    it("says so when every selected contact already has a group", async () => {
      const { useCase } = makeUseCase({
        countActiveContacts: jest.fn().mockResolvedValue(1),
        filterUngrouped: jest.fn().mockResolvedValue([]),
      });
      await expect(useCase.create("org-1", "u1", "ADMIN", "VIP", ["a"], 100, { onlyUngrouped: true }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it("split mode numbers the groups after existing ones", async () => {
      const { useCase, repository } = makeUseCase({
        countActiveContacts: jest.fn().mockResolvedValue(3),
        findNamesWithPrefix: jest.fn().mockResolvedValue(["Group 10"]),
        createManyGroups: jest.fn().mockResolvedValue([]),
      });
      await useCase.create("org-1", "u1", "ADMIN", "Group", ["a", "b", "c"], 2, { mode: "split" });
      expect(repository.createManyGroups.mock.calls[0][1].map((g: { name: string }) => g.name))
        .toEqual(["Group 11", "Group 12"]);
    });

    it("can put every ungrouped contact into one named group", async () => {
      const { useCase, repository } = makeUseCase({
        findUngroupedContactIds: jest.fn().mockResolvedValue({ ids: ["a", "b", "c"], total: 3 }),
        createManyGroups: jest.fn().mockResolvedValue([]),
      });
      await useCase.split("org-1", "u1", "ADMIN", 2, "Diwali", "one");
      expect(repository.createManyGroups).toHaveBeenCalledWith("org-1", [{ name: "Diwali", contactIds: ["a", "b", "c"] }]);
    });
  });

  describe("split", () => {
    it("splits ungrouped contacts into Group N, continuing existing numbering", async () => {
      const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
      const { useCase, repository } = makeUseCase({
        findUngroupedContactIds: jest.fn().mockResolvedValue({ ids, total: 250 }),
        findNamesWithPrefix: jest.fn().mockResolvedValue(["Group 1", "Group 2", "Group notes"]),
        createManyGroups: jest.fn().mockResolvedValue([]),
      });

      const result = await useCase.split("org-1", "u1", "ADMIN", 100);

      const groups = repository.createManyGroups.mock.calls[0][1];
      expect(groups.map((g: { name: string }) => g.name)).toEqual(["Group 3", "Group 4", "Group 5"]);
      expect(groups.map((g: { contactIds: string[] }) => g.contactIds.length)).toEqual([100, 100, 50]);
      expect(result.remaining).toBe(0);
    });

    it("reports contacts left for a later split", async () => {
      const { useCase } = makeUseCase({
        findUngroupedContactIds: jest.fn().mockResolvedValue({ ids: ["a"], total: 12_001 }),
        findNamesWithPrefix: jest.fn().mockResolvedValue([]),
        createManyGroups: jest.fn().mockResolvedValue([]),
      });
      await expect(useCase.split("org-1", "u1", "ADMIN")).resolves.toMatchObject({ remaining: 12_000 });
    });

    it("says so when every contact is already grouped", async () => {
      const { useCase } = makeUseCase({
        findUngroupedContactIds: jest.fn().mockResolvedValue({ ids: [], total: 0 }),
      });
      await expect(useCase.split("org-1", "u1", "ADMIN")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("manage", () => {
    it("does not let employees rename or delete groups", async () => {
      const { useCase } = makeUseCase({});
      await expect(useCase.remove("org-1", "EMPLOYEE", "g1")).rejects.toBeInstanceOf(ForbiddenException);
      await expect(useCase.rename("org-1", "EMPLOYEE", "g1", "New")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("soft deletes an existing group", async () => {
      const { useCase, repository } = makeUseCase({
        findById: jest.fn().mockResolvedValue({ id: "g1", name: "Old" }),
        softDelete: jest.fn().mockResolvedValue(undefined),
      });
      await expect(useCase.remove("org-1", "ADMIN", "g1")).resolves.toEqual({ deleted: true });
      expect(repository.softDelete).toHaveBeenCalledWith("org-1", "g1");
    });

    it("moving into a missing group is a 404", async () => {
      const { useCase } = makeUseCase({
        countActiveContacts: jest.fn().mockResolvedValue(1),
        findById: jest.fn().mockResolvedValue(null),
      });
      await expect(useCase.move("org-1", "u1", "ADMIN", ["a"], "nope")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("helpers", () => {
    it("names a single chunk without a suffix", () => {
      expect(chunkIntoGroups("VIP", ["a", "b"], 100)).toEqual([{ name: "VIP", contactIds: ["a", "b"] }]);
    });

    it("finds the next free group number and escapes the prefix", () => {
      expect(nextGroupNumber("Group", [])).toBe(1);
      expect(nextGroupNumber("Group", ["Group 2", "Group 10", "Group x"])).toBe(11);
      expect(nextGroupNumber("A+B", ["A+B 3", "AAB 9"])).toBe(4);
    });
  });
});
