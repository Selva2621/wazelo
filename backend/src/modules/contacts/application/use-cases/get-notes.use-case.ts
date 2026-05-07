import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';

@Injectable()
export class GetNotesUseCase {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(
    contactId: string,
    orgId: string,
    options?: { take?: number; skip?: number },
  ) {
    const contact = await this.contactRepository.findByIdAndOrg(
      contactId,
      orgId,
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.contactRepository.getNotes(contactId, orgId, options);
  }
}
