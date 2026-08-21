import { Injectable, Logger } from '@nestjs/common';
import { EngineeringRetrievalFilters } from './dto/engineering-retrieval.dto';

export interface NormalizedQueryOutput {
  rawQuery: string;
  normalizedQuery: string;
  searchTokens: string[];
  extractedFilters: EngineeringRetrievalFilters;
}

@Injectable()
export class EngineeringQueryNormalizerService {
  private readonly logger = new Logger(EngineeringQueryNormalizerService.name);

  // Common customer names in tooling library
  private readonly knownCustomers = ['veedol', 'alpla', 'dabur', 'castrol', 'tata', 'maruti', 'mahindra', 'unilever', 'nestle', 'reckitt'];

  // Common machine brands/models
  private readonly knownMachines = ['speedex', 'seb101', 'seb 101', 'engel', 'ferromatik', 'dr boy', 'dr. boy', 'windsor', 'arburg', 'bekum', 'uniloy'];

  // Common tool materials & polymers
  private readonly knownMaterials = ['hdpe', 'pp', 'pet', 'ldpe', 'lldpe', 'aluminium', 'aluminum', 'hokotol', 'alumold', 'p20', 'en24', 'en31', 'stavax', 'h13'];

  normalizeQuery(query: string, userFilters?: EngineeringRetrievalFilters): NormalizedQueryOutput {
    if (!query || typeof query !== 'string') {
      return {
        rawQuery: '',
        normalizedQuery: '',
        searchTokens: [],
        extractedFilters: userFilters || {},
      };
    }

    const raw = query.trim();
    let cleaned = raw.replace(/[^\w\s\-_./#]/g, ' ').replace(/\s+/g, ' ').trim();
    const lower = cleaned.toLowerCase();

    const extractedFilters: EngineeringRetrievalFilters = { ...(userFilters || {}) };

    // 1. Extract Project Number (e.g. BM454, BM-454, IM102, TC001)
    const projectMatch = cleaned.match(/\b(BM|IM|TC|MM|PL|PRJ)[-_]?(\d+)\b/i);
    if (projectMatch && !extractedFilters.projectNumber) {
      const prefix = projectMatch[1].toUpperCase();
      const num = projectMatch[2];
      extractedFilters.projectNumber = `${prefix}${num}`;
      extractedFilters.projectPrefix = prefix;
    }

    // 2. Extract Revision (e.g. RevA, Rev B, Rev_01)
    const revMatch = cleaned.match(/\bRev[-_\s]?([A-Z0-9]+)\b/i);
    if (revMatch && !extractedFilters.revision) {
      extractedFilters.revision = `Rev${revMatch[1].toUpperCase()}`;
    }

    // 3. Extract Customer
    if (!extractedFilters.customer) {
      for (const cust of this.knownCustomers) {
        if (new RegExp(`\\b${cust}\\b`, 'i').test(lower)) {
          extractedFilters.customer = cust.charAt(0).toUpperCase() + cust.slice(1);
          break;
        }
      }
    }

    // 4. Extract Machine
    if (!extractedFilters.machine) {
      for (const mach of this.knownMachines) {
        if (new RegExp(`\\b${mach}\\b`, 'i').test(lower)) {
          extractedFilters.machine = mach.toUpperCase();
          break;
        }
      }
    }

    // 5. Extract Material
    if (!extractedFilters.material) {
      for (const mat of this.knownMaterials) {
        if (new RegExp(`\\b${mat}\\b`, 'i').test(lower)) {
          extractedFilters.material = mat.toUpperCase();
          break;
        }
      }
    }

    // 6. Extract Entity Type Intent
    if (!extractedFilters.entityType) {
      if (/\b(bom|part list|parts|item|insert|cutting size|steel grade)\b/i.test(lower)) {
        extractedFilters.entityType = 'BOM_PART';
      } else if (/\b(cycle time|cycletime|ct|cycle seconds|speedex cycle)\b/i.test(lower)) {
        extractedFilters.entityType = 'CYCLE_TIME';
      } else if (/\b(process|planning|sequence|operation|step|duration|department)\b/i.test(lower)) {
        extractedFilters.entityType = 'PROCESS_PLAN';
      } else if (/\b(mold|mould|project|cavitation|tooling)\b/i.test(lower)) {
        extractedFilters.entityType = 'PROJECT';
      } else if (/\b(bottle|volume|overflow|container shape|product)\b/i.test(lower)) {
        extractedFilters.entityType = 'PRODUCT';
      }
    }

    const searchTokens = cleaned
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    return {
      rawQuery: raw,
      normalizedQuery: cleaned,
      searchTokens,
      extractedFilters,
    };
  }
}
