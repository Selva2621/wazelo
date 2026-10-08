import { Global, Module } from '@nestjs/common';
import { OrgStatusService } from './domain/services/org-status.service';
import { OrgStatusGuard } from './interfaces/guards/org-status.guard';

/**
 * Global so every enforcement point (guards, workers, socket gateway,
 * auth use cases) can check suspension without importing OrgModule.
 */
@Global()
@Module({
  providers: [OrgStatusService, OrgStatusGuard],
  exports: [OrgStatusService, OrgStatusGuard],
})
export class OrgStatusModule {}
