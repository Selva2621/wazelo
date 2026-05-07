import { createReadStream } from 'fs';

/**
 * Read the first N bytes of a file without loading it entirely into memory.
 */
function readFirstBytes(filePath: string, count: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = createReadStream(filePath, { start: 0, end: count - 1 });
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Validate that a file's actual binary content matches the claimed MIME type
 * using magic byte (file signature) detection.
 *
 * Multer's fileFilter only checks the client-supplied Content-Type header,
 * which is fully attacker-controlled. This check reads the actual file bytes
 * after diskStorage has written the file to disk.
 *
 * @param filePath    Absolute path to the file written by diskStorage
 * @param claimedMime The MIME type reported by the client (file.mimetype)
 * @returns true if the file content is consistent with the claimed MIME type
 */
export async function validateMagicBytes(
  filePath: string,
  claimedMime: string,
): Promise<boolean> {
  let header: Buffer;
  try {
    header = await readFirstBytes(filePath, 16);
  } catch {
    return false;
  }

  if (header.length < 4) return false;

  // ── Images ──

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return claimedMime === 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return claimedMime === 'image/png';
  }

  // GIF: 47 49 46 38 (GIF8)
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return claimedMime === 'image/gif';
  }

  // WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 (RIFF....WEBP)
  if (
    header.length >= 12 &&
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    return claimedMime === 'image/webp';
  }

  // ── Documents ──

  // PDF: 25 50 44 46 (%PDF)
  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return claimedMime === 'application/pdf';
  }

  // ZIP-based (docx, xlsx): 50 4B 03 04
  if (header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04) {
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ].includes(claimedMime);
  }

  // Legacy MS Office (doc, xls): D0 CF 11 E0
  if (header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0) {
    return ['application/msword', 'application/vnd.ms-excel'].includes(claimedMime);
  }

  // ── Video ──

  // MP4 / ISO Base Media: offset 4 = 66 74 79 70 (ftyp)
  if (
    header.length >= 8 &&
    header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70
  ) {
    return ['video/mp4', 'video/mpeg', 'video/quicktime'].includes(claimedMime);
  }

  // WEBM / MKV: 1A 45 DF A3
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
    return ['video/webm', 'audio/webm'].includes(claimedMime);
  }

  // 3GPP: also uses ftyp box at offset 4, handled above; fallback RIFF-based 3gp
  // (rare — allow if claimed mime matches and no other signature matched)

  // ── Audio ──

  // RIFF WAV: 52 49 46 46 ... 57 41 56 45 (RIFF....WAVE)
  if (
    header.length >= 12 &&
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x41 && header[10] === 0x56 && header[11] === 0x45
  ) {
    return claimedMime === 'audio/wav';
  }

  // OGG: 4F 67 67 53 (OggS)
  if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
    return ['audio/ogg', 'video/ogg'].includes(claimedMime);
  }

  // MP3: FF FB / FF F3 / FF F2 (MPEG sync) or ID3 tag: 49 44 33
  if (
    (header[0] === 0xff && (header[1] === 0xfb || header[1] === 0xf3 || header[1] === 0xf2)) ||
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33)
  ) {
    return claimedMime === 'audio/mpeg';
  }

  // AAC (ADTS): FF F1 or FF F9
  if (header[0] === 0xff && (header[1] === 0xf1 || header[1] === 0xf9)) {
    return claimedMime === 'audio/aac';
  }

  // ── Plain text / CSV: no reliable magic bytes ──
  // Validate that the header contains no null bytes or binary control chars
  if (claimedMime === 'text/plain' || claimedMime === 'text/csv') {
    const hasBinaryBytes = Array.from(header).some(
      (b) => b === 0x00 || (b < 0x09) || (b > 0x0d && b < 0x20 && b !== 0x1b),
    );
    return !hasBinaryBytes;
  }

  // Unknown magic bytes — reject
  return false;
}
