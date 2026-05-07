import { Module, Global } from '@nestjs/common';
import { RbacRepository } from './infrastructure/repositories/rbac.repository';
import { RbacService } from './domain/services/rbac.service';
import { RbacController } from './interfaces/controllers/rbac.controller';
import {
  GetPermissionsUseCase,
  GetRolePermissionsUseCase,
  UpdateRolePermissionsUseCase,
  AssignPermissionUseCase,
  RevokePermissionUseCase,
  SeedOrgPermissionsUseCase,
} from './application/use-cases';
import { AuditModule } from '../audit/audit.module';

/**
 * Global module — RbacService is needed by PermissionsGuard (APP_GUARD)
 * which runs on every request across all modules.
 */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [RbacController],
  providers: [
    RbacRepository,
    RbacService,
    GetPermissionsUseCase,
    GetRolePermissionsUseCase,
    UpdateRolePermissionsUseCase,
    AssignPermissionUseCase,
    RevokePermissionUseCase,
    SeedOrgPermissionsUseCase,
  ],
  exports: [RbacService, SeedOrgPermissionsUseCase],
})
export class RbacModule {}
