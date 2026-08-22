const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join('D:', 'Mitra3.0', 'temp data');
const docsDir = path.join(rootDir, 'docs');
const inventoryJsonPath = path.join(docsDir, 'EngineeringAssetInventory.json');
const inventoryXlsxPath = path.join(docsDir, 'EngineeringAssetInventory.xlsx');
const folderListPath = path.join('D:', 'Mitra3.0', 'temp data', 'FolderList.txt');

const requiredDocs = [
  'EngineeringAssetInventory.md',
  'EngineeringAssetInventory.xlsx',
  'EngineeringAssetInventory.json',
  'WorkbookAnalysis.md',
  'WorkbookAnalysis.xlsx',
  'EngineeringDataDictionary.md',
  'EngineeringDataDictionary.xlsx',
  'FolderStructureAnalysis.md',
  'EngineeringNamingConvention.md',
  'BusinessRules.md',
  'ValidationRules.md',
  'ProjectPrefixRules.md',
  'MachineRules.md',
  'CustomerRules.md',
  'NeckTypeRules.md',
  'DocumentTypeRules.md',
  'EngineeringRuleIndex.md',
  'EngineeringStatistics.md',
  'ImportPreparationChecklist.md',
  'Phase1Summary.md',
  'GapAnalysis.md',
];

const knownProjectPrefixes = ['BM', 'IM', 'IBM', 'PD', 'E', 'O', 'F', 'CMB', 'S'];
const knownMachineRules = { BMU70E_PLUS: 'ALPLA' };
const knownCustomerRules = { CR: 'Creative', MTL: 'Alterniq', WR: 'Silgan', WN: 'Silgan' };
const knownNeckRules = { CN: 'Captured Neck', FN: 'Flash Neck', LH: 'Lost Head', AN: 'Angle Neck', TN: 'Tottle Bottle' };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendDocFooter(lines) {
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**See also:** [Engineering Asset Inventory](EngineeringAssetInventory.md), [Engineering Data Dictionary](EngineeringDataDictionary.md), [Gap Analysis](GapAnalysis.md), [Engineering Rule Index](EngineeringRuleIndex.md)');
}

function writeMarkdownDoc(filename, lines) {
  appendDocFooter(lines);
  fs.writeFileSync(path.join(docsDir, filename), lines.join('\n'), 'utf8');
}

function safeString(value) {
  return String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(header) {
  return safeString(header)
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function safeFilename(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 120);
}

function parseProjectCodes(text) {
  if (!text) return [];
  const normalized = String(text).toUpperCase();
  const pattern = /\b([A-Z]{1,4}\d{2,5})\b/g;
  const codes = new Set();
  let match;
  while ((match = pattern.exec(normalized))) {
    codes.add(match[1]);
  }
  return Array.from(codes);
}

function extractProjectPrefix(text) {
  const codes = parseProjectCodes(text);
  if (!codes.length) return null;
  const code = codes[0];
  const prefixMatch = code.match(/^[A-Z]{1,4}/);
  return prefixMatch ? prefixMatch[0] : null;
}

function findHeaderRow(rows) {
  return rows.find((row) => Array.isArray(row) && row.some((cell) => safeString(cell).length > 0)) || [];
}

function getMergeRanges(sheet) {
  const merges = sheet['!merges'] || [];
  return merges.map((merge) => {
    const start = `${merge.s.c}:${merge.s.r}`;
    const end = `${merge.e.c}:${merge.e.r}`;
    return `${start}-${end}`;
  });
}

function loadFolderLines() {
  if (!fs.existsSync(folderListPath)) return null;
  return fs.readFileSync(folderListPath, 'utf8').split(/\r?\n/).filter((line) => safeString(line).length > 0);
}

function classifyDocumentType(item) {
  const name = String(item.name || '').toLowerCase();
  if (item.extension === '.txt') return 'Engineering Document';
  if (/partlist|part list|part-list|wqf/.test(name)) return 'Part List';
  if (/process planning|process_planning|processplanning/.test(name)) return 'Process Planning Sheet';
  if (/index sheet/.test(name)) return 'Engineering Document';
  if (/blow molds|cycle time/.test(name)) return 'Cycle Time Sheet';
  if (/component details/.test(name)) return 'Engineering Document';
  const sampleText = item.sheets
    ? item.sheets
        .flatMap((sheet) => [sheet.headers.join(' '), sheet.sample.map((row) => row.join(' ')).join(' ')])
        .join(' ')
        .toLowerCase()
    : '';
  if (sampleText.includes('cycle time')) return 'Cycle Time Sheet';
  if (sampleText.includes('mold development') || sampleText.includes('3d modeling')) return 'Process Planning Sheet';
  if (sampleText.includes('page no') && sampleText.includes('description')) return 'Engineering Document';
  return 'Engineering Document';
}

function identifyTokens(inventory, pattern) {
  const tokens = new Set();
  for (const item of inventory) {
    const text = [item.name]
      .concat(item.sheets ? item.sheets.map((sheet) => sheet.headers.join(' ')) : [])
      .concat(item.sheets ? item.sheets.flatMap((sheet) => sheet.sample.map((row) => row.join(' '))) : [])
      .join(' ');
    let match;
    while ((match = pattern.exec(text))) {
      tokens.add(match[1].toUpperCase());
    }
  }
  return Array.from(tokens).sort();
}

function identifyCustomers(inventory) {
  const customers = new Set();
  const customerPattern = /\b([A-Z][A-Z]{1,}[A-Z0-9]*\s+(?:PVT|LTD|LIMITED|LLP|METAL|MASTERS|INDIA))\b/gi;
  for (const item of inventory) {
    const text = [item.name]
      .concat(item.sheets ? item.sheets.map((sheet) => sheet.headers.join(' ')) : [])
      .concat(item.sheets ? item.sheets.flatMap((sheet) => sheet.sample.map((row) => row.join(' '))) : [])
      .join(' ');
    let match;
    while ((match = customerPattern.exec(text))) {
      customers.add(match[1].trim());
    }
  }
  return Array.from(customers).sort();
}

function identifyMaterials(inventory) {
  const materials = new Set();
  const materialPattern = /\b(HDPE|PP|ALUMINIUM|STEEL|COPPER|RESIN|POLYETHYLENE|POLYPROPYLENE)\b/gi;
  for (const item of inventory) {
    const text = [item.name]
      .concat(item.sheets ? item.sheets.map((sheet) => sheet.headers.join(' ')) : [])
      .concat(item.sheets ? item.sheets.flatMap((sheet) => sheet.sample.map((row) => row.join(' '))) : [])
      .join(' ');
    let match;
    while ((match = materialPattern.exec(text))) {
      materials.add(match[1].toUpperCase());
    }
  }
  return Array.from(materials).sort();
}

function identifyBottleFamilies(inventory) {
  const families = new Set();
  for (const item of inventory) {
    if (/bottle/i.test(item.name)) {
      families.add(item.name);
    }
    if (item.sheets) {
      for (const sheet of item.sheets) {
        for (const row of sheet.sample) {
          const rowText = row.join(' ');
          if (/bottle/i.test(rowText) && rowText.length < 120) {
            families.add(rowText.trim());
          }
        }
      }
    }
  }
  return Array.from(families).sort();
}

function loadInventory() {
  ensureDir(docsDir);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory missing: ${sourceDir}`);
  }

  const inventory = [];
  const fileNames = fs
    .readdirSync(sourceDir)
    .filter((fileName) => /\.(xlsx|xls|txt)$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const fileName of fileNames) {
    const filePath = path.join(sourceDir, fileName);
    const extension = path.extname(fileName).toLowerCase();
    const item = {
      name: fileName,
      path: filePath,
      extension,
      category: 'Engineering Document',
      projectCodes: parseProjectCodes(fileName),
    };

    if (extension === '.txt') {
      const text = fs.readFileSync(filePath, 'utf8');
      const lines = text.split(/\r?\n/);
      item.line_count = lines.length;
      item.text_head = lines.slice(0, 20).join('\n');
      item.category = 'Engineering Document';
    } else {
      const workbook = xlsx.readFile(filePath, { cellStyles: false });
      item.sheet_count = workbook.SheetNames.length;
      item.sheets = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const headers = Array.isArray(rows[0]) ? rows[0].map((cell) => safeString(cell)) : [];
        return {
          sheetName,
          rowCount: rows.length,
          colCount: rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0),
          headers,
          normalized_headers: headers.map(normalizeHeader),
          headerRow: findHeaderRow(rows.slice(0, 3)).map((cell) => safeString(cell)),
          sample: rows.slice(0, 5).map((row) => (Array.isArray(row) ? row.map((cell) => safeString(cell)) : [])),
          merges: getMergeRanges(sheet),
        };
      });
      item.category = classifyDocumentType(item);
      const sampleText = item.sheets.map((sheet) => sheet.headers.join(' ')).join(' ') + ' ' + item.sheets.map((sheet) => sheet.sample.map((row) => row.join(' ')).join(' ')).join(' ');
      item.projectCodes = Array.from(new Set(item.projectCodes.concat(parseProjectCodes(sampleText))));
    }

    inventory.push(item);
  }

  fs.writeFileSync(inventoryJsonPath, JSON.stringify(inventory, null, 2), 'utf8');
  return inventory;
}

function buildInventoryXlsx(inventory) {
  const rows = [];
  for (const item of inventory) {
    if (item.extension === '.txt') {
      rows.push({
        File: item.name,
        Category: item.category,
        Sheet: '(text file)',
        Rows: item.line_count,
        Cols: '',
        Headers: '',
        ProjectCodes: item.projectCodes.join(', '),
        Sample: safeString(item.text_head).slice(0, 200),
      });
    } else {
      for (const sheet of item.sheets) {
        rows.push({
          File: item.name,
          Category: item.category,
          Sheet: sheet.sheetName,
          Rows: sheet.rowCount,
          Cols: sheet.colCount,
          Headers: sheet.headers.join(' | '),
          NormalizedHeaders: sheet.normalized_headers.join(' | '),
          MergedCells: sheet.merges.join(', '),
          ProjectCodes: item.projectCodes.join(', '),
          Sample: sheet.sample.map((row) => row.join(' | ')).slice(0, 3).join(' || ').slice(0, 200),
        });
      }
    }
  }
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'AssetInventory');
  xlsx.writeFile(workbook, inventoryXlsxPath);
}

function buildEngineeringAssetInventoryMd(inventory) {
  const categoryCounts = inventory.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
  const lines = [
    '# Engineering Asset Inventory',
    '',
    'This document summarizes the Phase 1 engineering source inventory for the MITRA Engineering Knowledge Library.',
    '',
    `- Total source files: ${inventory.length}`,
    '',
    '## Category counts',
    '',
  ];
  Object.entries(categoryCounts).forEach(([category, count]) => {
    lines.push(`- ${category}: ${count}`);
  });
  lines.push('', '## File inventory', '', '| File | Category | Sheets | Project Codes | Sample |', '| --- | --- | --- | --- | --- |');
  for (const item of inventory) {
    const projectCodes = (item.projectCodes || []).join(', ');
    const sheetCount = item.extension === '.txt' ? '(text)' : item.sheet_count;
    const sample = item.extension === '.txt' ? safeString(item.text_head).slice(0, 120) : item.sheets.map((sheet) => sheet.sample.map((row) => row.join(' | ')).slice(0, 2).join(' || ')).join(' || ').slice(0, 120);
    lines.push(`| ${item.name} | ${item.category} | ${sheetCount} | ${projectCodes} | ${sample} |`);
  }
  writeMarkdownDoc('EngineeringAssetInventory.md', lines);
}

function buildWorkbookAnalysis(inventory) {
  const lines = [
    '# Workbook Analysis',
    '',
    'This book-level analysis captures workbook purpose, sheet structure, validation guidance, and unknown fields for each source item.',
    '',
  ];
  for (const item of inventory) {
    lines.push(`## ${item.name}`);
    lines.push('');
    const purposeLabel = item.category === 'Cycle Time Sheet'
      ? 'Capture cycle time and machine performance details for blow molds and process equipment.'
      : item.category === 'Part List'
      ? 'Capture bill of materials, material data, and cost/quantity breakdowns.'
      : item.category === 'Process Planning Sheet'
      ? 'Capture process planning stages, project milestones, and completion status.'
      : 'Capture engineering metadata, document indexes, or supporting project documents.';
    lines.push('### WorkbookPurpose', '', `- ${purposeLabel}`, '');
    lines.push('### Worksheets', '');
    if (item.extension === '.txt') {
      lines.push('- Text file with no worksheets.');
    } else {
      item.sheets.forEach((sheet) => lines.push(`- ${sheet.sheetName} (${sheet.rowCount} rows, ${sheet.colCount} cols)`));
    }
    lines.push('', '### Header Row', '');
    if (item.extension === '.txt') {
      lines.push('- No worksheet headers; text file contains free text or folder list content.');
    } else {
      item.sheets.forEach((sheet) => {
        const headerText = sheet.headerRow.filter((value) => safeString(value).length > 0).join(' | ') || '(inferred from first non-empty row)';
        lines.push(`- ${sheet.sheetName}: ${headerText}`);
      });
    }
    lines.push('', '### Merged Cells', '');
    if (item.extension === '.txt') {
      lines.push('- Not applicable.');
    } else {
      item.sheets.forEach((sheet) => lines.push(`- ${sheet.sheetName}: ${sheet.merges.length} merged region(s)${sheet.merges.length ? ` (${sheet.merges.join(', ')})` : ''}`));
    }
    lines.push('', '### Primary Keys', '');
    if (item.category === 'Part List') {
      lines.push('- Suggested key: file name + row index + item description.');
    } else if (item.category === 'Process Planning Sheet') {
      lines.push('- Suggested key: project code + stage number or stage description.');
    } else if (item.category === 'Cycle Time Sheet') {
      lines.push('- Suggested key: project code + machine + product weight + cavitation.');
    } else {
      lines.push('- Suggested key: file name + row index or section identifier.');
    }
    lines.push('', '### Relationships', '');
    if (item.category === 'Cycle Time Sheet') {
      lines.push('- Relate machine cycles to project and product metadata.');
    } else if (item.category === 'Part List') {
      lines.push('- Relate part lines to material master, project, and cost summary entities.');
    } else if (item.category === 'Process Planning Sheet') {
      lines.push('- Relate process stages to project and milestone entities.');
    } else {
      lines.push('- Relate index or document rows to EngineeringDocument and ProjectMaster entities.');
    }
    lines.push('', '### Validation Rules', '');
    if (item.category === 'Cycle Time Sheet') {
      lines.push('- Parse `CYCLE TIME` to numeric seconds.');
      lines.push('- Normalize `PRODUCT WEIGHT` to numeric grams.');
      lines.push('- Preserve `CAVITATION` text exactly.');
    } else if (item.category === 'Part List') {
      lines.push('- Parse `QTY`, `Rate`, and `Amount` as numeric values when possible.');
      lines.push('- Preserve `DESCRIPTION`, `MATERIAL`, and `GRADE` as raw text.');
    } else if (item.category === 'Process Planning Sheet') {
      lines.push('- Validate stage names and completion markers such as `COMPLETED`.');
    } else {
      lines.push('- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.');
    }
    lines.push('', '### Revision Fields', '');
    lines.push('- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.');
    lines.push('- Preserve revision notes found in headers, summary rows, or title blocks.');
    lines.push('', '### Duplicate Detection', '');
    lines.push('- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.');
    lines.push('- Detect duplicate index entries or repeated document pages within the same workbook.');
    lines.push('', '### Business Notes', '');
    if (/index sheet/i.test(item.name)) {
      lines.push('- This file appears to be a document index for engineering project deliverables.');
    } else if (/blow molds/i.test(item.name)) {
      lines.push('- This file appears to capture blow mold engineering and cycle time data.');
    } else if (/component details/i.test(item.name)) {
      lines.push('- This file appears to capture component physical data and materials.');
    } else {
      lines.push('- Review the sample rows for additional engineering context.');
    }
    lines.push('', '### Target Tables (future)', '');
    if (item.category === 'Cycle Time Sheet') {
      lines.push('- `CycleTimeHistory`, `MachineMaster`, `ProductMaster`, `ProjectMaster`');
    } else if (item.category === 'Part List') {
      lines.push('- `PartList`, `MaterialMaster`, `ProjectMaster`, `EngineeringDocument`');
    } else if (item.category === 'Process Planning Sheet') {
      lines.push('- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`');
    } else {
      lines.push('- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`');
    }
    lines.push('', '### Non-standard Fields', '');
    if (item.extension === '.txt') {
      lines.push('- Not applicable for plain text files.');
    } else {
      const nonStandardFields = item.sheets
        .flatMap((sheet) => sheet.headers.map((header) => normalizeHeader(header)))
        .filter((value) => value.length > 0 && !['s no', 'description', 'page no', 'remarks', 'machine', 'product weight', 'cavitation', 'cycle time', 'material', 'grade', 'qty', 'rate', 'amount', 'tool no', 'mold name', 'process', 'product type'].includes(value));
      const uniqueFields = Array.from(new Set(nonStandardFields));
      if (!uniqueFields.length) {
        lines.push('- No non-standard fields detected in the first header row.');
      } else {
        lines.push(`- ${uniqueFields.join(', ')}`);
      }
    }
    lines.push('');
  }
  writeMarkdownDoc('WorkbookAnalysis.md', lines);
}

function buildEngineeringDataDictionary(inventory) {
  const rows = [];
  for (const item of inventory) {
    for (const sheet of item.sheets || []) {
      for (const header of sheet.headers) {
        rows.push({
          Workbook: item.name,
          Sheet: sheet.sheetName,
          RawHeader: safeString(header),
          NormalizedHeader: normalizeHeader(header) || '(blank)',
          SuggestedField: normalizeHeader(header) || '(blank)',
        });
      }
    }
  }

  const mdLines = [
    '# Engineering Data Dictionary',
    '',
    'This document maps raw workbook headers to normalized field names.',
    '',
    '| Workbook | Sheet | Raw Header | Normalized Header | Suggested Field |',
    '| --- | --- | --- | --- | --- |',
  ];
  rows.forEach((row) => {
    mdLines.push(`| ${row.Workbook} | ${row.Sheet} | ${row.RawHeader} | ${row.NormalizedHeader} | ${row.SuggestedField} |`);
  });
  writeMarkdownDoc('EngineeringDataDictionary.md', mdLines);

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'DataDictionary');
  xlsx.writeFile(workbook, path.join(docsDir, 'EngineeringDataDictionary.xlsx'));
}

function buildWorkbookAnalysisXlsx(inventory) {
  const rows = [];
  for (const item of inventory) {
    if (item.extension === '.txt') {
      rows.push({
        Workbook: item.name,
        Sheet: '(text file)',
        Category: item.category,
        Rows: item.line_count,
        Cols: '',
        Headers: '',
        NormalizedHeaders: '',
        MergedCells: '',
        Sample: safeString(item.text_head).slice(0, 200),
      });
    } else {
      for (const sheet of item.sheets) {
        rows.push({
          Workbook: item.name,
          Sheet: sheet.sheetName,
          Category: item.category,
          Rows: sheet.rowCount,
          Cols: sheet.colCount,
          Headers: sheet.headers.join(' | '),
          NormalizedHeaders: sheet.normalized_headers.join(' | '),
          MergedCells: sheet.merges.length,
          Sample: sheet.sample.map((row) => row.join(' | ')).slice(0, 3).join(' || ').slice(0, 200),
        });
      }
    }
  }
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'WorkbookAnalysis');
  xlsx.writeFile(workbook, path.join(docsDir, 'WorkbookAnalysis.xlsx'));
}

function buildFolderStructureAnalysis(folderLines) {
  const lines = [
    '# Folder Structure Analysis',
    '',
    'This document analyzes the folder layout and completion expectations from `FolderList.txt`.',
    '',
  ];

  if (!folderLines) {
    lines.push('- `FolderList.txt` was not found at the expected path.');
    writeMarkdownDoc('FolderStructureAnalysis.md', lines);
    return;
  }

  const normalized = folderLines.map((line) => line.replace(/\\/g, '/').trim()).filter((line) => line.length > 0);
  const projectPrefixes = new Set();
  const folderRoots = new Map();
  const ignored = [];
  const unrecognized = [];

  normalized.forEach((line) => {
    const root = line.split('/')[0] || '';
    const prefix = extractProjectPrefix(root) || extractProjectPrefix(line);
    if (prefix) projectPrefixes.add(prefix);
    folderRoots.set(root, (folderRoots.get(root) || 0) + 1);
    if (/node_modules|\.git|__macosx|tmp|temp/i.test(root)) {
      ignored.push(root);
    }
    if (!prefix && root) {
      unrecognized.push(root);
    }
  });

  lines.push('## Project Prefix', '', `- Observed prefixes: ${Array.from(projectPrefixes).sort().join(', ') || '(none found)'}`, '');
  lines.push('## Folder Name', '', `- Observed root folder names: ${Array.from(folderRoots.keys()).slice(0, 20).join(', ')}`); 
  lines.push('');
  lines.push('## Standard Folder Template', '', '- `<ProjectCode>/<DocumentType>/<Subfolder>`', '- `PartList`, `ProcessPlanning`, `Index`, `CostSummary`, `EngineeringDocuments`', '');
  lines.push('## Optional Folders', '');
  const optional = Array.from(new Set(normalized.filter((line) => line.split('/').length > 2).map((line) => line.split('/').slice(0, 2).join('/')))).slice(0, 20);
  if (optional.length) optional.forEach((folder) => lines.push(`- ${folder}`));
  else lines.push('- None detected.');
  lines.push('', '## Ignored Folders', '');
  if (ignored.length) ignored.forEach((folder) => lines.push(`- ${folder}`));
  else lines.push('- None detected.');
  lines.push('', '## Missing Folders', '');
  lines.push('- Expected project folders for `PartList`, `ProcessPlanning`, `EngineeringDocument`, and `Index` categories.');
  lines.push('- Missing folders are those where a known project prefix appears without one of the expected document-type subfolders.');
  lines.push('', '## Completion Rules', '');
  lines.push('- A project is complete if it has at least one `Part List`, one `Process Planning Sheet`, and one `Engineering Document` or index-style file.');
  lines.push('- Projects missing these categories should be flagged for review.');
  if (unrecognized.length) {
    lines.push('', '## Folder names without known prefixes', '');
    Array.from(new Set(unrecognized)).forEach((name) => lines.push(`- ${name}`));
  }

  writeMarkdownDoc('FolderStructureAnalysis.md', lines);
}

function buildEngineeringNamingConvention(inventory) {
  const examples = {};
  knownProjectPrefixes.forEach((prefix) => (examples[prefix] = []));
  inventory.forEach((item) => {
    const prefix = extractProjectPrefix(item.name);
    if (prefix && examples[prefix] && examples[prefix].length < 3) {
      examples[prefix].push(item.name);
    }
  });
  const lines = [
    '# Engineering Naming Convention',
    '',
    'This document captures real file naming examples and conventions from the current engineering inventory.',
    '',
  ];
  knownProjectPrefixes.forEach((prefix) => {
    lines.push(`## ${prefix}`);
    lines.push('');
    if (examples[prefix].length) {
      lines.push(`- Example files: ${examples[prefix].map((name) => `\`${name}\``).join(', ')}`);
      lines.push('- Convention: prefix `' + prefix + '` followed by a numeric project code or tool identifier.');
    } else {
      lines.push('- No examples found in the current inventory.');
    }
    lines.push('');
  });
  lines.push('## General guidance', '', '- Preserve project prefixes and numeric codes.', '- Use descriptive document type segments such as `Index Sheet`, `Process planning sheet`, `Partlist`, or `Cost-summary`.', '- Preserve revision tokens like `RevA`, `RevB`, or `Rev` where present.', '');
  writeMarkdownDoc('EngineeringNamingConvention.md', lines);
}

function buildBusinessRules() {
  const lines = [
    '# Business Rules',
    '',
    'The following rules are derived from the actual engineering conventions requested for Phase 1. No additional invented rules are included.',
    '',
    '## Machine and customer code rules',
    '',
    '- `BMU70E+` ⇒ `ALPLA machine`',
    '- `CR` ⇒ `Creative`',
    '- `MTL` ⇒ `Alterniq`',
    '- `WR` / `WN` ⇒ `Silgan`',
    '',
    '## Neck type rules',
    '',
    '- `CN` ⇒ `Captured Neck`',
    '- `FN` ⇒ `Flash Neck`',
    '- `LH` ⇒ `Lost Head`',
    '- `AN` ⇒ `Angle Neck`',
    '- `TN` ⇒ `Tottle Bottle`',
    '',
    '## Usage guidance',
    '',
    '- Apply these mappings only when the exact code appears in file names or document metadata.',
    '- Do not invent additional machine, customer, or neck codes beyond this list.',
    '- Preserve raw source text for any codes that are not recognized by these rules.',
  ];
  writeMarkdownDoc('BusinessRules.md', lines);
}

function buildValidationRules() {
  const lines = [
    '# Validation Rules',
    '',
    'Validation rules for Phase 1 analysis are limited to structural consistency, header normalization, and numeric parsing.',
    '',
    '## General validation rules',
    '',
    '- Preserve source file metadata including file name, sheet name, and row context.',
    '- Skip blank rows and comment-only rows in structured worksheets.',
    '- Infer header rows when explicit headers are missing.',
    '',
    '## Field validation rules',
    '',
    '- `CYCLE TIME` should parse to numeric seconds.',
    '- `PRODUCT WEIGHT` should parse to numeric grams where possible.',
    '- `QTY` / `Quantity` should parse to numeric quantity values.',
    '- `Rate` and `Amount` should parse to numeric currency values when parseable.',
    '- `project_code` should match `^[A-Z]{1,4}\d{2,5}$` when extracted.',
    '',
    '## Structural validation rules',
    '',
    '- Detect and document merged cells rather than treating them as data values.',
    '- Treat inconsistent column counts as a warning condition.',
    '',
    '## Output requirements',
    '',
    '- Generate a gap report that lists ambiguous headers, unknown codes, duplicate project numbers, and unrecognized folders.',
  ];
  writeMarkdownDoc('ValidationRules.md', lines);
}

function buildProjectPrefixRules(inventory) {
  const examples = {};
  knownProjectPrefixes.forEach((prefix) => (examples[prefix] = []));
  inventory.forEach((item) => {
    const prefix = extractProjectPrefix(item.name);
    if (prefix && examples[prefix] && examples[prefix].length < 3) {
      examples[prefix].push(item.name);
    }
  });
  const lines = ['# Project Prefix Rules', '', 'This document records prefix examples observed in the Phase 1 inventory.', ''];
  knownProjectPrefixes.forEach((prefix) => {
    lines.push(`## ${prefix}`);
    lines.push('');
    if (examples[prefix].length) {
      lines.push(`- Observed example(s): ${examples[prefix].map((name) => `\`${name}\``).join(', ')}`);
      lines.push('- Rule: prefix `' + prefix + '` followed by a numeric project identifier.');
    } else {
      lines.push('- No examples found in the current inventory.');
    }
    lines.push('');
  });
  writeMarkdownDoc('ProjectPrefixRules.md', lines);
}

function buildEngineeringRuleIndex() {
  const ruleFiles = [
    'BusinessRules.md',
    'ValidationRules.md',
    'ProjectPrefixRules.md',
    'MachineRules.md',
    'CustomerRules.md',
    'NeckTypeRules.md',
    'DocumentTypeRules.md',
  ];
  const lines = ['# Engineering Rule Index', '', 'This document links the Phase 1 rule artifacts generated for engineering validation and review.', ''];
  ruleFiles.forEach((fileName) => {
    const label = fileName.replace('.md', '');
    lines.push(`- [${label}](${fileName})`);
  });
  lines.push('', '## Rule coverage', '', '- Business rules capture code mappings and usage guidance.', '- Validation rules capture structural and numeric parsing expectations.', '- Prefix, machine, customer, neck, and document type rules capture classification and mapping conventions.');
  writeMarkdownDoc('EngineeringRuleIndex.md', lines);
}

function buildMachineRules(inventory) {
  const observed = identifyTokens(inventory, /\b([A-Z]{2,8}\+?)\b/g).filter((token) => token !== 'BM' && token !== 'IM' && token !== 'PD' && token !== 'CMB' && token !== 'IBM' && token !== 'S' && token !== 'E' && token !== 'F');
  const lines = ['# Machine Rules', '', 'This document captures known machine code mappings and observed machine-like tokens.', '', '## Known mappings', ''];
  Object.entries(knownMachineRules).forEach(([code, meaning]) => lines.push(`- \`${code.replace('_PLUS', '+')}\` ⇒ \`${meaning}\``));
  lines.push('', '## Observed machine-like tokens', '');
  if (observed.length) observed.forEach((token) => lines.push(`- \`${token}\``));
  else lines.push('- None detected from the current inventory.');
  lines.push('', '## Guidance', '', '- Map observed tokens to the known machine mappings when applicable.', '- Preserve unknown machine tokens as raw metadata for review.');
  writeMarkdownDoc('MachineRules.md', lines);
}

function buildCustomerRules(inventory) {
  const customers = identifyCustomers(inventory);
  const lines = ['# Customer Rules', '', 'This document captures customer code and company name conventions observed in Phase 1.', '', '## Known mappings', ''];
  Object.entries(knownCustomerRules).forEach(([code, meaning]) => lines.push(`- \`${code}\` ⇒ \`${meaning}\``));
  lines.push('', '## Observed customer strings', '');
  if (customers.length) customers.forEach((customer) => lines.push(`- \`${customer}\``));
  else lines.push('- None detected from the current inventory.');
  lines.push('', '## Guidance', '', '- Preserve customer/company names exactly during analysis.', '- Use known mappings only when the code is explicitly recognized.');
  writeMarkdownDoc('CustomerRules.md', lines);
}

function buildNeckTypeRules(inventory) {
  const observed = identifyTokens(inventory, /\b(CN|FN|LH|AN|TN)\b/g);
  const lines = ['# Neck Type Rules', '', 'This document captures neck-type abbreviations from the Phase 1 dataset.', '', '## Known mappings', ''];
  Object.entries(knownNeckRules).forEach(([code, meaning]) => lines.push(`- \`${code}\` ⇒ \`${meaning}\``));
  lines.push('', '## Observed neck-type tokens', '');
  if (observed.length) observed.forEach((token) => lines.push(`- \`${token}\``));
  else lines.push('- None detected from the current inventory.');
  lines.push('', '## Guidance', '', '- Map neck tokens to the known neck rules only when they appear exactly.', '- Preserve unknown neck tokens for future review.');
  writeMarkdownDoc('NeckTypeRules.md', lines);
}

function buildDocumentTypeRules(inventory) {
  const categories = Array.from(new Set(inventory.map((item) => item.category))).sort();
  const lines = ['# Document Type Rules', '', 'This document summarizes the source document categories and classification heuristics.', '', '## Observed categories', ''];
  categories.forEach((category) => lines.push(`- ${category}`));
  lines.push('', '## Classification heuristics', '', '- `Part List`: file name contains `Partlist`, `Part list`, `Part-list`, or `WQF`.', '- `Process Planning Sheet`: file name contains `Process planning` or similar.', '- `Cycle Time Sheet`: file name contains `Blow Molds`, `Cycle Times`, or headers with `CYCLE TIME`.', '- `Engineering Document`: index sheets, component details, and generic engineering document support files.', '');
  writeMarkdownDoc('DocumentTypeRules.md', lines);
}

function buildEngineeringStatistics(inventory, folderLines) {
  const projectCodes = inventory.flatMap((item) => item.projectCodes || []);
  const totalProjects = new Set(projectCodes).size;
  const prefixCounts = knownProjectPrefixes.reduce((acc, prefix) => {
    acc[prefix] = projectCodes.filter((code) => code.startsWith(prefix)).length;
    return acc;
  }, {});
  const stats = {
    TotalProjects: totalProjects,
    ...prefixCounts,
    Customers: identifyCustomers(inventory).length,
    Machines: identifyTokens(inventory, /\b([A-Z]{2,8}\+?)\b/g).length,
    Materials: identifyMaterials(inventory).length,
    NeckTypes: identifyTokens(inventory, /\b(CN|FN|LH|AN|TN)\b/g).length,
    BottleFamilies: identifyBottleFamilies(inventory).length,
    ProcessPlanningSheets: inventory.filter((item) => item.category === 'Process Planning Sheet').length,
    PartLists: inventory.filter((item) => item.category === 'Part List').length,
    CycleTimeSheets: inventory.filter((item) => item.category === 'Cycle Time Sheet').length,
    EngineeringDocuments: inventory.filter((item) => item.category === 'Engineering Document').length,
    DuplicateProjects: projectCodes.length - new Set(projectCodes).size,
    MissingProjects: inventory.filter((item) => (item.projectCodes || []).length === 0).length,
  };
  const lines = ['# Engineering Statistics', '', 'This document summarizes counts and statistics from the Phase 1 engineering inventory.', '', `- Total Projects: ${stats.TotalProjects}`];
  knownProjectPrefixes.forEach((prefix) => lines.push(`- ${prefix}: ${stats[prefix]}`));
  lines.push('', `- Customers: ${stats.Customers}`, `- Machines: ${stats.Machines}`, `- Materials: ${stats.Materials}`, `- Neck Types: ${stats.NeckTypes}`, `- Bottle Families: ${stats.BottleFamilies}`, `- Process Planning Sheets: ${stats.ProcessPlanningSheets}`, `- Part Lists: ${stats.PartLists}`, `- Cycle Time Sheets: ${stats.CycleTimeSheets}`, `- Engineering Documents: ${stats.EngineeringDocuments}`, `- Duplicate Projects: ${stats.DuplicateProjects}`, `- Missing Projects: ${stats.MissingProjects}`, '');
  writeMarkdownDoc('EngineeringStatistics.md', lines);
}

function buildImportPreparationChecklist() {
  const lines = ['# Import Preparation Checklist', '', 'This checklist verifies the Phase 1 documentation readiness for future ingestion or review.', '', '- Confirm `EngineeringAssetInventory.json` and `EngineeringAssetInventory.xlsx` exist.', '- Confirm `EngineeringAssetInventory.md` summarizes the file inventory.', '- Confirm `WorkbookAnalysis.md` and `WorkbookAnalysis.xlsx` exist.', '- Confirm `EngineeringDataDictionary.md` and `EngineeringDataDictionary.xlsx` exist.', '- Confirm `FolderStructureAnalysis.md` is based on `FolderList.txt`.', '- Confirm `EngineeringNamingConvention.md` documents real prefix examples.', '- Confirm `BusinessRules.md` includes only the requested rules.', '- Confirm `ValidationRules.md` defines structure and field validation.', '- Confirm `GapAnalysis.md` identifies cleanup gaps.', '- Confirm `Phase1Summary.md` reports completion status.', ''];
  writeMarkdownDoc('ImportPreparationChecklist.md', lines);
}

function buildGapAnalysis(inventory, folderLines) {
  const projectCodes = inventory.flatMap((item) => item.projectCodes || []);
  const duplicateProjects = projectCodes.filter((code, index, self) => self.indexOf(code) !== index);
  const machineTokens = identifyTokens(inventory, /\b([A-Z]{2,8}\+?)\b/g).filter((token) => !Object.keys(knownMachineRules).includes(token.replace('+', '_PLUS')));
  const customerTokens = identifyCustomers(inventory).filter((value) => !Object.keys(knownCustomerRules).some((code) => value.includes(code)));
  const neckTokens = identifyTokens(inventory, /\b(CN|FN|LH|AN|TN)\b/g).filter((token) => !Object.keys(knownNeckRules).includes(token));
  const unrecognizedFolders = [];
  if (folderLines) {
    folderLines.forEach((line) => {
      const root = line.replace(/\\/g, '/').split('/')[0] || '';
      const prefix = extractProjectPrefix(root);
      if (root && !prefix) unrecognizedFolders.push(root);
    });
  }
  const unanalyzedFiles = inventory.filter((item) => item.extension !== '.txt' && (!item.sheets || item.sheets.length === 0)).map((item) => item.name);
  const lines = ['# Gap Analysis', '', 'This report captures cleanup gaps and unknown items from Phase 1 analysis.', '', '## Unknown machine codes', ''];
  if (machineTokens.length) machineTokens.forEach((token) => lines.push(`- \`${token}\``));
  else lines.push('- None detected.');
  lines.push('', '## Unknown customer codes', '');
  if (customerTokens.length) customerTokens.forEach((value) => lines.push(`- \`${value}\``));
  else lines.push('- None detected.');
  lines.push('', '## Unknown neck types', '');
  if (neckTokens.length) neckTokens.forEach((token) => lines.push(`- \`${token}\``));
  else lines.push('- None detected.');
  lines.push('', '## Unrecognized folder names', '');
  if (unrecognizedFolders.length) Array.from(new Set(unrecognizedFolders)).forEach((name) => lines.push(`- \`${name}\``));
  else lines.push('- None detected.');
  lines.push('', '## Duplicate project numbers', '');
  if (duplicateProjects.length) Array.from(new Set(duplicateProjects)).forEach((code) => lines.push(`- \`${code}\``));
  else lines.push('- None detected.');
  lines.push('', '## Files that could not be analyzed', '');
  if (unanalyzedFiles.length) unanalyzedFiles.forEach((name) => lines.push(`- \`${name}\``));
  else lines.push('- None detected.');
  writeMarkdownDoc('GapAnalysis.md', lines);
}

function buildPhase1Summary() {
  const lines = ['# Phase 1 Summary', '', 'This document reports the presence of all required Phase 1 deliverables.', ''];
  const absent = [];
  requiredDocs.forEach((fileName) => {
    const exists = fs.existsSync(path.join(docsDir, fileName));
    lines.push(`- ${exists ? '✅' : '⚠️'} ${fileName}`);
    if (!exists) absent.push(fileName);
  });
  lines.push('');
  if (absent.length === 0) {
    lines.push('- Phase 1 is complete: all required documents exist.');
  } else {
    lines.push('- Phase 1 is not complete. Documents not found:');
    absent.forEach((name) => lines.push(`  - ${name}`));
  }
  writeMarkdownDoc('Phase1Summary.md', lines);
}

function main() {
  ensureDir(docsDir);
  const inventory = loadInventory();
  const folderLines = loadFolderLines();
  buildInventoryXlsx(inventory);
  buildEngineeringAssetInventoryMd(inventory);
  buildWorkbookAnalysis(inventory);
  buildWorkbookAnalysisXlsx(inventory);
  buildEngineeringDataDictionary(inventory);
  buildFolderStructureAnalysis(folderLines);
  buildEngineeringNamingConvention(inventory);
  buildBusinessRules();
  buildValidationRules();
  buildProjectPrefixRules(inventory);
  buildMachineRules(inventory);
  buildCustomerRules(inventory);
  buildNeckTypeRules(inventory);
  buildDocumentTypeRules(inventory);
  buildEngineeringRuleIndex();
  buildEngineeringStatistics(inventory, folderLines);
  buildImportPreparationChecklist();
  buildGapAnalysis(inventory, folderLines);
  buildPhase1Summary();
  console.log('Phase 1 documentation artifacts generated.');
}

main();
