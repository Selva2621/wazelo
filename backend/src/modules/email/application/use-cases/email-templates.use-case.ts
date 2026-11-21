import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BUSINESS_EMAIL_TEMPLATES, FREELANCER_EMAIL_TEMPLATES } from '@/shared/constants/system-email-templates';
import { EmailRepository } from '../../infrastructure/repositories/email.repository';
import { SaveEmailTemplateDto } from '../dto/email.dto';

/** Reusable emails (subject + message) for campaigns, automations and sequences */
@Injectable()
export class EmailTemplatesUseCase {
  private readonly logger = new Logger(EmailTemplatesUseCase.name);

  constructor(private readonly repo: EmailRepository) {}

  /**
   * The workspace's email templates. A workspace that never had any starts with the
   * ready-made set (like the WhatsApp templates): business ones, plus freelancer
   * ones for freelancers. Deleted or renamed defaults are never added back.
   */
  async list(orgId: string, userId: string) {
    if (!(await this.repo.hadAnyTemplate(orgId))) {
      const freelancer = (await this.repo.orgType(orgId)) === 'FREELANCER';
      const defaults = freelancer ? [...FREELANCER_EMAIL_TEMPLATES, ...BUSINESS_EMAIL_TEMPLATES] : BUSINESS_EMAIL_TEMPLATES;
      try {
        await this.repo.createTemplates(orgId, userId, defaults);
        this.logger.log(`Default email templates added for org ${orgId} (${defaults.length})`);
      } catch (err) {
        // Two tabs opening at once: the list below still shows what's there
        this.logger.warn(`Couldn't add default email templates for org ${orgId}: ${(err as Error).message}`);
      }
    }
    return this.repo.templates(orgId);
  }

  async get(orgId: string, id: string) {
    const t = await this.repo.template(orgId, id);
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  create(orgId: string, userId: string, dto: SaveEmailTemplateDto) {
    return this.repo.createTemplate(orgId, userId, { name: dto.name.trim(), subject: dto.subject.trim(), body: dto.body });
  }

  async update(orgId: string, id: string, dto: SaveEmailTemplateDto) {
    if (!(await this.repo.updateTemplate(orgId, id, { name: dto.name.trim(), subject: dto.subject.trim(), body: dto.body }))) {
      throw new NotFoundException('Template not found');
    }
    return this.get(orgId, id);
  }

  async remove(orgId: string, id: string) {
    if (!(await this.repo.deleteTemplate(orgId, id))) throw new NotFoundException('Template not found');
    return { ok: true };
  }
}
