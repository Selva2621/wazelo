import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/jwt-auth.guard';
import { validateMagicBytes } from '@/common/utils/magic-bytes.util';

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/3gpp',
  // Audio
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type ${file.mimetype} is not allowed`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Magic bytes validation — verify actual file content matches claimed MIME type.
    // Multer's fileFilter only checks the client-supplied Content-Type header.
    const isValidContent = await validateMagicBytes(file.path, file.mimetype);
    if (!isValidContent) {
      await unlink(file.path).catch((err: Error) =>
        this.logger.warn(`Failed to delete rejected upload ${file.filename}: ${err.message}`),
      );
      throw new BadRequestException('File content does not match declared type.');
    }

    // Build the authenticated file URL (served via FileServeController)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8080';
    const url = `${protocol}://${host}/api/v1/files/${file.filename}`;

    return {
      url,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
