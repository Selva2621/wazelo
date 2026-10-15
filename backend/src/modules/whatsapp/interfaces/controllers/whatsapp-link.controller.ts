import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { WhatsAppLinkUseCase } from '../../application/use-cases/whatsapp-link.use-case';

/**
 * Login-free "reconnect from your phone" endpoints behind the link in
 * disconnect emails. The signed token is the only credential.
 */
@Public()
@Controller('whatsapp/link')
export class WhatsAppLinkController {
  constructor(private readonly linkUseCase: WhatsAppLinkUseCase) {}

  // Polled by the page while it waits for the phone to connect
  @Get(':token')
  @Throttle({ default: { ttl: 60000, limit: 40 } })
  async getStatus(@Param('token') token: string) {
    return this.linkUseCase.getStatus(this.check(token));
  }

  @Post(':token/reconnect')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async reconnect(@Param('token') token: string, @Req() req: Request) {
    return this.linkUseCase.reconnect(this.check(token), this.getIp(req), this.getUa(req));
  }

  @Post(':token/pairing-code')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async requestPairingCode(@Param('token') token: string, @Req() req: Request) {
    return this.linkUseCase.requestPairingCode(this.check(token), this.getIp(req), this.getUa(req));
  }

  private check(token: string): string {
    if (!token || token.length > 2048) throw new BadRequestException('Invalid link');
    return token;
  }

  private getIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getUa(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
