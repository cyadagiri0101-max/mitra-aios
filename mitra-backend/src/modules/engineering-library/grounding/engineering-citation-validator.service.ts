import { Injectable, Logger } from '@nestjs/common';
import { EngineeringCitationDto } from './dto/engineering-grounding.dto';

export interface CitationValidationResult {
  validatedAnswer: string;
  validCitations: EngineeringCitationDto[];
  hallucinatedCitationsCount: number;
  isFullyValid: boolean;
}

@Injectable()
export class EngineeringCitationValidatorService {
  private readonly logger = new Logger(EngineeringCitationValidatorService.name);

  /**
   * Validate citations in generated text against the active citation registry.
   */
  validateCitations(rawAnswer: string, citationRegistry: Map<string, EngineeringCitationDto>): CitationValidationResult {
    if (!rawAnswer || rawAnswer.trim().length === 0) {
      return {
        validatedAnswer: '',
        validCitations: [],
        hallucinatedCitationsCount: 0,
        isFullyValid: true,
      };
    }

    // Extract all [REF-X] or REF-X patterns
    const refRegex = /\[?(REF-\d+)\]?/gi;
    const matches = rawAnswer.match(refRegex) || [];

    const uniqueTags = new Set<string>(
      matches.map((m) => m.replace(/[\[\]]/g, '').toUpperCase()),
    );

    const validCitations: EngineeringCitationDto[] = [];
    let hallucinatedCount = 0;

    let sanitizedAnswer = rawAnswer;

    for (const tag of uniqueTags) {
      if (citationRegistry.has(tag)) {
        validCitations.push(citationRegistry.get(tag)!);
      } else {
        // Tag is not in registry -> Hallucinated reference
        this.logger.warn(`Rejected hallucinated citation tag: [${tag}]`);
        hallucinatedCount += 1;
        // Strip or flag hallucinated citation tag from text
        const badTagRegex = new RegExp(`\\[?${tag}\\]?`, 'gi');
        sanitizedAnswer = sanitizedAnswer.replace(badTagRegex, '').replace(/\s+/g, ' ');
      }
    }

    return {
      validatedAnswer: sanitizedAnswer.trim(),
      validCitations,
      hallucinatedCitationsCount: hallucinatedCount,
      isFullyValid: hallucinatedCount === 0,
    };
  }
}
