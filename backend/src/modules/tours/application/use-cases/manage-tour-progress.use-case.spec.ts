import { MAX_TOURS_PER_DEVICE, ManageTourProgressUseCase } from './manage-tour-progress.use-case';
import { TourProgressRepository } from '../../infrastructure/repositories/tour-progress.repository';

function setup() {
  const repo = {
    listForDevice: jest.fn().mockResolvedValue([{ tourId: 'welcome', version: 1, status: 'completed' }]),
    save: jest.fn().mockImplementation(async (input) => ({ tourId: input.tourId, version: input.version, status: input.status })),
    reset: jest.fn().mockResolvedValue(2),
    exists: jest.fn().mockResolvedValue(false),
    countForDevice: jest.fn().mockResolvedValue(0),
  };
  const useCase = new ManageTourProgressUseCase(repo as unknown as TourProgressRepository);
  return { repo, useCase };
}

describe('ManageTourProgressUseCase', () => {
  it('lists only this user and device', async () => {
    const { repo, useCase } = setup();
    await expect(useCase.list('o1', 'u1', 'd1')).resolves.toEqual({
      deviceId: 'd1',
      tours: [{ tourId: 'welcome', version: 1, status: 'completed' }],
    });
    expect(repo.listForDevice).toHaveBeenCalledWith('o1', 'u1', 'd1');
  });

  it('saves a finished tour with its content version', async () => {
    const { repo, useCase } = setup();
    await useCase.save('o1', 'u1', 'd1', 'inbox', { status: 'completed', version: 2 });
    expect(repo.save).toHaveBeenCalledWith({
      orgId: 'o1',
      userId: 'u1',
      deviceId: 'd1',
      tourId: 'inbox',
      version: 2,
      status: 'completed',
    });
  });

  it('refuses new tour rows once the device holds the maximum', async () => {
    const { repo, useCase } = setup();
    repo.countForDevice.mockResolvedValue(MAX_TOURS_PER_DEVICE);
    await expect(useCase.save('o1', 'u1', 'd1', 'made-up-1', { status: 'completed', version: 1 })).rejects.toThrow(
      'Too many tours',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('still updates an existing tour at the maximum', async () => {
    const { repo, useCase } = setup();
    repo.exists.mockResolvedValue(true);
    repo.countForDevice.mockResolvedValue(MAX_TOURS_PER_DEVICE);
    await useCase.save('o1', 'u1', 'd1', 'inbox', { status: 'skipped', version: 1 });
    expect(repo.save).toHaveBeenCalled();
    expect(repo.countForDevice).not.toHaveBeenCalled();
  });

  it('resets every tour on the device when no tour is given', async () => {
    const { repo, useCase } = setup();
    await expect(useCase.reset('o1', 'u1', 'd1')).resolves.toEqual({ removed: 2 });
    expect(repo.reset).toHaveBeenCalledWith('o1', 'u1', 'd1', undefined);
  });

  it('resets a single tour', async () => {
    const { repo, useCase } = setup();
    await useCase.reset('o1', 'u1', 'd1', 'campaigns');
    expect(repo.reset).toHaveBeenCalledWith('o1', 'u1', 'd1', 'campaigns');
  });
});
