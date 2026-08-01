import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { AddressType } from '../entities/customer-address.entity';
import { CreateCustomerDto } from '../dto/customer.dto';
import { CustomerService } from './customer.service';

export interface CsvRow {
  name?: string;
  industry?: string;
  gstNumber?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  contactEmail?: string;
  contactPhone?: string;
}

@Injectable()
export class CustomerImportService {
  constructor(private readonly customerService: CustomerService) {}

  async importCustomers(
    rows: CreateCustomerDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ created: number; failed: number; errors: { index: number; message: string }[] }> {
    const errors: { index: number; message: string }[] = [];
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        await this.customerService.createWithDetails(rows[i], userId, tenantId);
        created++;
      } catch (err: any) {
        errors.push({ index: i, message: err?.message ?? 'Unknown error' });
      }
    }
    return { created, failed: errors.length, errors };
  }

  exportCsv(customers: Customer[]): string {
    const header = ['code', 'name', 'industry', 'status', 'email', 'phone', 'gst_number', 'tax_id', 'city', 'state', 'primary_contact_email'];
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const c of customers) {
      const primary = (c.contacts ?? []).find((ct) => ct.isPrimary);
      const primaryAddress = (c.addresses ?? []).find((a) => a.isDefault) ?? (c.addresses ?? [])[0];
      lines.push([
        escape(c.code), escape(c.name), escape(c.industry), escape(c.status),
        escape(c.email), escape(c.phone), escape(c.gstNumber), escape(c.taxId),
        escape(primaryAddress?.city), escape(primaryAddress?.state),
        escape(primary?.email),
      ].join(','));
    }
    return lines.join('\n');
  }

  parseCsv(csv: string): CsvRow[] {
    const rows: CsvRow[] = [];
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return rows;
    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').replace(/_([a-z])/g, (_m, c) => c.toUpperCase()));
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      rows.push(row as unknown as CsvRow);
    }
    return rows;
  }

  importCsvRows(rows: CsvRow[]): CreateCustomerDto[] {
    return rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name as string,
        industry: r.industry || undefined,
        gstNumber: r.gstNumber || undefined,
        taxId: r.taxId || undefined,
        phone: r.phone || undefined,
        email: r.email || undefined,
        contacts: r.contactEmail || r.contactPhone ? [{
          firstName: (r.contactEmail ?? r.contactPhone ?? 'Primary').split('@')[0] || 'Primary',
          lastName: '',
          email: r.contactEmail || undefined,
          phone: r.contactPhone || undefined,
          isPrimary: true,
        }] : undefined,
        addresses: r.city || r.state ? [{
          addressType: AddressType.BILLING,
          line1: r.name ?? '',
          city: r.city || '',
          state: r.state || '',
        }] : undefined,
      }));
  }
}
