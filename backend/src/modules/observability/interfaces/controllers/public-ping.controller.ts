import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';

/**
 * "Is the API up" for an outside uptime pinger (and to keep a host that sleeps when
 * idle awake). No login, so it says nothing about the platform: no uptime, versions,
 * database or queue state. Those stay behind /super-admin/system.
 */
@Controller('health')
export class PublicPingController {
  @Public()
  @Get('ping')
  ping(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
