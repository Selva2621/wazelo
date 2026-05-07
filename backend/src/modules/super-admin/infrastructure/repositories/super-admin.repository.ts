import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SuperAdmin } from '@prisma/client';

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { id } });
  }
}
