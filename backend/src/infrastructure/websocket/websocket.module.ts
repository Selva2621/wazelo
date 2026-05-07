import { Global, Module } from '@nestjs/common';
import { AppWebSocketGateway } from './websocket.gateway';
import { AuthModule } from '@/modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [AppWebSocketGateway],
  exports: [AppWebSocketGateway],
})
export class WebSocketModule {}
