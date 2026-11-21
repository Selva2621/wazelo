import {
  applyDecorators,
  CallHandler,
  CanActivate,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, mergeMap } from 'rxjs';
import { AiCreditsService } from '../../domain/services/ai-credits.service';
import { AiAction } from '../../domain/services/ai-actions';
import { aiUsageContext, AiUsageStore } from '@/common/context/ai-usage.context';

export const AI_ACTION_KEY = 'ai_action';

function orgIdOf(context: ExecutionContext): string | undefined {
  const request = context.switchToHttp().getRequest();
  return request.user?.orgId ?? request.apiKeyAuth?.orgId;
}

/** Refuses the route (403 AI_CREDITS_EXHAUSTED) when the org can't pay for its AI action. */
@Injectable()
export class AiCreditGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<AiAction>(AI_ACTION_KEY, context.getHandler());
    const orgId = orgIdOf(context);
    if (action && orgId) await this.aiCredits.assertCanAfford(orgId, action);
    return true;
  }
}

/**
 * Charges the route's AI action once the handler has succeeded — and only when an
 * AI provider actually answered during it (not when it fell back to canned output).
 */
@Injectable()
export class AiCreditChargeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiCredits: AiCreditsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<AiAction>(AI_ACTION_KEY, context.getHandler());
    const orgId = orgIdOf(context);
    if (!action || !orgId) return next.handle();

    const store: AiUsageStore = { answered: false };
    // The handler runs on subscribe, so subscribing inside run() gives it this store
    return new Observable((subscriber) =>
      aiUsageContext.run(store, () =>
        next
          .handle()
          .pipe(
            mergeMap(async (result) => {
              if (store.answered) await this.aiCredits.charge(orgId, action);
              return result;
            }),
          )
          .subscribe(subscriber),
      ),
    );
  }
}

/**
 * `@AiCredits('smart_reply')` on a route: checks the org can afford the action
 * before the handler runs and charges it after it succeeds.
 */
export const AiCredits = (action: AiAction) =>
  applyDecorators(
    SetMetadata(AI_ACTION_KEY, action),
    UseGuards(AiCreditGuard),
    UseInterceptors(AiCreditChargeInterceptor),
  );
