import { InspectionPlanService } from './inspection-plan.service';
import { InspectionPlan } from '../entities/inspection-plan.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';

describe('InspectionPlanService', () => {
  it('creates an inspection plan and publishes an outbox event', async () => {
    const repo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    const outbox = { append: jest.fn().mockResolvedValue({}) };
    const service = new InspectionPlanService(repo as any, outbox as unknown as OutboxService);

    const plan = { id: 'plan-1', planNumber: 'IP-1001', title: 'Incoming Inspection', status: 'DRAFT' };
    repo.create.mockReturnValue(plan);
    repo.save.mockResolvedValue(plan);

    const result = await service.create({
      planNumber: 'IP-1001',
      title: 'Incoming Inspection',
      projectId: 'project-1',
      drawingId: 'drawing-1',
      bomId: 'bom-1',
      routingId: 'routing-1',
      inspectionType: 'INCOMING',
      status: 'DRAFT',
    } as any, 'user-1', 'tenant-1');

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(outbox.append).toHaveBeenCalledWith(
      expect.any(String),
      'inspection_plan',
      'plan-1',
      expect.objectContaining({ planNumber: 'IP-1001' }),
      expect.objectContaining({ tenantId: 'tenant-1', actorId: 'user-1' }),
    );
    expect(result).toEqual(plan);
  });
});
