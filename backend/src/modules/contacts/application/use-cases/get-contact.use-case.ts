import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContactRepository,
  ContactWithRelations,
} from '../../infrastructure/repositories/contact.repository';

@Injectable()
export class GetContactUseCase {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(
    contactId: string,
    orgId: string,
  ): Promise<ContactWithRelations> {
    const contact = await this.contactRepository.findByIdWithRelations(
      contactId,
      orgId,
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }
}
