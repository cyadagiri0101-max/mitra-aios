import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringSynonymService } from './engineering-synonym.service';

describe('EngineeringSynonymService (M7.3 Engineering Synonyms)', () => {
  let service: EngineeringSynonymService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringSynonymService],
    }).compile();

    service = module.get<EngineeringSynonymService>(EngineeringSynonymService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('expands BOM to bill of materials and part list', () => {
    const tokens = ['BM454', 'BOM'];
    const expanded = service.expandQueryTerms(tokens);
    expect(expanded).toContain('bom');
    expect(expanded).toContain('bill of materials');
    expect(expanded).toContain('part list');
  });

  it('expands cycle time to CT and cycle-time', () => {
    const tokens = ['SPEEDEX', 'cycle', 'time'];
    const expanded = service.expandQueryTerms(tokens);
    expect(expanded).toContain('ct');
    expect(expanded).toContain('cycle seconds');
  });

  it('expands cavitation to cavity', () => {
    const tokens = ['8', 'cavitation'];
    const expanded = service.expandQueryTerms(tokens);
    expect(expanded).toContain('cavity');
  });
});
