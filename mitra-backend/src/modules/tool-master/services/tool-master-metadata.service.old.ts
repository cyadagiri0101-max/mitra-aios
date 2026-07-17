import { Injectable } from '@nestjs/common';
import { ToolMaster } from '../entities/tool-master.entity';

export type ToolMasterMetadata = {
  toolNo: string | null;
  toolType: 'BM' | 'IM' | null;
  projectNumber: string | null;
  productName: string | null;
  capacity: string | null;
  material: string | null;
  cavity: string | null;
  machine: string | null;
  neckType: string | null;
  customerName: string | null;
};

const ALPLA_MACHINES = ['BMUTC', 'BMU70', 'BMU70E', 'BMU70E+', 'BMU70+', 'BMU75', 'SSB65', 'SEB101'];
const CUSTOMER_SUFFIXES: Record<string, string> = {
  ALPLA: 'ALPLA',
  CR: 'Creative',
  MTL: 'Alterniq',
  WN: 'Weener',
  WR: 'Weener',
};
const NECK_TYPE_CODES = ['CN', 'FN', 'LH', 'AN', 'TN'];
const MATERIALS = ['HDPE', 'PET', 'PP'];

@Injectable()
export class ToolMasterMetadataService {
  parseFolderName(folderName: string): ToolMasterMetadata {
    const normalized = (folderName ?? '').trim();
    if (!normalized) {
      return this.emptyMetadata();
    }

    const normalizedTokens = normalized.replace(/[\/]+/g, ' ').split(/\s+/);
    const upper = normalized.toUpperCase();
    const toolNo = this.extractToolNo(upper);
    const toolType = toolNo?.startsWith('IM') ? 'IM' : toolNo?.startsWith('BM') ? 'BM' : null;
    const projectNumber = this.extractProjectNumber(upper);
    const machine = this.extractMachine(upper);
    const material = this.extractMaterial(upper);
    const neckType = this.extractNeckType(upper);
    const cavity = this.extractCavity(upper);
    const capacity = this.extractCapacity(upper);
    const customerName = this.extractCustomerName(upper, machine);
    const productName = this.extractProductName(normalizedTokens, { capacity, projectNumber, machine, material, neckType, cavity });

    return {
      toolNo,
      toolType,
      projectNumber,
      productName,
      capacity,
      material,
      cavity,
      machine,
      neckType,
      customerName,
    };
  }

  mergeMetadata(tool: Partial<ToolMaster>, folderName: string): Partial<ToolMaster> {
    const parsed = this.parseFolderName(folderName);
    return {
      ...tool,
      toolNo: tool.toolNo ?? parsed.toolNo ?? tool.toolNo,
      toolType: tool.toolType ?? parsed.toolType ?? tool.toolType,
      productName: tool.productName ?? parsed.productName ?? tool.productName,
      customerName: tool.customerName ?? parsed.customerName ?? tool.customerName,
      machine: tool.machine ?? parsed.machine ?? tool.machine,
      cavity: tool.cavity ?? parsed.cavity ?? tool.cavity,
      projectNumber: (tool as any).projectNumber ?? parsed.projectNumber ?? (tool as any).projectNumber,
      capacity: (tool as any).capacity ?? parsed.capacity ?? (tool as any).capacity,
      material: (tool as any).material ?? parsed.material ?? (tool as any).material,
      neckType: (tool as any).neckType ?? parsed.neckType ?? (tool as any).neckType,
    };
  }

  private emptyMetadata(): ToolMasterMetadata {
    return {
      toolNo: null,
      toolType: null,
      projectNumber: null,
      productName: null,
      capacity: null,
      material: null,
      cavity: null,
      machine: null,
      neckType: null,
      customerName: null,
    };
  }

  private extractToolNo(value: string): string | null {
    const match = /\b(BM|IM)\s*[-_ ]?(\d{2,4})\b/i.exec(value);
    return match ? `${match[1].toUpperCase()}${match[2]}` : null;
  }

  private extractProjectNumber(value: string): string | null {
    const match = /\bP(\d{1,4})\b/i.exec(value);
    return match ? `P${match[1]}` : null;
  }

  private extractMachine(value: string): string | null {
    const patterns = ['BMU\\s*70E\\+', 'BMU\\s*70E', 'BMU\\s*70\\+', 'BMU\\s*70', 'BMUTC', 'BMU75', 'SSB65', 'SEB101'];
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}(?=$|\\s|[^A-Z0-9+])`, 'i');
      const match = regex.exec(value);
      if (match) {
        return match[0].replace(/\s+/g, '');
      }
    }
    return null;
  }

  private extractMaterial(value: string): string | null {
    const regex = new RegExp(`\\b(?:${MATERIALS.join('|')})\\b`, 'i');
    const match = regex.exec(value);
    return match ? match[0].toUpperCase() : null;
  }

  private extractNeckType(value: string): string | null {
    const regex = /\b(CN|FN|LH|AN|TN)\b/i;
    const match = regex.exec(value);
    return match ? match[1].toUpperCase() : null;
  }

  private extractCapacity(value: string): string | null {
    const match = /\b\d+(?:\.\d+)?\s*(?:ML|L|LTR|LITRE|CC)\b/i.exec(value);
    return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
  }

  private extractCavity(value: string): string | null {
    const exactMatch = /\b(?:\d+\+\d+|\d+)(?:-?CAV(?:ITY)?|\s*CAV(?:ITY)?)\b/i.exec(value);
    if (exactMatch) {
      return exactMatch[0].replace(/\s+/g, ' ').replace(/CAV\b/i, 'Cav').replace(/CAVITY/i, 'Cavity');
    }
    const singleMatch = /\b(SINGLE|DOUBLE|TRIPLE)\s+CAVITY\b/i.exec(value);
    return singleMatch ? `${singleMatch[1].charAt(0).toUpperCase()}${singleMatch[1].slice(1).toLowerCase()} cavity` : null;
  }

  private extractCustomerName(value: string, machine: string | null): string | null {
    const explicitMatch = /\b(ALPLA|CR|MTL|WN|WR)\b/i.exec(value);
    if (machine && ALPLA_MACHINES.includes(machine.toUpperCase())) {
      return 'ALPLA';
    }
    if (explicitMatch) {
      const explicitKey = explicitMatch[1].toUpperCase();
      return CUSTOMER_SUFFIXES[explicitKey] || null;
    }
    return null;
  }

  private extractProductName(tokens: string[], context: { capacity: string | null; projectNumber: string | null; machine: string | null; material: string | null; neckType: string | null; cavity: string | null; }) {
    const stopWords = new Set(['MOLD', 'MOULD', 'STL', 'TOOL', 'FOLDER']);
    const productNameTokens: string[] = [];
    const toolNoToken = tokens[0]?.toUpperCase();

    for (let index = 1; index < tokens.length; index += 1) {
      const token = tokens[index];
      const upper = token.toUpperCase();
      const next = tokens[index + 1]?.toUpperCase();
      const next2 = tokens[index + 2]?.toUpperCase();

      if (stopWords.has(upper)) break;
      if (this.isProjectNumberToken(upper)) continue;
      if (this.isCapacityToken(upper)) continue;
      if (this.isMachineToken(upper)) break;
      if (this.isNeckTypeToken(upper)) break;
      if (this.isCustomerSuffixToken(upper)) break;
      if (this.isCavityToken(upper) || this.isCavitySequence(tokens, index)) break;
      if (/^\d+(?:\+\d+)?$/.test(upper) && /^(?:CAV|CAVITY)$/i.test(next)) break;
      if (/\.[A-Z0-9]{1,6}$/i.test(token)) break;
      if (upper === toolNoToken) continue;

      if (this.isMaterialToken(upper)) {
        if (!next ||
            this.isCapacityToken(next) ||
            this.isMachineToken(next) ||
            this.isNeckTypeToken(next) ||
            this.isCustomerSuffixToken(next) ||
            this.isCavityToken(next) ||
            this.isCavitySequence(tokens, index + 1) ||
            /^(?:CAV|CAVITY)$/i.test(next)) {
          continue;
        }
      }

      productNameTokens.push(token);
    }

    const productName = productNameTokens.join(' ').trim();
    return productName || null;
  }

  private isCavitySequence(tokens: string[], index: number) {
    const token = tokens[index]?.toUpperCase();
    const next = tokens[index + 1]?.toUpperCase();
    return /^\d+(?:\+\d+)?$/.test(token) && /^(?:CAV|CAVITY)$/i.test(next);
  }

  private isProjectNumberToken(token: string) {
    return /^P\d{1,4}$/.test(token);
  }

  private isCapacityToken(token: string) {
    return /^\d+(?:\.\d+)?(?:ML|L|LTR|LITRE|CC)$/i.test(token);
  }

  private isMachineToken(token: string) {
    return ALPLA_MACHINES.some((machine) => token.replace(/\s+/g, '').toUpperCase() === machine.toUpperCase());
  }

  private isMaterialToken(token: string) {
    return MATERIALS.includes(token.toUpperCase());
  }

  private isNeckTypeToken(token: string) {
    return NECK_TYPE_CODES.includes(token.toUpperCase());
  }

  private isCustomerSuffixToken(token: string) {
    return Object.keys(CUSTOMER_SUFFIXES).includes(token.toUpperCase());
  }

  private isCavityToken(token: string) {
    return /^(?:\d+\+\d+|\d+)(?:-?CAV(?:ITY)?|CAV)$|^(?:SINGLE|DOUBLE|TRIPLE)$/i.test(token);
  }
}
