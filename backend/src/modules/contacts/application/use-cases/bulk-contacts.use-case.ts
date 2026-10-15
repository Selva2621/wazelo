import { Injectable, Logger } from '@nestjs/common';
import { ChangeLeadStatusUseCase } from './change-lead-status.use-case';
import { AssignContactUseCase } from './assign-contact.use-case';
import { AddTagUseCase } from './manage-tags.use-case';
import { DeleteContactUseCase } from './delete-contact.use-case';
import {
  BulkAddTagDto,
  BulkAssignContactsDto,
  BulkChangeLeadStatusDto,
  BulkContactIdsDto,
} from '../dto/bulk-contacts.dto';

export interface BulkContactsResult {
  succeeded: string[];
  failed: { contactId: string; error: string }[];
}

interface RequestMeta {
  orgId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string | string[];
}

/**
 * Applies a single-contact use case to many contacts. Each contact goes through the
 * same path as the per-contact endpoint (org scoping, audit log, domain events), so
 * bulk and single edits can't drift apart. One bad id doesn't abort the rest.
 */
@Injectable()
export class BulkContactsUseCase {
  private readonly logger = new Logger(BulkContactsUseCase.name);

  constructor(
    private readonly changeLeadStatusUseCase: ChangeLeadStatusUseCase,
    private readonly assignContactUseCase: AssignContactUseCase,
    private readonly addTagUseCase: AddTagUseCase,
    private readonly deleteContactUseCase: DeleteContactUseCase,
  ) {}

  changeStatus(dto: BulkChangeLeadStatusDto, meta: RequestMeta) {
    return this.run('status', dto, (id) =>
      this.changeLeadStatusUseCase.execute(
        id,
        meta.orgId,
        meta.userId,
        { status: dto.status, reason: dto.reason },
        meta.ipAddress,
        meta.userAgent,
      ),
    );
  }

  assign(dto: BulkAssignContactsDto, meta: RequestMeta) {
    return this.run('assign', dto, (id) =>
      this.assignContactUseCase.execute(
        id,
        meta.orgId,
        meta.userId,
        { ownerId: dto.ownerId, reason: dto.reason },
        meta.ipAddress,
        meta.userAgent,
      ),
    );
  }

  addTag(dto: BulkAddTagDto, meta: RequestMeta) {
    return this.run('tag', dto, (id) =>
      this.addTagUseCase.execute(
        id,
        meta.orgId,
        meta.userId,
        { name: dto.name, color: dto.color },
        meta.ipAddress,
        meta.userAgent,
      ),
    );
  }

  delete(dto: BulkContactIdsDto, meta: RequestMeta) {
    return this.run('delete', dto, (id) =>
      this.deleteContactUseCase.execute(
        id,
        meta.orgId,
        meta.userId,
        meta.ipAddress,
        meta.userAgent,
      ),
    );
  }

  // Sequential on purpose: bounded DB load, and audit entries land in selection order
  private async run(
    action: string,
    dto: BulkContactIdsDto,
    apply: (contactId: string) => Promise<unknown>,
  ): Promise<BulkContactsResult> {
    const result: BulkContactsResult = { succeeded: [], failed: [] };

    for (const contactId of dto.contactIds) {
      try {
        await apply(contactId);
        result.succeeded.push(contactId);
      } catch (err) {
        result.failed.push({
          contactId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk ${action}: ${result.succeeded.length} ok, ${result.failed.length} failed`,
    );
    return result;
  }
}
