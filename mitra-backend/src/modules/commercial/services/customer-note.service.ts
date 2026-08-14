import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerNote } from '../entities/customer-note.entity';
import { CustomerActivityType } from '../entities/customer-activity.entity';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto } from '../dto/customer-note.dto';
import { CustomerActivityService } from './customer-activity.service';

@Injectable()
export class CustomerNoteService {
  constructor(
    @InjectRepository(CustomerNote)
    private readonly noteRepo: Repository<CustomerNote>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly activityService: CustomerActivityService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  private async assertCustomerExists(customerId: string, tenantId: string): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenantId, deletedAt: IsNull() } });
    if (!customer) throw new NotFoundException('Customer not found');
  }

  async createNotes(
    customerId: string,
    notes: CreateCustomerNoteDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    for (const n of notes) {
      await this.noteRepo.save(this.noteRepo.create({
        customerId,
        content: n.content,
        category: n.category ?? null,
        isPinned: n.isPinned ?? false,
        tenantId: scopeTenant,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as CustomerNote));
    }
  }

  async replaceNotes(
    customerId: string,
    notes: CreateCustomerNoteDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.noteRepo.update({ customerId, tenantId: scopeTenant, deletedAt: IsNull() }, { deletedAt: new Date() });
    await this.createNotes(customerId, notes, userId, scopeTenant);
  }

  async addNote(
    customerId: string,
    dto: CreateCustomerNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerNote> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    const note = this.noteRepo.create({
      customerId,
      content: dto.content,
      category: dto.category ?? null,
      isPinned: dto.isPinned ?? false,
      tenantId: scopeTenant,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerNote);
    const saved = await this.noteRepo.save(note);
    await this.activityService.logActivity(customerId, CustomerActivityType.NOTE_ADDED, 'Note added', userId, scopeTenant, { noteId: saved.id });
    return saved;
  }

  async updateNote(
    customerId: string,
    noteId: string,
    dto: UpdateCustomerNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerNote> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    const note = await this.noteRepo.findOne({
      where: { id: noteId, customerId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!note) throw new NotFoundException('Note not found');
    const allowed = this.extractAllowedFields(dto as unknown as Record<string, unknown>);
    Object.assign(note, allowed, userId ? { updatedBy: userId } : {});
    return this.noteRepo.save(note);
  }

  async removeNote(customerId: string, noteId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    const note = await this.noteRepo.findOne({
      where: { id: noteId, customerId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!note) throw new NotFoundException('Note not found');
    note.deletedAt = new Date();
    await this.noteRepo.save(note);
    return { deleted: true, id: noteId };
  }

  protected extractAllowedFields(data: Record<string, unknown>): Record<string, unknown> {
    const protectedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'tenantId'];
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!protectedFields.includes(key)) result[key] = value;
    }
    return result;
  }
}
