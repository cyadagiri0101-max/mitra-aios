# Quality Traceability - MITRA v3.6

Every new QMS record supports genealogy through nullable reference anchors:

- Project
- Drawing revision
- BOM revision
- Routing revision
- Work order
- Job card
- Machine
- Operator
- Inspection plan
- Material lot
- Supplier

The references are UUID/string anchors only. Source data remains in Engineering, Manufacturing, Supplier, and Platform modules.

## Genealogy Query Pattern

1. Start from a QMS record ID.
2. Resolve its traceability columns.
3. Join to Engineering artifacts for release context.
4. Join to MES work order/job card/machine/operator records for execution context.
5. Join to supplier/material lot references for incoming quality context.
6. Follow NCR/CAPA/customer complaint links for containment, action, and closure.
