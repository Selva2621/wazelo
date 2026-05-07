import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import {
  UserRegisteredEvent,
  EmailVerifiedEvent,
  LoginFailedEvent,
  AccountLockedEvent,
} from '../event-bus';

@Injectable()
export class AuthEventsHandler {
  private readonly logger = new Logger(AuthEventsHandler.name);

  @OnEvent(EVENT_NAMES.USER_REGISTERED)
  handleUserRegistered(event: UserRegisteredEvent): void {
    this.logger.log(
      `New user registered: ${event.email} (org: ${event.orgId})`,
    );
    // Future: trigger onboarding flow, send welcome notification, etc.
  }

  @OnEvent(EVENT_NAMES.EMAIL_VERIFIED)
  handleEmailVerified(event: EmailVerifiedEvent): void {
    this.logger.log(`Email verified for user: ${event.userId}`);
    // Future: activate integrations, send welcome email
  }

  @OnEvent(EVENT_NAMES.LOGIN_FAILED)
  handleLoginFailed(event: LoginFailedEvent): void {
    this.logger.warn(
      `Login failed for user ${event.userId} — attempt #${event.failedAttempts}`,
    );
    // Future: alert admin, trigger security notification
  }

  @OnEvent(EVENT_NAMES.ACCOUNT_LOCKED)
  handleAccountLocked(event: AccountLockedEvent): void {
    this.logger.warn(
      `Account locked for user ${event.userId} until ${event.lockedUntil.toISOString()}`,
    );
    // Future: send lock notification email, alert admin
  }
}
