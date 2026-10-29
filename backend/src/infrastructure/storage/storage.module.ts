import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UploadController } from './upload.controller';
import { FileServeController } from './file-serve.controller';
import { MediaCompressionService } from './media-compression.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadController, FileServeController],
  providers: [MediaCompressionService],
})
export class StorageModule {}
