import { Injectable, Logger } from '@nestjs/common';
import { AuthorityStatus } from '../types/engineering-library-scan.types';
import { EngineeringRetrievalResultDto } from '../retrieval/dto/engineering-retrieval.dto';
import { EngineeringCitationDto } from './dto/engineering-grounding.dto';

export interface BuiltEngineeringContext {
  contextText: string;
  citationRegistry: Map<string, EngineeringCitationDto>;
  citationsList: EngineeringCitationDto[];
  includedChunksCount: number;
  totalChars: number;
}

@Injectable()
export class EngineeringContextBuilderService {
  private readonly logger = new Logger(EngineeringContextBuilderService.name);
  private readonly defaultMaxChunks = 8;
  private readonly defaultMaxChars = 8000;

  /**
   * Build deterministic engineering context blocks and citation registry.
   */
  buildContext(
    retrievedResults: EngineeringRetrievalResultDto[],
    options: {
      includeHistorical?: boolean;
      maxChunks?: number;
      maxChars?: number;
    } = {},
  ): BuiltEngineeringContext {
    const maxChunks = options.maxChunks || this.defaultMaxChunks;
    const maxChars = options.maxChars || this.defaultMaxChars;

    const citationRegistry = new Map<string, EngineeringCitationDto>();
    const citationsList: EngineeringCitationDto[] = [];
    const contextBlocks: string[] = [];

    // Filter out superseded unless historical requested
    const filteredResults = retrievedResults.filter((r) => {
      if (!options.includeHistorical && r.authorityStatus === AuthorityStatus.SUPERSEDED) {
        return false;
      }
      return true;
    });

    let currentTotalChars = 0;
    let refOrdinal = 1;

    for (const r of filteredResults) {
      if (refOrdinal > maxChunks) break;

      const refTag = `REF-${refOrdinal}`;
      const blockHeader = `[${refTag}] (Source: ${r.provenance.sourceType} | Entity: ${r.entityType} | Project: ${r.projectNumber || 'N/A'} | Authority: ${r.authorityStatus})`;
      const blockContent = `${blockHeader}\n${r.chunkText.trim()}\n`;

      if (currentTotalChars + blockContent.length > maxChars && contextBlocks.length > 0) {
        break; // Reached character budget
      }

      contextBlocks.push(blockContent);
      currentTotalChars += blockContent.length;

      const citationDto: EngineeringCitationDto = {
        ref: refTag,
        chunkId: r.chunkId,
        entityType: r.entityType,
        entityId: r.entityId,
        title: r.title,
        projectNumber: r.projectNumber,
        authorityStatus: r.authorityStatus,
        provenance: r.provenance,
        snippet: r.chunkText.substring(0, 200),
        isValid: true,
      };

      citationRegistry.set(refTag, citationDto);
      citationsList.push(citationDto);
      refOrdinal += 1;
    }

    return {
      contextText: contextBlocks.join('\n---\n\n'),
      citationRegistry,
      citationsList,
      includedChunksCount: contextBlocks.length,
      totalChars: currentTotalChars,
    };
  }
}
