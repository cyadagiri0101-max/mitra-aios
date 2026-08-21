import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringQueryNormalizerService } from './engineering-query-normalizer.service';

describe('EngineeringQueryNormalizerService (M7.3 Query Normalization)', () => {
  let service: EngineeringQueryNormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringQueryNormalizerService],
    }).compile();

    service = module.get<EngineeringQueryNormalizerService>(EngineeringQueryNormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizes whitespace, punctuation and extracts projectNumber & entityType for BOM', () => {
    const output = service.normalizeQuery('  What is the BM454   BOM part list for body insert?!! ');
    expect(output.extractedFilters.projectNumber).toBe('BM454');
    expect(output.extractedFilters.projectPrefix).toBe('BM');
    expect(output.extractedFilters.entityType).toBe('BOM_PART');
    expect(output.normalizedQuery).toContain('What is the BM454 BOM part list for body insert');
  });

  it('extracts machine name and cycle time entityType', () => {
    const output = service.normalizeQuery('cycle time history for SPEEDEX machine 13.5gm');
    expect(output.extractedFilters.machine).toBe('SPEEDEX');
    expect(output.extractedFilters.entityType).toBe('CYCLE_TIME');
  });

  it('extracts material and revision tags', () => {
    const output = service.normalizeQuery('HDPE mold specifications for BM377 RevB');
    expect(output.extractedFilters.material).toBe('HDPE');
    expect(output.extractedFilters.projectNumber).toBe('BM377');
    expect(output.extractedFilters.revision).toBe('RevB');
  });

  it('extracts known customer name', () => {
    const output = service.normalizeQuery('Veedol 600ml bottle container details');
    expect(output.extractedFilters.customer).toBe('Veedol');
  });
});
