# Engineering API Specification — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Contract baseline — OpenAPI 3.0.3 fragments for the Engineering domain.
> **Version:** `3.4.0-eng.1`
> **Base path:** `/api` (global prefix); servers: on-prem deployment.
> **Security:** Bearer JWT; every route tenant-scoped; global guards `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` (AND semantics for multiple permissions).
> **Related:** `API_STANDARDS.md`, `API_CONTRACTS.md`, `ENGINEERING_API_SPECIFICATION.md` schemas mirror entities in `ENGINEERING_DOMAIN_MODEL.md`.

---

## 1. Conventions

| Concern | Rule |
|---|---|
| Pagination | `?page=1&limit=20` (limit ≤ 100); response `{ data, total, page, limit, totalPages }` |
| Errors | HTTP 400 validation (whitelist+forbidNonWhitelisted), 401 auth, 403 role/permission, 404 cross-tenant/not-found (IDOR-safe), 409 conflict/optimistic-lock, 422 business rule violation, 500 server |
| Deletes | 204 No Content, soft delete (`deletedAt`) — ADR-005 |
| Date/time | ISO-8601 UTC |
| Money | `{ amount: number, currency: "INR" }` — decimals 18,2 |
| IDs | UUID v4 |
| Business numbers | `DRW-YYYY-####`, `BOM-YYYY-####`, `RTG-YYYY-####`, `RVR-YYYY-####`, `ECR-YYYY-####`, `ECO-YYYY-####`, `ECN-YYYY-####` |
| Audit | Every mutating request auto-audited (global interceptor); business events call `logBusinessEvent` |
| New endpoints (2.3.1+) | Tagged `🆕` |

## 2. Shared Schemas

```yaml
openapi: 3.0.3
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    ProjectScope:
      type: object
      required: [projectId]
      properties:
        projectId: { type: string, format: uuid }
    Money:
      type: object
      properties:
        amount: { type: number, format: double }
        currency: { type: string, example: INR }
    PageMeta:
      type: object
      properties:
        data: { type: array, items: { type: object } }
        total: { type: integer }
        page: { type: integer }
        limit: { type: integer }
        totalPages: { type: integer }
    Error:
      type: object
      properties:
        statusCode: { type: integer }
        message: { type: string, oneOf: [ { type: string }, { type: array, items: { type: string } } ] }
        error: { type: string }
        requestId: { type: string }
        timestamp: { type: string, format: date-time }
    EngineeringQuery:
      type: object
      properties:
        projectId: { type: string, format: uuid }
        search: { type: string, maxLength: 200 }
        status: { type: string }
        page: { type: integer, default: 1, minimum: 1 }
        limit: { type: integer, default: 20, maximum: 100 }
        sortBy: { type: string }
        sortOrder: { type: string, enum: [ASC, DESC] }
```

---

## 3. Drawings — `/api/engineering/drawings`

### 3.1 Schemas

```yaml
    Drawing:
      type: object
      required: [projectId, title, drawingType]
      properties:
        id: { type: string, format: uuid }
        drawingNumber: { type: string, example: "DRW-2026-0042" }
        title: { type: string }
        drawingType:
          type: string
          enum: [PART, ASSEMBLY, MOLD_BASE, CAVITY, CORE, FIXTURE, ELECTRODE, LAYOUT, STANDARD, OTHER]
        projectId: { type: string, format: uuid }
        bomId: { type: string, format: uuid, nullable: true }
        partId: { type: string, format: uuid, nullable: true }   # legacy design_parts link
        currentRevision: { type: string, example: "B" }
        status: { type: string, example: "DRAFT" }               # mirrors workflow state
        workflowInstanceId: { type: string, format: uuid, nullable: true }
        checkedOutBy: { type: string, format: uuid, nullable: true }
        checkedOutByName: { type: string, nullable: true }
        checkedOutAt: { type: string, format: date-time, nullable: true }
        cadFileType: { type: string, enum: [SOLIDWORKS, NX, CATIA, CREO, INVENTOR, STEP, IGES, STL, DXF, DWG, PDF, OTHER] }
        cadAppName: { type: string, nullable: true }
        cadAppVersion: { type: string, nullable: true }
        fileSizeBytes: { type: integer, nullable: true }
        lastFileChecksum: { type: string, nullable: true }
        lengthMm: { type: number, nullable: true }
        widthMm: { type: number, nullable: true }
        heightMm: { type: number, nullable: true }
        drawingScale: { type: string, nullable: true }
        sheetNumber: { type: string, nullable: true }
        sheetSize: { type: string, nullable: true }
        weightKg: { type: number, nullable: true }
        approvedBy: { type: string, format: uuid, nullable: true }
        approvedAt: { type: string, format: date-time, nullable: true }
        releasedBy: { type: string, format: uuid, nullable: true }
        releasedAt: { type: string, format: date-time, nullable: true }
        revisionNotes: { type: string, nullable: true }
        description: { type: string, nullable: true }
        tags: { type: array, items: { type: string } }
        metadata: { type: object }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    DrawingRevision:
      type: object
      properties:
        id: { type: string, format: uuid }
        drawingId: { type: string, format: uuid }
        revision: { type: string, example: "B" }
        versionNumber: { type: integer, example: 2 }
        fileName: { type: string, nullable: true }
        filePath: { type: string, nullable: true }        # legacy; 2.3.2 → minioBucket/minioKey
        minioBucket: { type: string, nullable: true }     # 🆕 2.3.2
        minioKey: { type: string, nullable: true }        # 🆕 2.3.2
        mimeType: { type: string, nullable: true }
        fileSize: { type: integer, nullable: true }
        checksum: { type: string, nullable: true }
        status: { type: string, enum: [DRAFT, UNDER_REVIEW, RELEASED, SUPERSEDED, OBSOLETE] }
        changeSummary: { type: string, nullable: true }
        checkedInBy: { type: string, format: uuid, nullable: true }
        checkedInAt: { type: string, format: date-time, nullable: true }
        releasedBy: { type: string, format: uuid, nullable: true }
        releasedAt: { type: string, format: date-time, nullable: true }
    DrawingCompareResult:
      type: object
      properties:
        identical: { type: boolean }
        differences:
          type: array
          items:
            type: object
            properties:
              field: { type: string }
              from: {}
              to: {}
        contentDiff:                        # 🆕 2.3.2 (content=true)
          type: object
          nullable: true
          properties:
            supported: { type: boolean }
            changeCount: { type: integer }
            differences: { type: array, items: { type: object } }
```

### 3.2 Paths

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/engineering/drawings` | `engineering:drawing:read` | query: EngineeringQuery + drawingType + currentRevision |
| GET | `/engineering/drawings/{id}` | read | 404 if cross-tenant/missing |
| GET | `/engineering/drawings/{id}/revisions` | read | ASC by (revision, versionNumber) |
| GET | `/engineering/drawings/{id}/revisions/latest` | read | latest by revision DESC, version DESC |
| GET | `/engineering/drawings/{id}/compare/{revisionA}/{revisionB}` | `engineering:drawing:compare` | `?content=true` 🆕 2.3.2 |
| POST | `/engineering/drawings` | `engineering:drawing:create` | body: Drawing (minus computed fields); creates workflow instance |
| PATCH | `/engineering/drawings/{id}` | `engineering:drawing:update` | partial update; blocked while checked out by other user |
| DELETE | `/engineering/drawings/{id}` | `engineering:drawing:delete` (ADMIN/MANAGEMENT) | 204; cascades soft-delete revisions |
| POST | `/engineering/drawings/{id}/revisions` | `engineering:drawing:checkin` | body: `{ revision, changeSummary, fileSizeBytes, fileChecksum, minioBucket?, minioKey? 🆕 }` |
| POST | `/engineering/drawings/{id}/checkout` | `engineering:drawing:checkout` | body: `{ revisionCode?, reason? }` → 409 if already out |
| POST | `/engineering/drawings/{id}/checkout/cancel` | `engineering:drawing:checkout` | releases lock |
| GET | `/engineering/drawings/{id}/workflow` | `engineering:workflow:read` | `{ currentState, stateEnteredAt, availableTransitions[], history[] }` |
| POST | `/engineering/drawings/{id}/workflow/transition` | `engineering:workflow:write` | body: `{ transitionId, remarks? }`; 409 invalid/guarded |
| POST | `/engineering/drawings/{id}/attachments` 🆕2.3.2 | `engineering:drawing:update` | multipart; body `{ kind, file }`; 50 MB cap |
| GET | `/engineering/drawings/{id}/attachments/{attachmentId}/download` 🆕2.3.2 | read | presigned URL |

---

## 4. BOMs — `/api/engineering/boms`

### 4.1 Schemas

```yaml
    Bom:
      type: object
      required: [projectId, name]
      properties:
        id: { type: string, format: uuid }
        bomNumber: { type: string, example: "BOM-2026-0081" }
        name: { type: string }
        projectId: { type: string, format: uuid }
        drawingId: { type: string, format: uuid, nullable: true }
        revision: { type: string, example: "A" }
        versionNumber: { type: integer }
        status: { type: string, example: "DRAFT" }
        workflowInstanceId: { type: string, format: uuid, nullable: true }
        effectiveFrom: { type: string, format: date, nullable: true }   # active from 2.3.1
        effectiveTo: { type: string, format: date, nullable: true }
        totalCost: { type: number, nullable: true }
        currency: { type: string, example: INR }
        isCurrent: { type: boolean }                                   # derived from 2.3.1
        releasedBy: { type: string, format: uuid, nullable: true }
        releasedAt: { type: string, format: date-time, nullable: true }
        notes: { type: string, nullable: true }
        metadata: { type: object }
    BomItem:
      type: object
      properties:
        id: { type: string, format: uuid }
        bomId: { type: string, format: uuid }
        parentItemId: { type: string, format: uuid, nullable: true }
        lineNumber: { type: string, example: "1.2" }
        partNumber: { type: string }
        partName: { type: string }
        itemType:
          type: string
          enum: [ASSEMBLY, SUB_ASSEMBLY, PART, RAW_MATERIAL, STANDARD_COMPONENT, PURCHASED_COMPONENT, SUBSTITUTE, ALTERNATE, TOOLING, CONSUMABLE]
        sourceType: { type: string, enum: [MAKE, BUY, SUB_CONTRACT, RAW] }
        drawingId: { type: string, format: uuid, nullable: true }
        materialId: { type: string, format: uuid, nullable: true }
        componentId: { type: string, format: uuid, nullable: true }
        supplierId: { type: string, format: uuid, nullable: true }
        supplierName: { type: string, nullable: true }
        quantityPer: { type: number }
        quantity: { type: number }
        uom: { type: string }
        baseUom: { type: string, nullable: true }
        conversionFactor: { type: number, nullable: true }
        unitCost: { type: number, nullable: true }
        extendedCost: { type: number, nullable: true }
        costCurrency: { type: string, nullable: true }
        leadTimeDays: { type: integer, nullable: true }
        reference: { type: string, nullable: true }
        makeOrBuyNotes: { type: string, nullable: true }
        notes: { type: string, nullable: true }
    BomSubstitution:                  # 🆕 2.3.1
      type: object
      properties:
        id: { type: string, format: uuid }
        bomId: { type: string, format: uuid }
        itemId: { type: string, format: uuid }
        substituteComponentId: { type: string, format: uuid, nullable: true }
        substitutePartNumber: { type: string, nullable: true }
        substituteDescription: { type: string, nullable: true }
        relationType: { type: string, enum: [SUBSTITUTE, ALTERNATE] }
        effectiveFrom: { type: string, format: date }
        effectiveTo: { type: string, format: date, nullable: true }
        reason: { type: string, nullable: true }
        createdBy: { type: string, format: uuid }
    BomCompareResult:
      type: object
      properties:
        added: { type: array, items: { $ref: '#/components/schemas/BomItem' } }
        removed: { type: array, items: { $ref: '#/components/schemas/BomItem' } }
        changed:
          type: array
          items:
            type: object
            properties:
              item: { $ref: '#/components/schemas/BomItem' }
              fields: { type: array, items: { type: string } }
        costDelta: { type: number }    # 🆕 cost=true
    CostBreakdown:                    # 🆕 2.3.1
      type: object
      properties:
        totalCost: { type: number }
        byItemType: { type: object }
        bySourceType: { type: object }
        bySupplier: { type: object }
```

### 4.2 Paths

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/engineering/boms` | `engineering:bom:read` | query: EngineeringQuery + revision |
| GET | `/engineering/boms/{id}` | read | |
| GET | `/engineering/boms/{id}/items` | read | flat, sorted |
| GET | `/engineering/boms/{id}/tree` | read | nested `BomTreeNode[]` |
| GET | `/engineering/boms/{id}/cost` | `engineering:bom:rollup` | runs rollup, returns total |
| GET | `/engineering/boms/{id}/cost-breakdown` 🆕 | read | §BOM 6 |
| GET | `/engineering/boms/{id}/revisions` | read | DESC |
| GET | `/engineering/boms/{id}/compare/{revisionA}/{revisionB}` | `engineering:bom:compare` | `?cost=true` 🆕 |
| GET | `/engineering/boms/{id}/export` | `engineering:bom:export` | CSV headers |
| GET | `/engineering/boms/{id}/select?asOf=YYYY-MM-DD` 🆕 | read | point-in-time resolution §BOM 5.2 |
| GET | `/engineering/boms/{id}/substitutions` 🆕 | read | list item substitutions |
| POST | `/engineering/boms/{id}/substitutions` 🆕 | `engineering:bom:substitute` | body: BomSubstitution (minus computed) |
| POST | `/engineering/boms/{id}/substitutions/{sid}/apply` 🆕 | `engineering:bom:substitute` | body: `{ asOf }`; approval-gated |
| POST | `/engineering/boms` | `engineering:bom:create` | |
| PATCH | `/engineering/boms/{id}` | `engineering:bom:update` | blocked when RELEASED |
| DELETE | `/engineering/boms/{id}` | `engineering:bom:delete` (ADMIN/MANAGEMENT) | 204; cascades items+revisions |
| POST | `/engineering/boms/{id}/items` | `engineering:bom:update` | body: AddBomItemDto |
| PATCH | `/engineering/boms/{id}/items/{itemId}` | `engineering:bom:update` | |
| DELETE | `/engineering/boms/{id}/items/{itemId}` | `engineering:bom:update` | 204; cascades sub-tree |
| POST | `/engineering/boms/{id}/revisions` | `engineering:bom:update` | body: `{ revisionCode, changeNotes }` → snapshot |
| POST | `/engineering/boms/{id}/clone` | `engineering:bom:update` | body: `{ name?, projectId? }` |
| POST | `/engineering/boms/{id}/import` | `engineering:bom:import` | body: `{ csv }` |
| GET | `/engineering/boms/{id}/workflow` | `engineering:workflow:read` | |
| POST | `/engineering/boms/{id}/workflow/transition` | `engineering:workflow:write` | body: `{ transitionId, remarks? }` |
| GET | `/engineering/uom/conversion?from=kg&to=lb` 🆕 | read | `{ from, to, factor, validFrom, validTo }` |
| POST | `/engineering/uom/conversions` 🆕 | `engineering:uom:update` (ADMIN) | body: `{ fromUom, toUom, factor, validFrom?, validTo? }` |

---

## 5. Engineering Changes — `/api/engineering-changes`

### 5.1 Schemas

```yaml
    Ecr:
      type: object
      required: [projectId, title, changeType]
      properties:
        id: { type: string, format: uuid }
        ecrNumber: { type: string, example: "ECR-2026-0012" }
        projectId: { type: string, format: uuid }
        partId: { type: string, format: uuid, nullable: true }        # 🆕 enforced 2.3.1
        drawingId: { type: string, format: uuid, nullable: true }
        bomId: { type: string, format: uuid, nullable: true }
        routingId: { type: string, format: uuid, nullable: true }
        workOrderId: { type: string, format: uuid, nullable: true }
        materialId: { type: string, format: uuid, nullable: true }    # 🆕 2.3.1
        componentId: { type: string, format: uuid, nullable: true }   # 🆕 2.3.1
        title: { type: string }
        changeDescription: { type: string, nullable: true }
        changeReason: { type: string, nullable: true }
        changeType: { type: string, enum: [DESIGN, PROCESS, MATERIAL, SUPPLIER, SPECIFICATION, TOOLING] }
        priority: { type: string, nullable: true }
        impactAssessment: { type: string, nullable: true }
        costImpact: { type: number, nullable: true }
        scheduleImpactDays: { type: integer, nullable: true }
        requestedBy: { type: string, format: uuid, nullable: true }
        approvedBy: { type: string, format: uuid, nullable: true }
        approvedAt: { type: string, format: date-time, nullable: true }
        rejectionReason: { type: string, nullable: true }
        status: { type: string, enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED, CLOSED] }
        workflowInstanceId: { type: string, format: uuid, nullable: true }
    Eco:
      type: object
      properties:
        id: { type: string, format: uuid }
        ecoNumber: { type: string, example: "ECO-2026-0007" }
        ecrId: { type: string, format: uuid }
        projectId: { type: string, format: uuid }
        implementationPlan: { type: string, nullable: true }
        implementationStartDate: { type: string, format: date, nullable: true }
        implementationEndDate: { type: string, format: date, nullable: true }
        actualCompletionDate: { type: string, format: date, nullable: true }
        responsiblePersonId: { type: string, format: uuid, nullable: true }
        verificationStatus: { type: string, nullable: true }
        verifiedBy: { type: string, format: uuid, nullable: true }
        status: { type: string, enum: [DRAFT, APPROVED, IN_IMPLEMENTATION, COMPLETED, CANCELLED] }
    Ecn:
      type: object
      properties:
        id: { type: string, format: uuid }
        ecnNumber: { type: string, example: "ECN-2026-0004" }
        ecoId: { type: string, format: uuid }
        ecrId: { type: string, format: uuid }
        projectId: { type: string, format: uuid }
        title: { type: string }
        description: { type: string, nullable: true }
        status: { type: string, enum: [ISSUED, IMPLEMENTED, VERIFIED, CLOSED] }
        issuedBy: { type: string, format: uuid, nullable: true }
        issuedAt: { type: string, format: date-time, nullable: true }
        effectiveDate: { type: string, format: date, nullable: true }
        notifiedTo: { type: array, items: { type: string } }
        affectedManufacturingOrders: { type: array, items: { type: string } }
    ChangeImpact:
      type: object
      properties:
        id: { type: string, format: uuid }
        ecrId: { type: string, format: uuid }
        impactType: { type: string, enum: [DRAWING, BOM, PROJECT, WORK_ORDER, ROUTING, MATERIAL, COMPONENT, DOCUMENT, OTHER] }
        entityId: { type: string, format: uuid, nullable: true }
        entityNumber: { type: string, nullable: true }
        impactDescription: { type: string, nullable: true }
        severity: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
        disposition: { type: string, enum: [RETAIN, REVISE, REPLACE, OBSOLETE] }
        isResolved: { type: boolean, default: false }
        suggested: { type: boolean, default: false }   # 🆕 2.3.3
```

### 5.2 Paths

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/engineering-changes/ecr` | `engineering:change:read` | query: projectId/status/changeType/priority/page |
| POST | `/engineering-changes/ecr` | `engineering:change:update` | creates workflow instance; `CHANGE_REQUESTED` |
| GET | `/engineering-changes/ecr/{id}` | read | |
| PATCH | `/engineering-changes/ecr/{id}` | `engineering:change:update` | blocked on CLOSED/REJECTED; links frozen after APPROVAL |
| DELETE | `/engineering-changes/ecr/{id}` | `engineering:change:delete` (ADMIN/MANAGEMENT) | cascades impacts+ECOs+ECNs |
| GET | `/engineering-changes/ecr/{id}/workflow` | read | available transitions |
| POST | `/engineering-changes/ecr/{id}/workflow/transition` | transition guards: `engineering:change:update|approve|implement|release` | body `{ transitionId, remarks? }` |
| GET | `/engineering-changes/ecr/{id}/impacts` | read | |
| POST | `/engineering-changes/ecr/{id}/impacts` | `engineering:change:update` | body: ChangeImpact minus computed |
| PATCH/DELETE | `/engineering-changes/ecr/{id}/impacts/{impactId}` | `engineering:change:update` | |
| POST | `/engineering-changes/ecr/{id}/impact-analysis` 🆕2.3.3 | `engineering:change:impact` (new permission, seeded) | returns suggested impacts |
| GET | `/engineering-changes/eco` · `/{id}` | read | |
| POST | `/engineering-changes/eco` | `engineering:change:update` | from approved ECR |
| PATCH | `/engineering-changes/eco/{id}` | `engineering:change:update` | |
| GET/POST | `/engineering-changes/eco/{ecoId}/implementations` 🆕2.3.1 | read / `:update` | ECO task tracking |
| POST | `/engineering-changes/eco/{ecoId}/implementations/{id}/verify` 🆕2.3.1 | `engineering:change:implement` | |
| POST | `/engineering-changes/eco/{ecoId}/ecn` | `engineering:change:update` | body: `{ title, effectiveDate, notifiedTo[] }` → ISSUED |
| GET/PATCH | `/engineering-changes/ecn` · `/{id}` | read / `:update` | |

---

## 6. Process Plans — `/api/engineering/routings` & `/work-centers`

### 6.1 Schemas

```yaml
    Routing:
      type: object
      required: [projectId, routingName]
      properties:
        id: { type: string, format: uuid }
        routingNumber: { type: string, example: "RTG-2026-0033" }
        name: { type: string }
        projectId: { type: string, format: uuid }
        partId: { type: string, format: uuid, nullable: true }
        drawingId: { type: string, format: uuid, nullable: true }
        bomId: { type: string, format: uuid, nullable: true }
        version: { type: integer, default: 1 }                 # display only after 2.3.1
        status: { type: string, example: "DRAFT" }
        workflowInstanceId: { type: string, format: uuid, nullable: true }
        totalSetupHours: { type: number, nullable: true }
        totalCycleHours: { type: number, nullable: true }
        totalStandardHours: { type: number, nullable: true }
        totalCost: { type: number, nullable: true }
        approvedBy: { type: string, format: uuid, nullable: true }
        releasedBy: { type: string, format: uuid, nullable: true }
    Operation:
      type: object
      properties:
        id: { type: string, format: uuid }
        routingId: { type: string, format: uuid }
        operationNumber: { type: integer, example: 10 }
        operationCode: { type: string, nullable: true }
        description: { type: string, nullable: true }
        workCenterId: { type: string, format: uuid }
        machineId: { type: string, format: uuid, nullable: true }
        setupTimeMinutes: { type: number }
        cycleTimeMinutes: { type: number }
        standardTimeMinutes: { type: number, nullable: true }
        quantityPerCycle: { type: number, nullable: true }
        costPerHour: { type: number, nullable: true }
        operationCost: { type: number, nullable: true }
        toolRequirements: { type: array, items: { type: string } }
        materialRequirements: { type: array, items: { type: string } }
        inspectionRequired: { type: boolean, default: false }
        qualityCheckpoints: { type: array, items: { type: string } }
        predecessorOperationId: { type: string, format: uuid, nullable: true }  # sequenced 2.3.1
    WorkCenter:
      type: object
      properties:
        id: { type: string, format: uuid }
        code: { type: string }
        name: { type: string }
        workCenterType: { type: string, enum: [MACHINING, EDM, GRINDING, ASSEMBLY, INSPECTION, HEAT_TREATMENT, WELDING, POLISHING, PAINTING, OTHER] }
        location: { type: string, nullable: true }
        costPerHour: { type: number }
        capacityHoursPerDay: { type: number, default: 8 }
        machineIds: { type: array, items: { type: string, format: uuid } }
        isActive: { type: boolean, default: true }
    RoutingRevision:                 # 🆕 2.3.1
      type: object
      properties:
        id: { type: string, format: uuid }
        routingId: { type: string, format: uuid }
        revision: { type: string }
        versionNumber: { type: integer }
        snapshot: { type: object }
        totalCost: { type: number, nullable: true }
        changeSummary: { type: string, nullable: true }
        releasedBy: { type: string, format: uuid, nullable: true }
        releasedAt: { type: string, format: date-time, nullable: true }
```

### 6.2 Paths

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET/POST | `/engineering/work-centers` · `/{id}` (GET/PATCH/DELETE) | `engineering:workcenter:*` | CRUD; delete 204 |
| GET | `/engineering/routings` | `engineering:routing:read` | EngineeringQuery + drawingId/bomId |
| GET | `/engineering/routings/{id}` · `/{id}/with-operations` | read | |
| GET | `/engineering/routings/{id}/operations` | read | ASC operationNumber |
| GET | `/engineering/routings/{id}/revisions` 🆕2.3.1 | read | snapshots DESC |
| POST | `/engineering/routings` | `engineering:routing:create` | workflow instance created |
| PATCH/DELETE | `/engineering/routings/{id}` | `:update` / `:delete` (ADMIN/MANAGEMENT) | DELETE cascades operations |
| POST | `/engineering/routings/{id}/operations` | `:update` | auto operationNumber, cost computed; RELEASED guard |
| PATCH/DELETE | `/engineering/routings/{id}/operations/{opId}` | `:update` | |
| GET | `/engineering/routings/{id}/workflow` · `/workflow/transition` | `engineering:workflow:*` | |
| POST | `/engineering/routings/{id}/revisions` 🆕2.3.1 | `:update` | immutable snapshot |

---

## 7. Materials — `/api/engineering/materials`

```yaml
    Material:
      type: object
      required: [materialCode, materialName, category]
      properties:
        id: { type: string, format: uuid }
        materialCode: { type: string }
        materialName: { type: string }
        category: { type: string, enum: [STEEL, ALUMINUM, COPPER, BRASS, TITANIUM, PLASTIC, RUBBER, CERAMIC, COMPOSITE, OTHER] }
        grade: { type: string, nullable: true }
        standard: { type: string, nullable: true }
        density: { type: number, nullable: true }
        unitCost: { type: number, nullable: true }
        costCurrency: { type: string, nullable: true }
        supplierIds: { type: array, items: { type: string, format: uuid } }
        preferredSupplierId: { type: string, format: uuid, nullable: true }
        preferredSupplierName: { type: string, nullable: true }
        mechanicalProperties: { type: object }
        thermalProperties: { type: object }
        availableSizes: { type: array, items: { type: string } }
        leadTimeDays: { type: integer, nullable: true }
        moq: { type: number, nullable: true }
        status: { type: string, enum: [ACTIVE, INACTIVE] }
```

| Method | Path | Permission |
|---|---|---|
| GET | `/engineering/materials` | `engineering:material:read` (filter: search/code/category/grade/status) |
| GET | `/engineering/materials/{id}` | read |
| POST | `/engineering/materials` | `engineering:material:create` |
| PATCH | `/engineering/materials/{id}` | `engineering:material:update` |
| DELETE | `/engineering/materials/{id}` | `engineering:material:delete` (ADMIN/MANAGEMENT) |

---

## 8. Components — `/api/engineering/components`

```yaml
    Component:
      type: object
      required: [componentCode, componentName, componentType]
      properties:
        id: { type: string, format: uuid }
        componentCode: { type: string }
        componentName: { type: string }
        componentType: { type: string, enum: [STANDARD, PURCHASED, MANUFACTURED] }
        category: { type: string, nullable: true }
        manufacturer: { type: string, nullable: true }
        modelNumber: { type: string, nullable: true }
        unitOfMeasure: { type: string, nullable: true }
        unitCost: { type: number, nullable: true }
        costCurrency: { type: string, nullable: true }
        vendorMapping: { type: array, items: { type: object } }
        drawingIds: { type: array, items: { type: string, format: uuid } }
        specification: { type: string, nullable: true }
        isActive: { type: boolean, default: true }
        externalCodes: { type: object }      # 🆕 2.4 ERP/MES mapping
    ComponentAlternate:
      type: object
      properties:
        id: { type: string, format: uuid }
        componentId: { type: string, format: uuid }
        alternateComponentId: { type: string, format: uuid }
        relationType: { type: string, enum: [SUBSTITUTE, ALTERNATE], default: SUBSTITUTE }
        notes: { type: string, nullable: true }
    StandardCatalogEntry:                  # 🆕 2.3.2
      type: object
      properties:
        id: { type: string, format: uuid }
        catalogCode: { type: string }
        supplierId: { type: string, format: uuid }
        componentId: { type: string, format: uuid }
        catalogPartNo: { type: string }
        supersededBy: { type: string, nullable: true }
        drawingIds: { type: array, items: { type: string, format: uuid } }
```

| Method | Path | Permission |
|---|---|---|
| GET | `/engineering/components` | `engineering:component:read` (filter: search/code/type/category) |
| GET | `/engineering/components/{id}` · `/{id}/alternates` | read |
| POST | `/engineering/components` | `engineering:component:create` |
| PATCH | `/engineering/components/{id}` | `engineering:component:update` |
| DELETE | `/engineering/components/{id}` | `engineering:component:delete` (ADMIN/MANAGEMENT); cascades alternates both ways |
| POST | `/engineering/components/{id}/alternates` | `:update` (body: `{ alternateComponentId, relationType?, notes? }`) |
| DELETE | `/engineering/components/alternates/{alternateId}` | `:update` (204) |
| GET/POST | `/engineering/standard-catalogs` 🆕2.3.2 | `engineering:component:read` / `:update` |

---

## 9. Reviews — `/api/engineering/reviews`

```yaml
    ReviewRequest:
      type: object
      required: [projectId, entityType, entityId, title, reviewType]
      properties:
        id: { type: string, format: uuid }
        reviewNumber: { type: string, example: "RVR-2026-0021" }
        projectId: { type: string, format: uuid }
        entityType: { type: string, enum: [DRAWING, BOM, ROUTING, CHANGE, DOCUMENT] }
        entityId: { type: string, format: uuid }
        title: { type: string }
        description: { type: string, nullable: true }
        reviewType: { type: string, enum: [PEER, LEAD, DESIGN_RULE, CUSTOMER] }
        requestedBy: { type: string, format: uuid, nullable: true }
        requestedByName: { type: string, nullable: true }
        assignees:                             # multi-reviewer 🆕 2.3.1
          type: array
          items:
            type: object
            properties:
              assigneeId: { type: string, format: uuid }
              sequence: { type: integer }
              status: { type: string, enum: [PENDING, IN_REVIEW, APPROVED, REJECTED, CHANGES_REQUIRED] }
              decision: { type: string, enum: [APPROVE, REJECT, CHANGES_REQUIRED, CONCURRED], nullable: true }
              decidedAt: { type: string, format: date-time, nullable: true }
        dueDate: { type: string, format: date, nullable: true }
        completedAt: { type: string, format: date-time, nullable: true }
        status: { type: string, enum: [PENDING, IN_REVIEW, APPROVED, CHANGES_REQUIRED, REJECTED, CANCELLED] }
        decision: { type: string, enum: [APPROVE, REJECT, CHANGES_REQUIRED, CONCURRED], nullable: true }
        decisionComments: { type: string, nullable: true }
        markups: { type: array, items: { type: object } }
        attachments: { type: array, items: { type: object } }
    ReviewComment:
      type: object
      properties:
        id: { type: string, format: uuid }
        reviewRequestId: { type: string, format: uuid }
        authorId: { type: string, format: uuid }
        authorName: { type: string, nullable: true }
        body: { type: string }
        markupData: { type: object }
        isResolved: { type: boolean, default: false }
        resolvedBy: { type: string, format: uuid, nullable: true }
        resolvedAt: { type: string, format: date-time, nullable: true }
```

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/engineering/reviews` | `engineering:review:read` | filter: entityType/entityId/status/reviewerId |
| GET | `/engineering/reviews/{id}` · `/{id}/comments` | read | |
| POST | `/engineering/reviews` | `engineering:review:create` | body: `{ …, assignees: [userId,…] }` 🆕 |
| PATCH | `/engineering/reviews/{id}` | `engineering:review:update` | |
| DELETE | `/engineering/reviews/{id}` | `engineering:review:delete` (ADMIN/MANAGEMENT) | 204; cascades comments |
| POST | `/engineering/reviews/{id}/decide` | `engineering:review:approve` | body: `{ decision, comment?, assigneeId? 🆕 }`; terminal states locked |
| POST | `/engineering/reviews/{id}/comments` | `engineering:review:update` | body: `{ comment, markerRef?, markup? }` |
| POST | `/engineering/reviews/{id}/comments/{commentId}/resolve` | `:update` | |
| DELETE | `/engineering/reviews/{id}/comments/{commentId}` | `:update` (204) | |

---

## 10. Documents — `/api/engineering/documents`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/engineering/documents` | `engineering:document:read` | filter: projectId/docType/status |
| GET | `/engineering/documents/{id}` · `/{id}/versions` | read | |
| POST | `/engineering/documents` | `engineering:document:create` | body: `{ projectId, title, docType, description?, tags?, metadata? }` |
| PATCH | `/engineering/documents/{id}` | `engineering:document:update` | |
| DELETE | `/engineering/documents/{id}` | `engineering:document:delete` (ADMIN/MANAGEMENT) | 204 |
| POST | `/engineering/documents/{id}/versions` | `engineering:document:version` | body: `{ versionCode, fileName, fileSizeBytes, storageKey, mimeType, changeSummary }` |
| GET | `/engineering/documents/{id}/workflow` 🆕2.3.2 | `engineering:workflow:read` | document workflow seeded |
| POST | `/engineering/documents/{id}/workflow/transition` 🆕2.3.2 | `engineering:workflow:write` | |

---

## 11. Workflow, Traceability, Dashboard, AI Hooks

| Method | Path | Permission |
|---|---|---|
| GET | `/engineering/{entityType}/{id}/workflow` (entityType ∈ drawing\|bom\|routing) | `engineering:workflow:read` |
| POST | `/engineering/{entityType}/{id}/workflow/transition` | `engineering:workflow:write` |
| GET | `/engineering/traceability/project/{projectId}` | `engineering:traceability:read` |
| GET | `/engineering/traceability/entity?entityType=&entityId=&direction=&depth=` | `engineering:traceability:read` |
| GET | `/engineering/traceability/impact/{ecrId}` 🆕 | read |
| GET | `/engineering/traceability/integrity` 🆕 | `engineering:traceability:read` (ADMIN/MANAGEMENT) |
| GET | `/engineering/dashboard/stats` · `/pending-reviews` | `engineering:dashboard:read` |
| GET | `/engineering/ai-hooks` · `/{id}` | `engineering:aihook:read` |
| PATCH | `/engineering/ai-hooks/{id}` | `engineering:aihook:update` (ADMIN) |

---

## 12. Versioning & Backward Compatibility

- The specification version `3.4.0-eng.1` is the contract for Sprint 2.3.0 **as implemented today** plus tagged 🆕 additions (2.3.1–2.3.3).
- Swagger UI regenerated from Nest decorators at `/api/docs` (dev/staging) — decorators remain the source of truth; this document is the authoritative contract review artifact.
- Breaking changes require an ADR and a migration note (repository convention).
