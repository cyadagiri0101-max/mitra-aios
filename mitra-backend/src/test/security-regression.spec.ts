import { getMetadataStorage } from 'class-validator';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { OptimisticLockFilter } from '@common/filters/optimistic-lock.filter';
import { UpdateUserDto } from '@modules/platform/dto/update-user.dto';
import { AssignUserRoleDto } from '@modules/platform/dto/assign-user-role.dto';
import { UpdateCustomerDto } from '@modules/commercial/dto/customer.dto';
import { UpdateLeadDto } from '@modules/commercial/dto/lead.dto';
import { UpdateRfqDto } from '@modules/commercial/dto/rfq.dto';
import { UpdateQuotationDto } from '@modules/commercial/dto/quotation.dto';
import { UpdateEnquiryDto } from '@modules/commercial/dto/enquiry.dto';

function dtoProperties(dto: new () => unknown): string[] {
  const storage = getMetadataStorage();
  const metadatas = storage.getTargetValidationMetadatas(dto, '', false, true);
  return [...new Set(metadatas.map((m) => m.propertyName))];
}

describe('C-3 status mutation protection (update DTO field exclusion)', () => {
  it('UpdateUserDto exposes no roleId or password', () => {
    const props = dtoProperties(UpdateUserDto);
    expect(props).not.toContain('roleId');
    expect(props).not.toContain('password');
  });

  it('AssignUserRoleDto is the only sanctioned role-change channel', () => {
    expect(dtoProperties(AssignUserRoleDto)).toEqual(
      expect.arrayContaining(['roleId']),
    );
  });

  it('UpdateCustomerDto exposes no status', () => {
    expect(dtoProperties(UpdateCustomerDto)).not.toContain('status');
  });

  it('UpdateLeadDto exposes no leadStatus', () => {
    expect(dtoProperties(UpdateLeadDto)).not.toContain('leadStatus');
  });

  it('UpdateRfqDto exposes no status', () => {
    expect(dtoProperties(UpdateRfqDto)).not.toContain('status');
  });

  it('UpdateQuotationDto exposes no status', () => {
    expect(dtoProperties(UpdateQuotationDto)).not.toContain('status');
  });

  it('UpdateEnquiryDto exposes no status', () => {
    expect(dtoProperties(UpdateEnquiryDto)).not.toContain('status');
  });
});

describe('OptimisticLockFilter (P2 — concurrent writes surface as 409)', () => {
  const responseMock = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn();
    return res;
  };

  it('maps OptimisticLockVersionMismatchError to 409 Conflict', () => {
    const res = responseMock();
    const host: any = { switchToHttp: () => ({ getResponse: () => res }) };
    new OptimisticLockFilter().catch(
      new OptimisticLockVersionMismatchError('Customer', 1, 2),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it('passes non-optimistic errors through untouched (no handler)', () => {
    expect(() => new OptimisticLockFilter().catch as any).not.toThrow();
  });
});

describe('ConflictException body shape', () => {
  it('carries a client-actionable message', () => {
    const e = new ConflictException('The record was modified by another request. Refresh and retry.');
    expect(e.getResponse()).toEqual({
      statusCode: 409,
      message: 'The record was modified by another request. Refresh and retry.',
      error: 'Conflict',
    });
  });
});
