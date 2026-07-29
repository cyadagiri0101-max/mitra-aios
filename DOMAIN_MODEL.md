# Domain Model

## Purpose

This document defines the bounded contexts, entities, value objects, and relationships that make up the MITRA domain model.

---

## Domain Overview

MITRA consists of seven bounded contexts. Each context owns its data, logic, and workflows. Cross-context communication happens exclusively through the **Project lifecycle**.

---

## 1. Commercial Domain

**Purpose:** Manage customer relationships, inquiries, and quotations.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| Customer | Organization that places mold orders | Has Contacts; origin of Projects |
| Contact | Individual at a customer organization | Belongs to Customer |
| Opportunity | Potential sales lead or inquiry | Belongs to Customer; may become RFQ |
| RFQ | Request for quotation from customer | Belongs to Customer; produces Quotation |
| Quotation | Pricing and delivery offer | Originates from RFQ; approved Quotation creates Project |

**Value Objects:** Address, ContactInfo, PricingTerms, DeliveryTerms

---

## 2. Project Domain

**Purpose:** Central backbone that links every domain. Every entity across all domains traces here.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| Project | A mold development engagement | Originates from Quotation; aggregates all domain entities |
| Milestone | Key checkpoint in project timeline | Belongs to Project |
| Task | Unit of work within a milestone | Belongs to Milestone; assigned to Team |
| Team | Group of users working on a project | Belongs to Project; contains Users |
| Timeline | Schedule of milestones and tasks | Belongs to Project |

**Value Objects:** ProjectStatus, Priority, TimelineRange

**Note:** The Project entity is a reference identifier (UUID) shared across all domains. Each domain maintains its own Project association without foreign key coupling.

---

## 3. Engineering Domain

**Purpose:** Manage design, BOM, process planning, and engineering changes.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| Design | Mold design with associated CAD data | Belongs to Project; has Revisions; produces BOM |
| CADMetadata | Metadata about CAD files (version, format, author) | Belongs to Design; stored in MinIO |
| DrawingRevision | Version-controlled drawing iteration | Belongs to Design |
| BOM | Bill of Materials listing all components | Originates from Design; feeds Process Planning |
| BOMItem | Individual line item in a BOM | Belongs to BOM |
| ProcessPlan | Manufacturing process steps and routing | Belongs to Project; references BOM |
| EngineeringChange | Change request affecting design or process | Belongs to Project; references affected entities |

**Value Objects:** RevisionNumber, CADFormat, MaterialSpec, Tolerance

---

## 4. Manufacturing Domain

**Purpose:** Plan and execute mold manufacturing.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| ProductionPlan | High-level manufacturing schedule | Belongs to Project; references ProcessPlan |
| Machine | Physical manufacturing resource | Allocated to WorkOrders |
| WorkOrder | Job instruction for manufacturing a component | References BOMItem; assigned to Machine |
| ProductionRun | Actual execution of a WorkOrder | Belongs to WorkOrder; captures output |
| Trial | Mold trial event during production | Belongs to Project; feeds Quality data |
| TrialResult | Measured outcomes from a trial | Belongs to Trial |

**Value Objects:** MachineSpec, ScheduleSlot, ProductionStatus

---

## 5. Quality Domain

**Purpose:** Ensure quality across the manufacturing lifecycle.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| InspectionPlan | Quality checkpoints and criteria | Belongs to Project; references ProcessPlan |
| InspectionResult | Measured values from an inspection | Belongs to InspectionPlan |
| NCR | Non-Conformance Report for defects | Belongs to Project; references InspectionResult |
| CAPA | Corrective and Preventive Action | Addresses NCR; belongs to Project |
| CAPAAction | Individual action within a CAPA plan | Belongs to CAPA |

**Value Objects:** DefectType, Severity, InspectionCriteria, ActionStatus

---

## 6. Service Domain

**Purpose:** Support molds after delivery.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| DispatchRecord | Shipment of completed mold to customer | Belongs to Project |
| Installation | On-site installation record | Belongs to Project; references DispatchRecord |
| MaintenanceLog | Scheduled or ad-hoc maintenance event | Belongs to Project |
| ServiceRequest | Customer support ticket | Belongs to Project; references MaintenanceLog |
| SparePart | Replacement part inventory item | References BOMItem |
| Warranty | Warranty terms and claims for a mold | Belongs to Project |

**Value Objects:** ServiceStatus, WarrantyTerms, DispatchDetail

---

## 7. Knowledge Domain

**Purpose:** Capture, organize, and make engineering knowledge reusable.

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| Document | Engineering document or artifact | Belongs to one or more domains; stored in MinIO |
| KnowledgeEntry | Codified engineering knowledge extracted from projects | References Projects, Designs, BOMs |
| KnowledgeGraph | Graph of entities and their semantic relationships | Links entities across all domains |
| AICopilotSession | Interaction log between user and AI assistant | References KnowledgeEntries used in responses |

**Value Objects:** DocumentType, KnowledgeCategory, GraphRelation

---

## Domain Relationships

```
Commercial ──> Project <── Engineering
                    │
           ┌────────┼────────┐
           │        │        │
     Manufacturing Quality Service
           │        │        │
           └────────┴────────┘
                    │
              Knowledge Domain
```

All arrows represent "references project" relationships. No domain directly references another domain's entities — they all communicate through the Project lifecycle.

---

## Key Design Decisions

1. **No cross-domain foreign keys.** Each domain schema is independent. Cross-domain references use UUIDs without enforced database-level constraints.
2. **Project as value reference.** Any entity that needs project association carries a `projectId` field. This is the universal linking mechanism.
3. **Event-based consistency.** When data in one domain affects another, it publishes a domain event. Interested domains consume and react.
4. **Knowledge is a first-class domain.** The Knowledge domain does not own operational data — it indexes, categorizes, and enriches data from other domains.
