import { Controller, Get, HttpCode, Logger, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { EmailRepository } from '../../infrastructure/repositories/email.repository';
import { OrgEmailService } from '../../application/services/org-email.service';
import { readUnsubscribe } from '../../domain/services/unsubscribe-token';

const page = (title: string, text: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7f9;display:flex;min-height:100vh;align-items:center;justify-content:center">
<main style="background:#fff;border-radius:12px;padding:32px 28px;max-width:420px;text-align:center"><h1 style="font-size:20px;margin:0 0 8px;color:#111827">${title}</h1>
<p style="margin:0;color:#4b5563;font-size:15px;line-height:1.6">${text}</p></main></body></html>`;

/**
 * The "Unsubscribe" link in every email. Public: the person clicking isn't logged in.
 * GET from the link; POST is the one-click unsubscribe mail apps use (List-Unsubscribe-Post).
 */
@Controller('email/unsubscribe')
@Public()
export class EmailUnsubscribeController {
  private readonly logger = new Logger(EmailUnsubscribeController.name);

  constructor(
    private readonly repo: EmailRepository,
    private readonly email: OrgEmailService,
  ) {}

  @Get()
  async viaLink(@Query('t') token: string, @Res() res: Response) {
    const ok = await this.unsubscribe(token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res
      .status(ok ? 200 : 400)
      .send(
        ok
          ? page("You're unsubscribed", "You won't get more emails from this business. WhatsApp messages are separate.")
          : page('Link not valid', 'This unsubscribe link is broken or too old. Reply to the email and ask to be removed.'),
      );
  }

  @Post()
  @HttpCode(200)
  async oneClick(@Query('t') token: string) {
    return { ok: await this.unsubscribe(token) };
  }

  private async unsubscribe(token: string): Promise<boolean> {
    const who = readUnsubscribe(token, this.email.secret());
    if (!who) return false;
    const changed = await this.repo.unsubscribe(who.orgId, who.contactId);
    this.logger.log(`Email unsubscribe org=${who.orgId} contact=${who.contactId}${changed ? '' : ' (already)'}`);
    return true;
  }
}
