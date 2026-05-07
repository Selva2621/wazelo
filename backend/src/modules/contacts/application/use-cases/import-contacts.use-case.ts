import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class ImportContactsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(orgId: string, userId: string, csvContent: string): Promise<ImportResult> {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = this.parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
    const phoneIdx = headers.findIndex((h) => h.includes('phone'));
    const nameIdx = headers.findIndex((h) => h === 'name' || h.includes('full name'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const statusIdx = headers.findIndex((h) => h.includes('status') || h.includes('lead'));
    const sourceIdx = headers.findIndex((h) => h.includes('source'));

    if (phoneIdx === -1) {
      throw new BadRequestException('CSV must have a "Phone" column');
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      const phone = this.normalizePhone(row[phoneIdx]?.trim());

      if (!phone) {
        errors.push(`Row ${i + 1}: Missing phone number`);
        continue;
      }

      const name = nameIdx >= 0 ? row[nameIdx]?.trim() || null : null;
      const email = emailIdx >= 0 ? row[emailIdx]?.trim() || null : null;
      const status = statusIdx >= 0 ? this.normalizeStatus(row[statusIdx]?.trim()) : 'NEW';
      const source = sourceIdx >= 0 ? this.normalizeSource(row[sourceIdx]?.trim()) : 'IMPORT';

      try {
        // Check for existing contact (same org + phone)
        const existing = await this.prisma.contact.findFirst({
          where: { orgId, phoneNumber: phone, deletedAt: null },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.contact.create({
          data: {
            orgId,
            phoneNumber: phone,
            name,
            email,
            leadStatus: status as any,
            source: source as any,
            ownerId: userId,
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || 'Unknown error'}`);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 20) };
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  private normalizePhone(phone: string | undefined): string {
    if (!phone) return '';
    // Strip non-digit except leading +
    return phone.replace(/[^\d+]/g, '');
  }

  private normalizeStatus(status: string | undefined): string {
    if (!status) return 'NEW';
    const upper = status.toUpperCase();
    const valid = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'];
    return valid.includes(upper) ? upper : 'NEW';
  }

  private normalizeSource(source: string | undefined): string {
    if (!source) return 'IMPORT';
    const upper = source.toUpperCase();
    const valid = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'EMAIL', 'MANUAL', 'IMPORT', 'API'];
    return valid.includes(upper) ? upper : 'IMPORT';
  }
}
