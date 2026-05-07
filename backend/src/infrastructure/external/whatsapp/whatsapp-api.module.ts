import { Global, Module, forwardRef } from '@nestjs/common';
import { WhatsAppApiService } from './whatsapp-api.service';
import { BaileysConnectionManager } from './baileys-connection-manager.service';
import { BaileysAuthStateService } from './baileys-auth-state.service';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [forwardRef(() => WhatsAppModule)],
  providers: [
    WhatsAppApiService,
    BaileysConnectionManager,
    BaileysAuthStateService,
  ],
  exports: [
    WhatsAppApiService,
    BaileysConnectionManager,
    BaileysAuthStateService,
  ],
})
export class WhatsAppApiModule {}
