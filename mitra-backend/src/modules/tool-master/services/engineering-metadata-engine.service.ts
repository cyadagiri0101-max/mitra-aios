import { Injectable } from '@nestjs/common';
import { ToolMasterMetadataService, ToolMasterMetadata } from './tool-master-metadata.service';
import { ENGINEERING_METADATA_ENGINE_CONFIG } from '../config/engineering-engine.config';

export type BottleFamily = {
  name: string | null;
  capacityRange: string | null;
  family: string | null;
};

export type CustomerResolution = {
  customer: string | null;
  rule: string | null;
  confidence: 'high' | 'medium' | 'low' | 'manual' | null;
};

export type FolderClassification = {
  primary: string | null;
  secondary: string[];
};

export type ProjectCompleteness = {
  expectedItems: string[];
  foundItems: string[];
  completionPercentage: number;
};

export type EngineeringMetadata = ToolMasterMetadata & {
  bottleFamily: BottleFamily;
  productVariant: string | null;
  customerResolution: CustomerResolution;
  folderClassification: FolderClassification;
  aiTags: string[];
  completeness: ProjectCompleteness;
  linkedProjects: {
    parentProjects: string[];
    childProjects: string[];
  };
};

@Injectable()
export class EngineeringMetadataEngine {
  constructor(private metadataService: ToolMasterMetadataService) {}

  analyzeFolder(folderName: string): EngineeringMetadata {
    const baseMetadata = this.metadataService.parseFolderName(folderName);

    const bottleFamily = this.detectBottleFamily(baseMetadata, folderName);
    const customerResolution = this.resolveCustomerWithExplanation(baseMetadata, folderName);
    const folderClassification = this.classifyFolder(folderName);
    const aiTags = this.generateAITags(baseMetadata, bottleFamily, customerResolution);
    const completeness = this.detectCompleteness(baseMetadata, folderName);
    const linkedProjects = this.prepareRelationships(baseMetadata);
    const productVariant = this.detectProductVariant(baseMetadata, bottleFamily);

    return {
      ...baseMetadata,
      bottleFamily,
      productVariant,
      customerResolution,
      folderClassification,
      aiTags,
      completeness,
      linkedProjects,
    };
  }

  private detectProductVariant(metadata: ToolMasterMetadata, bottleFamily: BottleFamily): string | null {
    if (metadata.projectMetadata.productName) {
      return metadata.projectMetadata.productName;
    }

    if (bottleFamily.name) {
      return bottleFamily.name;
    }

    return null;
  }

  private detectBottleFamily(metadata: ToolMasterMetadata, folderName: string): BottleFamily {
    const productName = metadata.projectMetadata.productName || '';
    const upper = productName.toUpperCase();

    for (const [family, details] of Object.entries(ENGINEERING_METADATA_ENGINE_CONFIG.bottleFamilies)) {
      if (upper.includes(family.toUpperCase())) {
        return {
          name: family,
          capacityRange: (details as any).capacity,
          family: (details as any).family,
        };
      }
    }

    return {
      name: null,
      capacityRange: null,
      family: null,
    };
  }

  private resolveCustomerWithExplanation(metadata: ToolMasterMetadata, folderName: string): CustomerResolution {
    const upper = folderName.toUpperCase();

    for (const rule of ENGINEERING_METADATA_ENGINE_CONFIG.customerResolutionRules) {
      const regex = new RegExp(`(^|\\W)(?:${rule.pattern})(?=$|\\W)`, 'i');
      if (regex.test(upper)) {
        return {
          customer: rule.customer,
          rule: `${rule.type.toLowerCase()} rule: ${rule.pattern}`,
          confidence: rule.confidence,
        };
      }
    }

    return {
      customer: metadata.projectMetadata.customer,
      rule: metadata.projectMetadata.customer ? 'Detected from config' : null,
      confidence: metadata.projectMetadata.customer ? 'high' : null,
    };
  }

  private classifyFolder(folderName: string): FolderClassification {
    const upper = folderName.toUpperCase();
    const classifications: string[] = [];

    for (const [category, patterns] of Object.entries(ENGINEERING_METADATA_ENGINE_CONFIG.folderCategories)) {
      for (const pattern of patterns) {
        if (new RegExp(`\\b${pattern}\\b`, 'i').test(folderName)) {
          classifications.push(category);
          break;
        }
      }
    }

    return {
      primary: classifications.length > 0 ? classifications[0] : null,
      secondary: classifications.slice(1),
    };
  }

  private generateAITags(metadata: ToolMasterMetadata, bottleFamily: BottleFamily, customerResolution: CustomerResolution): string[] {
    const tags: string[] = [];
    const combinedMeta = {
      ...metadata.projectMetadata,
      ...metadata.technicalSpecification,
      bottleFamily: bottleFamily.name,
      customer: customerResolution.customer || metadata.projectMetadata.customer,
    };

    for (const rule of ENGINEERING_METADATA_ENGINE_CONFIG.aiTagRules) {
      if (rule.condition(combinedMeta)) {
        tags.push(rule.tag);
      }
    }

    // Add project type tag
    if (metadata.projectMetadata.projectType) {
      tags.push(metadata.projectMetadata.projectType.toLowerCase().replace(/\s+/g, '-'));
    }

    // Add customer tag
    if (customerResolution.customer) {
      tags.push(`customer-${customerResolution.customer.toLowerCase()}`);
    }

    return Array.from(new Set(tags)); // Remove duplicates
  }

  private detectCompleteness(metadata: ToolMasterMetadata, folderName: string): ProjectCompleteness {
    const projectType = metadata.projectMetadata.projectType;
    const templates = ENGINEERING_METADATA_ENGINE_CONFIG.completenessTemplates as Record<string, string[]>;
    const expectedItems = projectType ? templates[projectType] || [] : [];
    const foundItems: string[] = [];
    const upper = folderName.toUpperCase();

    for (const item of expectedItems) {
      if (new RegExp(`\\b${item.toUpperCase()}\\b`, 'i').test(upper)) {
        foundItems.push(item);
      }
    }

    const completionPercentage = expectedItems.length > 0 ? Math.round((foundItems.length / expectedItems.length) * 100) : 0;

    return {
      expectedItems,
      foundItems,
      completionPercentage,
    };
  }

  private prepareRelationships(metadata: ToolMasterMetadata): { parentProjects: string[]; childProjects: string[] } {
    const toolNo = metadata.toolNo || '';
    const prefix = toolNo.replace(/\d+/g, '');

    const relationships = ENGINEERING_METADATA_ENGINE_CONFIG.projectRelationships as Record<string, string[]>;
    const childProjectPrefixes = relationships[prefix] || [];

    return {
      parentProjects: [],
      childProjects: childProjectPrefixes.map((p: string) => `${p}XXX`), // Placeholder for linked projects
    };
  }
}

