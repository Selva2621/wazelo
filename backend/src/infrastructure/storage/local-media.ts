import { existsSync } from 'fs';
import { join, resolve } from 'path';

/** Where uploads are kept on this server (see UploadController / FileServeController). */
const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

/** Our own file links: .../files/<uuid>.<ext> */
const OWN_FILE_LINK = /\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+)(?:[?#].*)?$/i;

export const MEDIA_MISSING_REASON =
  'The media file is missing on the server (it was cleared by a restart or deploy). Upload it again.';

/**
 * True when `url` is one of our uploaded files and it is no longer on disk.
 * Files are kept on the server's local disk, which a host like Render wipes on
 * every restart or deploy. Links to other sites are never treated as missing.
 */
export function isLocalMediaMissing(url: string | null | undefined): boolean {
  if (!url) return false;
  const match = OWN_FILE_LINK.exec(url);
  if (!match) return false;
  return !existsSync(join(UPLOADS_DIR, match[1]));
}
