import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import {
  CreateContactDto,
  UpdateContactDto,
  ListContactsQueryDto,
  ChangeLeadStatusDto,
  AssignContactDto,
  MergeContactsDto,
  AddNoteDto,
  AddTagDto,
} from '../../application/dto';
import {
  CreateContactUseCase,
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
} from '../../application/use-cases';
import { ExportContactsUseCase } from '../../application/use-cases/export-contacts.use-case';
import { ImportContactsUseCase } from '../../application/use-cases/import-contacts.use-case';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';

@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createContactUseCase: CreateContactUseCase,
    private readonly getContactUseCase: GetContactUseCase,
    private readonly listContactsUseCase: ListContactsUseCase,
    private readonly updateContactUseCase: UpdateContactUseCase,
    private readonly deleteContactUseCase: DeleteContactUseCase,
    private readonly changeLeadStatusUseCase: ChangeLeadStatusUseCase,
    private readonly assignContactUseCase: AssignContactUseCase,
    private readonly mergeContactsUseCase: MergeContactsUseCase,
    private readonly addNoteUseCase: AddNoteUseCase,
    private readonly getNotesUseCase: GetNotesUseCase,
    private readonly addTagUseCase: AddTagUseCase,
    private readonly removeTagUseCase: RemoveTagUseCase,
    private readonly getContactHistoryUseCase: GetContactHistoryUseCase,
    private readonly contactRepository: ContactRepository,
    private readonly exportContactsUseCase: ExportContactsUseCase,
    private readonly importContactsUseCase: ImportContactsUseCase,
  ) {}

  // ───── Contact CRUD ─────

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async createContact(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateContactDto,
    @Req() req: Request,
  ) {
    return this.createContactUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get()
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listContacts(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.listContactsUseCase.execute(user.orgId, user.sub, user.role, query);
  }

  @Get('export')
  @Permissions(PERMISSIONS.CONTACTS_EXPORT)
  async exportContacts(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.exportContactsUseCase.execute(user.orgId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csv);
  }

  @Post('import')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async importContacts(
    @CurrentUser() user: JwtPayload,
    @Body('csv') csv: string,
  ) {
    return this.importContactsUseCase.execute(user.orgId, user.sub, csv);
  }

  @Get(':contactId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getContact(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.getContactUseCase.execute(contactId, user.orgId);
  }

  @Patch(':contactId')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async updateContact(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
    @Req() req: Request,
  ) {
    return this.updateContactUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':contactId')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CONTACTS_DELETE)
  @HttpCode(HttpStatus.OK)
  async deleteContact(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Req() req: Request,
  ) {
    return this.deleteContactUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ───── Lead Status ─────

  @Patch(':contactId/status')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async changeLeadStatus(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: ChangeLeadStatusDto,
    @Req() req: Request,
  ) {
    return this.changeLeadStatusUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':contactId/status-history')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getStatusHistory(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.getContactHistoryUseCase.executeStatusHistory(
      contactId,
      user.orgId,
    );
  }

  // ───── Owner Assignment ─────

  @Patch(':contactId/assign')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CONTACTS_ASSIGN)
  async assignContact(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: AssignContactDto,
    @Req() req: Request,
  ) {
    return this.assignContactUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':contactId/owner-history')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getOwnerHistory(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.getContactHistoryUseCase.executeOwnerHistory(
      contactId,
      user.orgId,
    );
  }

  // ───── Merge ─────

  @Post('merge')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.CONTACTS_MERGE)
  async mergeContacts(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MergeContactsDto,
    @Req() req: Request,
  ) {
    return this.mergeContactsUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ───── Notes ─────

  @Post(':contactId/notes')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async addNote(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: AddNoteDto,
    @Req() req: Request,
  ) {
    return this.addNoteUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':contactId/notes')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getNotes(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.getNotesUseCase.execute(contactId, user.orgId, {
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  // ───── Tags ─────

  @Post(':contactId/tags')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async addTag(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: AddTagDto,
    @Req() req: Request,
  ) {
    return this.addTagUseCase.execute(
      contactId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':contactId/tags/:tagId')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  async removeTag(
    @CurrentUser() user: JwtPayload,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @Req() req: Request,
  ) {
    return this.removeTagUseCase.execute(
      contactId,
      tagId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':contactId/tags')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getContactTags(
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.contactRepository.getContactTags(contactId);
  }

  // ───── Org-level Tags ─────

  @Get('tags/list')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listOrgTags(@CurrentUser() user: JwtPayload) {
    return this.contactRepository.listOrgTags(user.orgId);
  }
}
