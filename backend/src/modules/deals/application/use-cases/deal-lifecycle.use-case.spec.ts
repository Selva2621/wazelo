import { BadRequestException } from '@nestjs/common';
import { DealStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { DealLifecycleUseCase } from './deal-lifecycle.use-case';

const STAGES = [
  { id: 'lead', isWonStage: false, isLostStage: false },
  { id: 'proposal', isWonStage: false, isLostStage: false },
  { id: 'won', isWonStage: true, isLostStage: false },
  { id: 'lost', isWonStage: false, isLostStage: true },
];

function setup(stages = STAGES) {
  const saved = (stageId: string) => ({
    id: 'd1', orgId: 'o1', pipelineId: 'p1', contactId: 'c1', stageId,
  });
  const dealRepo = {
    create: jest.fn(async (input: { stageId: string }) => saved(input.stageId)),
    updateStage: jest.fn(async (_id: string, stage: { id: string }) => saved(stage.id)),
    update: jest.fn(async () => saved('unchanged')),
  };
  const pipelineRepo = {
    findStageInPipeline: jest.fn(async (id: string) => stages.find((s) => s.id === id) ?? null),
    findStages: jest.fn(async () => stages),
  };
  const eventEmitter = { emit: jest.fn() };
  const orgLocale = { get: jest.fn(async () => ({ country: 'IN', dialCode: '91', currency: 'INR' })) };
  const useCase = new DealLifecycleUseCase(
    dealRepo as never,
    pipelineRepo as never,
    eventEmitter as never,
    orgLocale as never,
  );
  return { useCase, dealRepo, eventEmitter };
}

const deal = (stageId: string, status: DealStatus = DealStatus.OPEN) => ({
  id: 'd1', pipelineId: 'p1', stageId, status,
});

describe('DealLifecycleUseCase', () => {
  it('announces a new deal in its first stage', async () => {
    const { useCase, eventEmitter } = setup();
    await useCase.create({ orgId: 'o1', pipelineId: 'p1', stageId: 'lead', contactId: 'c1', title: 'T' });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      EVENT_NAMES.DEAL_STAGE_CHANGED,
      expect.objectContaining({ dealId: 'd1', stageId: 'lead', previousStageId: null }),
    );
  });

  it('announces a move with the previous stage, but not a drop on the same column', async () => {
    const { useCase, eventEmitter } = setup();
    await useCase.moveToStage(deal('lead'), 'proposal');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      EVENT_NAMES.DEAL_STAGE_CHANGED,
      expect.objectContaining({ stageId: 'proposal', previousStageId: 'lead' }),
    );

    eventEmitter.emit.mockClear();
    await useCase.moveToStage(deal('proposal'), 'proposal');
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('rejects a stage from another pipeline', async () => {
    const { useCase } = setup();
    await expect(useCase.moveToStage(deal('lead'), 'elsewhere')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marking won moves the deal to the won stage', async () => {
    const { useCase, dealRepo } = setup();
    await useCase.update(deal('proposal'), { status: DealStatus.WON, title: 'New' });
    expect(dealRepo.updateStage).toHaveBeenCalledWith('d1', expect.objectContaining({ id: 'won' }));
    expect(dealRepo.update).toHaveBeenCalledWith('d1', { title: 'New' });
  });

  it('reopening a lost deal moves it to the first open stage', async () => {
    const { useCase, dealRepo } = setup();
    await useCase.update(deal('lost', DealStatus.LOST), { status: DealStatus.OPEN });
    expect(dealRepo.updateStage).toHaveBeenCalledWith('d1', expect.objectContaining({ id: 'lead' }));
  });

  it('without a matching stage, sets the status and keeps the column', async () => {
    const { useCase, dealRepo } = setup(STAGES.filter((s) => !s.isWonStage));
    await useCase.update(deal('proposal'), { status: DealStatus.WON });
    expect(dealRepo.updateStage).not.toHaveBeenCalled();
    expect(dealRepo.update).toHaveBeenCalledWith('d1', { status: DealStatus.WON });
  });

  it('leaves the stage alone when the status does not change', async () => {
    const { useCase, dealRepo } = setup();
    await useCase.update(deal('proposal'), { status: DealStatus.OPEN, value: null });
    expect(dealRepo.updateStage).not.toHaveBeenCalled();
    expect(dealRepo.update).toHaveBeenCalledWith('d1', { value: null });
  });
});
