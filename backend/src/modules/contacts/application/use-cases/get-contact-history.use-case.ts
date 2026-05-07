import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';

@Injectable()
export class GetContactHistoryUseCase {
  constructor(private readonly contactRepository: ContactRepository) {}

  async executeStatusHistory(contactId: string, orgId: string) {
    const contact = await this.contactRepository.findByIdAndOrg(
      contactId,
      orgId,
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.contactRepository.getStatusHistory(contactId, orgId);
  }

  async executeOwnerHistory(contactId: string, orgId: string) {
    const contact = await this.contactRepository.findByIdAndOrg(
      contactId,
      orgId,
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.contactRepository.getOwnerHistory(contactId, orgId);
  }
}
