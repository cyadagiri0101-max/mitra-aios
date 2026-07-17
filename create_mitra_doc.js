import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, Document, Footer, Header, HeadingLevel, Packer, PageNumber,
  Paragraph, TextRun, Table, TableCell, TableRow, WidthType, ShadingType,
  convertInchesToTwip, BorderStyle
} from "docx";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Usage: node create.js /absolute/path/output.docx");

const T = String.raw;

const palette = {
  dark: "0A192F",
  primary: "112240",
  light: "233554",
  accent: "64FFDA",
  blue: "00B4D8",
  text: "E6F1FF",
  muted: "8892B0",
  border: "495670",
  fill: "112240",
  success: "2ECC71",
  warning: "F39C12",
  error: "E74C3C",
};

const font = { name: "Inter", eastAsia: "SimSun" };
const monoFont = { name: "JetBrains Mono", eastAsia: "SimSun" };

const run = (text, options = {}) => new TextRun({ text, font, size: 22, color: palette.text, ...options });
const monoRun = (text, options = {}) => new TextRun({ text, font: monoFont, size: 20, color: palette.text, ...options });
const para = (children, options = {}) => new Paragraph({
  spacing: { after: 120, line: 280 },
  ...options,
  children: Array.isArray(children) ? children : [children],
});

const heading = (text, level = 1) => {
  const sizes = { 1: 32, 2: 26, 3: 22, 4: 20 };
  return para(run(text, { bold: true, size: sizes[level] || 20, color: palette.accent }), {
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
    spacing: { before: 300, after: 160 },
  });
};

const bodyPara = (text, options = {}) => para(run(text), { indent: { firstLine: convertInchesToTwip(0.3) }, ...options });

const cell = (text, options = {}, isHeader = false) => new TableCell({
  children: [para(run(text, { bold: isHeader, size: isHeader ? 20 : 20, color: isHeader ? palette.accent : palette.text }), { spacing: { after: 60, line: 240 } })],
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  shading: isHeader ? { type: ShadingType.CLEAR, fill: palette.fill } : undefined,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 1, color: palette.border },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: palette.border },
    left: { style: BorderStyle.SINGLE, size: 1, color: palette.border },
    right: { style: BorderStyle.SINGLE, size: 1, color: palette.border },
  },
  ...options,
});

const makeTable = (rows, columnWidths) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: columnWidths,
    rows: rows.map((row, ri) => new TableRow({
      children: row.map((text, ci) => cell(text, {}, ri === 0)),
    })),
  });
};

// --- Parse markdown and build content ---
const mdPath = path.join(path.dirname(outputPath), "mitra.agent.final.md");
const mdContent = fs.readFileSync(mdPath, "utf-8");
const lines = mdContent.split("\n");

const children = [];

// Title page
children.push(para(run("MITRA v3.1", { bold: true, size: 56, color: palette.accent }), {
  alignment: AlignmentType.CENTER,
  spacing: { before: 2000, after: 200 },
}));
children.push(para(run("Design Specification & Implementation Roadmap", { bold: true, size: 32, color: palette.text }), {
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
}));
children.push(para(run("Date: 2026-06-20", { size: 22, color: palette.muted }), {
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
}));
children.push(para(run("Version: 1.0", { size: 22, color: palette.muted }), {
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
}));
children.push(para(run("Domain: Blow Molds, Injection Molds, Toolroom, CNC Manufacturing", { size: 22, color: palette.muted }), {
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
}));
children.push(para(run("User Base: 10–15 internal users", { size: 22, color: palette.muted }), {
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
}));

// Page break before TOC
children.push(new Paragraph({ spacing: { after: 0 }, children: [] }));

// TOC heading
children.push(heading("Table of Contents", 1));

const tocEntries = [
  { title: "Section 1: Formal Requirements Document", level: 1, page: "3" },
  { title: "1.1 Executive Summary", level: 2, page: "3" },
  { title: "1.2 MoSCoW Prioritization", level: 2, page: "4" },
  { title: "1.3 Functional Requirements", level: 2, page: "5" },
  { title: "1.4 Non-Functional Requirements", level: 2, page: "8" },
  { title: "1.5 Acceptance Criteria Matrix", level: 2, page: "10" },
  { title: "Section 2: Visual Design Direction", level: 1, page: "12" },
  { title: "2.1 Design Philosophy", level: 2, page: "12" },
  { title: "2.2 Color System", level: 2, page: "13" },
  { title: "2.3 Typography Scale", level: 2, page: "14" },
  { title: "2.4 Component Styles", level: 2, page: "15" },
  { title: "2.5 Layout Grid", level: 2, page: "18" },
  { title: "Section 3: Implementation Roadmap", level: 1, page: "20" },
  { title: "3.1 Phase 1: Foundation", level: 2, page: "20" },
  { title: "3.2 Phase 2: Intelligence", level: 2, page: "22" },
  { title: "3.3 Phase 3: Operations", level: 2, page: "24" },
  { title: "3.4 Dependencies & Risk Mitigation", level: 2, page: "26" },
  { title: "3.5 Resource Allocation", level: 2, page: "27" },
  { title: "Section 4: UI Copy & Microcopy", level: 1, page: "29" },
  { title: "4.1 Brand Voice Guide", level: 2, page: "29" },
  { title: "4.2 Search Animation States", level: 2, page: "32" },
  { title: "4.3 AI Panel Labels", level: 2, page: "34" },
  { title: "4.4 Button Copy", level: 2, page: "35" },
  { title: "4.5 Empty States", level: 2, page: "37" },
  { title: "4.6 Error Messages", level: 2, page: "38" },
  { title: "4.7 Greeting Patterns", level: 2, page: "39" },
  { title: "Section 5: Dashboard Wireframe Concept", level: 1, page: "41" },
  { title: "5.1 Hero Widgets", level: 2, page: "41" },
  { title: "5.2 Secondary Content", level: 2, page: "45" },
  { title: "5.3 Layout Specifications", level: 2, page: "47" },
  { title: "5.4 Interaction Patterns", level: 2, page: "48" },
  { title: "5.5 Responsive Behavior", level: 2, page: "50" },
  { title: "5.6 Color Coding & Status", level: 2, page: "52" },
];

for (const entry of tocEntries) {
  const indent = Math.max(0, entry.level - 1) * 400;
  children.push(para(run(`${entry.title}`, { size: 20, color: entry.level === 1 ? palette.text : palette.muted }), {
    indent: { left: indent },
    spacing: { after: 60, line: 240 },
  }));
}

// Simple markdown parser
let inTable = false;
let tableRows = [];
let inCodeBlock = false;
let codeLines = [];

function flushTable() {
  if (tableRows.length === 0) return;
  const numCols = tableRows[0].length;
  const colWidth = Math.floor(9000 / numCols);
  const widths = Array(numCols).fill(colWidth);
  // Skip separator rows (contains ---)
  const dataRows = tableRows.filter(row => !row.some(cell => cell.includes("---") && cell.replace(/[^-]/g, "").length > 3));
  if (dataRows.length > 0) {
    children.push(makeTable(dataRows, widths));
    children.push(para(run(""), { spacing: { after: 120 } }));
  }
  tableRows = [];
  inTable = false;
}

function flushCodeBlock() {
  if (codeLines.length === 0) return;
  const codeText = codeLines.join("\n");
  children.push(para(monoRun(codeText, { size: 18, color: palette.muted }), {
    shading: { type: ShadingType.CLEAR, fill: "0D1117" },
    spacing: { after: 120, line: 240 },
  }));
  codeLines = [];
  inCodeBlock = false;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();

  if (line.startsWith("```")) {
    if (inCodeBlock) {
      flushCodeBlock();
    } else {
      inCodeBlock = true;
      if (inTable) flushTable();
    }
    continue;
  }

  if (inCodeBlock) {
    codeLines.push(line);
    continue;
  }

  if (line.startsWith("| ") && line.endsWith(" |")) {
    if (!inTable) inTable = true;
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    tableRows.push(cells);
    continue;
  } else if (inTable) {
    flushTable();
  }

  if (line.startsWith("# ")) {
    children.push(heading(line.replace("# ", ""), 1));
  } else if (line.startsWith("## ")) {
    children.push(heading(line.replace("## ", ""), 2));
  } else if (line.startsWith("### ")) {
    children.push(heading(line.replace("### ", ""), 3));
  } else if (line.startsWith("#### ")) {
    children.push(heading(line.replace("#### ", ""), 4));
  } else if (line.startsWith("---")) {
    // Horizontal rule - skip
  } else if (line === "") {
    // Skip empty lines
  } else {
    // Regular paragraph - handle bold and italic
    const segments = [];
    const boldItalicRegex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_)/g;
    let lastIndex = 0;
    let match;
    const textRuns = [];

    while ((match = boldItalicRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        textRuns.push(run(line.substring(lastIndex, match.index)));
      }
      const marker = match[0];
      const inner = marker.replace(/\*\*|\*|__/g, "");
      if (marker.startsWith("***") || (marker.startsWith("*") && marker.endsWith("*") && marker.length > 2)) {
        textRuns.push(run(inner, { bold: true, italics: true }));
      } else if (marker.startsWith("**") || marker.startsWith("__")) {
        textRuns.push(run(inner, { bold: true }));
      } else {
        textRuns.push(run(inner, { italics: true }));
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      textRuns.push(run(line.substring(lastIndex)));
    }
    if (textRuns.length === 0) {
      textRuns.push(run(line));
    }
    children.push(para(textRuns, { indent: { firstLine: convertInchesToTwip(0.3) } }));
  }
}

if (inTable) flushTable();
if (inCodeBlock) flushCodeBlock();

const doc = new Document({
  features: { updateFields: true },
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
      },
    },
    headers: {
      default: new Header({
        children: [para(run("MITRA v3.1 Design Specification", { bold: true, color: palette.muted, size: 18 }), {
          alignment: AlignmentType.RIGHT,
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [para(
          new TextRun({ children: [PageNumber.CURRENT], color: palette.muted, size: 18 }),
          { alignment: AlignmentType.CENTER },
        )],
      }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log("DOCX created: " + outputPath);
