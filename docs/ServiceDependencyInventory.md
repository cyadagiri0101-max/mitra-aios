# Service Dependency Inventory

## Verified Service Classes

### `src/services/project-service.ts`

- Class: `ProjectService`  (line 11)
- Dependencies:
  - `DataSource` from TypeORM
  - Entities: `ProjectMaster`, `CustomerMaster`, `ProductMaster`, `BottleFamily`, `MachineMaster`, `MaterialMaster`, `NeckTypeMaster`
- Methods:
  - `async createProject(projectCode: string): Promise<ProjectMaster>`  (line 14)
  - `async findOrCreateCustomer(name: string): Promise<CustomerMaster>`  (line 26)
  - `async findOrCreateProduct(name: string, bottleFamilyName?: string): Promise<ProductMaster>`  (line 36)
  - `async findOrCreateMachine(name: string): Promise<MachineMaster>`  (line 54)
  - `async findOrCreateMaterial(name: string): Promise<MaterialMaster>`  (line 64)
  - `async findOrCreateNeckType(type: string): Promise<NeckTypeMaster>`  (line 74)
- Behavior:
  - Uses TypeORM repositories to retrieve or create master records.
  - `findOrCreateProduct` may create a `BottleFamily` record when a bottle family name is provided.

### `src/services/importer.service.ts`

- Class: `ImporterService`  (line 7)
- Dependencies:
  - Node.js `fs`
  - Node.js `path`
  - `xlsx` workbook parsing library
  - `DataSource` from TypeORM
  - `ImportContext` entity
  - `engineering_document` repository name string
- Methods:
  - `async importWorkbook(filePath: string, revision?: string): Promise<void>`  (line 10)
    - Reads an Excel workbook and writes import context rows for each data row.
  - `async importEngineeringTextFile(filePath: string, revision?: string): Promise<void>`  (line 31)
    - Reads a text file and inserts an engineering document record.

### `src/services/folder-scanner.service.ts`

- Class: `FolderScannerService`  (line 4)
- Dependencies:
  - Node.js `fs`
  - Node.js `path`
- Method:
  - `scanFolder(rootPath: string): string[]`  (line 7)
    - Scans the given root path for subdirectories whose names begin with known project prefixes.
- Static data:
  - `folderPrefixes = ['BM', 'IM', 'IBM', 'PD', 'E', 'O', 'CMB', 'F', 'S']`

## Verified Service File Inventory

- `src/services/project-service.ts`
- `src/services/importer.service.ts`
- `src/services/folder-scanner.service.ts`

## Verified Service Layer Facts

- The repository evidence shows a TypeScript service layer in `src/services`.
- `project-service.ts` is the primary master-data helper service for project/customer/product/machine/material/neck-type records.
- `importer.service.ts` is a file import service that tracks import context and inserts engineering document content.
- `folder-scanner.service.ts` is a filesystem utility service that filters project folders by prefix.
