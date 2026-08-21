import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringCitationValidatorService } from './engineering-citation-validator.service';
import { EngineeringCitationDto } from './dto/engineering-grounding.dto';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringCitationValidatorService (M7.4 Citation Validator)', () => {
  let service: EngineeringCitationValidatorService;

  const mockCitation: EngineeringCitationDto = {
    ref: 'REF-1',
    chunkId: 'chunk-1',
    entityType: 'BOM_PART',
    entityId: 'part-1',
    title: 'BOM Part',
    projectNumber: 'BM454',
    authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
    provenance: {
      sourceId: 'src-1',
      sourceType: 'MEKB_DATABASE',
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'part_list',
      sourceRow: 1,
      sourcePage: null,
    },
    snippet: 'Snippet',
    isValid: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringCitationValidatorService],
    }).compile();

    service = module.get<EngineeringCitationValidatorService>(EngineeringCitationValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validates legitimate citation tags in answer', () => {
    const registry = new Map<string, EngineeringCitationDto>([['REF-1', mockCitation]]);
    const answer = 'The body insert material is Aluminium Hokotol [REF-1].';

    const result = service.validateCitations(answer, registry);
    expect(result.isFullyValid).toBe(true);
    expect(result.validCitations.length).toBe(1);
    expect(result.validCitations[0].ref).toBe('REF-1');
    expect(result.hallucinatedCitationsCount).toBe(0);
  });

  it('detects and eliminates hallucinated citation tags', () => {
    const registry = new Map<string, EngineeringCitationDto>([['REF-1', mockCitation]]);
    const answer = 'The body insert is Aluminium [REF-1], but core is steel [REF-99].';

    const result = service.validateCitations(answer, registry);
    expect(result.isFullyValid).toBe(false);
    expect(result.hallucinatedCitationsCount).toBe(1);
    expect(result.validCitations.length).toBe(1);
    expect(result.validCitations[0].ref).toBe('REF-1');
    expect(result.validatedAnswer).not.toContain('REF-99');
  });
});
