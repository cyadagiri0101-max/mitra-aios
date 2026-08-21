# M7 — Source Traceability & Provenance Model
## Complete Provenance Chain for Engineering Facts
**Standard:** ISO 9001 / IATF 16949 Engineering Data Provenance  
**Target:** 100% Verifiable Source Attribution in MITRA AI Answers

---

## 1. Provenance Data Schema

Every retrieved fact and generated answer turn carries a verifiable provenance chain:

```json
{
  "provenanceId": "prov-8f92a1bc-20260820-001",
  "tenantId": "b4fcd7e4-9e25-47e5-9239-c4c31abf4b01",
  "sourceFile": {
    "fileName": "BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx",
    "relativePath": "PartLists/BM454/",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "lastModified": "2026-07-03T10:14:00Z"
  },
  "location": {
    "sheetName": "Mold and Mask Parts",
    "rowNumber": 3,
    "itemNumber": "1",
    "pageNumber": 1
  },
  "domainMetadata": {
    "projectNumber": "BM454",
    "customer": "Veedol",
    "productName": "600ml Lubricant Bottle",
    "cavitation": "8-Cavity",
    "componentType": "INSERTS/MAIN PARTS",
    "material": "ALUMINIUM",
    "grade": "HOKOTOL/ALUMOLD1-500",
    "dimensions": "1230 x 135 x 40 mm",
    "supplier": "Alumold",
    "revision": "RevA",
    "authorityStatus": "AUTHORITATIVE_RELEASE"
  },
  "audit": {
    "importBatchId": "batch-20260703-051839-89f072",
    "indexedAt": "2026-08-20T12:00:00Z",
    "embeddingModel": "all-minilm:latest"
  }
}
```

---

## 2. Provenance Resolution Contract

1. **User asks question in AI Dock / Copilot:**
   `"What material is specified for the body inserts on BM454 Veedol 600ml mold?"`
2. **Context Builder retrieves chunk:**
   Injects chunk text with tag `[REF-1: BM454_Partlist_RevA.xlsx > 'Mold and Mask Parts' > Row 3]`.
3. **Local Phi-3 LLM synthesizes response:**
   `"For the BM454 Veedol 600ml 8-cavity mold, the Body Inserts (B & P) are specified with Aluminium Grade HOKOTOL / ALUMOLD 1-500 with a finished size of 1230 x 135 x 40 mm [REF-1]."`
4. **UI renders interactive citation badge:**
   Clicking `[REF-1]` opens a modal showing the exact spreadsheet row, sheet name, project code, and import batch audit timestamp.
