import { ConflictException, BadRequestException } from "@nestjs/common";
import { CAMPAIGN_CONFIG } from "@/common/constants";
import { SavedContactGroupRepository } from "../../infrastructure/repositories/saved-contact-group.repository";
import { SavedContactGroupsUseCase } from "./saved-contact-groups.use-case";

describe("SavedContactGroupsUseCase", () => {
  it("splits selected contacts into named reusable groups of the configured size", async () => {
    const batchSize = CAMPAIGN_CONFIG.BATCH_SIZE;
    const contactIds = Array.from(
      { length: batchSize * 2 + 5 },
      (_, index) => `contact-${index}`,
    );
    const repository = {
      countActiveContacts: jest.fn().mockResolvedValue(contactIds.length),
      findExistingNames: jest.fn().mockResolvedValue([]),
      createManyGroups: jest.fn().mockResolvedValue([
        { id: "group-1", name: "Spring leads - 001", contactCount: batchSize },
        { id: "group-2", name: "Spring leads - 002", contactCount: batchSize },
        { id: "group-3", name: "Spring leads - 003", contactCount: 5 },
      ]),
    } as unknown as SavedContactGroupRepository;
    const useCase = new SavedContactGroupsUseCase(repository);

    const result = await useCase.create("org-1", "Spring leads", contactIds);

    expect(result.batchSize).toBe(batchSize);
    expect(repository.createManyGroups).toHaveBeenCalledWith(
      "org-1",
      expect.arrayContaining([
        expect.objectContaining({
          name: "Spring leads - 001",
          contactIds: contactIds.slice(0, batchSize),
        }),
        expect.objectContaining({
          name: "Spring leads - 002",
          contactIds: contactIds.slice(batchSize, batchSize * 2),
        }),
        expect.objectContaining({
          name: "Spring leads - 003",
          contactIds: contactIds.slice(batchSize * 2),
        }),
      ]),
    );
    expect(result.groups).toHaveLength(3);
  });

  it("rejects selected contacts that are not active members of the organization", async () => {
    const repository = {
      countActiveContacts: jest.fn().mockResolvedValue(1),
      findExistingNames: jest.fn(),
      createManyGroups: jest.fn(),
    } as unknown as SavedContactGroupRepository;

    await expect(
      new SavedContactGroupsUseCase(repository).create(
        "org-1",
        "Spring leads",
        ["contact-1", "contact-2"],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createManyGroups).not.toHaveBeenCalled();
  });

  it("rejects an existing group name before creating any groups", async () => {
    const repository = {
      countActiveContacts: jest.fn().mockResolvedValue(1),
      findExistingNames: jest.fn().mockResolvedValue(["Leads"]),
      createManyGroups: jest.fn(),
    } as unknown as SavedContactGroupRepository;

    await expect(
      new SavedContactGroupsUseCase(repository).create("org-1", "Leads", [
        "contact-1",
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createManyGroups).not.toHaveBeenCalled();
  });
});
