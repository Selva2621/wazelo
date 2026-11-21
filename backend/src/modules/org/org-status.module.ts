import { Global, Module } from '@nestjs/common';
import { OrgStatusService } from './domain/services/org-status.service';
import { OrgLocaleService } from './domain/services/org-locale.service';
import { OrgStatusGuard } from './interfaces/guards/org-status.guard';

/**
 * Global so every enforcement point (guards, workers, socket gateway,
 * auth use cases) can check suspension without importing OrgModule.
 * Also serves the org's country/currency to anything storing phones or amounts.
 */
@Global()
@Module({
  providers: [OrgStatusService, OrgStatusGuard, OrgLocaleService],
  exports: [OrgStatusService, OrgStatusGuard, OrgLocaleService],
})
export class OrgStatusModule {}
