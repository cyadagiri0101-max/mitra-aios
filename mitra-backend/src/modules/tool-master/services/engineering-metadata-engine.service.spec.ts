import { EngineeringMetadataEngine } from './engineering-metadata-engine.service';
import { ToolMasterMetadataService } from './tool-master-metadata.service';

describe('EngineeringMetadataEngine - Phase 3', () => {
  let engine: EngineeringMetadataEngine;
  let metadataService: ToolMasterMetadataService;

  beforeEach(() => {
    metadataService = new ToolMasterMetadataService();
    engine = new EngineeringMetadataEngine(metadataService);
  });

  describe('Bottle Family Detection', () => {
    it('should detect BLACK BIRD family from BM450', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      expect(result.bottleFamily.name).toBe('BLACK BIRD');
      expect(result.bottleFamily.family).toBe('Single Large Format');
    });

    it('should detect VANCOUVER family from BM458', () => {
      const result = engine.analyzeFolder('BM458 Vancouver 200ml 10-Cavity Mold BMU70E+ FN');
      expect(result.bottleFamily.name).toBe('VANCOUVER');
      expect(result.bottleFamily.family).toBe('Standard Beverage');
    });

    it('should detect PREMIUM family from BM475', () => {
      const result = engine.analyzeFolder('BM475 Premium Product 1000ml P02 Double cavity BMU75 CN HDPE');
      expect(result.bottleFamily.name).toBe('PREMIUM');
      expect(result.bottleFamily.family).toBe('Premium Segment');
    });

    it('should return null for unrecognized family', () => {
      const result = engine.analyzeFolder('BM999 UnknownProduct 500ml');
      expect(result.bottleFamily.name).toBeNull();
      expect(result.bottleFamily.family).toBeNull();
    });
  });

  describe('Customer Resolution with Explanation', () => {
    it('should resolve ALPLA via machine rule (SSB65)', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      expect(result.customerResolution.customer).toBe('ALPLA');
      expect(result.customerResolution.confidence).toBe('high');
      expect(result.customerResolution.rule).toContain('machine');
    });

    it('should resolve ALPLA via machine rule (BMU70E+)', () => {
      const result = engine.analyzeFolder('BM458 Vancouver 200ml 10-Cavity Mold BMU70E+ FN');
      expect(result.customerResolution.customer).toBe('ALPLA');
      expect(result.customerResolution.rule).toContain('machine');
    });

    it('should resolve Creative via suffix rule (CR)', () => {
      const result = engine.analyzeFolder('BM420 Special Product CR');
      expect(result.customerResolution.customer).toBe('Creative');
      expect(result.customerResolution.rule).toContain('suffix');
    });

    it('should resolve Alterniq via suffix rule (MTL)', () => {
      const result = engine.analyzeFolder('BM430 Product 500ml MTL');
      expect(result.customerResolution.customer).toBe('Alterniq');
      expect(result.customerResolution.rule).toContain('suffix');
    });

    it('should resolve Weener via suffix rule (WN)', () => {
      const result = engine.analyzeFolder('BM440 Bottle Design WN');
      expect(result.customerResolution.customer).toBe('Weener');
      expect(result.customerResolution.confidence).toBe('high');
    });
  });

  describe('Folder Classification', () => {
    it('should classify CAD folder', () => {
      const result = engine.analyzeFolder('BM450 CAD Models SOLIDWORKS');
      expect(result.folderClassification.primary).toBe('CAD');
    });

    it('should classify Manufacturing folder', () => {
      const result = engine.analyzeFolder('BM450 Manufacturing Process CNC Setup');
      expect(result.folderClassification.primary).toBe('Manufacturing');
    });

    it('should classify Documentation folder', () => {
      const result = engine.analyzeFolder('BM450 Documentation Technical Drawings DWG');
      expect(result.folderClassification.primary).toBe('Documentation');
    });

    it('should classify Planning folder', () => {
      const result = engine.analyzeFolder('BM450 Planning Schedule Timeline');
      expect(result.folderClassification.primary).toBe('Planning');
    });

    it('should return null for unclassified folder', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml');
      expect(result.folderClassification.primary).toBeNull();
    });
  });

  describe('AI Tag Generation', () => {
    it('should generate blow-molding tag for BM with capacity', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      expect(result.aiTags).toContain('blow-molding');
    });

    it('should generate alpla-exclusive tag for ALPLA machines', () => {
      const result = engine.analyzeFolder('BM450 Black Bird SSB65');
      expect(result.aiTags).toContain('alpla-exclusive');
    });

    it('should generate multi-cavity tag for multi-cavity molds', () => {
      const result = engine.analyzeFolder('BM458 Vancouver 10-Cavity Mold BMU70E+');
      expect(result.aiTags).toContain('multi-cavity');
    });

    it('should generate single-cavity tag for single cavity', () => {
      const result = engine.analyzeFolder('BM450 Black Bird Single cavity');
      expect(result.aiTags).toContain('single-cavity');
    });

    it('should generate material tags for PET', () => {
      const result = engine.analyzeFolder('BM420 Product PET Material');
      expect(result.aiTags).toContain('pet-material');
    });

    it('should generate material tags for HDPE', () => {
      const result = engine.analyzeFolder('BM430 Container HDPE');
      expect(result.aiTags).toContain('hdpe-material');
    });

    it('should generate high-capacity tag for >1000ml', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml');
      expect(result.aiTags).toContain('high-capacity');
    });

    it('should generate compact tag for <500ml', () => {
      const result = engine.analyzeFolder('BM460 Mini Bottle 250ml');
      expect(result.aiTags).toContain('compact');
    });

    it('should generate tier1-customer tag for known customers', () => {
      const result = engine.analyzeFolder('BM450 Black Bird ALPLA');
      expect(result.aiTags).toContain('tier1-customer');
    });

    it('should generate project-type tag', () => {
      const result = engine.analyzeFolder('IM101 Injection Component');
      expect(result.aiTags).toContain('injection-molding');
    });

    it('should generate customer tag', () => {
      const result = engine.analyzeFolder('BM450 Black Bird SSB65');
      expect(result.aiTags).toContain('customer-alpla');
    });

    it('should include multiple tags', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 10-Cavity Mold SSB65 HDPE');
      expect(result.aiTags.length).toBeGreaterThan(3);
      expect(result.aiTags).toContain('blow-molding');
      expect(result.aiTags).toContain('alpla-exclusive');
      expect(result.aiTags).toContain('high-capacity');
    });
  });

  describe('Project Completeness Detection', () => {
    it('should detect completeness for Blow Mold projects', () => {
      const result = engine.analyzeFolder('BM450 Black Bird CAD Models Technical Drawings Process Documentation');
      expect(result.completeness.expectedItems.length).toBeGreaterThan(0);
      expect(result.completeness.completionPercentage).toBeGreaterThan(0);
    });

    it('should calculate completion percentage correctly', () => {
      const result = engine.analyzeFolder('BM450 Project CAD Models Technical Drawings');
      expect(result.completeness.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.completeness.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should track found items', () => {
      const result = engine.analyzeFolder('BM450 CAD Models Technical Drawings');
      expect(result.completeness.foundItems.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Project Relationship Linking (E → PD → BM)', () => {
    it('should link E (Engineering) to PD (Product Design)', () => {
      const result = engine.analyzeFolder('E500 Engineering Request');
      expect(result.linkedProjects.childProjects).toContain('PDXXX');
    });

    it('should link PD (Product Design) to molds', () => {
      const result = engine.analyzeFolder('PD300 Product Development');
      expect(result.linkedProjects.childProjects).toContain('BMXXX');
      expect(result.linkedProjects.childProjects).toContain('IMXXX');
    });

    it('should not link final molds', () => {
      const result = engine.analyzeFolder('BM450 Black Bird');
      expect(result.linkedProjects.childProjects.length).toBe(0);
    });

    it('should support CMB (Mold Base) linking to molds', () => {
      const result = engine.analyzeFolder('CMB700 Mold Base');
      expect(result.linkedProjects.childProjects).toContain('BMXXX');
      expect(result.linkedProjects.childProjects).toContain('IMXXX');
    });

    it('should support F (Fixture) linking to molds', () => {
      const result = engine.analyzeFolder('F800 Fixture Assembly');
      expect(result.linkedProjects.childProjects).toContain('BMXXX');
      expect(result.linkedProjects.childProjects).toContain('IMXXX');
    });
  });

  describe('Real Company Folder Names - Complex Scenarios', () => {
    it('should handle BM450 with full metadata', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      expect(result.toolNo).toBe('BM450');
      expect(result.bottleFamily.name).toBe('BLACK BIRD');
      expect(result.customerResolution.customer).toBe('ALPLA');
      expect(result.aiTags.length).toBeGreaterThan(0);
    });

    it('should handle IM101 Injection Mold', () => {
      const result = engine.analyzeFolder('IM101 PET Bottle 1L 2 Cav SSB65 CN');
      expect(result.toolNo).toBe('IM101');
      expect(result.projectMetadata.projectType).toBe('Injection Mold');
      expect(result.aiTags).toContain('injection-molding');
    });

    it('should handle IBM200 Injection Blow Mold', () => {
      const result = engine.analyzeFolder('IBM200 Design Component Multi Cavity');
      expect(result.toolNo).toBe('IBM200');
      expect(result.projectMetadata.projectType).toBe('Injection Blow Mold');
    });

    it('should handle PD300 Product Design linking', () => {
      const result = engine.analyzeFolder('PD300 Product Development P05');
      expect(result.linkedProjects.childProjects).toContain('BMXXX');
    });

    it('should handle E500 Engineering Request', () => {
      const result = engine.analyzeFolder('E500 Engineering Request SSB65');
      expect(result.linkedProjects.childProjects).toContain('PDXXX');
    });

    it('should preserve backward compatibility with old API', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      expect(result.toolNo).toBeDefined();
      expect(result.projectMetadata).toBeDefined();
      expect(result.technicalSpecification).toBeDefined();
    });

    it('should handle unknown values gracefully', () => {
      const result = engine.analyzeFolder('BM999 UnknownProduct UnknownCustomer');
      expect(result.toolNo).toBe('BM999');
      expect(result.bottleFamily.family).toBeNull();
      expect(result.customerResolution.confidence).toBeNull();
    });
  });

  describe('Configuration-Driven Rules', () => {
    it('should respect folder rules configuration', () => {
      const result = engine.analyzeFolder('BM450 Simple');
      // allowPartialMetadata is true, so it should not fail
      expect(result.toolNo).toBe('BM450');
    });

    it('should use all lookup values from configuration', () => {
      const result = engine.analyzeFolder('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      // Verify that config-driven values are used
      expect(result.projectMetadata.projectType).toBe('Blow Mold'); // From config
      expect(result.customerResolution.customer).toBe('ALPLA'); // From config
    });
  });
});
