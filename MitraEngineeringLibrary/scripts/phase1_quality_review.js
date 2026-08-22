const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const sourceDir = path.join('D:', 'Mitra3.0', 'temp data');
const inventoryJsonPath = path.join(rootDir, 'EngineeringAssetInventory.json');
const reportPath = path.join(docsDir, 'Phase1QualityReport.md');

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
  'EngineeringStatistics.md',
  'ImportPreparationChecklist.md',
  'Phase1Summary.md',
  'GapAnalysis.md',
];

const knownProjectPrefixes = ['BM', 'IM', 'IBM', 'PD', 'E', 'O', 'F', 'CMB', 'S'];
const knownMachineRules = { BMU70E_PLUS: 'ALPLA' };
const knownCustomerRules = { CR: 'Creative', MTL: 'Alterniq', WR: 'Silgan', WN: 'Silgan' };
const knownNeckRules = { CN: 'Captured Neck', FN: 'Flash Neck', LH: 'Lost Head', AN: 'Angle Neck', TN: 'Tottle Bottle' };

function safeRead(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function normalizeText(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

function getDocs() {
  return fs.readdirSync(docsDir).sort();
}

function getSourceFiles() {
  return fs.readdirSync(sourceDir).filter((name) => /\.(xlsx|xls|txt)$/i.test(name)).sort();
}

function getInventoryFiles() {
  const inventory = JSON.parse(fs.readFileSync(inventoryJsonPath, 'utf8'));
  return inventory.map((item) => item.name).sort();
}

function getDocContent(name) {
  return safeRead(path.join(docsDir, name)) || '';
}

function findHeadings(text) {
  return (text.match(/^#{1,6}\s+.*$/gm) || []).map((line) => line.replace(/^#{1,6}\s+/, '').trim());
}

function searchTerm(text, term) {
  return new RegExp(term, 'gi').test(text);
}

function extractProjectPrefixes(items) {
  const prefixes = new Set();
  const pattern = /\b([A-Z]{1,4})(?=\d{2,5})\d{2,5}\b/g;
  for (const item of items) {
    let match;
    while ((match = pattern.exec(item)) !== null) {
      prefixes.add(match[1]);
    }
  }
  return Array.from(prefixes).sort();
}

function extractMachineTokens(items) {
  const tokens = new Set();
  const pattern = /\b([A-Z]{2,8}\+?)\b/g;
  for (const item of items) {
    let match;
    while ((match = pattern.exec(item)) !== null) {
      tokens.add(match[1]);
    }
  }
  return Array.from(tokens).sort();
}

function extractNeckTokens(items) {
  const tokens = new Set();
  const pattern = /\b(CN|FN|LH|AN|TN)\b/g;
  for (const item of items) {
    let match;
    while ((match = pattern.exec(item)) !== null) {
      tokens.add(match[1]);
    }
  }
  return Array.from(tokens).sort();
}

function countOccurrences(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function evaluate() {
  const report = [];
  const docs = getDocs();
  const sourceFiles = getSourceFiles();
  const inventoryFiles = getInventoryFiles();

  const missingDocs = requiredDocs.filter((doc) => !docs.includes(doc));
  const duplicateDocs = docs.length !== Array.from(new Set(docs)).length;

  report.push('## Missing documents');
  report.push('');
  if (missingDocs.length) {
    missingDocs.forEach((name) => report.push(`- ${name}`));
  } else {
    report.push('- None');
  }
  report.push('');

  const missingWorkbooks = sourceFiles.filter((name) => /\.(xlsx|xls)$/i.test(name) && !inventoryFiles.includes(name));
  report.push('## Missing workbooks in inventory');
  report.push('');
  if (missingWorkbooks.length) {
    missingWorkbooks.forEach((name) => report.push(`- ${name}`));
  } else {
    report.push('- None');
  }
  report.push('');

  const missingEngineeringSources = sourceFiles.filter((name) => !inventoryFiles.includes(name));
  report.push('## Missing engineering source files in inventory');
  report.push('');
  if (missingEngineeringSources.length) {
    missingEngineeringSources.forEach((name) => report.push(`- ${name}`));
  } else {
    report.push('- None');
  }
  report.push('');

  report.push('## Duplicate documentation');
  report.push('');
  report.push(duplicateDocs ? '- Duplicate documentation file names detected.' : '- None');
  report.push('');

  const dataDictionaryRefs = [];
  const docsWithoutDataDictionaryRef = [];
  const problemDocs = ['EngineeringAssetInventory.md', 'WorkbookAnalysis.md', 'EngineeringDataDictionary.md', 'FolderStructureAnalysis.md', 'EngineeringNamingConvention.md', 'BusinessRules.md', 'ValidationRules.md', 'ProjectPrefixRules.md', 'MachineRules.md', 'CustomerRules.md', 'NeckTypeRules.md', 'DocumentTypeRules.md', 'EngineeringStatistics.md', 'ImportPreparationChecklist.md', 'Phase1Summary.md', 'GapAnalysis.md'];
  problemDocs.forEach((name) => {
    const content = getDocContent(name);
    if (!content) return;
    if (searchTerm(content, 'Data Dictionary')) {
      dataDictionaryRefs.push(name);
    } else {
      docsWithoutDataDictionaryRef.push(name);
    }
  });

  report.push('## Broken references to Data Dictionary');
  report.push('');
  if (docsWithoutDataDictionaryRef.length) {
    docsWithoutDataDictionaryRef.forEach((name) => report.push(`- ${name} does not mention "Data Dictionary"`));
  } else {
    report.push('- None');
  }
  report.push('');

  const allDocContents = problemDocs.map((name) => ({ name, content: getDocContent(name) || '' }));
  const unknownIssues = [];
  const unknownTerms = ['unknown', 'unrecognized', 'missing'];
  allDocContents.forEach(({ name, content }) => {
    const lower = content.toLowerCase();
    if (name !== 'GapAnalysis.md') {
      unknownTerms.forEach((term) => {
        if (lower.includes(term)) {
          unknownIssues.push({ name, term });
        }
      });
    }
  });

  report.push('## Unknown values incorrectly listed outside GapAnalysis.md');
  report.push('');
  if (unknownIssues.length) {
    unknownIssues.forEach((issue) => report.push(`- ${issue.name}: contains "${issue.term}"`));
  } else {
    report.push('- None');
  }
  report.push('');

  const prefixDocNames = ['EngineeringNamingConvention.md', 'ProjectPrefixRules.md'];
  const prefixIssues = [];
  const actualPrefixes = extractProjectPrefixes(inventoryFiles.concat(sourceFiles));
  const invalidActualPrefixes = actualPrefixes.filter((prefix) => !knownProjectPrefixes.includes(prefix));
  prefixDocNames.forEach((name) => {
    const content = getDocContent(name);
    if (!content) return;
    const foundPrefixes = knownProjectPrefixes.filter((prefix) => content.includes(prefix));
    if (!foundPrefixes.length) prefixIssues.push(`- ${name}: does not mention known project prefixes`);
  });

  report.push('## Project Prefix rules validation');
  report.push('');
  if (invalidActualPrefixes.length) {
    invalidActualPrefixes.forEach((prefix) => report.push(`- Observed actual project prefix not in allowed company rules: ${prefix}`));
  }
  if (!prefixIssues.length && !invalidActualPrefixes.length) {
    report.push('- Project prefix rules match expected company standards.');
  } else {
    prefixIssues.forEach((issue) => report.push(issue));
  }
  report.push('');

  const machineRulesText = getDocContent('MachineRules.md');
  const customerRulesText = getDocContent('CustomerRules.md');
  const neckRulesText = getDocContent('NeckTypeRules.md');
  const machineIssues = [];
  const customerIssues = [];
  const neckIssues = [];

  if (machineRulesText && !machineRulesText.includes('BMU70E+')) {
    machineIssues.push('- MachineRules.md does not mention the expected rule for BMU70E+.');
  }
  if (customerRulesText) {
    Object.entries(knownCustomerRules).forEach(([code, name]) => {
      if (!customerRulesText.includes(code) || !customerRulesText.includes(name)) {
        customerIssues.push(`- CustomerRules.md missing mapping for ${code} => ${name}`);
      }
    });
  }
  if (neckRulesText) {
    Object.entries(knownNeckRules).forEach(([code, name]) => {
      if (!neckRulesText.includes(code) || !neckRulesText.includes(name)) {
        neckIssues.push(`- NeckTypeRules.md missing mapping for ${code} => ${name}`);
      }
    });
  }

  report.push('## Machine rules validation');
  report.push('');
  if (machineIssues.length) machineIssues.forEach((issue) => report.push(issue)); else report.push('- Machine rules match expected company standards.');
  report.push('');
  report.push('## Customer rules validation');
  report.push('');
  if (customerIssues.length) customerIssues.forEach((issue) => report.push(issue)); else report.push('- Customer rules match expected company standards.');
  report.push('');
  report.push('## Neck type rules validation');
  report.push('');
  if (neckIssues.length) neckIssues.forEach((issue) => report.push(issue)); else report.push('- Neck type rules match expected company standards.');
  report.push('');

  const folderText = getDocContent('FolderStructureAnalysis.md');
  const ignoredLines = [];
  if (folderText) {
    const lines = folderText.split(/\r?\n/);
    const start = lines.findIndex((l) => l.startsWith('## Ignored Folders'));
    if (start !== -1) {
      for (let i = start + 1; i < lines.length && lines[i].trim(); i += 1) {
        if (lines[i].startsWith('- ')) ignoredLines.push(lines[i].slice(2).trim());
      }
    }
  }
  report.push('## Optional folders ignored correctly');
  report.push('');
  if (ignoredLines.length) {
    ignoredLines.forEach((line) => report.push(`- ${line}`));
  } else {
    report.push('- No ignored folders listed or no optional folders detected.');
  }
  report.push('');

  const duplicateHeadingIssues = [];
  allDocContents.forEach(({ name, content }) => {
    const headings = findHeadings(content);
    const duplicates = headings.filter((heading, idx) => headings.indexOf(heading) !== idx);
    if (duplicates.length) {
      duplicateHeadingIssues.push(`- ${name}: duplicate heading(s) ${Array.from(new Set(duplicates)).join(', ')}`);
    }
  });
  report.push('## Duplicate sections');
  report.push('');
  if (duplicateHeadingIssues.length) duplicateHeadingIssues.forEach((issue) => report.push(issue)); else report.push('- None');
  report.push('');

  const brokenReferenceIssues = [];
  problemDocs.forEach((name) => {
    const content = getDocContent(name);
    if (!content) return;
    if (name !== 'EngineeringDataDictionary.md' && !searchTerm(content, 'Engineering Data Dictionary') && !searchTerm(content, 'Data Dictionary')) {
      brokenReferenceIssues.push(`- ${name}: no Data Dictionary cross-reference found`);
    }
  });
  report.push('## Broken references');
  report.push('');
  if (brokenReferenceIssues.length) brokenReferenceIssues.forEach((issue) => report.push(issue)); else report.push('- None');
  report.push('');

  const unknownValuesFound = [];
  allDocContents.forEach(({ name, content }) => {
    const lower = content.toLowerCase();
    if (name !== 'GapAnalysis.md') {
      ['unknown', 'unrecognized'].forEach((term) => {
        if (lower.includes(term)) unknownValuesFound.push(`- ${name}: contains "${term}"`);
      });
    }
  });
  report.push('## Unknown values');
  report.push('');
  if (unknownValuesFound.length) unknownValuesFound.forEach((issue) => report.push(issue)); else report.push('- Unknown values are properly confined to GapAnalysis.md');
  report.push('');

  const totalChecks = 12;
  let passed = totalChecks;
  if (missingDocs.length) passed -= 1;
  if (missingWorkbooks.length) passed -= 1;
  if (missingEngineeringSources.length) passed -= 1;
  if (duplicateDocs) passed -= 1;
  if (docsWithoutDataDictionaryRef.length) passed -= 1;
  if (unknownIssues.length) passed -= 1;
  if (invalidActualPrefixes.length || prefixIssues.length) passed -= 1;
  if (machineIssues.length) passed -= 1;
  if (customerIssues.length) passed -= 1;
  if (neckIssues.length) passed -= 1;
  if (duplicateHeadingIssues.length) passed -= 1;
  if (brokenReferenceIssues.length) passed -= 1;

  const completeness = Math.round((passed / totalChecks) * 100);
  report.push('## Overall completeness');
  report.push('');
  report.push(`- ${completeness}%`);
  report.push('');
  report.push('## Approval recommendation');
  report.push('');
  if (passed === totalChecks) {
    report.push('- Phase 1 quality review passes. Approval recommended.');
  } else {
    report.push('- Phase 1 quality review identifies gaps. Approval not recommended until issues are addressed.');
  }
  report.push('');

  fs.writeFileSync(reportPath, report.join('\n'), 'utf8');
  return { reportPath, passed, totalChecks, missingDocs, missingWorkbooks, missingEngineeringSources, duplicateDocs, docsWithoutDataDictionaryRef, unknownIssues, invalidActualPrefixes, prefixIssues, machineIssues, customerIssues, neckIssues, duplicateHeadingIssues, brokenReferenceIssues, unknownValuesFound, completeness };
}

function main() {
  if (!fs.existsSync(inventoryJsonPath)) {
    console.error('Inventory JSON not found:', inventoryJsonPath);
    process.exit(1);
  }
  if (!fs.existsSync(docsDir)) {
    console.error('Docs directory not found:', docsDir);
    process.exit(1);
  }

  const result = evaluate();
  console.log('Phase 1 quality review written to', result.reportPath);
  console.log('Passed', result.passed, 'of', result.totalChecks, 'checks. Completeness', result.completeness + '%');
  if (result.passed !== result.totalChecks) {
    console.log('Issues detected. See report for details.');
    process.exit(2);
  }
}

main();
