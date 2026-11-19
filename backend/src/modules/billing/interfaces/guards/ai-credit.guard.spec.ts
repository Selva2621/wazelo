import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, firstValueFrom, from } from 'rxjs';
import { AsyncResource } from 'async_hooks';
import { markAiAnswered } from '@/common/context/ai-usage.context';
import { AiCreditChargeInterceptor } from './ai-credit.guard';

function context(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: { orgId: 'org-1' } }) }),
  } as unknown as ExecutionContext;
}

/** Like Nest's InterceptorsConsumer: the handler runs on subscribe, in the context handle() was called in. */
function handler(work: () => Promise<unknown>): CallHandler {
  return { handle: () => defer(AsyncResource.bind(() => from(work()))) };
}

describe('AiCreditChargeInterceptor', () => {
  const reflector = { get: jest.fn().mockReturnValue('smart_reply') } as unknown as Reflector;
  let charge: jest.Mock;
  let interceptor: AiCreditChargeInterceptor;

  beforeEach(() => {
    charge = jest.fn().mockResolvedValue(undefined);
    interceptor = new AiCreditChargeInterceptor(reflector, { charge } as never);
  });

  it('charges when the AI provider answered during the handler', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        context(),
        handler(async () => {
          await new Promise((r) => setTimeout(r, 5));
          markAiAnswered();
          return { replies: ['hi'] };
        }),
      ),
    );
    expect(result).toEqual({ replies: ['hi'] });
    expect(charge).toHaveBeenCalledWith('org-1', 'smart_reply');
  });

  it('does not charge when the handler fell back without an AI answer', async () => {
    await firstValueFrom(interceptor.intercept(context(), handler(async () => ({ replies: [] }))));
    expect(charge).not.toHaveBeenCalled();
  });

  it('keeps concurrent requests apart', async () => {
    const answered = interceptor.intercept(
      context(),
      handler(async () => {
        await new Promise((r) => setTimeout(r, 10));
        markAiAnswered();
        return 'a';
      }),
    );
    const fallback = interceptor.intercept(
      context(),
      handler(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return 'b';
      }),
    );
    await Promise.all([firstValueFrom(answered), firstValueFrom(fallback)]);
    expect(charge).toHaveBeenCalledTimes(1);
  });
});
