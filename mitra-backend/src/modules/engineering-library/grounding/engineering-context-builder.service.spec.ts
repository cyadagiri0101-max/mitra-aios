import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringContextBuilderService } from './engineering-context-builder.service';
import { AuthorityStatus } from '../types/engineering-library-scan.types';
import { EngineeringRetrievalResultDto } from '../retrieval/dto/engineering-retrieval.dto';

describe('EngineeringContextBuilderService (M7.4 Context Builder)', () => {
  let service: EngineeringContextBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringContextBuilderService],
    }).compile();

    service = module.get<EngineeringContextBuilderService>(EngineeringContextBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds sequential [REF-1], [REF-2] context blocks and citation registry', () => {
    const results: EngineeringRetrievalResultDto[] = [
      {
        chunkId: 'c1',
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
        chunkText: 'BODY INSERT finished size 1230 x 135 x 40.',
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
      {
        chunkId: 'c2',
        score: 0.88,
        entityType: 'PROJECT',
        entityId: 'proj-1',
        chunkType: 'PROJECT_CONTEXT',
        title: 'Project BM454',
        projectNumber: 'BM454',
        projectPrefix: 'BM',
        customer: 'Veedol',
        machine: 'SEB101',
        material: 'HDPE',
        revision: 'RevA',
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        chunkText: 'Project BM454 Veedol 600ml Mold 8-Cavity.',
        provenance: {
          sourceId: 'src-1',
          sourceType: 'MEKB_DATABASE',
          relativePath: 'database/mekb.sqlite',
          sourceFile: 'mekb.sqlite',
          sourceSheet: 'project_master',
          sourceRow: 1,
          sourcePage: null,
        },
      },
    ];

    const context = service.buildContext(results, { maxChunks: 5 });
    expect(context.includedChunksCount).toBe(2);
    expect(context.citationRegistry.size).toBe(2);

    expect(context.citationRegistry.has('REF-1')).toBe(true);
    expect(context.citationRegistry.get('REF-1')?.projectNumber).toBe('BM454');
    expect(context.citationRegistry.get('REF-1')?.provenance.sourceSheet).toBe('part_list');

    expect(context.citationRegistry.has('REF-2')).toBe(true);
    expect(context.citationRegistry.get('REF-2')?.projectNumber).toBe('BM454');

    expect(context.contextText).toContain('[REF-1]');
    expect(context.contextText).toContain('[REF-2]');
    expect(context.contextText).toContain('BODY INSERT finished size');
  });

  it('filters out superseded chunks unless explicitly allowed', () => {
    const results: EngineeringRetrievalResultDto[] = [
      {
        chunkId: 'c-old',
        score: 0.9,
        entityType: 'BOM_PART',
        entityId: 'p-old',
        chunkType: 'BOM_TABLE',
        title: 'Old BOM',
        projectNumber: 'BM454',
        projectPrefix: 'BM',
        customer: 'Veedol',
        machine: 'SEB101',
        material: 'ALUMINIUM',
        revision: 'Rev0',
        authorityStatus: AuthorityStatus.SUPERSEDED,
        chunkText: 'Deprecated BOM.',
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
    ];

    const context = service.buildContext(results, { includeHistorical: false });
    expect(context.includedChunksCount).toBe(0);
    expect(context.citationRegistry.size).toBe(0);

    const contextHistorical = service.buildContext(results, { includeHistorical: true });
    expect(contextHistorical.includedChunksCount).toBe(1);
    expect(contextHistorical.citationRegistry.has('REF-1')).toBe(true);
  });
});
