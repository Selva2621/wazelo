import { Module } from '@nestjs/common';
import { WebPushService } from './web-push.service';

@Module({
  providers: [WebPushService],
  exports: [WebPushService],
})
export class PushModule {}
