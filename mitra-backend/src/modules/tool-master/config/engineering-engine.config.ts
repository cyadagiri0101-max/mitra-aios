export type EngineeringMetadataEngineConfig = {
  folderCategories: Record<string, string[]>;
  bottleFamilies: Record<string, { capacity: string; family: string }>;
  customerResolutionRules: Array<{
    type: 'machine' | 'suffix' | 'manual' | string;
    pattern: string;
    customer: string;
    confidence: 'high' | 'medium' | 'low' | 'manual';
  }>;
  aiTagRules: Array<{ condition: (meta: Record<string, any>) => boolean; tag: string }>;
  completenessTemplates: Record<string, string[]>;
  projectRelationships: Record<string, string[]>;
  folderRules: {
    requireProjectNumber: boolean;
    requireCapacity: boolean;
    requireMaterial: boolean;
    allowPartialMetadata: boolean;
    stopOnMissingToolNumber: boolean;
  };
};

export const ENGINEERING_METADATA_ENGINE_CONFIG: EngineeringMetadataEngineConfig = {
  // Folder categories for classification
  folderCategories: {
    CAD: ['CAD', 'DESIGN', 'DRAWING', 'MODEL', '3D', 'SOLIDWORKS', 'STEP', 'IGES'],
    Manufacturing: ['MANUFACTURING', 'PRODUCTION', 'PROCESS', 'TOOL', 'TOOLING', 'CNC', 'INJECTION', 'MOLDING'],
    Documentation: ['DOCUMENTATION', 'DOCS', 'REPORT', 'SPECIFICATION', 'SPEC', 'DRAWING', 'DWG', 'PDF', 'MANUAL'],
    Planning: ['PLANNING', 'SCHEDULE', 'TIMELINE', 'CHECKLIST', 'PLAN', 'PROJECT', 'WORKFLOW'],
  },

  // Bottle family patterns
  bottleFamilies: {
    'BLACK BIRD': { capacity: '5000', family: 'Single Large Format' },
    VANCOUVER: { capacity: '200-500', family: 'Standard Beverage' },
    PREMIUM: { capacity: '500-1000', family: 'Premium Segment' },
    ELITE: { capacity: '250-750', family: 'Elite Series' },
    DESIGN: { capacity: 'Variable', family: 'Design Focus' },
  },

  // Customer resolution rules (order matters)
  customerResolutionRules: [
    { type: 'machine', pattern: 'BMUTC|BMU70|BMU70E|BMU75|SSB65|SEB101', customer: 'ALPLA', confidence: 'high' },
    { type: 'suffix', pattern: 'CR', customer: 'Creative', confidence: 'high' },
    { type: 'suffix', pattern: 'MTL', customer: 'Alterniq', confidence: 'high' },
    { type: 'suffix', pattern: 'WN|WR', customer: 'Weener', confidence: 'high' },
    { type: 'manual', pattern: 'ALPLA', customer: 'ALPLA', confidence: 'manual' },
  ],

  // AI tags for automated tagging
  aiTagRules: [
    { condition: (meta: any) => meta.projectType === 'Blow Mold' && meta.capacity, tag: 'blow-molding' },
    { condition: (meta: any) => meta.projectType === 'Injection Mold', tag: 'injection-molding' },
    { condition: (meta: any) => meta.customer === 'ALPLA', tag: 'alpla-exclusive' },
    { condition: (meta: any) => meta.cavitation && /MULTI|DOUBLE|TRIPLE|\d{2,}/.test(meta.cavitation), tag: 'multi-cavity' },
    { condition: (meta: any) => meta.cavitation && /SINGLE\s*CAVITY/i.test(meta.cavitation), tag: 'single-cavity' },
    { condition: (meta: any) => meta.material === 'PET', tag: 'pet-material' },
    { condition: (meta: any) => meta.material === 'HDPE', tag: 'hdpe-material' },
    { condition: (meta: any) => meta.capacity && parseInt(meta.capacity) > 1000, tag: 'high-capacity' },
    { condition: (meta: any) => meta.capacity && parseInt(meta.capacity) < 500, tag: 'compact' },
    { condition: (meta: any) => /ALPLA|CREATIVE|ALTERNIQ|WEENER/.test(meta.customer), tag: 'tier1-customer' },
  ],

  // Project completeness checklist
  completenessTemplates: {
    'Blow Mold': ['CAD Models', 'Technical Drawings', 'Process Documentation', 'Tooling Schedule', 'Cost Analysis'],
    'Injection Mold': ['Design Specifications', 'CAD Assembly', 'Mold Base Drawings', 'Hot Runner Specs', 'Validation Report'],
    'Product Design': ['Concept Sketches', 'Engineering Drawings', 'Bill of Materials', 'Feasibility Study', 'Timeline'],
  },

  // Relationship linking (E → PD → BM)
  projectRelationships: {
    E: ['PD'], // Engineering request links to product designs
    PD: ['BM', 'IM', 'IBM'], // Product design links to molds
    BM: [], // Blow mold is final
    IM: [], // Injection mold is final
    IBM: [], // Injection blow mold is final
    CMB: ['BM', 'IM'], // Mold base supports molds
    F: ['BM', 'IM'], // Fixtures support molds
  },

  // Optional folder rules (extensible)
  folderRules: {
    requireProjectNumber: false,
    requireCapacity: false,
    requireMaterial: false,
    allowPartialMetadata: true,
    stopOnMissingToolNumber: false,
  },
};
