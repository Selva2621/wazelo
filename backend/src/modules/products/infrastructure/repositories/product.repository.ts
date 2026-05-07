import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class ProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Product Category ────────────────────────────────────────────────────

  async createCategory(data: {
    orgId: string;
    name: string;
    description?: string;
    color?: string;
    sortOrder?: number;
    parentId?: string;
  }) {
    return this.prisma.productCategory.create({
      data,
      include: { parent: true, children: true },
    });
  }

  async findCategoriesByOrg(orgId: string) {
    return this.prisma.productCategory.findMany({
      where: { orgId },
      include: { parent: true, children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findCategoryByIdAndOrg(id: string, orgId: string) {
    return this.prisma.productCategory.findFirst({
      where: { id, orgId },
      include: { parent: true, children: true },
    });
  }

  async updateCategory(id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    sortOrder?: number;
    parentId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.productCategory.update({
      where: { id },
      data,
      include: { parent: true, children: true },
    });
  }

  async deleteCategory(id: string) {
    // Re-parent children to this category's parent (or null)
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    await this.prisma.productCategory.updateMany({
      where: { parentId: id },
      data: { parentId: cat?.parentId ?? null },
    });
    // Null out categoryId on related products
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return this.prisma.productCategory.delete({ where: { id } });
  }

  // ─── Product ─────────────────────────────────────────────────────────────

  async create(data: {
    orgId: string;
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    sku?: string;
    imageUrl?: string;
    categoryId?: string;
  }) {
    return this.prisma.product.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? null,
        currency: data.currency ?? 'INR',
        sku: data.sku ?? null,
        imageUrl: data.imageUrl ?? null,
        categoryId: data.categoryId ?? null,
      },
      include: { category: true },
    });
  }

  async findByOrg(orgId: string) {
    return this.prisma.product.findMany({
      where: { orgId, deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.product.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { category: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    sku?: string;
    imageUrl?: string;
    categoryId?: string;
    status?: any;
  }) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assignToContact(contactId: string, productId: string, orgId: string) {
    const result = await this.prisma.contactProduct.create({
      data: { contactId, productId, orgId },
    });
    this.eventEmitter.emit(EVENT_NAMES.CONTACT_PRODUCT_ASSIGNED, { contactId, productId, orgId });
    return result;
  }

  async removeFromContact(contactId: string, productId: string) {
    const items = await this.prisma.contactProduct.findMany({ where: { contactId, productId }, select: { orgId: true } });
    await this.prisma.contactProduct.deleteMany({ where: { contactId, productId } });
    if (items.length > 0) {
      this.eventEmitter.emit(EVENT_NAMES.CONTACT_PRODUCT_REMOVED, { contactId, productId, orgId: items[0].orgId });
    }
  }

  async findByContact(contactId: string, orgId: string) {
    const items = await this.prisma.contactProduct.findMany({
      where: { contactId, orgId, product: { deletedAt: null } },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((cp) => cp.product);
  }
}
