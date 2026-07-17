import { ToolMasterMetadataService } from './tool-master-metadata.service';

describe('ToolMasterMetadataService - Enhanced', () => {
  let service: ToolMasterMetadataService;

  beforeEach(() => {
    service = new ToolMasterMetadataService();
  });

  describe('parseFolderName - Real Engineering Data', () => {
    it('should parse BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN', () => {
      const result = service.parseFolderName('BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN');
      
      expect(result.toolNo).toBe('BM450');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.projectNumber).toBe('P01');
      expect(result.projectMetadata.productName).toBe('Black Bird');
      expect(result.projectMetadata.customer).toBe('ALPLA');
      
      expect(result.technicalSpecification.capacity).toBe('5000ML');
      expect(result.technicalSpecification.cavitation).toBe('SINGLE CAVITY');
      expect(result.technicalSpecification.machine).toBe('SSB65');
      expect(result.technicalSpecification.neckType).toBe('FN');
      expect(result.technicalSpecification.moldType).toBe('Single Cavity');
      expect(result.technicalSpecification.material).toBeNull();
    });

    it('should parse BM458 Vancouver 200ml 10-Cavity Mold BMU70E+ FN', () => {
      const result = service.parseFolderName('BM458 Vancouver 200ml 10-Cavity Mold BMU70E+ FN');
      
      expect(result.toolNo).toBe('BM458');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.productName).toBe('Vancouver');
      expect(result.projectMetadata.customer).toBe('ALPLA');
      
      expect(result.technicalSpecification.capacity).toBe('200ML');
      expect(result.technicalSpecification.cavitation).toBe('10-CAVITY');
      expect(result.technicalSpecification.machine).toBe('BMU70E+');
      expect(result.technicalSpecification.neckType).toBe('FN');
      expect(result.technicalSpecification.moldType).toBe('Multi Cavity');
    });

    it('should parse BM475 Premium Product 1000ml P02 Double cavity BMU75 CN HDPE', () => {
      const result = service.parseFolderName('BM475 Premium Product 1000ml P02 Double cavity BMU75 CN HDPE');
      
      expect(result.toolNo).toBe('BM475');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.projectNumber).toBe('P02');
      expect(result.projectMetadata.productName).toBe('Premium Product');
      expect(result.projectMetadata.customer).toBe('ALPLA');
      
      expect(result.technicalSpecification.capacity).toBe('1000ML');
      expect(result.technicalSpecification.cavitation).toBe('DOUBLE CAVITY');
      expect(result.technicalSpecification.machine).toBe('BMU75');
      expect(result.technicalSpecification.neckType).toBe('CN');
      expect(result.technicalSpecification.material).toBe('HDPE');
      expect(result.technicalSpecification.moldType).toBe('Multi Cavity');
    });

    it('should parse BM480 Elite Series 500ml P03 8-Cavity SEB101 LH', () => {
      const result = service.parseFolderName('BM480 Elite Series 500ml P03 8-Cavity SEB101 LH');
      
      expect(result.toolNo).toBe('BM480');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.projectNumber).toBe('P03');
      expect(result.projectMetadata.productName).toBe('Elite Series');
      expect(result.projectMetadata.customer).toBe('ALPLA');
      
      expect(result.technicalSpecification.capacity).toBe('500ML');
      expect(result.technicalSpecification.cavitation).toBe('8-CAVITY');
      expect(result.technicalSpecification.machine).toBe('SEB101');
      expect(result.technicalSpecification.neckType).toBe('LH');
      expect(result.technicalSpecification.moldType).toBe('Multi Cavity');
    });

    it('should parse IM101 PET Bottle 1L 2 Cav SSB65 CN (Injection Mold)', () => {
      const result = service.parseFolderName('IM101 PET Bottle 1L 2 Cav SSB65 CN');
      
      expect(result.toolNo).toBe('IM101');
      expect(result.projectMetadata.projectType).toBe('Injection Mold');
      expect(result.projectMetadata.productName).toBe('Bottle');  // PET is material
      expect(result.projectMetadata.customer).toBe('ALPLA');
      
      expect(result.technicalSpecification.capacity).toBe('1L');
      expect(result.technicalSpecification.material).toBe('PET');
      expect(result.technicalSpecification.cavitation).toBe('2 CAV');
      expect(result.technicalSpecification.machine).toBe('SSB65');
      expect(result.technicalSpecification.neckType).toBe('CN');
    });

    it('should parse IBM200 Design Component Multi Cavity (Injection Blow Mold)', () => {
      const result = service.parseFolderName('IBM200 Design Component Multi Cavity');
      
      expect(result.toolNo).toBe('IBM200');
      expect(result.projectMetadata.projectType).toBe('Injection Blow Mold');
      expect(result.projectMetadata.productName).toBe('Design Component');
      expect(result.technicalSpecification.moldType).toBe('Multi Cavity');
    });

    it('should parse PD300 Product Development P05 (Product Design)', () => {
      const result = service.parseFolderName('PD300 Product Development P05');
      
      expect(result.toolNo).toBe('PD300');
      expect(result.projectMetadata.projectType).toBe('Product Design');
      expect(result.projectMetadata.projectNumber).toBe('P05');
      expect(result.projectMetadata.productName).toBe('Product Development');
    });

    it('should parse E500 Engineering Request SSB65 (ALPLA Engineering)', () => {
      const result = service.parseFolderName('E500 Engineering Request SSB65');
      
      expect(result.toolNo).toBe('E500');
      expect(result.projectMetadata.projectType).toBe('ALPLA Engineering Request');
      expect(result.projectMetadata.customer).toBe('ALPLA');
    });

    it('should parse O600 Customer Enquiry (Other Enquiry)', () => {
      const result = service.parseFolderName('O600 Customer Enquiry');
      
      expect(result.toolNo).toBe('O600');
      expect(result.projectMetadata.projectType).toBe('Other Customer Enquiry');
      expect(result.projectMetadata.productName).toBe('Customer Enquiry');
    });

    it('should parse CMB700 Mold Base Component (Mold Base)', () => {
      const result = service.parseFolderName('CMB700 Mold Base Component');
      
      expect(result.toolNo).toBe('CMB700');
      expect(result.projectMetadata.projectType).toBe('Mold Base');
      expect(result.projectMetadata.productName).toBeNull(); // Stops at "MOLD"
    });

    it('should parse F800 Fixture Assembly (Fixture)', () => {
      const result = service.parseFolderName('F800 Fixture Assembly');
      
      expect(result.toolNo).toBe('F800');
      expect(result.projectMetadata.projectType).toBe('Fixture');
      expect(result.projectMetadata.productName).toBe('Fixture Assembly');
    });

    it('should parse S900 Job Work Project (Job Work)', () => {
      const result = service.parseFolderName('S900 Job Work Project');
      
      expect(result.toolNo).toBe('S900');
      expect(result.projectMetadata.projectType).toBe('Job Work');
      expect(result.projectMetadata.productName).toBe('Job Work Project');
    });

    it('should handle missing optional fields gracefully', () => {
      const result = service.parseFolderName('BM450 Simple Product');
      
      expect(result.toolNo).toBe('BM450');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.projectNumber).toBeNull();
      expect(result.projectMetadata.productName).toBe('Simple Product');
      expect(result.projectMetadata.customer).toBeNull();
      
      expect(result.technicalSpecification.capacity).toBeNull();
      expect(result.technicalSpecification.cavitation).toBeNull();
      expect(result.technicalSpecification.machine).toBeNull();
      expect(result.technicalSpecification.neckType).toBeNull();
      expect(result.technicalSpecification.material).toBeNull();
      expect(result.technicalSpecification.moldType).toBeNull();
    });

    it('should handle empty folder name', () => {
      const result = service.parseFolderName('');
      
      expect(result.toolNo).toBeNull();
      expect(result.projectMetadata.projectType).toBeNull();
      expect(result.projectMetadata.projectNumber).toBeNull();
      expect(result.projectMetadata.productName).toBeNull();
      expect(result.projectMetadata.customer).toBeNull();
    });

    it('should handle unknown values without failing', () => {
      const result = service.parseFolderName('BM999 UnknownCustomer UnknownMaterial UnknownMachine');
      
      expect(result.toolNo).toBe('BM999');
      expect(result.projectMetadata.projectType).toBe('Blow Mold');
      expect(result.projectMetadata.customer).toBeNull(); // Unknown suffix
      expect(result.technicalSpecification.material).toBeNull(); // Unknown material
      expect(result.technicalSpecification.machine).toBeNull(); // Unknown machine
      expect(result.projectMetadata.productName).toBe('UnknownCustomer UnknownMaterial UnknownMachine');
    });

    it('should parse folder with multiple cavity specifications', () => {
      const result = service.parseFolderName('BM420 Complex Product 300ml 4+4 Cavity BMU70');
      
      expect(result.toolNo).toBe('BM420');
      expect(result.projectMetadata.productName).toBe('Complex Product');
      expect(result.technicalSpecification.capacity).toBe('300ML');
      expect(result.technicalSpecification.cavitation).toBe('4+4 CAVITY');
      expect(result.technicalSpecification.moldType).toBe('Multi Cavity');
      expect(result.technicalSpecification.machine).toBe('BMU70');
    });
  });
});
