import { Module } from '@nestjs/common';
import { EncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

// Repository
import { ContactRepository } from './infrastructure/repositories/contact.repository';
import { SavedContactGroupRepository } from './infrastructure/repositories/saved-contact-group.repository';

// Use cases
import {
  CreateContactUseCase,
  AutoCreateContactUseCase,
  GetContactUseCase,
  ListContactsUseCase,
  UpdateContactUseCase,
  DeleteContactUseCase,
  ChangeLeadStatusUseCase,
  AssignContactUseCase,
  MergeContactsUseCase,
  AddNoteUseCase,
  GetNotesUseCase,
  AddTagUseCase,
  RemoveTagUseCase,
  GetContactHistoryUseCase,
  BulkContactsUseCase,
  SavedContactGroupsUseCase,
} from './application/use-cases';
import { ExportContactsUseCase } from './application/use-cases/export-contacts.use-case';
import { ImportContactsUseCase } from './application/use-cases/import-contacts.use-case';

// Controller
import { ContactsController } from './interfaces/controllers/contacts.controller';

// Dependent modules
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [AuditModule, UsersModule, TeamsModule],
  controllers: [ContactsController],
  providers: [
    // Repository
    ContactRepository,
    SavedContactGroupRepository,
    // Decrypts message bodies for the pipeline cards' last message
    EncryptionService,
    MessageEncryptionService,

    // Use cases
    CreateContactUseCase,
    AutoCreateContactUseCase,
    GetContactUseCase,
    ListContactsUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    ChangeLeadStatusUseCase,
    AssignContactUseCase,
    MergeContactsUseCase,
    AddNoteUseCase,
    GetNotesUseCase,
    AddTagUseCase,
    RemoveTagUseCase,
    GetContactHistoryUseCase,
    BulkContactsUseCase,
    SavedContactGroupsUseCase,
    ExportContactsUseCase,
    ImportContactsUseCase,
  ],
  // The contact use-cases are also run by automation actions (assign, tag, lead status)
  exports: [
    ContactRepository,
    AutoCreateContactUseCase,
    AssignContactUseCase,
    AddTagUseCase,
    RemoveTagUseCase,
    AddNoteUseCase,
    ChangeLeadStatusUseCase,
  ],
})
export class ContactsModule {}
