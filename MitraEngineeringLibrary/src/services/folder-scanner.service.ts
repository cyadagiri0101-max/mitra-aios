import fs from 'fs';
import path from 'path';

export class FolderScannerService {
  private static folderPrefixes = ['BM', 'IM', 'IBM', 'PD', 'E', 'O', 'CMB', 'F', 'S'];

  scanFolder(rootPath: string): string[] {
    const candidates: string[] = [];
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name.toUpperCase();
      if (FolderScannerService.folderPrefixes.some((prefix) => name.startsWith(prefix))) {
        candidates.push(path.join(rootPath, entry.name));
      }
    }

    return candidates;
  }
}
