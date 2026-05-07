import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import {
  UserInvitedEvent,
  InvitationAcceptedEvent,
  UserCreatedEvent,
  UserDisabledEvent,
  UserEnabledEvent,
  UserDeletedEvent,
  RoleChangedEvent,
  OrgSettingsUpdatedEvent,
} from '../event-bus';

@Injectable()
export class OrgUserEventsHandler {
  private readonly logger = new Logger(OrgUserEventsHandler.name);

  @OnEvent(EVENT_NAMES.USER_INVITED)
  handleUserInvited(event: UserInvitedEvent): void {
    this.logger.log(
      `User invited: ${event.email} to org ${event.orgId} with role ${event.role}`,
    );
    // Future: WebSocket notification to admin dashboard
  }

  @OnEvent(EVENT_NAMES.INVITATION_ACCEPTED)
  handleInvitationAccepted(event: InvitationAcceptedEvent): void {
    this.logger.log(
      `Invitation accepted: ${event.email} joined org ${event.orgId} as ${event.role}`,
    );
    // Future: WebSocket notification to org admins, trigger onboarding
  }

  @OnEvent(EVENT_NAMES.USER_CREATED)
  handleUserCreated(event: UserCreatedEvent): void {
    this.logger.log(
      `User created: ${event.email} in org ${event.orgId} by ${event.createdById}`,
    );
  }

  @OnEvent(EVENT_NAMES.USER_DISABLED)
  handleUserDisabled(event: UserDisabledEvent): void {
    this.logger.warn(
      `User disabled: ${event.userId} in org ${event.orgId} by ${event.disabledById}`,
    );
    // Future: WebSocket force-disconnect the disabled user
  }

  @OnEvent(EVENT_NAMES.USER_ENABLED)
  handleUserEnabled(event: UserEnabledEvent): void {
    this.logger.log(
      `User re-enabled: ${event.userId} in org ${event.orgId} by ${event.enabledById}`,
    );
  }

  @OnEvent(EVENT_NAMES.USER_DELETED)
  handleUserDeleted(event: UserDeletedEvent): void {
    this.logger.warn(
      `User deleted: ${event.userId} in org ${event.orgId} by ${event.deletedById}`,
    );
    // Future: WebSocket force-disconnect, cleanup assignments
  }

  @OnEvent(EVENT_NAMES.ROLE_CHANGED)
  handleRoleChanged(event: RoleChangedEvent): void {
    this.logger.log(
      `Role changed: user ${event.userId} from ${event.previousRole} to ${event.newRole} in org ${event.orgId}`,
    );
    // Future: WebSocket push to force JWT refresh (AC2: Role updates real-time)
  }

  @OnEvent(EVENT_NAMES.ORG_SETTINGS_UPDATED)
  handleOrgSettingsUpdated(event: OrgSettingsUpdatedEvent): void {
    this.logger.log(
      `Org settings updated: org ${event.orgId} by user ${event.userId}`,
    );
    // Future: WebSocket push org settings to all connected users
  }
}
