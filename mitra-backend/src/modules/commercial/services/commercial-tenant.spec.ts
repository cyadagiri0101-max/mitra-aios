import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerAddressService } from './customer-address.service';
import { CustomerNoteService } from './customer-note.service';
import { CustomerActivityService } from './customer-activity.service';

import { CustomerAddress } from '../entities/customer-address.entity';
import { CustomerNote } from '../entities/customer-note.entity';
import { CustomerActivity } from '../entities/customer-activity.entity';
import { Customer } from '../entities/customer.entity';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: any) => ({ ...d, id: 'c-1' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-c-1', ...e })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('Commercial Services — Tenant Isolation', () => {
  let addressService: CustomerAddressService;
  let noteService: CustomerNoteService;
  let activityService: CustomerActivityService;

  let addressRepo: ReturnType<typeof makeRepo>;
  let noteRepo: ReturnType<typeof makeRepo>;
  let activityRepo: ReturnType<typeof makeRepo>;
  let customerRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    addressRepo = makeRepo();
    noteRepo = makeRepo();
    activityRepo = makeRepo();
    customerRepo = makeRepo();
    customerRepo.findOne.mockResolvedValue({ id: 'cust-1', tenantId: 'tenant-a' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAddressService,
        CustomerNoteService,
        CustomerActivityService,
        { provide: getRepositoryToken(CustomerAddress), useValue: addressRepo },
        { provide: getRepositoryToken(CustomerNote), useValue: noteRepo },
        { provide: getRepositoryToken(CustomerActivity), useValue: activityRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile();

    addressService = module.get<CustomerAddressService>(CustomerAddressService);
    noteService = module.get<CustomerNoteService>(CustomerNoteService);
    activityService = module.get<CustomerActivityService>(CustomerActivityService);
  });

  describe('CustomerAddressService', () => {
    it('rejects tenantless requests with 403', async () => {
      await expect(addressService.createAddresses('cust-1', [], 'u-1', '')).rejects.toThrow(ForbiddenException);
      await expect(addressService.removeAddress('cust-1', 'addr-1', null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CustomerNoteService', () => {
    it('rejects tenantless requests with 403', async () => {
      await expect(noteService.addNote('cust-1', { content: 'test' }, 'u-1', undefined)).rejects.toThrow(ForbiddenException);
      await expect(noteService.removeNote('cust-1', 'note-1', '')).rejects.toThrow(ForbiddenException);
    });

    it('scopes customer validation to tenant', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(noteService.addNote('cust-1', { content: 'test' }, 'u-1', 'tenant-a')).rejects.toThrow(NotFoundException);
      expect(customerRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'cust-1', tenantId: 'tenant-a' }),
      });
    });
  });

  describe('CustomerActivityService', () => {
    it('rejects tenantless activity calls with 403', async () => {
      await expect(activityService.findActivities('cust-1', '')).rejects.toThrow(ForbiddenException);
      await expect(activityService.logActivity('cust-1', 'NOTE_ADDED' as any, 'desc', 'u-1', null)).rejects.toThrow(ForbiddenException);
    });
  });
});
