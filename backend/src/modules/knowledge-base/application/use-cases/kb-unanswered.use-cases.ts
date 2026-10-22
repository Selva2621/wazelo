import { Injectable, NotFoundException } from '@nestjs/common';
import { KbMissRepository } from '../../infrastructure/repositories/kb-miss.repository';
import { FaqItem, KbFaqsUseCase } from './kb-faqs.use-cases';

/** GET /kb/unanswered, POST /kb/unanswered/:id/answer, DELETE /kb/unanswered/:id */
@Injectable()
export class KbUnansweredUseCase {
  constructor(
    private readonly misses: KbMissRepository,
    private readonly faqs: KbFaqsUseCase,
  ) {}

  async list(orgId: string) {
    const [items, total] = await Promise.all([this.misses.listOpen(orgId), this.misses.countOpen(orgId)]);
    return { items, total };
  }

  /** Publishes the owner's answer as a FAQ, so the bot knows it next time. */
  async answer(orgId: string, userId: string, id: string, item: FaqItem) {
    if (!(await this.misses.findOpen(id, orgId))) throw new NotFoundException('Question not found');
    await this.faqs.publish(orgId, userId, [item]);
    await this.misses.resolve(id, orgId);
    return { answered: true };
  }

  async dismiss(orgId: string, id: string) {
    if (!(await this.misses.resolve(id, orgId))) throw new NotFoundException('Question not found');
    return { dismissed: true };
  }
}
