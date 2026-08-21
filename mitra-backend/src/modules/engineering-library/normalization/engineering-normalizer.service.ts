import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeCatalogEntry } from '../../knowledge/entities/knowledge-catalog.entity';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

export interface NormalizedEngineeringRecord {
  tenantId: string;
  sourceId: string | null;
  sourceType: string;
  entityType: string;
  entityId: string;
  chunkType: string;
  title: string;
  projectNumber: string | null;
  projectPrefix: string | null;
  customer: string | null;
  machine: string | null;
  material: string | null;
  revision: string | null;
  authorityStatus: AuthorityStatus;
  relativePath: string | null;
  sourceFile: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
  sourcePage: number | null;
  normalizedText: string;
  structuredMetadata: Record<string, any>;
}

@Injectable()
export class EngineeringNormalizerService {
  private readonly logger = new Logger(EngineeringNormalizerService.name);

  /**
   * Normalize a KnowledgeCatalogEntry into one or more canonical normalized records.
   */
  normalizeCatalogEntry(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord[] {
    const sourceRef = entry.sourceRef || {};
    const tableName = sourceRef.tableName || sourceRef.table || 'unknown';
    const sourceDomain = entry.sourceDomain || 'MEKB';

    if (sourceDomain === 'DOCUMENT') {
      return [this.normalizeDocumentEntry(entry, source)];
    }

    switch (tableName) {
      case 'project_master':
        return [this.normalizeProjectMaster(entry, source)];
      case 'product_master':
        return [this.normalizeProductMaster(entry, source)];
      case 'part_list':
        return [this.normalizePartList(entry, source)];
      case 'process_planning':
        return [this.normalizeProcessPlanning(entry, source)];
      case 'cycle_time_history':
        return [this.normalizeCycleTime(entry, source)];
      case 'machine_master':
        return [this.normalizeMachineMaster(entry, source)];
      case 'material_master':
        return [this.normalizeMaterialMaster(entry, source)];
      case 'bottle_family':
        return [this.normalizeBottleFamily(entry, source)];
      case 'component_detail':
        return [this.normalizeComponentDetail(entry, source)];
      case 'project_relationships':
        return [this.normalizeProjectRelationship(entry, source)];
      case 'document_index':
        return [this.normalizeDocumentIndex(entry, source)];
      case 'ai_search_tags':
        return [this.normalizeAiSearchTag(entry, source)];
      default:
        return [this.normalizeGenericCatalogEntry(entry, source)];
    }
  }

  private normalizeProjectMaster(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const projectNumber = row.project_number || null;
    const prefix = row.prefix || (projectNumber ? projectNumber.replace(/[0-9]/g, '') : null);

    const lines = [
      `=== ENGINEERING PROJECT PROFILE: ${projectNumber || entry.title} ===`,
      `Project Number: ${projectNumber || 'N/A'}`,
      `Mold / Tool Name: ${row.mold_name || row.project_name || 'N/A'}`,
      `Customer: ${row.customer_name || 'N/A'}`,
      `Prefix / Domain: ${prefix || 'N/A'}`,
      `Cavitation: ${row.cavitation || 'N/A'}`,
      `Machine: ${row.machine_name || 'N/A'}`,
      `Product Type: ${row.product_type || 'N/A'}`,
      `Resin / Material: ${row.resin || 'N/A'}`,
      `Status: ${row.status || 'RELEASED'}`,
      `Provenance: database/mekb.sqlite -> project_master (Record ID: ${row.id || row._rowid_ || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'PROJECT',
      entityId: entry.entityId,
      chunkType: 'PROJECT_CONTEXT',
      title: entry.title,
      projectNumber,
      projectPrefix: prefix,
      customer: row.customer_name || null,
      machine: row.machine_name || null,
      material: row.resin || null,
      revision: row.revision || 'RevA',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'project_master',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'TOOLING_PROJECT',
      },
    };
  }

  private normalizeProductMaster(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== PRODUCT SPECIFICATION: ${row.product_name || entry.title} ===`,
      `Product Name: ${row.product_name || 'N/A'}`,
      `Volume: ${row.volume_ml || row.volume || 'N/A'} ml`,
      `Overflow Volume: ${row.overflow_volume_ml || 'N/A'} ml`,
      `Resin / Polymer: ${row.resin || 'N/A'}`,
      `Container Shape: ${row.shape || 'N/A'}`,
      `Target Weight: ${row.weight_gm || 'N/A'} gm`,
      `Dimensions: ${row.dimensions || 'N/A'}`,
      `Bottle Family ID: ${row.family_id || 'N/A'}`,
      `Provenance: database/mekb.sqlite -> product_master (ID: ${row.product_id || row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'PRODUCT',
      entityId: entry.entityId,
      chunkType: 'PRODUCT_SPEC',
      title: entry.title,
      projectNumber: row.project_number || null,
      projectPrefix: null,
      customer: row.customer || null,
      machine: null,
      material: row.resin || null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'product_master',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'PRODUCT_CATALOG',
      },
    };
  }

  private normalizePartList(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const sFile = String(row.source_file || '');
    const extractedProj = (sFile.match(/\b(BM|IM|TC|MM|PL|PRJ)[-_]?(\d+)\b/i) || [])[0] || null;
    const projectNumber = row.project_number || (extractedProj ? extractedProj.toUpperCase() : null);
    const prefix = projectNumber ? projectNumber.replace(/[0-9]/g, '') : null;
    const customer = row.customer || (sFile.match(/Veedol/i) ? 'Veedol' : sFile.match(/ALPLA/i) ? 'ALPLA' : null);
    const machine = row.machine || (sFile.match(/SEB101/i) ? 'SEB101 FN' : sFile.match(/SPEEDEX/i) ? 'SPEEDEX' : null);
    const revision = row.revision ? `Rev${row.revision}` : (sFile.match(/Rev([A-Z0-9]+)/i) || [])[0] || 'RevA';

    const lines = [
      `=== ENGINEERING BILL OF MATERIALS (BOM) PART: ${row.description || entry.title} ===`,
      `Project: ${projectNumber || 'N/A'}`,
      `Customer: ${customer || 'N/A'}`,
      `Machine: ${machine || 'N/A'}`,
      `Revision: ${revision || 'N/A'}`,
      `Item Number: ${row.item_number || row.s_no || 'N/A'}`,
      `Part Description: ${row.description || 'N/A'}`,
      `Material: ${row.material || 'N/A'}`,
      `Steel Grade: ${row.grade || 'N/A'}`,
      `Finished Sizes: ${row.finished_sizes || row.length_dia || 'N/A'}`,
      `Quantity: ${row.qty || 1}`,
      `Hardness: ${row.hardness || 'N/A'}`,
      `Supplier: ${row.supplier || 'N/A'}`,
      `Estimated Cost: ${row.cost || 'N/A'}`,
      `\nHeader-Preserved BOM Table:`,
      `| Project | Item | Description | Material | Grade | Finished Sizes | Qty | Hardness | Supplier |`,
      `|---|---|---|---|---|---|---|---|---|`,
      `| ${projectNumber || 'N/A'} | ${row.item_number || ''} | ${row.description || ''} | ${row.material || ''} | ${row.grade || ''} | ${row.finished_sizes || row.length_dia || ''} | ${row.qty || 1} | ${row.hardness || ''} | ${row.supplier || ''} |`,
      `\nProvenance: database/mekb.sqlite -> part_list (Record ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'BOM_PART',
      entityId: entry.entityId,
      chunkType: 'BOM_TABLE',
      title: entry.title,
      projectNumber,
      projectPrefix: prefix,
      customer,
      machine,
      material: row.material || null,
      revision,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: row.source_file || 'mekb.sqlite',
      sourceSheet: row.source_sheet || 'part_list',
      sourceRow: row.source_row ? Number(row.source_row) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'BILL_OF_MATERIALS',
      },
    };
  }

  private normalizeProcessPlanning(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const sFile = String(row.source_file || '');
    const extractedProj = (sFile.match(/\b(BM|IM|TC|MM|PL|PRJ)[-_]?(\d+)\b/i) || [])[0] || null;
    const projectNumber = row.project_number || (extractedProj ? extractedProj.toUpperCase() : null);

    const lines = [
      `=== ENGINEERING PROCESS PLANNING STEP ===`,
      `Project: ${projectNumber || 'N/A'}`,
      `Sequence: Step ${row.sequence_number || row.s_no || '1'}`,
      `Stage: ${row.stage || 'Planning'}`,
      `Operation / Activity: ${row.description || row.operation || 'N/A'}`,
      `Department: ${row.department || 'Manufacturing'}`,
      `Machine Assigned: ${row.machine || 'N/A'}`,
      `Estimated Duration: ${row.duration_hours || row.duration || 'N/A'} Hours`,
      `Remarks / Notes: ${row.remarks || 'None'}`,
      `\nHeader-Preserved Process Sequence Table:`,
      `| Project | Step | Stage | Operation | Department | Duration (Hrs) |`,
      `|---|---|---|---|---|---|`,
      `| ${projectNumber || 'N/A'} | ${row.sequence_number || row.s_no || 1} | ${row.stage || ''} | ${row.description || row.operation || ''} | ${row.department || ''} | ${row.duration_hours || ''} |`,
      `\nProvenance: database/mekb.sqlite -> process_planning (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'PROCESS_PLAN',
      entityId: entry.entityId,
      chunkType: 'PROCESS_SEQUENCE',
      title: entry.title,
      projectNumber,
      projectPrefix: projectNumber ? projectNumber.replace(/[0-9]/g, '') : null,
      customer: null,
      machine: row.machine || null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'process_planning',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'PROCESS_PLANNING',
      },
    };
  }

  private normalizeCycleTime(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== CYCLE TIME BENCHMARK SPECIFICATION ===`,
      `Machine Name: ${row.machine_name || 'N/A'}`,
      `Product Weight: ${row.product_weight || 'N/A'}`,
      `Cavitation: ${row.cavitation || 'N/A'}`,
      `Cycle Time: ${row.cycle_time || 'N/A'}`,
      `Operating Mode: ${row.mode || 'Standard Running'}`,
      `Remarks: ${row.remarks || 'None'}`,
      `\nHeader-Preserved Cycle Time Table:`,
      `| Machine | Weight | Cavitation | Cycle Time | Remarks |`,
      `|---|---|---|---|---|`,
      `| ${row.machine_name || ''} | ${row.product_weight || ''} | ${row.cavitation || ''} | ${row.cycle_time || ''} | ${row.remarks || ''} |`,
      `\nProvenance: database/mekb.sqlite -> cycle_time_history (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'CYCLE_TIME',
      entityId: entry.entityId,
      chunkType: 'CYCLE_TIME_SPEC',
      title: entry.title,
      projectNumber: null,
      projectPrefix: null,
      customer: null,
      machine: row.machine_name || null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'cycle_time_history',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'CYCLE_TIME_BENCHMARKS',
      },
    };
  }

  private normalizeMachineMaster(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== MACHINE TECHNICAL SPECIFICATION: ${row.machine_name || entry.title} ===`,
      `Machine Name: ${row.machine_name || 'N/A'}`,
      `Type / Process: ${row.type || 'Molding Machine'}`,
      `Clamping Force: ${row.clamping_force || row.tonnage || 'N/A'}`,
      `Tonnage: ${row.tonnage || 'N/A'}`,
      `Manufacturer: ${row.manufacturer || 'N/A'}`,
      `Status: ${row.status || 'Active'}`,
      `Provenance: database/mekb.sqlite -> machine_master (ID: ${row.machine_id || row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'MACHINE',
      entityId: entry.entityId,
      chunkType: 'MACHINE_PROFILE',
      title: entry.title,
      projectNumber: null,
      projectPrefix: null,
      customer: null,
      machine: row.machine_name || null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'machine_master',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'MACHINE_SPECIFICATION',
      },
    };
  }

  private normalizeMaterialMaster(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== MATERIAL TECHNICAL SPECIFICATION: ${row.material_name || entry.title} ===`,
      `Material Name / Polymer: ${row.material_name || 'N/A'}`,
      `Grade: ${row.grade || 'N/A'}`,
      `Density: ${row.density || 'N/A'} g/cm3`,
      `Shrinkage Rate: ${row.shrinkage || 'N/A'} %`,
      `Processing Temp: ${row.processing_temp || 'N/A'}`,
      `Manufacturer: ${row.manufacturer || 'N/A'}`,
      `Provenance: database/mekb.sqlite -> material_master (ID: ${row.material_id || row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'MATERIAL',
      entityId: entry.entityId,
      chunkType: 'MATERIAL_GRADE',
      title: entry.title,
      projectNumber: null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: row.material_name || null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'material_master',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: {
        ...row,
        domain: 'MATERIAL_PROPERTIES',
      },
    };
  }

  private normalizeBottleFamily(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== BOTTLE FAMILY / CONTAINER TAXONOMY: ${row.family_name || entry.title} ===`,
      `Family Name: ${row.family_name || 'N/A'}`,
      `Category: ${row.category || 'Bottles & Containers'}`,
      `Parent Family: ${row.parent_family || 'Root'}`,
      `Description: ${row.description || 'Standard bottle series'}`,
      `Provenance: database/mekb.sqlite -> bottle_family (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'BOTTLE_FAMILY',
      entityId: entry.entityId,
      chunkType: 'FAMILY_TAXONOMY',
      title: entry.title,
      projectNumber: null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'bottle_family',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: row,
    };
  }

  private normalizeComponentDetail(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== COMPONENT DETAIL SPECIFICATION ===`,
      `Tool / Project Number: ${row.tool_no || row.project_number || 'N/A'}`,
      `Component Name: ${row.component_name || row.description || 'N/A'}`,
      `Material: ${row.material || 'N/A'}`,
      `Finished Size: ${row.finished_sizes || row.sizes || 'N/A'}`,
      `Quantity: ${row.qty || 1}`,
      `Hardness: ${row.hardness || 'N/A'}`,
      `\nHeader-Preserved Component Table:`,
      `| Tool No | Component | Material | Finished Size | Qty | Hardness |`,
      `|---|---|---|---|---|---|`,
      `| ${row.tool_no || ''} | ${row.component_name || ''} | ${row.material || ''} | ${row.finished_sizes || ''} | ${row.qty || 1} | ${row.hardness || ''} |`,
      `\nProvenance: database/mekb.sqlite -> component_detail (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'COMPONENT',
      entityId: entry.entityId,
      chunkType: 'COMPONENT_SPEC',
      title: entry.title,
      projectNumber: row.tool_no || row.project_number || null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: row.material || null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'component_detail',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: row,
    };
  }

  private normalizeProjectRelationship(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== PROJECT ENGINEERING RELATIONSHIP LINK ===`,
      `Parent Project: ${row.parent_project || row.parent_project_number || 'N/A'}`,
      `Child / Derived Project: ${row.child_project || row.child_project_number || 'N/A'}`,
      `Relationship Type: ${row.relationship_type || row.type || 'DERIVATION'}`,
      `Description / Reason: ${row.description || row.reason || 'Design reuse or mold revision'}`,
      `Provenance: database/mekb.sqlite -> project_relationships (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'RELATIONSHIP',
      entityId: entry.entityId,
      chunkType: 'RELATIONSHIP_LINK',
      title: entry.title,
      projectNumber: row.parent_project || null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'project_relationships',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: row,
    };
  }

  private normalizeDocumentIndex(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== ENGINEERING DOCUMENT INDEX ===`,
      `Project: ${row.project_number || 'N/A'}`,
      `Page / Sheet: ${row.page_no || 1}`,
      `Section Description: ${row.description || 'N/A'}`,
      `Remarks: ${row.remarks || 'None'}`,
      `Provenance: database/mekb.sqlite -> document_index (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'DOCUMENT_INDEX',
      entityId: entry.entityId,
      chunkType: 'DOCUMENT_INDEX_SECTION',
      title: entry.title,
      projectNumber: row.project_number || null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'document_index',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: row.page_no ? Number(row.page_no) : null,
      normalizedText: lines.join('\n'),
      structuredMetadata: row,
    };
  }

  private normalizeAiSearchTag(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const row = entry.sourceRef || {};
    const lines = [
      `=== DOMAIN SEARCH KEYWORD & TAG ===`,
      `Tag / Keyword: ${row.tag || row.keyword || entry.title}`,
      `Target Entity: ${row.entity_type || 'General'} #${row.entity_id || 'N/A'}`,
      `Context Description: ${row.context || 'Domain engineering keyword'}`,
      `Provenance: database/mekb.sqlite -> ai_search_tags (ID: ${row.id || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || row.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'SEARCH_TAG',
      entityId: entry.entityId,
      chunkType: 'SEARCH_KEYWORD',
      title: entry.title,
      projectNumber: null,
      projectPrefix: null,
      customer: null,
      machine: null,
      material: null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'ai_search_tags',
      sourceRow: row.id ? Number(row.id) : null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: row,
    };
  }

  private normalizeDocumentEntry(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const sourceRef = entry.sourceRef || {};
    const lines = [
      `=== TECHNICAL DOCUMENTATION SPECIFICATION: ${entry.title} ===`,
      `File: ${sourceRef.relativePath || entry.title}`,
      `Classification: ${sourceRef.classification || 'ENGINEERING_DOCUMENT'}`,
      `Authority Status: ${sourceRef.authorityStatus || 'AUTHORITATIVE_RELEASE'}`,
      `Summary / Content:`,
      entry.summary || entry.searchText || 'Engineering Technical Standard Document.',
      `\nProvenance: ${sourceRef.relativePath || 'docs/'} (SHA-256: ${sourceRef.sha256 || 'unknown'})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || sourceRef.sourceId || null,
      sourceType: 'TECHNICAL_DOCUMENT',
      entityType: 'TECHNICAL_DOCUMENT',
      entityId: entry.entityId,
      chunkType: 'DOCUMENT_SECTION',
      title: entry.title,
      projectNumber: sourceRef.provenance?.projectNumber || null,
      projectPrefix: sourceRef.provenance?.projectPrefix || null,
      customer: sourceRef.provenance?.customer || null,
      machine: sourceRef.provenance?.machine || null,
      material: sourceRef.provenance?.material || null,
      revision: sourceRef.provenance?.revision || 'RevA',
      authorityStatus: (sourceRef.authorityStatus as AuthorityStatus) || AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: sourceRef.relativePath || null,
      sourceFile: sourceRef.relativePath ? sourceRef.relativePath.split(/[/\\\\]/).pop() || null : null,
      sourceSheet: null,
      sourceRow: null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: sourceRef,
    };
  }

  private normalizeGenericCatalogEntry(entry: KnowledgeCatalogEntry, source?: KnowledgeSource | null): NormalizedEngineeringRecord {
    const sourceRef = entry.sourceRef || {};
    const lines = [
      `=== ENGINEERING CATALOG RECORD: ${entry.title} ===`,
      `Domain: ${entry.sourceDomain || 'GENERAL'}`,
      `Summary: ${entry.summary || 'N/A'}`,
      `Search Terms: ${entry.searchText || 'N/A'}`,
      `Tags: ${(entry.tags || []).join(', ')}`,
      `Provenance: ${sourceRef.table || sourceRef.tableName || 'MEKB'} (ID: ${sourceRef.pk || entry.entityId})`,
    ];

    return {
      tenantId: entry.tenantId || '00000000-0000-0000-0000-000000000000',
      sourceId: source?.id || sourceRef.sourceId || null,
      sourceType: 'MEKB_DATABASE',
      entityType: 'KNOWLEDGE',
      entityId: entry.entityId,
      chunkType: 'GENERIC_RECORD',
      title: entry.title,
      projectNumber: sourceRef.project_number || null,
      projectPrefix: null,
      customer: sourceRef.customer_name || null,
      machine: sourceRef.machine_name || null,
      material: sourceRef.material || null,
      revision: null,
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: sourceRef.tableName || sourceRef.table || null,
      sourceRow: null,
      sourcePage: null,
      normalizedText: lines.join('\n'),
      structuredMetadata: sourceRef,
    };
  }
}
