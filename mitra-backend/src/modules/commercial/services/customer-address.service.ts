import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerAddress } from '../entities/customer-address.entity';
import { CreateCustomerAddressDto } from '../dto/customer-address.dto';

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  private async assertCustomerExists(customerId: string, tenantId?: string | null): Promise<void> {
    const where: any = { id: customerId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const customer = await this.customerRepo.findOne({ where });
    if (!customer) throw new NotFoundException('Customer not found');
  }

  async createAddresses(
    customerId: string,
    addresses: CreateCustomerAddressDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    for (const a of addresses) {
      await this.addressRepo.save(this.addressRepo.create({
        customerId,
        addressType: a.addressType ?? 'BILLING',
        line1: a.line1,
        line2: a.line2 ?? null,
        line3: a.line3 ?? null,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode ?? null,
        country: a.country ?? 'India',
        isDefault: a.isDefault ?? false,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as CustomerAddress));
    }
  }

  async replaceAddresses(
    customerId: string,
    addresses: CreateCustomerAddressDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    await this.addressRepo.update({ customerId, deletedAt: IsNull() }, { deletedAt: new Date() });
    await this.createAddresses(customerId, addresses, userId, tenantId);
  }

  async addAddress(
    customerId: string,
    dto: CreateCustomerAddressDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerAddress> {
    await this.assertCustomerExists(customerId, tenantId);
    if (dto.isDefault) {
      await this.addressRepo.update(
        { customerId, isDefault: true, deletedAt: IsNull() },
        { isDefault: false },
      );
    }
    const address = this.addressRepo.create({
      customerId,
      addressType: dto.addressType ?? 'BILLING',
      line1: dto.line1,
      line2: dto.line2 ?? null,
      line3: dto.line3 ?? null,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode ?? null,
      country: dto.country ?? 'India',
      isDefault: dto.isDefault ?? false,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerAddress);
    return this.addressRepo.save(address);
  }

  async removeAddress(customerId: string, addressId: string, tenantId?: string | null) {
    await this.assertCustomerExists(customerId, tenantId);
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId, deletedAt: IsNull() },
    });
    if (!address) throw new NotFoundException('Address not found');
    address.deletedAt = new Date();
    await this.addressRepo.save(address);
    return { deleted: true, id: addressId };
  }
}
