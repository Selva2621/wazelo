import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class ExportContactsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(orgId: string): Promise<string> {
    const contacts = await this.prisma.contact.findMany({
      where: { orgId, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
        contactTags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Name',
      'Phone',
      'Email',
      'Lead Status',
      'Source',
      'Owner',
      'Tags',
      'Opted Out',
      'Created At',
    ];

    const rows = contacts.map((c) => [
      this.escapeCsv(c.name || ''),
      this.escapeCsv(c.phoneNumber),
      this.escapeCsv(c.email || ''),
      this.escapeCsv(c.leadStatus),
      this.escapeCsv(c.source),
      this.escapeCsv(
        c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : '',
      ),
      this.escapeCsv(c.contactTags.map((ct) => ct.tag.name).join('; ')),
      c.optedOut ? 'Yes' : 'No',
      c.createdAt.toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');
  }

  private escapeCsv(value: string): string {
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
    if (/^[=+\-@\t\r]/.test(value)) {
      value = `'${value}`;
    }
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
