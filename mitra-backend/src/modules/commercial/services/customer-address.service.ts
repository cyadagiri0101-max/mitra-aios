import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async createAddresses(
    customerId: string,
    addresses: CreateCustomerAddressDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
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
        tenantId: scopeTenant,
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
    const scopeTenant = this.requireTenant(tenantId);
    await this.addressRepo.update({ customerId, tenantId: scopeTenant, deletedAt: IsNull() }, { deletedAt: new Date() });
    await this.createAddresses(customerId, addresses, userId, scopeTenant);
  }

  async addAddress(
    customerId: string,
    dto: CreateCustomerAddressDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerAddress> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    if (dto.isDefault) {
      await this.addressRepo.update(
        { customerId, tenantId: scopeTenant, isDefault: true, deletedAt: IsNull() },
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
      tenantId: scopeTenant,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerAddress);
    return this.addressRepo.save(address);
  }

  async removeAddress(customerId: string, addressId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.assertCustomerExists(customerId, scopeTenant);
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!address) throw new NotFoundException('Address not found');
    address.deletedAt = new Date();
    await this.addressRepo.save(address);
    return { deleted: true, id: addressId };
  }
}
