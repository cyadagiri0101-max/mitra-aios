import { CrossProjectIntelligenceService } from './cross-project-intelligence.service';
import { NotFoundException } from '@nestjs/common';

describe('CrossProjectIntelligenceService (S5.5)', () => {
  let service: CrossProjectIntelligenceService;
  let mockEngineeringLibraryService: any;

  beforeEach(() => {
    mockEngineeringLibraryService = {
      getProject: jest.fn().mockImplementation((id: string) => {
        if (id === 'BM289') {
          return Promise.resolve({
            id: 'BM289',
            project_number: 'BM289',
            project_name: 'Veedol 1L Blow Mold',
            customer_name: 'Veedol',
            machine_name: 'SEB101 FN',
            cavitation: 2,
            project_prefix: 'BM',
            resin: 'HDPE',
          });
        }
        if (id === 'BM331') {
          return Promise.resolve({
            id: 'BM331',
            project_number: 'BM331',
            project_name: 'ALPLA 500ml Container',
            customer_name: 'ALPLA',
            machine_name: 'SPEEDEX',
            cavitation: 4,
            project_prefix: 'BM',
            resin: 'HDPE',
          });
        }
        return Promise.resolve(null);
      }),
    };
    service = new CrossProjectIntelligenceService(mockEngineeringLibraryService);
  });

  it('should compare two projects and return structured variance analysis with provenance', async () => {
    const result = await service.compareProjects('BM289', 'BM331', 'tenant-1');
    expect(result).toBeDefined();
    expect(result.projectA.projectNumber).toBe('BM289');
    expect(result.projectB.projectNumber).toBe('BM331');
    expect(result.comparison.cavitationDifference).toContain('BM289 has 2 cavities, whereas BM331 has 4 cavities');
    expect(result.comparison.designPatternReuse).toContain('both tools belong to the \'BM\' blow mold family');
    expect(result.isAutonomousDecision).toBe(false);
    expect(result.provenance.authorityStatus).toBe('AUTHORITATIVE_RELEASE');
  });

  it('should throw NotFoundException if a requested project does not exist', async () => {
    await expect(service.compareProjects('BM289', 'UNKNOWN_PROJ', 'tenant-1')).rejects.toThrow(NotFoundException);
  });
});
