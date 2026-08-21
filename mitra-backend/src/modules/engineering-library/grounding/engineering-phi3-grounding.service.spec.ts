import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EngineeringPhi3GroundingService } from './engineering-phi3-grounding.service';
import { EngineeringRetrievalService } from '../retrieval/engineering-retrieval.service';
import { EngineeringContextBuilderService } from './engineering-context-builder.service';
import { EngineeringCitationValidatorService } from './engineering-citation-validator.service';
import { OllamaProvider } from '../../ai/providers/ollama.provider';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringPhi3GroundingService (M7.4 Phi-3 Grounding)', () => {
  let service: EngineeringPhi3GroundingService;

  const mockRetrievalResult = {
    query: 'What is the BM454 body insert material?',
    normalizedQuery: 'BM454 body insert material',
    extractedFilters: { projectNumber: 'BM454' },
    results: [
      {
        chunkId: 'chunk-1',
        score: 0.95,
        entityType: 'BOM_PART',
        entityId: 'part-1',
        chunkType: 'BOM_TABLE',
        title: 'BOM Part: BODY INSERT',
        projectNumber: 'BM454',
        projectPrefix: 'BM',
        customer: 'Veedol',
        machine: 'SEB101',
        material: 'ALUMINIUM',
        revision: 'RevA',
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        chunkText: '=== ENGINEERING BILL OF MATERIALS (BOM) PART: BODY INSERT- B & P ===\nMaterial: ALUMINIUM\nGrade: HOKOTOL/ALUMOLD1-500',
        provenance: {
          sourceId: 'src-1',
          sourceType: 'MEKB_DATABASE',
          relativePath: 'database/mekb.sqlite',
          sourceFile: 'mekb.sqlite',
          sourceSheet: 'part_list',
          sourceRow: 1,
          sourcePage: null,
        },
      },
    ],
    telemetry: {
      totalLatencyMs: 8,
      degradedMode: false,
    },
  };

  const mockRetrievalService = {
    retrieve: jest.fn().mockResolvedValue(mockRetrievalResult),
  };

  const mockOllamaProvider = {
    enabled: true,
    model: 'phi3',
    ping: jest.fn().mockResolvedValue({ available: true, version: '0.1.30' }),
    generate: jest.fn().mockResolvedValue({
      response: 'The material for the BM454 body insert is ALUMINIUM HOKOTOL/ALUMOLD1-500 [REF-1].',
      done: true,
      model: 'phi3',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringPhi3GroundingService,
        EngineeringContextBuilderService,
        EngineeringCitationValidatorService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('true') } },
        { provide: EngineeringRetrievalService, useValue: mockRetrievalService },
        { provide: OllamaProvider, useValue: mockOllamaProvider },
      ],
    }).compile();

    service = module.get<EngineeringPhi3GroundingService>(EngineeringPhi3GroundingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('produces grounded answer with validated citations and provenance', async () => {
    const response = await service.ask('tenant-1', {
      query: 'What is the BM454 body insert material?',
    });

    expect(response.grounded).toBe(true);
    expect(response.confidence).toBe('HIGH');
    expect(response.insufficientEvidence).toBe(false);
    expect(response.answer).toContain('ALUMINIUM');
    expect(response.citations.length).toBe(1);
    expect(response.citations[0].ref).toBe('REF-1');
    expect(response.citations[0].projectNumber).toBe('BM454');
    expect(response.citations[0].provenance.sourceFile).toBe('mekb.sqlite');
    expect(response.telemetry.isLiveInference).toBe(true);
    expect(response.telemetry.modelUsed).toBe('phi3');
  });

  it('refuses to answer and protects against hallucination when evidence is empty', async () => {
    mockRetrievalService.retrieve.mockResolvedValueOnce({
      query: 'Unknown project BM999',
      normalizedQuery: 'Unknown project BM999',
      extractedFilters: {},
      results: [],
      telemetry: { totalLatencyMs: 2, degradedMode: false },
    });

    const response = await service.ask('tenant-1', {
      query: 'What is the mold name for project BM999?',
    });

    expect(response.confidence).toBe('REFUSAL');
    expect(response.insufficientEvidence).toBe(true);
    expect(response.answer).toContain('does not contain sufficient evidence');
    expect(response.citations.length).toBe(0);
  });
});
