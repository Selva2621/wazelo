import { Injectable } from '@nestjs/common';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { WazeloHqRepository } from '../../infrastructure/repositories/wazelo-hq.repository';
import { logRangeEnd, toHqMessageLogEntry } from '../../domain/services/hq-message-log';
import { ListHqMessageLogQueryDto } from '../dto/hq-message-log.dto';

/**
 * Every WhatsApp message Wazelo HQ's number sent (sign-in codes, customer alerts,
 * chats), newest first, as stored. A code is already wiped in the database once sent.
 */
@Injectable()
export class ListHqMessageLogUseCase {
  constructor(
    private readonly hqRepo: WazeloHqRepository,
    private readonly messageEncryption: MessageEncryptionService,
  ) {}

  async execute(query: ListHqMessageLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const hq = await this.hqRepo.findHq();
    if (!hq) return { items: [], total: 0, page, limit, totalPages: 0 };

    const { items, total } = await this.hqRepo.findOutboundMessages(hq.id, {
      skip: (page - 1) * limit,
      take: limit,
      status: query.status,
      kind: query.kind,
      provider: query.provider,
      phoneDigits: (query.search ?? '').replace(/\D/g, '') || undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? logRangeEnd(query.to) : undefined,
    });

    // Message text is encrypted at rest
    const rows = this.messageEncryption.decryptBodies(items);
    return { items: rows.map(toHqMessageLogEntry), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
