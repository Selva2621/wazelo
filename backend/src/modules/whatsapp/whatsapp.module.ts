import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { BillingModule } from '@/modules/billing/billing.module';

// Domain services
import { WhatsAppSessionService } from './domain/services/session.service';
import { EncryptionService } from './domain/services/encryption.service';

// Repositories
import { WhatsAppSessionRepository } from './infrastructure/repositories/whatsapp-session.repository';

// Use cases (messaging moved to MessagesModule — EPIC 5)
import {
  InitiateSessionUseCase,
  DisconnectSessionUseCase,
  ListSessionsUseCase,
  GetSessionUseCase,
  RefreshQrUseCase,
  ReconnectSessionUseCase,
  HandleSessionEventUseCase,
  HandleIncomingMessageUseCase,
  HandleStatusUpdateUseCase,
} from './application/use-cases';

// Controllers
import { WhatsAppSessionController } from './interfaces/controllers/whatsapp-session.controller';

@Module({
  imports: [AuditModule, BillingModule, forwardRef(() => MessagesModule)],
  controllers: [WhatsAppSessionController],
  providers: [
    // Domain
    WhatsAppSessionService,
    EncryptionService,

    // Infrastructure
    WhatsAppSessionRepository,

    // Use cases (session management only)
    InitiateSessionUseCase,
    DisconnectSessionUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    RefreshQrUseCase,
    ReconnectSessionUseCase,
    HandleSessionEventUseCase,
    HandleIncomingMessageUseCase,
    HandleStatusUpdateUseCase,
  ],
  exports: [
    WhatsAppSessionRepository,
    WhatsAppSessionService,
    EncryptionService,
    HandleSessionEventUseCase,
    HandleIncomingMessageUseCase,
    HandleStatusUpdateUseCase,
  ],
})
export class WhatsAppModule {}
