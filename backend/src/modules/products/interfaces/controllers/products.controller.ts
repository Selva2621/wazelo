import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { EVENT_NAMES } from '@/common/constants';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import {
  CreateProductDto,
  UpdateProductDto,
  AssignProductDto,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '../../application/dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly repo: ProductRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Product Categories ──────────────────────────────────────────────────

  @Get('categories')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listCategories(@CurrentUser('orgId') orgId: string) {
    return this.repo.findCategoriesByOrg(orgId);
  }

  @Post('categories')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.repo.createCategory({ orgId, ...dto });
  }

  @Patch('categories/:id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async updateCategory(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    const cat = await this.repo.findCategoryByIdAndOrg(id, orgId);
    if (!cat) throw new NotFoundException('Category not found');
    return this.repo.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async deleteCategory(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const cat = await this.repo.findCategoryByIdAndOrg(id, orgId);
    if (!cat) throw new NotFoundException('Category not found');
    await this.repo.deleteCategory(id);
    return { success: true };
  }

  // ─── Products ────────────────────────────────────────────────────────────

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateProductDto) {
    const product = await this.repo.create({ orgId, ...dto });
    this.eventEmitter.emit(EVENT_NAMES.PRODUCT_CREATED, { orgId });
    return product;
  }

  @Get()
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async list(@CurrentUser('orgId') orgId: string) {
    return this.repo.findByOrg(orgId);
  }

  // Static routes BEFORE parameterized :id routes
  @Post('assign')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async assign(@CurrentUser('orgId') orgId: string, @Body() dto: AssignProductDto) {
    return this.repo.assignToContact(dto.contactId, dto.productId, orgId);
  }

  @Delete('unassign')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async unassign(@Body() dto: AssignProductDto) {
    await this.repo.removeFromContact(dto.contactId, dto.productId);
    return { success: true };
  }

  @Get('by-contact/:contactId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getContactProducts(
    @CurrentUser('orgId') orgId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.repo.findByContact(contactId, orgId);
  }

  // Parameterized routes
  @Get(':id')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    const product = await this.repo.findByIdAndOrg(id, orgId);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.repo.findByIdAndOrg(id, orgId);
    if (!product) throw new NotFoundException('Product not found');
    const updated = await this.repo.update(id, dto as any);
    this.eventEmitter.emit(EVENT_NAMES.PRODUCT_UPDATED, { orgId });
    return updated;
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    const product = await this.repo.findByIdAndOrg(id, orgId);
    if (!product) throw new NotFoundException('Product not found');
    await this.repo.softDelete(id);
    this.eventEmitter.emit(EVENT_NAMES.PRODUCT_DELETED, { orgId });
    return { success: true };
  }
}
