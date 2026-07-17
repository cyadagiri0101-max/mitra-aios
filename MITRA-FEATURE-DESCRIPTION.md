# MITRA v3.2 — Complete Feature Description

## What is MITRA?

**MITRA** (Mold Industrial Technology & Resource Assistant) is a precision mold manufacturing lifecycle management platform built specifically for industrial companies that design, manufacture, and service molds — especially for the plastics industry (blow molds, injection molds, PET bottle molds, toolroom operations).

Think of it as a single integrated platform that replaces the Excel sheets, paper logs, and disconnected software tools that mold manufacturing companies currently use to manage their entire business. MITRA connects every department — from sales receiving an enquiry to the toolroom machining steel blocks to the QC team running trials to the service engineer fixing a mold at the customer's plant.

MITRA is built for:

- **Blow mold manufacturers** (PET bottles, industrial containers)
- **Injection mold manufacturers** (automotive, medical, consumer goods)
- **Toolrooms** (precision machining, CNC, EDM, grinding, fitting)
- **Small-to-medium industrial enterprises** (10-50 users, 3-5 concurrent users)
- **Single-factory, on-premise deployment** (not multi-tenant SaaS)

---

## The Mold Manufacturing Problem MITRA Solves

In a typical mold manufacturing company, a project lifecycle looks like this:

1. **Customer sends an enquiry** — "We need a 6-cavity PET bottle mold for 500ml bottles, 38mm neck finish, production rate 12,000 bottles/hour"
2. **Sales prepares a quotation** — Calculates material cost, machining time, design hours, assembly hours, trial cost, margin
3. **Customer approves** — PO is issued, project is created
4. **Design team creates the mold design** — CAD models (STEP/IGES), 2D drawings (DWG/DXF), BOM (Bill of Materials), specifications
5. **Design review & approval** — Internal review, customer approval, design release
6. **Planning creates process plans** — Routing: which machine, which operation, sequence, tooling required, time estimates
7. **Machine scheduling** — CNC machine calendar, booking slots, resource allocation
8. **Manufacturing** — Machining operations, assembly, fitting, heat treatment, surface treatment
9. **Internal trial** — Run the mold on a test machine, measure parts, check dimensions, identify issues
10. **CAPA** (Corrective & Preventive Action) — If issues found, fix them, re-trial
11. **Customer trial** — Customer runs the mold on their production line, approves samples
12. **Final approval** — Customer signs off, mold is ready for dispatch
13. **Dispatch** — Packaging, shipping, documentation, customs clearance
14. **Service** — Warranty support, annual maintenance, spare parts, emergency repairs

**The problem:** Most companies manage this across 5-10 disconnected tools:
- Excel for project tracking
- Email for approvals
- Shared drives for drawings (unorganized, no version control)
- ERP for invoicing (but no mold-specific data)
- WhatsApp for urgent updates
- Paper job cards on the shop floor
- No visibility into project health, delays, or bottlenecks

**MITRA solves this** by providing one integrated platform where every stage is connected, every document is version-controlled, every approval is tracked, and every user has real-time visibility into project health.

---

## 1. Project Lifecycle Management (The Core of MITRA)

### 1.1 16-Stage Mold Project Lifecycle

MITRA enforces a strict 16-stage lifecycle that cannot be skipped. Every stage must be completed in sequence, with proper approvals at each gate.

```
ENQUIRY
  ↓
QUOTATION
  ↓
APPROVAL
  ↓
PROJECT_CREATED
  ↓
DESIGN_INITIATED
  ↓
CPS_APPROVED (Customer/Project/Specification approval)
  ↓
DESIGN_RELEASED
  ↓
PROCESS_PLANNING
  ↓
MACHINE_PLANNING
  ↓
MANUFACTURING
  ↓
INTERNAL_TRIAL
  ↓
CUSTOMER_TRIAL
  ↓
CAPA (if issues found)
  ↓
RETRIAL
  ↓
CUSTOMER_APPROVAL
  ↓
DISPATCH
  ↓
SERVICE (post-delivery)
```

**Why this matters:** This lifecycle is the DNA of mold manufacturing. A mold cannot move from "Design Released" to "Process Planning" without proper design approval. It cannot move from "Manufacturing" to "Internal Trial" without all operations completed. MITRA enforces these rules in software, preventing costly mistakes like manufacturing a design that hasn't been approved, or shipping a mold that hasn't passed trials.

### 1.2 Project Health Engine

Every project has a **health score** calculated automatically:

- **GREEN (On Track)** — No overdue milestones, budget variance < 10%, on schedule
- **YELLOW (At Risk)** — 1-2 overdue milestones OR budget variance 10-25% OR stage overdue
- **RED (Critical)** — 3+ overdue milestones OR budget variance > 25% OR critical stage overdue

The health engine runs automatically when:
- A milestone is marked overdue
- A stage transition happens
- Budget data is updated
- The user explicitly requests a refresh

**Dashboard display:** A real-time project pipeline shows 128 active projects, color-coded by health status. The executive can see at a glance that 85 are on track, 17 are at risk, and 6 are critical.

### 1.3 Project Numbering & Sequencing

Projects are automatically assigned sequential numbers: **PRJ-2026-0001**, **PRJ-2026-0002**, etc. The numbering is per-tenant (so if you have multiple business units, each gets its own sequence). The system handles concurrent requests gracefully — if two users create projects simultaneously, it retries until a unique number is assigned.

### 1.4 Milestone Tracking

Each project has milestones (e.g., "Design Complete", "CNC Programming Done", "Assembly Start", "Trial Date"). Milestones have target dates, actual dates, and statuses (PENDING, IN_PROGRESS, COMPLETED, OVERDUE). The health engine uses milestone data to calculate the overall project health.

### 1.5 Budget Tracking

Projects track estimated budget vs. actual spend. Variance is calculated automatically and feeds into the health score. Budget categories include: material, machining, design, assembly, trial, and overhead.

---

## 2. Commercial Management (Sales → Money)

### 2.1 Enquiry Management

When a customer sends an enquiry, MITRA captures:
- Customer details (linked to customer master)
- Product specifications (bottle volume, neck finish, material, cavitation)
- Technical requirements (cycle time, shot weight, cooling system)
- Delivery requirements (timeline, destination, incoterms)
- Attachments (customer drawings, sketches, reference images)

**Status lifecycle:** DRAFT → SUBMITTED → UNDER_REVIEW → CONVERTED (to quotation) or LOST

The sales team can see all enquiries in a pipeline view, filter by status, customer, or date range.

### 2.2 Quotation Management

Quotations are generated from enquiries. MITRA supports:
- Itemized line items (mold base, cavity blocks, hot runner, cooling system, etc.)
- Cost breakdown (material cost, machining cost, design cost, overhead, profit margin)
- Multiple revisions (quotation v1, v2, v3...)
- Approval workflow (sales manager → management → customer)
- PDF generation (quotation document for customer)
- Linked to project (when quotation is approved, a project is auto-created)

### 2.3 Invoicing & Payments

MITRA tracks invoices, payments, and credit notes linked to projects and quotations. This ensures every dollar is accounted for and linked to the correct mold project.

---

## 3. Customer Management

### 3.1 Customer Master

Customer records include: name, address, contact persons, tax details, payment terms, credit limit, and a history of all projects, enquiries, and quotations.

### 3.2 Customer Approval Portal

External customers can log into MITRA to:
- Review design drawings and approve them
- View trial reports and measurement data
- Sign off on final approval
- Track project status
- Submit service requests

This eliminates the email back-and-forth of "Please review the attached drawing and approve." The customer sees the drawing in the portal, clicks "Approve" or "Reject with comments," and the approval is timestamped and recorded in the audit trail.

---

## 4. Design Management (CAD, BOM, Drawings)

### 4.1 Design Part Management

Every component of a mold is tracked as a "Design Part":
- Cavity blocks (the shaped parts that form the bottle)
- Core blocks (the inner parts)
- Mold base (the frame that holds everything)
- Cooling inserts (water channels for temperature control)
- Ejector system (pins that push the bottle out)
- Hot runner system (if applicable)

Each part has: material specification (steel grade, hardness), dimensions, weight, surface finish requirements, and tolerances.

### 4.2 Bill of Materials (BOM)

The BOM is auto-generated from design parts. It includes:
- Part number, description, quantity
- Material (steel type, supplier, heat treatment)
- Standard components (screws, springs, O-rings, guides)
- Outsourced parts (heat treatment, surface coating, EDM)
- Raw material requirements (stock size, cutting allowance)

**v3.2 AI Feature:** The BOM can be uploaded to MITRA AI for complexity analysis. The AI identifies:
- High-complexity parts that need special machining
- Material risk (long lead times, single-source suppliers)
- Substitute suggestions (alternative steel grades with same properties)
- Cost optimization opportunities

### 4.3 Drawing & File Management

All CAD files and drawings are stored in MinIO (S3-compatible object storage):
- **3D Models:** STEP, IGES, native CAD formats
- **2D Drawings:** DWG, DXF, PDF
- **CAM Files:** NC, TAP, G-code for CNC machines
- **Specifications:** PDF, DOCX, XLSX

**Version control:** Every file upload creates a new version. The system tracks who uploaded it, when, and what changed. Old versions are never deleted — they are marked as "superseded" and can be viewed for audit purposes.

**v3.2 AI Feature:** Drawing files (STEP, IGES, PDF, DWG) can be uploaded to MITRA AI for risk analysis. The AI detects:
- Thin walls (risk of warping during machining)
- Deep pockets (risk of tool breakage, long machining time)
- Sharp corners (stress concentrators, may need radius)
- Tolerance stacks (cumulative tolerance issues)
- Complexity score (simple → moderate → complex → very complex)

### 4.4 Design Release Workflow

Before a design can move to manufacturing, it must pass:
1. Internal design review (design team)
2. CPS approval (Customer/Project/Specification matching)
3. Management approval (budget and timeline check)
4. Customer approval (if required by contract)

Each approval is recorded with the approver's name, timestamp, and remarks. The workflow engine enforces that a design cannot be released without all approvals.

### 4.5 Engineering Change Requests (ECR) & Change Orders (ECO)

If a design needs to be changed after release (customer request, manufacturing issue, or quality finding), MITRA manages the ECR/ECO process:
- ECR is raised by any department
- Affected parts are identified
- Impact assessment (cost, timeline, quality)
- ECO is approved by management
- Changes are implemented and tracked
- All affected documents are updated and re-versioned

---

## 5. Planning & Scheduling

### 5.1 Process Planning

For each mold, the process planner creates a **process plan** — a sequence of operations:

```
Op 1: Rough milling of cavity block (Machine: CNC-001, Time: 8h)
Op 2: Heat treatment (Outsourced, Time: 48h)
Op 3: Finish milling (Machine: CNC-002, Time: 12h)
Op 4: EDM of deep pockets (Machine: EDM-001, Time: 6h)
Op 5: Grinding of fit surfaces (Machine: GRD-001, Time: 4h)
Op 6: Assembly (Workstation: ASM-001, Time: 16h)
Op 7: Internal trial (Machine: TRIAL-001, Time: 4h)
```

Each operation has: machine/workstation, estimated time, tooling required, setup time, and inspection checkpoints.

### 5.2 Machine Master & Calendar

MITRA maintains a catalog of all machines in the factory:
- CNC machines (model, capacity, accuracy, hourly rate)
- EDM machines (wire EDM, sinker EDM)
- Grinding machines (surface, cylindrical, centerless)
- Milling machines (VMC, HMC, 5-axis)
- Trial machines (injection molding machines for testing)
- Manual workstations (assembly, fitting, polishing)

Each machine has a calendar with available hours, scheduled maintenance, and booked operations. When a process planner assigns an operation to a machine, the system checks availability and prevents double-booking.

### 5.3 Resource Allocation

When a work order is released, resources are allocated:
- Machine hours (booked on the machine calendar)
- Raw material (reserved from inventory or ordered)
- Tools (special cutters, fixtures, gauges — checked out from tool crib)
- Labor (operator skill level matching required)

---

## 6. Manufacturing (Shop Floor Execution)

### 6.1 Work Order Management

When a process plan is approved, work orders are generated for each operation or group of operations. Work orders have a lifecycle:

```
DRAFT → RELEASED → IN_PROGRESS → COMPLETED
```

Each work order is a "job card" that travels with the physical part on the shop floor. The operator scans or enters the work order number, and the system records:
- Start time, end time
- Actual time vs. estimated time
- Quality checkpoints (inspection results at each stage)
- Material consumption (actual vs. planned)
- Operator name and machine used
- Notes and deviations

### 6.2 Job Cards

A job card is the physical or digital document that travels with the part. It contains:
- Part number, drawing number, revision
- Operation details (what to do, how to do it, tolerances)
- Quality checkpoints (what to measure, acceptable range)
- Sign-off boxes (operator signs, inspector signs, supervisor signs)

MITRA digitalizes this — operators use tablets or computers to update job card status in real-time.

### 6.3 Production Batching

For production molds (molds that are made in batches for the same customer), MITRA tracks:
- Batch number, quantity, customer
- Material batch tracking (which steel batch was used for which mold)
- Heat treatment batch tracking
- Serial number assignment (each mold gets a unique serial number)

### 6.4 Material Issue Tracking

MITRA tracks every gram of steel that goes into a mold:
- Raw material stock size (block dimensions)
- Cutting allowance (how much is lost during cutting)
- Actual material issued vs. planned
- Scrap tracking (why was material scrapped? rework, damage, wrong size?)
- Material traceability (which steel batch, heat number, certificate)

---

## 7. Quality Management (Trials, CAPA, Inspection)

### 7.1 Trial Management

The most critical phase of mold manufacturing is **trial** — running the mold on an injection molding machine and producing actual parts to verify everything works.

MITRA manages three types of trials:
- **Internal Trial** — Run at the manufacturer's factory before customer sees the mold
- **Customer Trial** — Run at the customer's factory with their material, machine, and conditions
- **Retrial** — If the first trial fails, fixes are made and the mold is re-trialed

Each trial records:
- Machine used, material used, cycle time, shot weight
- Part measurements (dimensions, weight, wall thickness, neck finish)
- Visual inspection (flash, sink marks, warpage, color)
- Functional tests (leak test, drop test, torque test)
- Photos and videos of parts and mold running
- Trial report (PDF generated automatically)

**Trial results:** PASS, FAIL, or CONDITIONAL (pass with minor issues to be fixed).

### 7.2 CAPA (Corrective and Preventive Action)

When a trial fails or a quality issue is found, a CAPA is raised:

```
OPEN → IN_PROGRESS → IMPLEMENTED → VERIFIED → CLOSED
```

Each CAPA records:
- Problem description (what went wrong)
- Root cause analysis (why did it go wrong?)
- Corrective action (what was done to fix it?)
- Preventive action (what will be done so it never happens again?)
- Verification (how do we know the fix worked?)
- Responsible person, target date, actual date

The CAPA system is integrated with the project lifecycle — a project cannot move from "CAPA" to "RETRIAL" until all CAPAs are closed.

### 7.3 Inspection Reports

Formal inspection reports are generated for:
- Incoming material inspection (steel hardness, dimensions, certificates)
- In-process inspection (after each critical operation)
- Final inspection (before dispatch)
- Customer inspection (at customer trial)

Inspection reports include: measured values, tolerance limits, pass/fail status, inspector name, inspection date, and equipment used (calipers, CMM, gauge).

### 7.4 Retrial Management

If a mold fails trial, MITRA manages the retrial process:
- CAPA is raised and tracked
- Fix is implemented and verified
- Retrial is scheduled
- Retrial results are recorded
- If retrial fails again, the cycle repeats (CAPA → Fix → Retrial)

MITRA tracks the number of retrial cycles per project — this is a key quality metric.

---

## 8. Dispatch & Delivery

### 8.1 Dispatch Planning

When a mold is ready for delivery, MITRA creates a dispatch plan:
- Packaging requirements (wooden crate, foam, desiccant, VCI paper)
- Documentation (packing list, inspection certificate, warranty certificate, operation manual, maintenance guide)
- Shipping method (road, sea, air)
- Insurance and customs requirements
- Delivery date commitment to customer

### 8.2 Shipment Tracking

Dispatch status is tracked:

```
PLANNING → PACKED → SHIPPED → IN_TRANSIT → DELIVERED → INSTALLED
```

At each stage, the user updates the status, adds tracking numbers, and attaches photos of the packed mold, shipping documents, and delivery confirmation.

---

## 9. Service & After-Sales (Post-Delivery)

### 9.1 Service Request Management

After a mold is delivered, the customer may need:
- **Repair** — Something broke, needs fixing
- **Maintenance** — Regular preventive maintenance (annual or per cycle count)
- **Modification** — Customer wants to change the bottle design or add a feature
- **Inspection** — Periodic inspection to check wear and tear
- **Emergency** — Mold broke down on the production line, urgent response needed

Service requests are tracked with:
- Ticket number, priority (LOW/MEDIUM/HIGH/CRITICAL), type (REPAIR/MAINTENANCE/MODIFICATION/INSPECTION/EMERGENCY)
- Customer, machine, mold serial number
- Problem description, photos, videos
- Technician assignment, visit schedule
- Service report (what was done, parts replaced, time spent, cost)

### 9.2 Spare Parts Management

MITRA tracks spare parts for every mold:
- Which parts are wear items (ejector pins, springs, O-rings, guide bushes)
- Recommended spare parts list (what the customer should keep in stock)
- Part availability (do we have stock or need to manufacture?)
- Spare parts pricing

### 9.3 Warranty Tracking

Every mold has a warranty period (typically 12 months from delivery or 1 million shots, whichever comes first). MITRA tracks:
- Warranty start date and end date
- Warranty claims (what failed, when, under what conditions)
- Warranty type (material defect, workmanship, wear and tear)
- AMC (Annual Maintenance Contract) status and renewal dates

---

## 10. AI Copilot — MITRA's Production Intelligence Engine

### 10.1 What is MITRA AI?

MITRA AI is a **local AI assistant** powered by Microsoft's **Phi-3** model running on **Ollama** (no cloud API, no data leaves your network). It is embedded into every part of the platform and acts as a "Production Intelligence Engine" — not just a chatbot, but an intelligent assistant that understands your manufacturing data.

### 10.2 AI Features

**Conversational AI:** Ask MITRA AI anything about your data:
- "Which projects are delayed and why?"
- "Show me the BOM for project PRJ-2026-0012"
- "What was the outcome of the last customer trial?"
- "Which CAPAs are overdue?"
- "Summarize all activities on the ABC Industries project this week"

**Intent Detection:** The AI automatically detects what the user is asking about:
- `DELAYED_PROJECTS` → Fetches overdue projects with reasons
- `BOM_QUERY` → Fetches the Bill of Materials
- `TRIAL_STATUS` → Fetches trial results
- `CAPA_STATUS` → Fetches CAPA status
- `PROJECT_SUMMARY` → Generates a project summary

**Data-Grounded Responses:** The AI never hallucinates. Every answer is based on actual data from the MITRA database. If the data doesn't contain the answer, the AI says "I don't have enough information" rather than making something up.

**Rate Limiting:** 30 messages per minute per user to prevent abuse.

**v3.2 AI Usage Tracking:** Every AI interaction is logged for analysis:
- Who asked what, when, and how long it took
- Which model was used (Phi-3, data-only fallback)
- Response time in milliseconds
- Total prompts per day, per user, per tenant

### 10.3 AI Panel Interface

The AI Copilot appears as a floating button in the bottom-right corner of every screen. Clicking it opens a side panel with:
- Chat history
- Quick action buttons ("Analyze Delays", "Explain BOM", "Generate Quotation", "Search Documents")
- Typing indicator when the AI is processing
- Status indicator (Online — Phi-3 AI, Local)

### 10.4 BOM Analysis (v3.2)

Upload a BOM file and MITRA AI will analyze it:
- **Complexity Score:** How complex is this mold to manufacture? (Simple/Moderate/Complex/Very Complex)
- **Risk Areas:** Which parts are high-risk? (thin walls, deep pockets, tight tolerances, exotic materials)
- **Material Analysis:** Lead times for each material, single-source risks, substitute suggestions
- **Machining Time Estimate:** Estimated hours for each operation type
- **Cost Optimization:** Suggestions to reduce cost without compromising quality

### 10.5 Drawing Analysis (v3.2)

Upload CAD files (STEP, IGES, DWG, DXF) or PDF drawings and MITRA AI will:
- Extract geometric features
- Identify potential manufacturing risks
- Suggest design improvements
- Estimate complexity and machining time

---

## 11. Document & File Management

### 11.1 Version Control for All Files

Every file in MITRA is version-controlled:
- **Upload** → creates version 1
- **Re-upload** → creates version 2 (version 1 is preserved)
- **Checkout** → locks the file for editing (others can view but not modify)
- **Checkin** → creates a new version and releases the lock
- **Rollback** → revert to a previous version if a mistake was made
- **Download** → every download is tracked (who, when, which version)

### 11.2 File Types Supported

| Category | File Types |
|----------|------------|
| **3D CAD Models** | STEP (.stp, .step), IGES (.igs, .iges) |
| **2D Drawings** | DWG, DXF, PDF |
| **CAM Files** | NC, TAP, G-code |
| **Documents** | DOC, DOCX, PDF, XLS, XLSX |
| **Images** | JPG, JPEG, PNG, GIF |
| **Videos** | MP4, MOV |
| **Archives** | ZIP |

### 11.3 Security

- **50 MB maximum file size**
- **MIME type validation** — the file type must match the extension
- **Magic number verification** — the file content must match the claimed type (prevents fake extensions)
- **SHA-256 checksum** — every file is hashed to detect corruption
- **Presigned URLs** — temporary download links that expire after a set time
- **No direct file access** — all files are served through the API with authentication

### 11.4 Folder Intelligence (v3.2)

MITRA can automatically scan project folders and classify files:
- **3D_MODEL** — STEP, IGES files
- **2D_DRAWING** — DWG, DXF, PDF drawings
- **CAM** — NC, TAP, G-code files
- **BOM** — Excel BOM files
- **SPECIFICATION** — PDF specifications
- **PHOTO** — Images of the mold, parts, trials
- **VIDEO** — Trial videos, machining videos
- **REPORT** — Trial reports, inspection reports, CAPA reports

Files are linked to each other (e.g., a 3D model is linked to its 2D drawing, which is linked to its CAM file).

---

## 12. Workflow Engine

### 12.1 Stage Transition Enforcement

The workflow engine is the backbone of MITRA. It enforces:
- **No stage skipping** — a project cannot jump from ENQUIRY to MANUFACTURING. It must pass through every intermediate stage.
- **Approval gates** — certain transitions require specific roles or permissions (e.g., only DESIGN users can release a design)
- **Automatic instance creation** — when a project is created, a workflow instance is automatically created to track its progress
- **History tracking** — every transition is recorded with: from stage, to stage, who did it, when, and remarks

### 12.2 Role-Based Transition Guards

Not everyone can move a project to any stage. The system checks:
- Does the user have the required role? (e.g., DESIGN, QUALITY, MANAGEMENT)
- Does the user have the required permission? (e.g., `design:release`, `trial:approve`, `dispatch:release`)
- Is the transition allowed by the workflow definition? (e.g., can ENQUIRY go to QUOTATION? Yes. Can ENQUIRY go to MANUFACTURING? No.)

### 12.3 Workflow Visualization

The frontend shows a visual timeline of the project lifecycle:
- Completed stages are green with a checkmark
- The current stage has a blue pulse animation
- Future stages are gray and inactive
- The user can hover over any stage to see details (when it was entered, who moved it, remarks)
- The overall progress bar shows the percentage of the lifecycle completed

---

## 13. User Management & Security

### 13.1 Role-Based Access Control (RBAC)

MITRA has 8 built-in roles:

| Role | Typical Users | Access |
|------|--------------|--------|
| **ADMIN** | IT Manager, System Administrator | Everything — users, settings, all data, system configuration |
| **MANAGEMENT** | Factory Manager, Director | All projects, all financial data, analytics, reports |
| **SALES** | Sales Engineer, Estimator | Enquiries, quotations, customers, documents, projects (read) |
| **DESIGN** | Design Engineer, CAD Operator | Design parts, drawings, ECR/ECO, design approval |
| **PLANNING** | Process Planner, Scheduler | Process plans, machine calendar, work orders, routing |
| **PRODUCTION** | Shop Floor Supervisor, CNC Operator | Work orders, job cards, manufacturing, operation logs |
| **QUALITY** | Quality Inspector, QA Manager | Trials, CAPA, inspection reports, retrial management |
| **CUSTOMER** | Customer representative | Read-only access to their own projects, drawings, trial reports, service requests |

### 13.2 Permission System (v3.2)

Beyond roles, MITRA has a fine-grained permission system:

```
project:read, project:create, project:update, project:delete, project:transition
design:read, design:create, design:approve, design:release, design:delete
quality:read, quality:create, quality:close, quality:delete
document:read, document:upload, document:download, document:checkout, document:delete
workflow:read, workflow:transition, workflow:approve
service:read, service:create, service:update, service:delete
user:read, user:create, user:update, user:delete
role:read, role:manage
audit:read
```

Permissions are assigned to roles, and users inherit permissions through their role. This allows for flexible access control (e.g., a DESIGN user can create design parts but not approve them — only a DESIGN MANAGER with `design:approve` permission can do that).

### 13.3 Authentication

- **JWT tokens** — Access token (short-lived, 15 minutes) + Refresh token (long-lived, 7 days, httpOnly cookie)
- **Password security** — bcrypt hashing with salt rounds, minimum 8 characters
- **Login rate limiting** — 5 failed attempts trigger a lockout with exponential backoff (5s, 10s, 20s, 40s, 80s...)
- **Cross-tab logout** — If a user logs out in one tab, all other tabs are logged out instantly (via `storage` event)
- **Silent token refresh** — Tokens are refreshed automatically 60 seconds before expiry, without user interruption
- **CSRF protection** — All mutating requests (POST, PUT, PATCH, DELETE) include a CSRF token

### 13.4 Tenant Isolation

MITRA is designed for single-tenant deployment (one company), but the architecture supports multi-tenant if needed in the future:
- Every entity has a `tenantId` column
- All queries are filtered by `tenantId`
- A user can only see data from their own tenant
- Project numbers are per-tenant (Tenant A has PRJ-2026-0001, Tenant B also has PRJ-2026-0001 — no conflict)
- For single-tenant deployment, this is transparent to the user

### 13.5 Audit Logging

Every action is recorded in the audit log:
- Who (user ID, name, IP address, user agent)
- What (entity type, entity ID, action type: CREATE/UPDATE/DELETE)
- When (timestamp)
- Before/After values (for updates, what changed from what to what)
- Business events (e.g., `design:released`, `trial:approved`, `dispatch:released`)

---

## 14. Analytics & Reporting

### 14.1 Dashboard KPIs

The executive dashboard shows real-time metrics:
- **Active Projects:** Total projects currently in progress
- **On Track:** Projects with GREEN health status
- **At Risk:** Projects with YELLOW health status
- **Critical:** Projects with RED health status
- **Machines Running:** Number of machines currently in use (v3.2)
- **Pending Dispatches:** Molds ready but not yet shipped
- **Overdue CAPAs:** CAPAs past their target closure date
- **Open Service Requests:** Service tickets that need attention

### 14.2 Project Analytics

- Project trends over time (projects created per month)
- Health distribution (green/yellow/red percentage)
- Stage distribution (how many projects are in each stage)
- Average cycle time (how long does a typical mold take from enquiry to dispatch)
- Budget variance analysis (are we over budget or under budget on average)
- On-time delivery rate (what percentage of projects are delivered on time)

### 14.3 Quality Analytics

- Trial success rate (percentage of trials that pass on first attempt)
- CAPA resolution time (average time from CAPA open to CAPA closed)
- Retrial frequency (how many molds need more than one trial)
- Quality metrics by customer (which customers have the most quality issues)
- Quality metrics by designer (which designers produce the most reliable designs)

### 14.4 Machine Utilization (v3.2)

- Machine uptime percentage
- Machine idle time (when is a machine not being used and why)
- Maintenance schedule compliance (are machines being serviced on time)
- Utilization by machine type (CNC vs. EDM vs. Grinding)
- Cost per machine hour (how much does it cost to run each machine)

---

## 15. Machine Status & Telemetry (v3.2)

### 15.1 Real-Time Machine Status

MITRA v3.2 can ingest real-time data from CNC machines via:
- **OPC-UA** (industrial standard protocol)
- **MTConnect** (manufacturing technology standard)
- **Modbus** (legacy protocol)
- **Direct API** (machine vendor's API)

For each machine, MITRA tracks:
- **Status:** RUNNING, IDLE, MAINTENANCE, ALARM, OFFLINE
- **Current Program:** Which G-code or NC program is running
- **Cycle Count:** How many parts have been made today
- **Spindle Speed:** RPM (for CNC machines)
- **Feed Rate:** mm/min (for CNC machines)
- **Tool Number:** Which tool is currently in use
- **Alarm History:** What alarms have occurred and when
- **Uptime:** Percentage of time the machine is running (vs. idle or down)

### 15.2 Machine Dashboard

The machine dashboard shows:
- A grid of all machines with color-coded status (green = running, yellow = idle, red = alarm, gray = offline)
- Utilization percentage for each machine
- Current job (which work order, which part, which operation)
- Alarm notifications (if a machine has an alarm, it's highlighted)
- Maintenance due alerts (if a machine is due for maintenance, it shows a warning)

### 15.3 Predictive Maintenance (Future)

Based on machine telemetry data, MITRA can predict:
- When a machine will need maintenance (before it breaks down)
- Which parts are likely to wear out next
- Optimal maintenance schedule (minimize downtime while preventing breakdowns)

---

## 16. Search & Knowledge Management

### 16.1 Global Search (Command Palette)

Press **Ctrl+K** anywhere in MITRA to open the global search:
- Search projects by name, number, or customer
- Search documents by filename or content
- Search customers by name or contact person
- Search BOM items by part number or material
- Search service requests by ticket number

The search has an animated interface:
- **Analyzing...** — When you type, a waveform animation shows the system is processing
- **Results** — Matching results appear with icons and descriptions
- **Quick Actions** — Suggested searches (e.g., "Open Dashboard", "New Project", "AI Copilot")

### 16.2 Knowledge Base

MITRA has a built-in knowledge base:
- **Articles:** How-to guides, best practices, standard operating procedures
- **Categories:** Organized by department (Design, Manufacturing, Quality, Service)
- **Tags:** Cross-cutting topics (e.g., "PET bottle", "CNC programming", "EDM settings")
- **Attachments:** Photos, videos, PDFs linked to articles
- **AI Search:** The knowledge base is indexed for vector search, so the AI can find relevant articles when answering questions

### 16.3 Vector Search (AI-Powered)

MITRA uses pgvector (PostgreSQL extension) to store AI embeddings of knowledge articles and documents. When a user asks a question, the AI:
1. Converts the question to an embedding vector
2. Searches the database for the most similar vectors (semantic similarity, not keyword matching)
3. Retrieves the top matching articles and documents
4. Uses this context to generate an accurate, grounded answer

---

## 17. System Administration & Operations

### 17.1 Backup & Recovery

MITRA v3.2 includes automated backup scripts:
- **PostgreSQL backup:** Daily `pg_dump` with gzip compression, retention for 30 days
- **MinIO backup:** Daily `mc mirror` of all documents to a backup bucket
- **Offsite S3 copy:** Optional copy to an external S3 bucket for disaster recovery
- **Restore verification:** Weekly test restores to verify backup integrity
- **One-click restore:** `restore.sh db <backup_file>` or `restore.sh full <db> <minio>`

### 17.2 Health Monitoring

- **System Health:** Database connectivity, Redis connectivity, MinIO connectivity, AI service availability
- **Prometheus Metrics:** HTTP request rates, error rates, response times, database pool status, active users
- **API Health:** `GET /api/health` returns `{"status":"ok"}` for load balancers and monitoring tools
- **Liveness Probe:** `GET /api/health/liveness` for Kubernetes-style orchestration
- **AI Health:** `GET /api/ai/health` shows Ollama/Phi-3 status (enabled, available, model name)

### 17.3 System Status Bar (v3.2)

A persistent status bar at the bottom of every screen shows:
- **System Status:** Healthy / Warning / Error
- **Database:** Connected / Disconnected / Reconnecting
- **MinIO Storage:** Online / Offline / Degraded
- **AI Service:** Running (Phi-3) / Stopped / Loading
- **Version:** MITRA v3.2.0
- **Uptime:** How long the system has been running

### 17.4 Rate Limiting & Security

- **API rate limiting:** Throttled by NestJS Throttler (prevents brute force attacks)
- **Helmet:** HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Compression:** Gzip compression for all API responses
- **CORS:** Configurable allowed origins (e.g., `http://localhost`, `https://mitra.yourcompany.com`)
- **Input validation:** All user input is validated using class-validator DTOs
- **SQL injection prevention:** All database queries use parameterized queries (TypeORM)

---

## 18. Frontend User Experience (v3.2 Industrial Theme)

### 18.1 Dark Industrial Theme

MITRA v3.2 has a premium industrial theme inspired by:
- **Linear** (smooth motion)
- **Notion** (clean UX)
- **Vercel** (premium polish)
- **Microsoft Copilot** (AI integration)
- **Tesla Factory** (industrial control room aesthetic)

**Color palette:**
- Deep navy base: `#0A192F`
- Card surfaces: `#112240`, `#233554`
- Cyan accent: `#64FFDA`
- Status colors: Green (`#22c55e`), Amber (`#f59e0b`), Red (`#ef4444`)

### 18.2 Animated Login Page

The login page features:
- Dark background with floating particle animation
- Glowing orbs (blue and cyan) with blur effects
- A robot avatar (MITRA's AI mascot) with blinking eyes and a glowing antenna
- Glassmorphism login card (frosted glass effect)
- Animated form fields (staggered fade-in)
- Password strength meter with animated color bar
- Status display: "System Status: Operational | Version: 3.2"

### 18.3 Hero Dashboard

The dashboard is the "mission control" for the factory manager:
- **4 KPI Hero Widgets:** Machines Running, Open Projects, Pending Dispatches, Overdue CAPAs
- **Animated counters:** Numbers count up from 0 to the actual value when the page loads
- **Sparkline charts:** Mini trend lines behind each KPI showing the trend over time
- **Workflow Timeline:** Visual 8-stage pipeline showing the status of the entire factory's projects
- **AI Insights Panel:** AI-generated insights (e.g., "2 Projects are at risk due to material shortage")
- **Activity Feed:** Recent events (design released, trial completed, dispatch scheduled)
- **AI Copilot Mini-Panel:** Quick-access AI suggestions (Analyze Delays, Explain BOM, Generate Quotation, Search Documents)

### 18.4 Command Palette (Ctrl+K)

Press **Ctrl+K** anywhere to open the search overlay:
- Animated waveform visualization while searching
- "Analyzing..." state with progress bar
- Results grouped by type (Projects, Documents, Customers, Service Requests)
- Quick commands (Open Dashboard, New Project, AI Copilot, Search Documents)
- Keyboard navigation (arrow keys, Enter to select, Escape to close)

### 18.5 AI Copilot Floating Button

A floating button in the bottom-right corner of every screen:
- **Idle:** Gentle blue glow, robot avatar, "MITRA AI Copilot" label
- **Hover:** Expands slightly, shows sparkle icon
- **Click:** Opens the AI chat panel with slide-in animation
- **Online indicator:** Green dot with pulse animation shows AI is ready
- **Offline:** Gray indicator if Ollama is not running

### 18.6 Page Transitions

Every page transition has a smooth animation:
- Old page fades out and slides up slightly
- New page fades in and slides up from below
- Duration: 200-300ms (fast enough to feel instant, slow enough to feel premium)

### 18.7 Skeleton Loaders

When data is loading, MITRA shows skeleton placeholders instead of "Loading..." text:
- Shimmer animation (light sweeps across the placeholder)
- Matches the shape of the actual content (so the layout doesn't jump when data loads)
- Perceived performance: The page feels faster because the user sees the structure immediately

### 18.8 Sidebar Navigation

The left sidebar is a dark industrial navigation panel:
- Dark background (`#0A192F`) with blue active indicators
- Hover glow effect on each menu item
- Active page highlighted with blue border and background
- Collapsible (click arrow to collapse to icons only)
- Robot avatar footer with AI status ("Online — Phi-3")
- Version number: "MITRA v3.1"

---

## 19. Architecture & Technology Stack

### 19.1 Backend (NestJS)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | NestJS 11 | Enterprise-grade Node.js framework |
| **Language** | TypeScript 5.3 | Type-safe development |
| **Database** | PostgreSQL 16 + pgvector | Relational data + AI vector search |
| **ORM** | TypeORM 0.3 | Database abstraction |
| **Cache** | Redis 7 | Session storage, rate limiting |
| **Storage** | MinIO | S3-compatible object storage for files |
| **Auth** | JWT + Passport | Token-based authentication |
| **AI** | Ollama + Phi-3 | Local LLM (no cloud dependency) |
| **Monitoring** | Prometheus + Terminus | Metrics and health checks |
| **API Docs** | Swagger/OpenAPI | Auto-generated API documentation |
| **Validation** | class-validator | DTO input validation |
| **Security** | Helmet + Throttler | HTTP headers + rate limiting |

### 19.2 Frontend (React)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 | UI library |
| **Language** | TypeScript 5 | Type-safe development |
| **Build Tool** | Vite 5 | Fast development and production builds |
| **Styling** | Tailwind CSS 3 | Utility-first CSS |
| **Animation** | Framer Motion | Smooth animations and transitions |
| **Charts** | Recharts | Data visualization |
| **State** | React Query (TanStack) | Server state management |
| **Forms** | React Hook Form + Zod | Form validation |
| **Icons** | Lucide React | Icon library |
| **Counters** | react-countup | Animated number counters |
| **Auth** | Custom JWT context | Memory-only token storage |

### 19.3 Infrastructure

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Containerization** | Docker + Docker Compose | Development and production deployment |
| **Alternative** | Podman + Podman Compose | Rootless container deployment |
| **Web Server** | Nginx | Static file serving, SPA routing, gzip |
| **Reverse Proxy** | Nginx | Load balancing, SSL termination |
| **Backup** | Custom scripts (pg_dump + mc mirror) | Automated daily backups |
| **Monitoring** | Prometheus + Grafana | Metrics visualization |

---

## 20. Deployment Options

### 20.1 Docker Compose (Recommended)

```bash
cp .env.example .env
# Edit .env with your secrets
docker compose up -d
# Wait for healthy
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
# Open http://localhost
```

Services: PostgreSQL, Redis, MinIO, Ollama (Phi-3), NestJS Backend, Nginx Frontend

### 20.2 Podman (Rootless)

```bash
./scripts/podman-setup.sh
podman compose -f podman-compose.yml up -d
podman compose -f podman-compose.yml exec backend npm run migration:run
podman compose -f podman-compose.yml exec backend npm run seed
```

### 20.3 Manual (Development)

```bash
# Backend
cd mitra-backend
npm install
npm run start:dev

# Frontend (separate terminal)
cd mitra-frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 21. What MITRA is NOT

To set expectations, MITRA is NOT:

- **NOT an ERP** — It doesn't do accounting, payroll, or general ledger. It focuses on mold manufacturing lifecycle.
- **NOT a CAD/CAM system** — It stores CAD files but doesn't create or edit them. Use SolidWorks, NX, or CATIA for design.
- **NOT a CNC controller** — It tracks machine status but doesn't send G-code to machines. Use Fanuc, Siemens, or Heidenhain controllers for machining.
- **NOT a multi-tenant SaaS** — It is designed for single-company deployment on-premise or in a private cloud.
- **NOT a replacement for all your tools** — It integrates with your existing CAD/CAM, ERP, and machine controllers by storing files and syncing data.

---

## 22. Summary: What MITRA Does in One Sentence

**MITRA is a single, integrated platform that manages the entire lifecycle of a precision mold — from the first customer enquiry to the final service call — with AI-powered insights, real-time project health tracking, and industrial-grade security.**

---

*Document Version: MITRA v3.2*  
*Date: 2025-06-20*  
*Total Backend Modules: 30*  
*Total Frontend Pages: 24*  
*Total Database Entities: 93*  
*Total Database Tables: 92*  
*AI Model: Microsoft Phi-3 (Local via Ollama)*  
*Target Users: 10-15, Concurrent: 3-5*  
*Deployment: Single-tenant, On-premise, Docker/Podman*
