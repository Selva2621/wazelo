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
  BadRequestException,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { EVENT_NAMES } from '@/common/constants';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import {
  CreateProductDto,
  UpdateProductDto,
  AssignProductDto,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
} from '../../application/dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly repo: ProductRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly orgLocale: OrgLocaleService,
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

  // ─── Brands ──────────────────────────────────────────────────────────────

  @Get('brands')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listBrands(@CurrentUser('orgId') orgId: string) {
    return this.repo.findBrandsByOrg(orgId);
  }

  @Post('brands')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createBrand(@CurrentUser('orgId') orgId: string, @Body() dto: CreateBrandDto) {
    if (await this.repo.findBrandByName(orgId, dto.name)) {
      throw new ConflictException('A brand with this name already exists');
    }
    await this.assertManager(orgId, dto.managerId);
    return this.repo.createBrand({ orgId, ...dto });
  }

  @Patch('brands/:id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async updateBrand(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    const brand = await this.repo.findBrandByIdAndOrg(id, orgId);
    if (!brand) throw new NotFoundException('Brand not found');
    if (dto.name) {
      const same = await this.repo.findBrandByName(orgId, dto.name);
      if (same && same.id !== id) throw new ConflictException('A brand with this name already exists');
    }
    await this.assertManager(orgId, dto.managerId);
    return this.repo.updateBrand(id, dto);
  }

  @Delete('brands/:id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  async deleteBrand(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    const brand = await this.repo.findBrandByIdAndOrg(id, orgId);
    if (!brand) throw new NotFoundException('Brand not found');
    await this.repo.softDeleteBrand(id);
    this.eventEmitter.emit(EVENT_NAMES.PRODUCT_UPDATED, { orgId });
    return { success: true };
  }

  /** A brand manager must be an active member of the workspace */
  private async assertManager(orgId: string, managerId: string | null | undefined) {
    if (!managerId) return;
    const [ok] = await this.repo.findActiveUserIds(orgId, [managerId]);
    if (!ok) throw new BadRequestException('The manager must be an active team member');
  }

  /** Brand must be the org's; lead handlers must be its active members */
  private async checkProductLinks(orgId: string, dto: { brandId?: string | null; leadHandlerIds?: string[] }) {
    if (dto.brandId && !(await this.repo.findBrandByIdAndOrg(dto.brandId, orgId))) {
      throw new BadRequestException('Brand not found');
    }
    if (dto.leadHandlerIds) {
      const unique = [...new Set(dto.leadHandlerIds)];
      const active = await this.repo.findActiveUserIds(orgId, unique);
      if (active.length !== unique.length) throw new BadRequestException('Every lead handler must be an active team member');
      dto.leadHandlerIds = unique;
    }
  }

  // ─── Products ────────────────────────────────────────────────────────────

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateProductDto) {
    await this.checkProductLinks(orgId, dto);
    // No currency picked — the org's
    const currency = dto.currency || (await this.orgLocale.get(orgId)).currency;
    const product = await this.repo.create({ orgId, ...dto, currency });
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
    await this.checkProductLinks(orgId, dto);
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
