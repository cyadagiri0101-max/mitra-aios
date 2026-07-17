import { Injectable } from '@nestjs/common';
import { TOOL_MASTER_METADATA_CONFIG } from '../config/metadata.config';

export type ProjectMetadata = {
  projectNumber: string | null;
  projectType: string | null;
  productName: string | null;
  customer: string | null;
};

export type TechnicalSpecification = {
  capacity: string | null;
  material: string | null;
  machine: string | null;
  cavitation: string | null;
  neckType: string | null;
  moldType: string | null;
};

export type ToolMasterMetadata = {
  toolNo: string | null;
  projectMetadata: ProjectMetadata;
  technicalSpecification: TechnicalSpecification;
};

@Injectable()
export class ToolMasterMetadataService {
  parseFolderName(folderName: string): ToolMasterMetadata {
    const normalized = (folderName ?? '').trim();
    if (!normalized) {
      return this.emptyMetadata();
    }

    const upper = normalized.toUpperCase();
    const tokens = normalized.replace(/[\/\\]+/g, ' ').split(/\s+/);

    const toolNo = this.extractToolNumber(upper);
    const projectType = this.detectProjectType(toolNo);
    const projectNumber = this.extractProjectNumber(upper);
    const machine = this.extractMachine(upper);
    const customer = this.extractCustomer(upper, machine);
    const productName = this.extractProductName(tokens, toolNo);
    const capacity = this.extractCapacity(upper);
    const material = this.extractMaterial(upper);
    const cavitation = this.extractCavitation(upper);
    const neckType = this.extractNeckType(upper);
    const moldType = this.extractMoldType(upper, cavitation);

    return {
      toolNo,
      projectMetadata: {
        projectNumber,
        projectType,
        productName,
        customer,
      },
      technicalSpecification: {
        capacity,
        material,
        machine,
        cavitation,
        neckType,
        moldType,
      },
    };
  }

  private emptyMetadata(): ToolMasterMetadata {
    return {
      toolNo: null,
      projectMetadata: {
        projectNumber: null,
        projectType: null,
        productName: null,
        customer: null,
      },
      technicalSpecification: {
        capacity: null,
        material: null,
        machine: null,
        cavitation: null,
        neckType: null,
        moldType: null,
      },
    };
  }

  private extractToolNumber(value: string): string | null {
    const prefixes = Object.keys(TOOL_MASTER_METADATA_CONFIG.projectPrefixes);
    const pattern = prefixes.join('|');
    const match = new RegExp(`\\b(${pattern})\\s*[-_ ]?(\\d+)\\b`, 'i').exec(value);
    return match ? `${match[1].toUpperCase()}${match[2]}` : null;
  }

  private detectProjectType(toolNo: string | null): string | null {
    if (!toolNo) return null;
    const prefix = toolNo.replace(/\d+/g, '');
    return (TOOL_MASTER_METADATA_CONFIG.projectPrefixes as any)[prefix] ?? null;
  }

  private extractProjectNumber(value: string): string | null {
    const match = /\bP(\d{1,4})\b/i.exec(value);
    return match ? `P${match[1]}` : null;
  }

  private extractProductName(tokens: string[], toolNo: string | null): string | null {
    const stopWords = new Set(['MOLD', 'MOULD', 'TOOL', 'FOLDER', 'STL', 'DRW', 'DWG', 'CAVITY', 'CAV']);
    const productTokens: string[] = [];

    for (let i = 1; i < tokens.length; i += 1) {
      const token = tokens[i];
      const upper = token.toUpperCase();

      if (stopWords.has(upper)) break;
      if (this.isMetadataToken(upper)) continue;
      if (this.isCavityToken(upper)) break;
      if (this.isExtensionLike(token)) break;

      productTokens.push(token);
    }

    const productName = productTokens.join(' ').trim();
    return productName || null;
  }

  private extractCapacity(value: string): string | null {
    const match = /\b(\d+(?:\.\d+)?)\s*(ML|L|LTR|LITRE|CC)\b/i.exec(value);
    return match ? `${match[1]}${match[2].toUpperCase()}` : null;
  }

  private extractMaterial(value: string): string | null {
    for (const material of TOOL_MASTER_METADATA_CONFIG.materials) {
      const regex = new RegExp(`\\b${material}\\b`, 'i');
      if (regex.test(value)) {
        return material;
      }
    }
    return null;
  }

  private extractMachine(value: string): string | null {
    const machines = Object.keys(TOOL_MASTER_METADATA_CONFIG.machines);
    const sortedMachines = machines.sort((a, b) => b.length - a.length);

    for (const machine of sortedMachines) {
      const pattern = machine.replace(/\+/g, '\\+').replace(/\s+/g, '\\s+');
      const regex = new RegExp(`(?:^|\\s)${pattern}(?:\\s|$)`, 'i');
      const match = regex.exec(value);
      if (match) {
        return match[0].trim().replace(/\s+/g, '');
      }
    }
    return null;
  }

  private extractCavitation(value: string): string | null {
    const match = /\b((?:\d+\+\d+|\d+)\s*(?:-?CAV(?:ITY)?|CAVITY|Cav|cavity)|(?:SINGLE|DOUBLE|TRIPLE)\s+(?:CAVITY|Cavity|cavity))\b/i.exec(value);
    if (match) {
      return match[0].replace(/\s+/g, ' ');
    }
    return null;
  }

  private extractNeckType(value: string): string | null {
    for (const neckType of TOOL_MASTER_METADATA_CONFIG.neckTypes) {
      const regex = new RegExp(`\\b${neckType}\\b`, 'i');
      const match = regex.exec(value);
      if (match) {
        return neckType;
      }
    }
    return null;
  }

  private extractMoldType(value: string, cavitation: string | null): string | null {
    if (cavitation) {
      const cavUpper = cavitation.toUpperCase();
      // Check for explicit patterns like SINGLE, DOUBLE, TRIPLE
      for (const [pattern, moldType] of Object.entries(TOOL_MASTER_METADATA_CONFIG.cavityPatterns)) {
        if (cavUpper.includes(pattern)) {
          return moldType;
        }
      }
      // If cavitation contains numbers (e.g., "10-CAVITY", "4+4 CAVITY"), it's multi-cavity
      if (/\d/.test(cavUpper)) {
        return 'Multi Cavity';
      }
    }

    for (const moldType of TOOL_MASTER_METADATA_CONFIG.moldTypes) {
      const regex = new RegExp(`\\b${moldType.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(value)) {
        return moldType;
      }
    }
    return null;
  }

  private extractCustomer(value: string, machine: string | null = null): string | null {
    if (machine) {
      const customer = (TOOL_MASTER_METADATA_CONFIG.machines as any)[machine];
      if (customer) {
        return customer;
      }
    }

    const suffixes = Object.keys(TOOL_MASTER_METADATA_CONFIG.customerSuffixes);
    for (const suffix of suffixes) {
      const regex = new RegExp(`(?:^|\s)${suffix}(?:\s|$)`, 'i');
      if (regex.test(value)) {
        return (TOOL_MASTER_METADATA_CONFIG.customerSuffixes as any)[suffix];
      }
    }
    return null;
  }

  private isMetadataToken(upper: string): boolean {
    if (/^P\d{1,4}$/.test(upper)) return true;
    if (/^\d+(?:\.\d+)?(?:ML|L|LTR|LITRE|CC)$/.test(upper)) return true;
    if (TOOL_MASTER_METADATA_CONFIG.materials.includes(upper)) return true;
    if (TOOL_MASTER_METADATA_CONFIG.neckTypes.includes(upper)) return true;
    const suffixes = Object.keys(TOOL_MASTER_METADATA_CONFIG.customerSuffixes);
    if (suffixes.includes(upper)) return true;
    return false;
  }

  private isCavityToken(upper: string): boolean {
    return /^(?:\d+(?:\+\d+)?(?:-?CAV(?:ITY)?|CAVITY)?|SINGLE|DOUBLE|TRIPLE|MULTI)$/i.test(upper) || /CAV|CAVITY/i.test(upper);
  }

  private isExtensionLike(token: string): boolean {
    return /^\.\w+$/.test(token) || /PRT|ASM|DRW|STEP|IGES|PDF|DXF|IGS/i.test(token);
  }
}
