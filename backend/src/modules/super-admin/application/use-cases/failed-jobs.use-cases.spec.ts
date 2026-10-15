import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QUEUE_NAMES } from '@/common/constants';
import { ListFailedJobsUseCase, RetryFailedJobUseCase } from './failed-jobs.use-cases';

const queueName = Object.values(QUEUE_NAMES)[0] as string;
const failedJob = {
  id: '11111111-1111-1111-1111-111111111111',
  name: queueName,
  state: 'failed' as const,
  data: { orgId: 'org-1', accessToken: 'secret' },
  output: { message: 'boom' },
  retryCount: 3,
  createdOn: new Date(),
  failedOn: new Date(),
};
const actor = { id: 'sa-1', email: 'a@x.com' };

function setup(opts: { job?: typeof failedJob | null; retried?: string[] } = {}) {
  const queue = {
    findFailedJob: jest.fn().mockResolvedValue(opts.job === undefined ? failedJob : opts.job),
    listFailedJobs: jest.fn().mockResolvedValue({ jobs: [failedJob], total: 1 }),
    publish: jest.fn().mockResolvedValue('new-job-id'),
  };
  const auditRepo = { targetIdsWithAction: jest.fn().mockResolvedValue(new Set(opts.retried ?? [])) };
  const audit = { record: jest.fn() };
  return {
    queue,
    audit,
    retry: new RetryFailedJobUseCase(queue as any, auditRepo as any, audit as any),
    list: new ListFailedJobsUseCase(queue as any, auditRepo as any),
  };
}

describe('Failed jobs', () => {
  it('lists jobs with secrets redacted, the error summarised and retry state', async () => {
    const s = setup({ retried: [failedJob.id] });
    const out = await s.list.execute({});
    expect(out.jobs[0]).toMatchObject({
      queue: queueName,
      attempts: 4,
      error: 'boom',
      retried: true,
      data: { orgId: 'org-1', accessToken: '[redacted]' },
    });
  });

  it('re-queues the original payload as a new job and audits both ids', async () => {
    const s = setup();
    const out = await s.retry.execute(failedJob.id, actor, {});
    expect(s.queue.publish).toHaveBeenCalledWith(queueName, failedJob.data);
    expect(out.newJobId).toBe('new-job-id');
    expect(s.audit.record.mock.calls[0][0]).toMatchObject({
      targetId: failedJob.id,
      metadata: { queue: queueName, newJobId: 'new-job-id' },
    });
  });

  it('refuses a second retry of the same job', async () => {
    const s = setup({ retried: [failedJob.id] });
    await expect(s.retry.execute(failedJob.id, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(s.queue.publish).not.toHaveBeenCalled();
  });

  it('404s when the job is gone or not failed', async () => {
    const s = setup({ job: null });
    await expect(s.retry.execute(failedJob.id, actor, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses internal or unknown queues', async () => {
    const s = setup({ job: { ...failedJob, name: '__pgboss__cron' } });
    await expect(s.retry.execute(failedJob.id, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(s.queue.publish).not.toHaveBeenCalled();
  });
});
