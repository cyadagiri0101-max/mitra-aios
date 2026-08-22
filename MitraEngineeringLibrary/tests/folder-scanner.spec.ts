import { FolderScannerService } from '../src/services/folder-scanner.service';
import fs from 'fs';
import path from 'path';

describe('FolderScannerService', () => {
  const scanner = new FolderScannerService();
  const tempDir = path.join(__dirname, 'temp-folders');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    ['BM450', 'IM101', 'XYZ', 'PD300', 'docs'].forEach((folderName) => {
      const folderPath = path.join(tempDir, folderName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('scans only known project folders', () => {
    const result = scanner.scanFolder(tempDir);
    expect(result).toEqual(expect.arrayContaining([expect.stringContaining('BM450'), expect.stringContaining('IM101'), expect.stringContaining('PD300')]));
    expect(result.some((entry) => entry.includes('XYZ'))).toBe(false);
  });
});
