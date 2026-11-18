import { SimulateLeadAdUseCase } from './simulate-lead-ad.use-case';
import { readSimulatedLead } from './process-lead-ad.use-case';

describe('SimulateLeadAdUseCase', () => {
  function setup(processError?: Error) {
    const created: Record<string, unknown>[] = [];
    const leadAdRepo = {
      create: jest.fn(async (data: Record<string, unknown>) => {
        created.push(data);
        return { id: 'e1', ...data };
      }),
      findById: jest.fn(async () => ({ id: 'e1', status: processError ? 'FAILED' : 'COMPLETED' })),
    };
    const processLeadAd = {
      execute: jest.fn(async () => {
        if (processError) throw processError;
      }),
    };
    const useCase = new SimulateLeadAdUseCase(leadAdRepo as never, processLeadAd as never);
    return { useCase, leadAdRepo, processLeadAd, created };
  }

  it('stores the answers as a simulated entry and runs the real processing', async () => {
    const { useCase, processLeadAd, created } = setup();
    const result = await useCase.execute('o1', {
      name: ' Priya ',
      phone: '98765 43210',
      platform: 'instagram',
      fields: { city: 'Chennai' },
    });

    const entry = created[0];
    expect(entry).toMatchObject({ orgId: 'o1', platform: 'instagram', pageId: 'dev-test', campaignName: 'Test campaign' });
    expect(String(entry.leadgenId)).toMatch(/^dev-/);
    expect(readSimulatedLead(entry.rawWebhookData)?.fieldData).toEqual([
      { name: 'full_name', values: ['Priya'] },
      { name: 'phone_number', values: ['98765 43210'] },
      { name: 'city', values: ['Chennai'] },
    ]);
    expect(processLeadAd.execute).toHaveBeenCalledWith('e1');
    expect(result).toMatchObject({ status: 'COMPLETED' });
  });

  it('returns the failed entry instead of throwing', async () => {
    const { useCase } = setup(new Error('boom'));
    await expect(useCase.execute('o1', { name: 'A', phone: '+919876543210' })).resolves.toMatchObject({ status: 'FAILED' });
  });

  it('only treats entries marked simulated as test leads', () => {
    expect(readSimulatedLead({ simulated: true, fieldData: [] })).not.toBeNull();
    expect(readSimulatedLead({ entry: [{ changes: [] }] })).toBeNull();
    expect(readSimulatedLead(null)).toBeNull();
  });
});
