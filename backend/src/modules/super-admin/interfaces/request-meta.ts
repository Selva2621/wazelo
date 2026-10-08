import { Request } from 'express';
import { RequestMeta } from '../application/services/platform-audit.service';

/** IP + user agent for audit entries. req.ip honours the app's trust proxy setting. */
export function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || undefined,
    userAgent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 512) : undefined,
  };
}
