import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EngineeringRetrievalService } from '../retrieval/engineering-retrieval.service';
import { EngineeringContextBuilderService } from './engineering-context-builder.service';
import { EngineeringCitationValidatorService } from './engineering-citation-validator.service';
import { OllamaProvider } from '../../ai/providers/ollama.provider';
import { EngineeringAskRequestDto, EngineeringAskResponseDto } from './dto/engineering-grounding.dto';

@Injectable()
export class EngineeringPhi3GroundingService {
  private readonly logger = new Logger(EngineeringPhi3GroundingService.name);
  private readonly phi3Model = 'phi3';

  constructor(
    private readonly config: ConfigService,
    private readonly retrievalService: EngineeringRetrievalService,
    private readonly contextBuilder: EngineeringContextBuilderService,
    private readonly citationValidator: EngineeringCitationValidatorService,
    private readonly ollama: OllamaProvider,
  ) {}

  /**
   * Answer an engineering question using grounded local Phi-3 inference and validated citations.
   */
  async ask(tenantId: string, request: EngineeringAskRequestDto): Promise<EngineeringAskResponseDto> {
    const totalStartTime = Date.now();

    // 1. Execute M7.3.1 Hybrid Retrieval
    const retrievalStart = Date.now();
    const retrievalResponse = await this.retrievalService.retrieve(tenantId, {
      query: request.query,
      topK: request.topK || 8,
      filters: request.filters,
      minScore: 0.1,
    });
    const retrievalLatencyMs = Date.now() - retrievalStart;

    // 2. Refusal Guard on Empty or Low-Evidence Results
    if (!retrievalResponse.results || retrievalResponse.results.length === 0) {
      const totalLatencyMs = Date.now() - totalStartTime;
      return {
        query: request.query,
        answer: 'The engineering library does not contain sufficient evidence to answer this reliably.',
        grounded: true,
        confidence: 'REFUSAL',
        insufficientEvidence: true,
        citations: [],
        telemetry: {
          retrievalLatencyMs,
          contextBuilderLatencyMs: 0,
          llmInferenceLatencyMs: 0,
          citationValidationLatencyMs: 0,
          totalLatencyMs,
          contextChunksCount: 0,
          contextCharsCount: 0,
          modelUsed: 'none (refusal guard)',
          isLiveInference: false,
          hallucinatedCitationsDetected: 0,
        },
      };
    }

    // 3. Build Deterministic Engineering Context Blocks
    const contextStart = Date.now();
    const builtContext = this.contextBuilder.buildContext(retrievalResponse.results, {
      includeHistorical: request.includeHistorical,
      maxChunks: request.topK || 8,
      maxChars: request.maxContextChars || 8000,
    });
    const contextBuilderLatencyMs = Date.now() - contextStart;

    // 4. Construct System Prompt & Prompt Template
    const prompt = this.assemblePrompt(request.query, builtContext.contextText);

    // 5. Check Local Model Readiness & Execute Inference
    const llmStart = Date.now();
    let rawAnswer = '';
    let isLiveInference = false;
    let modelUsed = 'deterministic-grounded-fallback';

    try {
      const ping = await this.ollama.ping();
      if (ping.available && this.ollama.enabled) {
        const ollamaRes = await this.ollama.generate(prompt);
        if (ollamaRes && ollamaRes.done && !ollamaRes.response.includes('[AI_DISABLED]')) {
          rawAnswer = ollamaRes.response;
          isLiveInference = true;
          modelUsed = ollamaRes.model || this.phi3Model;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Local Phi-3 inference failed or timed out: ${err.message}. Using deterministic grounded response.`);
    }

    if (!rawAnswer) {
      // Deterministic Grounded Synthesis from top verified chunks
      rawAnswer = this.synthesizeDeterministicGroundedAnswer(request.query, builtContext.citationsList);
    }
    const llmInferenceLatencyMs = Date.now() - llmStart;

    // 6. Validate Citations & Eliminate Hallucinations
    const valStart = Date.now();
    const validationResult = this.citationValidator.validateCitations(rawAnswer, builtContext.citationRegistry);
    const citationValidationLatencyMs = Date.now() - valStart;

    // If answer states insufficient evidence or lacks sufficient evidence
    const lowerAnswer = validationResult.validatedAnswer.toLowerCase();
    const insufficientEvidence = lowerAnswer.includes('insufficient evidence') || lowerAnswer.includes('does not contain sufficient evidence');
    const confidence = insufficientEvidence ? 'REFUSAL' : validationResult.validCitations.length > 0 ? 'HIGH' : 'MEDIUM';

    const totalLatencyMs = Date.now() - totalStartTime;

    return {
      query: request.query,
      answer: validationResult.validatedAnswer,
      grounded: true,
      confidence,
      insufficientEvidence,
      citations: validationResult.validCitations,
      telemetry: {
        retrievalLatencyMs,
        contextBuilderLatencyMs,
        llmInferenceLatencyMs,
        citationValidationLatencyMs,
        totalLatencyMs,
        contextChunksCount: builtContext.includedChunksCount,
        contextCharsCount: builtContext.totalChars,
        modelUsed,
        isLiveInference,
        hallucinatedCitationsDetected: validationResult.hallucinatedCitationsCount,
      },
    };
  }

  private assemblePrompt(query: string, contextBlocks: string): string {
    return `You are the MITRA Engineering Knowledge Library Copilot.
Your sole mission is to provide accurate, factual, and strictly grounded engineering answers based ONLY on the provided context passages below.

CRITICAL INSTRUCTIONS:
1. Base your answer EXCLUSIVELY on the facts provided in the Context.
2. Every engineering claim, measurement, material grade, machine, tool specification, or cycle time MUST cite its source using [REF-x] notation (e.g. "[REF-1]", "[REF-2]").
3. DO NOT use outside general knowledge or make assumptions.
4. DO NOT guess, fabricate, or invent numbers, materials, tolerances, or file paths.
5. If the provided context does NOT contain enough information to answer the question reliably, you MUST explicitly respond with:
   "The engineering library does not contain sufficient evidence to answer this reliably."
6. NEVER invent citations. ONLY cite [REF-x] tags that are explicitly defined in the Context.

CONTEXT PASSAGES:
${contextBlocks}

USER QUESTION:
${query}

GROUNDED ENGINEERING ANSWER:`;
  }

  private synthesizeDeterministicGroundedAnswer(query: string, citations: any[]): string {
    if (!citations || citations.length === 0) {
      return 'The engineering library does not contain sufficient evidence to answer this reliably.';
    }

    const topCitation = citations[0];
    const topSnippet = topCitation.snippet ? topCitation.snippet.split('\n')[0] : topCitation.title;
    const refTag = topCitation.ref || 'REF-1';

    return `Based on the engineering knowledge library, the specification for ${topCitation.projectNumber || 'the requested item'} is documented in [${refTag}]. Details: ${topSnippet} [${refTag}].`;
  }
}
