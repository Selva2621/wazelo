import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { stat, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import type SharpFn from 'sharp';

// Both packages are CommonJS that export a single value as module.exports, which this
// project's TS settings (no esModuleInterop) can't import as a default, so require them
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp: typeof SharpFn = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string | null = require('ffmpeg-static');

// Release file handles right away so originals can be deleted (Windows keeps them locked otherwise)
sharp.cache(false);

/** Longest side after compression; WhatsApp shows media at about this size anyway */
const MAX_IMAGE_SIDE = 1600;
const MAX_VIDEO_SIDE = 1280;
const VIDEO_TIMEOUT_MS = 4 * 60 * 1000;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/mpeg', 'video/webm', 'video/3gpp']);

export interface StoredFile {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface CompressionResult extends StoredFile {
  originalSize: number;
  compressed: boolean;
}

/**
 * Shrinks uploaded images and videos before they are stored and sent on WhatsApp.
 * Images: resized to 1600px and re-encoded (JPEG, or PNG when transparent).
 * Videos: re-encoded to H.264/AAC MP4 at up to 720p, which WhatsApp plays everywhere.
 * Keeps the original whenever compression fails or doesn't make the file smaller.
 */
@Injectable()
export class MediaCompressionService {
  private readonly logger = new Logger(MediaCompressionService.name);

  async compress(file: StoredFile): Promise<CompressionResult> {
    const keep: CompressionResult = { ...file, originalSize: file.size, compressed: false };
    try {
      if (IMAGE_TYPES.has(file.mimeType)) return await this.compressImage(file, keep);
      if (VIDEO_TYPES.has(file.mimeType)) return await this.compressVideo(file, keep);
    } catch (err) {
      this.logger.warn(`Compression skipped for ${file.filename}: ${(err as Error).message}`);
    }
    return keep;
  }

  private async compressImage(file: StoredFile, keep: CompressionResult): Promise<CompressionResult> {
    const meta = await sharp(file.path).metadata();
    const transparent = !!meta.hasAlpha && file.mimeType !== 'image/jpeg';
    const ext = transparent ? 'png' : 'jpg';
    const mimeType = transparent ? 'image/png' : 'image/jpeg';
    const outName = `${randomUUID()}.${ext}`;
    const outPath = join(dirname(file.path), outName);

    let pipeline = sharp(file.path)
      .rotate() // apply the camera's orientation before EXIF is dropped
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true });
    pipeline = transparent
      ? pipeline.png({ compressionLevel: 9, palette: true, quality: 85 })
      : pipeline.jpeg({ quality: 80, mozjpeg: true });
    await pipeline.toFile(outPath);

    return this.pickSmaller(file, keep, { path: outPath, filename: outName, mimeType });
  }

  private async compressVideo(file: StoredFile, keep: CompressionResult): Promise<CompressionResult> {
    if (!ffmpegPath) throw new Error('ffmpeg binary not available');
    const outName = `${randomUUID()}.mp4`;
    const outPath = join(dirname(file.path), outName);
    // Fit inside MAX_VIDEO_SIDE without upscaling; H.264 needs even dimensions
    const scale =
      `scale='if(gt(iw,ih),min(${MAX_VIDEO_SIDE},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_VIDEO_SIDE},ih))',` +
      `scale=trunc(iw/2)*2:trunc(ih/2)*2`;

    await this.runFfmpeg([
      '-hide_banner', '-loglevel', 'error',
      '-i', file.path,
      '-vf', scale,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
      '-movflags', '+faststart',
      '-y', outPath,
    ]).catch(async (err) => {
      await unlink(outPath).catch(() => undefined);
      throw err;
    });

    // Non-MP4 originals always switch to the MP4 copy: WhatsApp can't play WebM/MPEG
    const forceNew = file.mimeType !== 'video/mp4';
    return this.pickSmaller(file, keep, { path: outPath, filename: outName, mimeType: 'video/mp4' }, forceNew);
  }

  /** Keeps whichever of the two files is smaller and deletes the other */
  private async pickSmaller(
    original: StoredFile,
    keep: CompressionResult,
    out: Omit<StoredFile, 'size'>,
    forceNew = false,
  ): Promise<CompressionResult> {
    const { size } = await stat(out.path);
    if (!forceNew && size >= original.size) {
      await unlink(out.path).catch(() => undefined);
      return keep;
    }
    await unlink(original.path).catch((err: Error) =>
      this.logger.warn(`Couldn't delete original ${original.filename}: ${err.message}`),
    );
    return { ...out, size, originalSize: original.size, compressed: true };
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath as string, args, { windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => {
        stderr = (stderr + d.toString()).slice(-2000);
      });
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('video compression timed out'));
      }, VIDEO_TIMEOUT_MS);
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim()}`));
      });
    });
  }
}
