import 'reflect-metadata';
import { WorkflowController } from './workflow.controller';

describe('WorkflowController RBAC', () => {
  it('limits workflow transitions to operational roles', () => {
    expect(Reflect.getMetadata('roles', WorkflowController.prototype.executeTransition)).toEqual([
      'ADMIN',
      'MANAGEMENT',
      'DESIGN',
      'PLANNING',
      'PRODUCTION',
      'QUALITY',
    ]);
  });

  it('passes the authenticated user role into transition context', () => {
    const workflowService = { executeTransition: jest.fn() };
    const controller = new WorkflowController(workflowService as any);

    controller.executeTransition(
      '1b59a6b0-2cd8-4ccd-a5f4-d7b0d639a2d0',
      { transitionId: 'transition-id', remarks: 'approved' },
      {
        id: 'user-id',
        email: 'planner@mitra.local',
        tenantId: 'tenant-id',
        role: 'PLANNING',
        permissions: ['workflow:transition'],
      },
    );

    expect(workflowService.executeTransition).toHaveBeenCalledWith(
      '1b59a6b0-2cd8-4ccd-a5f4-d7b0d639a2d0',
      'transition-id',
      expect.objectContaining({
        userId: 'user-id',
        userRole: ['PLANNING'],
        userPermissions: ['workflow:transition'],
        tenantId: 'tenant-id',
        remarks: 'approved',
      }),
    );
  });
});
