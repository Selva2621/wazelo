import { ForbiddenException } from '@nestjs/common';
import { UsageMetricType } from '@prisma/client';
import { ApiCallLimitGuard } from './api-call-limit.guard';

function contextFor(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('ApiCallLimitGuard', () => {
  const usageTracking = { consumeUpTo: jest.fn(), checkUsage: jest.fn() };
  const guard = new ApiCallLimitGuard(usageTracking as any);

  beforeEach(() => jest.resetAllMocks());

  it('counts the call and lets it through while under the limit', async () => {
    usageTracking.consumeUpTo.mockResolvedValue(1);

    await expect(guard.canActivate(contextFor({ apiKeyAuth: { orgId: 'org-1' } }))).resolves.toBe(true);
    expect(usageTracking.consumeUpTo).toHaveBeenCalledWith('org-1', UsageMetricType.API_CALLS, 1);
  });

  it('blocks the call once the monthly limit is used up', async () => {
    usageTracking.consumeUpTo.mockResolvedValue(0);
    usageTracking.checkUsage.mockResolvedValue({ currentValue: 500, limitValue: 500 });

    await expect(guard.canActivate(contextFor({ apiKeyAuth: { orgId: 'org-1' } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does nothing without an org on the request', async () => {
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    expect(usageTracking.consumeUpTo).not.toHaveBeenCalled();
  });
});
