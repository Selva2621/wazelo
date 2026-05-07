import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { ChannelAdapter } from '../interfaces/channel-adapter.interface';
import { WhatsAppChannelAdapter } from '../../infrastructure/adapters/whatsapp-channel.adapter';
import { InstagramChannelAdapter } from '../../infrastructure/adapters/instagram-channel.adapter';
import { FacebookChannelAdapter } from '../../infrastructure/adapters/facebook-channel.adapter';
import { EmailChannelAdapter } from '../../infrastructure/adapters/email-channel.adapter';

@Injectable()
export class ChannelAdapterRegistry implements OnModuleInit {
  private readonly logger = new Logger(ChannelAdapterRegistry.name);
  private readonly adapters = new Map<ChannelType, ChannelAdapter>();

  constructor(
    private readonly whatsAppAdapter: WhatsAppChannelAdapter,
    private readonly instagramAdapter: InstagramChannelAdapter,
    private readonly facebookAdapter: FacebookChannelAdapter,
    private readonly emailAdapter: EmailChannelAdapter,
  ) {}

  onModuleInit() {
    this.register(this.whatsAppAdapter);
    this.register(this.instagramAdapter);
    this.register(this.facebookAdapter);
    this.register(this.emailAdapter);

    this.logger.log(
      `Channel adapters registered: ${Array.from(this.adapters.keys()).join(', ')}`,
    );
  }

  private register(adapter: ChannelAdapter): void {
    if (this.adapters.has(adapter.channelType)) {
      throw new Error(
        `Adapter already registered for channel type: ${adapter.channelType}`,
      );
    }
    this.adapters.set(adapter.channelType, adapter);
  }

  getAdapter(type: ChannelType): ChannelAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`No adapter registered for channel type: ${type}`);
    }
    return adapter;
  }

  getSupportedTypes(): ChannelType[] {
    return Array.from(this.adapters.keys());
  }

  hasAdapter(type: ChannelType): boolean {
    return this.adapters.has(type);
  }
}
