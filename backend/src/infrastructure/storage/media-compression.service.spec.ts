import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type SharpFn from 'sharp';
import { MediaCompressionService } from './media-compression.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp: typeof SharpFn = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static');

jest.setTimeout(120_000);

describe('MediaCompressionService', () => {
  const service = new MediaCompressionService();
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'media-compress-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A noisy photo-like PNG (noise doesn't compress, so the original is big) */
  async function bigImage(name: string, alpha: boolean) {
    const width = 3000;
    const height = 2000;
    const channels = alpha ? 4 : 3;
    const raw = Buffer.alloc(width * height * channels);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
    if (alpha) for (let i = 3; i < raw.length; i += 4) raw[i] = 128;
    const path = join(dir, name);
    await sharp(raw, { raw: { width, height, channels } }).png().toFile(path);
    return { path, filename: name, mimeType: 'image/png', size: statSync(path).size };
  }

  function testVideo(name: string, extraArgs: string[]) {
    const path = join(dir, name);
    const res = spawnSync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30:duration=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      ...extraArgs, '-y', path,
    ]);
    if (res.status !== 0) throw new Error(res.stderr.toString());
    return path;
  }

  it('shrinks a large opaque image to a JPEG no wider than 1600px', async () => {
    const input = await bigImage('a.png', false);
    const out = await service.compress(input);

    // An opaque PNG becomes a JPEG
    expect(out.compressed).toBe(true);
    expect(out.mimeType).toBe('image/jpeg');
    expect(out.filename.endsWith('.jpg')).toBe(true);
    expect(out.size).toBeLessThan(input.size);
    expect(existsSync(input.path)).toBe(false);
    const meta = await sharp(out.path).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1600);
  });

  it('keeps transparent images as PNG', async () => {
    const input = await bigImage('t.png', true);
    const out = await service.compress(input);

    expect(out.mimeType).toBe('image/png');
    expect(out.size).toBeLessThanOrEqual(input.size);
  });

  it('re-encodes a 1080p WebM video to a 720p MP4', async () => {
    const path = testVideo('v.webm', ['-c:v', 'libvpx-vp9', '-b:v', '4M', '-c:a', 'libopus']);
    const out = await service.compress({ path, filename: 'v.webm', mimeType: 'video/webm', size: statSync(path).size });

    expect(out.compressed).toBe(true);
    expect(out.mimeType).toBe('video/mp4');
    expect(out.filename.endsWith('.mp4')).toBe(true);
    expect(existsSync(path)).toBe(false);

    const probe = spawnSync(ffmpegPath, ['-hide_banner', '-i', out.path]).stderr.toString();
    expect(probe).toMatch(/Video: h264/);
    expect(probe).toMatch(/1280x720/);
    expect(probe).toMatch(/Audio: aac/);
  });

  it('keeps the original when the compressed copy would be bigger', async () => {
    // A tiny, already-efficient MP4
    const path = testVideo('small.mp4', ['-vf', 'scale=320:180', '-c:v', 'libx264', '-crf', '40', '-c:a', 'aac', '-b:a', '32k']);
    const input = { path, filename: 'small.mp4', mimeType: 'video/mp4', size: statSync(path).size };
    const out = await service.compress(input);

    expect(out.compressed).toBe(false);
    expect(out.path).toBe(path);
    expect(existsSync(path)).toBe(true);
  });

  it('passes documents through untouched', async () => {
    const input = { path: join(dir, 'x.pdf'), filename: 'x.pdf', mimeType: 'application/pdf', size: 10 };
    const out = await service.compress(input);
    expect(out).toEqual({ ...input, originalSize: 10, compressed: false });
  });

  it('falls back to the original when the image is unreadable', async () => {
    const input = { path: join(dir, 'missing.jpg'), filename: 'missing.jpg', mimeType: 'image/jpeg', size: 10 };
    const out = await service.compress(input);
    expect(out.compressed).toBe(false);
    expect(out.path).toBe(input.path);
  });
});
