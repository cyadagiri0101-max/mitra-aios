import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EngineeringTraceabilityService } from './engineering-traceability.service';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringReviewRequest } from '../entities/engineering-review-request.entity';
import { EngineeringDocument } from '../entities/engineering-document.entity';
import { EngineeringChangeRequest } from '../../ecr-eco/entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder } from '../../ecr-eco/entities/engineeringchangeorder.entity';
import { EngineeringChangeNotice } from '../../ecr-eco/entities/engineering-change-notice.entity';
import { EngineeringChangeImpact } from '../../ecr-eco/entities/engineering-change-impact.entity';

describe('EngineeringTraceabilityService', () => {
  let service: EngineeringTraceabilityService;
  let drawingRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    drawingRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'd-1', projectId: 'p-1', tenantId: 't-1', deletedAt: null }),
      find: jest.fn().mockResolvedValue([]),
    };
    const emptyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringTraceabilityService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(EngineeringDrawing), useValue: drawingRepo },
        { provide: getRepositoryToken(EngineeringBom), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringRouting), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringReviewRequest), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringDocument), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringChangeRequest), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringChangeOrder), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringChangeNotice), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringChangeImpact), useValue: emptyRepo },
      ],
    }).compile();

    service = module.get(EngineeringTraceabilityService);
  });

  it('renders a full project artifact map', async () => {
    const result = await service.byProject('p-1', 't-1');
    expect(result.projectId).toBe('p-1');
    expect(result.manufacturing.workOrders).toEqual([]);
    expect(result.quality.records).toEqual([]);
    expect(dataSource.query).toHaveBeenCalledTimes(2);
  });

  it('scopes the raw work_orders SQL to the caller tenant', async () => {
    await service.byProject('p-1', 't-1');
    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain('tenant_id = $2');
    expect(params).toEqual(['p-1', 't-1']);
  });

  it('scopes the raw trial_observations SQL to the caller tenant', async () => {
    await service.byProject('p-1', 't-1');
    const [sql, params] = dataSource.query.mock.calls[1];
    expect(sql).toContain('tenant_id = $2');
    expect(params).toEqual(['p-1', 't-1']);
  });

  it('scopes repository lookups to the caller tenant', async () => {
    await service.byProject('p-1', 't-1');
    expect(drawingRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: 'p-1', tenantId: 't-1' }) }),
    );
  });

  it('rejects tenantless byProject (fail closed)', async () => {
    await expect(service.byProject('p-1', null)).rejects.toThrow(ForbiddenException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('rejects tenantless byEntity (fail closed)', async () => {
    await expect(service.byEntity('DRAWING', 'd-1', null)).rejects.toThrow(ForbiddenException);
    expect(drawingRepo.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 for a drawing of another tenant', async () => {
    drawingRepo.findOne.mockResolvedValue(null);
    await expect(service.byEntity('DRAWING', 'd-x', 't-2')).rejects.toThrow(NotFoundException);
  });

  it('scopes byEntity lookup to the caller tenant', async () => {
    await service.byEntity('DRAWING', 'd-1', 't-1');
    expect(drawingRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'd-1', tenantId: 't-1' }) }),
    );
  });

  it('renders revision impact with work orders, job cards, and inspection plans', async () => {
    dataSource.query = jest.fn()
      .mockResolvedValueOnce([{ id: 'wo-1', wo_number: 'WO-101', status: 'RELEASED' }])
      .mockResolvedValueOnce([{ id: 'jc-1', job_card_number: 'JC-101', status: 'IN_PROGRESS' }])
      .mockResolvedValueOnce([{ id: 'ip-1', plan_number: 'IP-2026-0001', status: 'RELEASED' }]);

    const impact = await service.getRevisionImpact('DRAWING', 'd-1', 'B', 't-1');
    expect(impact.entityType).toBe('DRAWING');
    expect(impact.entityId).toBe('d-1');
    expect(impact.revision).toBe('B');
    expect(impact.impact.workOrdersCount).toBe(1);
    expect(impact.impact.jobCardsCount).toBe(1);
    expect(impact.impact.inspectionPlansCount).toBe(1);
  });
});