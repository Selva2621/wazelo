import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UploadController } from './upload.controller';
import { FileServeController } from './file-serve.controller';

@Module({
  imports: [AuthModule],
  controllers: [UploadController, FileServeController],
})
export class StorageModule {}
