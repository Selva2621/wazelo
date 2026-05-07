import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure — Adapters
import { WhatsAppChannelAdapter } from './infrastructure/adapters/whatsapp-channel.adapter';
import { InstagramChannelAdapter } from './infrastructure/adapters/instagram-channel.adapter';
import { FacebookChannelAdapter } from './infrastructure/adapters/facebook-channel.adapter';
import { EmailChannelAdapter } from './infrastructure/adapters/email-channel.adapter';

// Infrastructure — Repositories
import { ChannelRepository } from './infrastructure/repositories/channel.repository';

// Domain — Services
import { ChannelAdapterRegistry } from './domain/services/channel-adapter-registry';
import { ChannelService } from './domain/services/channel.service';
import { ChannelWebhookService } from './domain/services/channel-webhook.service';
import { EncryptionService } from './domain/services/channel-encryption.service';
import { EncryptionService as CommonEncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

// Application — Use Cases
import { SendChannelMessageUseCase } from './application/use-cases/send-channel-message.use-case';

// Interfaces — Controllers
import { ChannelsController } from './interfaces/controllers/channels.controller';
import { ChannelWebhookController } from './interfaces/controllers/channel-webhook.controller';

// Interfaces — Guards
import { ChannelOrgGuard } from './interfaces/guards/channel-org.guard';

@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [ChannelsController, ChannelWebhookController],
  providers: [
    // Adapters
    WhatsAppChannelAdapter,
    InstagramChannelAdapter,
    FacebookChannelAdapter,
    EmailChannelAdapter,

    // Registry
    ChannelAdapterRegistry,

    // Repository
    ChannelRepository,

    // Services
    ChannelService,
    ChannelWebhookService,
    EncryptionService,
    CommonEncryptionService,
    MessageEncryptionService,

    // Use Cases
    SendChannelMessageUseCase,

    // Guards
    ChannelOrgGuard,
  ],
  exports: [
    ChannelService,
    ChannelAdapterRegistry,
    ChannelRepository,
    SendChannelMessageUseCase,
    EncryptionService,
  ],
})
export class ChannelsModule {}
