import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { AUDITED_KEY, AuditedInterceptor, AuditedOptions } from '../interceptors/audited.interceptor';

/**
 * Audit-logs an endpoint after it succeeds. The controller's module must import AuditModule.
 *
 *   @Audited({ action: AuditAction.CHATBOT_FLOW_UPDATED, targetType: 'ChatbotFlow', idParam: 'flowId' })
 */
export const Audited = (options: AuditedOptions) =>
  applyDecorators(SetMetadata(AUDITED_KEY, options), UseInterceptors(AuditedInterceptor));
