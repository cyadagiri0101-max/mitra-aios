import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerContactService } from './customer-contact.service';
import { Contact } from '../entities/contact.entity';
import { Customer } from '../entities/customer.entity';
import { CustomerActivityService } from './customer-activity.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';

describe('CustomerContactService', () => {
  let service: CustomerContactService;
  let contactRepo: any;
  let customerRepo: any;
  let activityService: any;
  let events: any;

  beforeEach(async () => {
    contactRepo = {
      create: jest.fn((c: any) => ({ ...c })),
      save: jest.fn((c: any) => Promise.resolve({ ...c, id: c.id ?? 'ct-9' })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    customerRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'c-1', tenantId: 't-1', deletedAt: null }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    activityService = { logActivity: jest.fn() };
    events = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerContactService,
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: CustomerActivityService, useValue: activityService },
        { provide: CommercialEventPublisherService, useValue: events },
      ],
    }).compile();

    service = module.get(CustomerContactService);
  });

  it('rejects tenantless addContact (fail closed)', async () => {
    await expect(
      service.addContact('c-1', { firstName: 'A', lastName: 'B' }, 'u-1', null),
    ).rejects.toThrow(ForbiddenException);
    expect(customerRepo.findOne).not.toHaveBeenCalled();
    expect(contactRepo.save).not.toHaveBeenCalled();
  });

  it('returns 404 for a customer of another tenant', async () => {
    customerRepo.findOne.mockResolvedValue(null);
    await expect(
      service.addContact('c-x', { firstName: 'A', lastName: 'B' }, 'u-1', 't-2'),
    ).rejects.toThrow(NotFoundException);
    expect(contactRepo.save).not.toHaveBeenCalled();
  });

  it('scopes the customer lookup to the caller tenant', async () => {
    await service.addContact('c-1', { firstName: 'A', lastName: 'B' }, 'u-1', 't-1');
    expect(customerRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'c-1', tenantId: 't-1' }) }),
    );
  });

  it('writes the caller tenant onto the created contact', async () => {
    await service.addContact('c-1', { firstName: 'A', lastName: 'B' }, 'u-1', 't-1');
    expect(contactRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
  });

  it('scopes customer primary-contact updates to the caller tenant', async () => {
    await service.addContact('c-1', { firstName: 'A', lastName: 'B', isPrimary: true }, 'u-1', 't-1');
    expect(customerRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c-1', tenantId: 't-1' }),
      expect.objectContaining({ primaryContactId: 'ct-9' }),
    );
  });

  it('scopes clearPrimaryContact to the caller tenant', async () => {
    await service.addContact('c-1', { firstName: 'A', lastName: 'B', isPrimary: true }, 'u-1', 't-1');
    expect(contactRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'c-1', tenantId: 't-1', isPrimary: true }),
      { isPrimary: false },
    );
  });

  it('scopes contact removal + fallback primary selection to the caller tenant', async () => {
    const primary = { id: 'ct-1', customerId: 'c-1', isPrimary: true, tenantId: 't-1', deletedAt: null };
    contactRepo.findOne.mockResolvedValueOnce(primary).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await service.removeContact('ct-1', 'c-1', 't-1');
    expect(customerRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c-1', tenantId: 't-1' }),
      expect.objectContaining({ primaryContactId: null }),
    );
    expect(contactRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId: 'c-1', tenantId: 't-1' }) }),
    );
  });
});