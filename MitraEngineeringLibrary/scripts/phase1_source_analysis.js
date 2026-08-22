const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const srcDir = path.join('D:', 'Mitra3.0', 'temp data');
const outDir = path.join('D:', 'MitraEngineeringLibrary');

function normalizeSheetRows(rows) {
  return rows.slice(0, 5).map((r) => r.map((v) => (v === undefined || v === null ? '' : String(v))));
}

function readTextFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  return {
    line_count: lines.length,
    head: lines.slice(0, 20).join('\n'),
  };
}

const files = fs.readdirSync(srcDir).filter((name) => /\.(xlsx|xls|txt)$/i.test(name)).sort();
const summary = [];
for (const name of files) {
  const filePath = path.join(srcDir, name);
  const ext = path.extname(name).toLowerCase();
  const item = { name, path: filePath, extension: ext, source: 'D:\\Mitra3.0\\temp data' };
  if (ext === '.txt') {
    Object.assign(item, readTextFile(filePath));
  } else {
    const wb = xlsx.readFile(filePath, { cellStyles: false });
    item.sheet_count = wb.SheetNames.length;
    item.sheets = wb.SheetNames.map((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headers = rows[0] || [];
      return {
        sheetName,
        rowCount: rows.length,
        colCount: headers.length,
        headers: headers.map((h) => (h === undefined || h === null ? '' : String(h))),
        sample: normalizeSheetRows(rows),
      };
    });
  }
  summary.push(item);
}

const assetInventoryJson = path.join(outDir, 'EngineeringAssetInventory.json');
fs.writeFileSync(assetInventoryJson, JSON.stringify(summary, null, 2), 'utf8');

const rows = [];
for (const item of summary) {
  if (item.extension === '.txt') {
    rows.push({
      File: item.name,
      Sheet: '',
      Rows: item.line_count,
      Cols: '',
      Headers: '',
      Sample: item.head.replace(/\r?\n/g, ' '),
    });
  } else {
    for (const sh of item.sheets) {
      rows.push({
        File: item.name,
        Sheet: sh.sheetName,
        Rows: sh.rowCount,
        Cols: sh.colCount,
        Headers: sh.headers.join(' | '),
        Sample: sh.sample.map((r) => r.join(' | ')).join(' || '),
      });
    }
  }
}
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(rows);
xlsx.utils.book_append_sheet(workbook, worksheet, 'Inventory');
xlsx.writeFile(workbook, path.join(outDir, 'EngineeringAssetInventory.xlsx'));

console.log('Generated EngineeringAssetInventory.json and EngineeringAssetInventory.xlsx');
