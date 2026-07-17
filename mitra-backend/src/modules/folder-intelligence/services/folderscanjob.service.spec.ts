import { Test } from '@nestjs/testing';
import { FolderScanJobService } from './folderscanjob.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FolderScanJob } from '../entities/folderscanjob.entity';

describe('FolderScanJobService — classifyFile', () => {
  let service: FolderScanJobService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        FolderScanJobService,
        { provide: getRepositoryToken(FolderScanJob), useValue: {} },
      ],
    }).compile();
    service = mod.get(FolderScanJobService);
  });

  it('classifies SolidWorks part as 3D_MODEL', () => {
    const r = service.classifyFile('CORE_A_R03.SLDPRT');
    expect(r.category).toBe('3D_MODEL');
  });

  it('extracts part number and revision from CORE_A_R03.SLDPRT', () => {
    const r = service.classifyFile('CORE_A_R03.SLDPRT');
    expect(r.partNumber).toBe('CORE_A');
    expect(r.revision).toBe('03');
  });

  it('classifies DWG as DRAWING', () => {
    const r = service.classifyFile('CAVITY_01_V2.dwg');
    expect(r.category).toBe('DRAWING');
    expect(r.partNumber).toBe('CAVITY_01');
    expect(r.revision).toBe('2');
  });

  it('classifies NC as CAM_PROGRAM', () => {
    expect(service.classifyFile('PLATE_B_R01.nc').category).toBe('CAM_PROGRAM');
  });

  it('classifies STEP as 3D_MODEL', () => {
    expect(service.classifyFile('HOTRUNNER_SYSTEM.step').category).toBe('3D_MODEL');
  });

  it('classifies ISO as EDM_PROGRAM', () => {
    expect(service.classifyFile('INSERT_A_R02.iso').category).toBe('EDM_PROGRAM');
  });

  it('returns UNKNOWN for unrecognised extension', () => {
    expect(service.classifyFile('notes.txt').category).toBe('UNKNOWN');
  });

  it('classifyBatch: detects parts missing drawings', () => {
    const result = service.classifyBatch([
      'CORE_A_R03.SLDPRT',  // has 3D only
      'CAV_01_R01.SLDPRT',  // has 3D
      'CAV_01_R01.DWG',     // also has drawing → complete
    ]);
    expect(result.summary.missingDrawing).toContain('CORE_A');
    expect(result.summary.missingDrawing).not.toContain('CAV_01');
    expect(result.summary.readyParts).toBe(1);
  });

  it('classifyBatch: readiness 3D+Drawing = 80', () => {
    const r = service.classifyBatch(['PLATE_B_R02.SLDPRT', 'PLATE_B_R02.DWG']);
    expect(r.coverage['PLATE_B'].readiness).toBe(80);
  });

  it('classifyBatch: readiness 3D+Drawing+CAM+EDM = 100', () => {
    const r = service.classifyBatch([
      'PLATE_B_R02.SLDPRT', 'PLATE_B_R02.DWG',
      'PLATE_B_R02.nc', 'PLATE_B_R02.iso',
    ]);
    expect(r.coverage['PLATE_B'].readiness).toBe(100);
  });
});
