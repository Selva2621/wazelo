import { Module } from '@nestjs/common';
import { EncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [EncryptionService, MessageEncryptionService],
})
export class SearchModule {}
