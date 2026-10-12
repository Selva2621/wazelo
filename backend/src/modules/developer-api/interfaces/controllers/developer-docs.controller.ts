import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { buildDeveloperOpenApiSpec } from '../openapi/developer-openapi';

/** Public, unauthenticated docs for the Developer API. */
@Controller('developer')
@Public()
export class DeveloperDocsController {
  /**
   * OpenAPI 3 spec for Postman, Insomnia or code generators. Sent with
   * @Res() so the global response wrapper doesn't nest it under `data`.
   */
  @Get('openapi.json')
  getOpenApiSpec(@Req() req: Request, @Res() res: Response) {
    // trust proxy is set, so protocol reflects X-Forwarded-Proto behind Nginx
    const host = req.get('x-forwarded-host') ?? req.get('host');
    res.json(buildDeveloperOpenApiSpec(`${req.protocol}://${host}`));
  }
}
