# MITRA v3.1 — Design Specification

## Section 1: Formal Requirements Document

---

## 1. Executive Summary

MITRA v3.1 is the next-generation redesign of the company's internal Enterprise Resource Planning (ERP) and Manufacturing Execution System (MES) platform. The system serves 10–15 daily users across Blow Molds, Injection Molds, Toolroom, and CNC Manufacturing operations. The current v1.7 interface has been criticized for its generic, spreadsheet-like appearance, which lacks the visual authority expected of a modern industrial-grade manufacturing platform. The v3.1 redesign initiative directly addresses this gap by introducing an **Industrial AI Copilot persona**, a **real-time Manufacturing Hero Dashboard**, and **AI-powered deep-dive analytics** — all wrapped in a visually distinctive **Blue Holographic Theme**. This specification establishes the formal requirements, prioritization, and acceptance criteria that will guide the v3.1 build to achieve a target user experience rating of **9.8/10**.

This requirements document defines **Functional Requirements (FR-1 through FR-7+)**, **Non-Functional Requirements (NFR-1 through NFR-5+)**, and a **MoSCoW Prioritization** framework to ensure disciplined, testable, and user-centric delivery. The v3.1 scope is intentionally focused on empowering the existing internal user base — machine operators, toolroom engineers, production planners, and plant supervisors — through intelligent automation, faster data access, and real-time operational visibility. Features such as external customer portals, multi-tenant architectures, and mobile-native applications are **explicitly excluded** from this release to maintain delivery velocity and target fidelity. All requirements in this document are written to be measurable, with specific performance targets, refresh intervals, and response-time thresholds tied to manufacturing-floor realities.

---

## 2. MoSCoW Prioritization

The following features are prioritized using the MoSCoW method (Must have, Should have, Could have, Won't have). All items include their assigned feature identifier (F1–F10) for cross-reference with Functional and Non-Functional Requirements.

### 2.1 Must Have (Must)

These features are non-negotiable. Their absence would materially compromise the v3.1 redesign and prevent the target 9.8/10 experience rating.

| ID | Feature | Rationale |
|----|---------|-----------|
| **F1** | **Industrial AI Copilot Persona** | The central AI assistant must exhibit a consistent, industrial-grade visual identity — a technical-expert avatar with blue holographic styling, aligned with the brand identity. This is the primary differentiator from the generic v1.7 interface. |
| **F2** | **Manufacturing Hero Dashboard** | The main landing screen must provide a unified, real-time overview of all manufacturing KPIs (OEE, throughput, scrap rate, machine availability) with role-based data filtering for the 10–15 user base. |
| **F3** | **AI Search Animation** | The global search bar must feature a fluid, loading-aware animation (e.g., holographic scan-line, data-stream particles) that signals active AI processing and improves perceived performance. |
| **F4** | **Blue Holographic Theme** | A consistent visual system across all views: dark industrial base, electric blue accents, glassmorphism panels, and glowing data overlays. The theme must be enforced by the design system and not require per-page customization. |

### 2.2 Should Have (Should)

These features are important to the v3.1 value proposition but can be deferred to a follow-up sprint if delivery risk emerges.

| ID | Feature | Rationale |
|----|---------|-----------|
| **F5** | **BOM Analysis** | AI-powered Bill of Materials (BOM) analysis must detect anomalies, suggest substitutes, and flag material shortages based on current inventory and production schedules. |
| **F6** | **Drawing Analysis** | AI-powered engineering drawing analysis must extract dimensions, tolerances, and GD&T callouts from uploaded CAD/PDF drawings, auto-populating job cards and quality checklists. |
| **F7** | **Real-time Machine Status** | Live machine state telemetry (spindle load, feed rate, temperature, alarm status) must be ingested and displayed on the dashboard with sub-5-second latency. |

### 2.3 Could Have (Could)

These features are desirable but not essential to the 9.8/10 target. They are scheduled for inclusion only if Must and Should items are validated and capacity remains.

| ID | Feature | Rationale |
|----|---------|-----------|
| **F8** | **CNC/Toolroom Dedicated Dashboard** | A specialized dashboard for CNC operators and toolroom engineers, showing tool wear, tool offsets, calibration schedules, and job-queue prioritization. |
| **F9** | **Predictive Maintenance** | Machine-learning-based predictive maintenance alerts, using historical vibration/temperature/feed data to forecast bearing wear, coolant degradation, and spindle failure probability. |
| **F10** | **Advanced Workflow Analytics** | Deep-dive analytics module tracking job-card cycle times, operator efficiency, and bottleneck identification across Blow Molds, Injection Molds, and Toolroom workflows. |

### 2.4 Won't Have (Won't)

These features are explicitly excluded from the v3.1 scope to preserve scope discipline and delivery velocity.

| ID | Feature | Exclusion Rationale |
|----|---------|---------------------|
| **—** | **External Customer Portal** | Customer-facing functionality requires separate authentication, role management, and legal review (SLAs, data privacy). Deferred to a future release (v4.x). |
| **—** | **Multi-tenant Architecture** | The company operates a single internal instance. Multi-tenant isolation adds unnecessary complexity for 10–15 users. |
| **—** | **Mobile-native Application** | A responsive web experience is sufficient for the shop floor. Native iOS/Android apps are not justified by the current user base or device landscape. |

---

## 3. Functional Requirements

All functional requirements are uniquely identified (FR-1 through FR-7+), testable, and include User Stories in the Connextra format:

> **As a** [role], **I want** [capability], **so that** [benefit].

### FR-1: Industrial AI Copilot Persona

**Priority:** Must (F1)
**Owner:** UX/UI Lead / AI Engineering

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must present an AI Copilot interface with a consistent, industrial-grade persona. The persona is rendered as a technical-expert avatar (holographic blue avatar overlay) and must provide contextual guidance, natural-language query resolution, and proactive suggestions across all modules. |
| **Inputs** | User typed query (natural language); contextual page state (current module, selected job, user role); historical user interaction log. |
| **Outputs** | AI-generated response rendered in a chat-style panel; contextual action suggestions (e.g., "Open Job Card J-2047", "Show OEE trend for Line 3"); avatar animation state (idle, thinking, speaking). |
| **User Story** | *As a* production supervisor, *I want* to ask the Copilot "What is the bottleneck on Line 2 today?", *so that* I can take corrective action without navigating multiple reports. |
| **Constraints** | Persona must not interrupt critical workflows (e.g., during CNC program upload). Copilot panel must be collapsible and non-modal. |
| **Performance Target** | Copilot response time ≤ 2.5 seconds for 90th percentile of queries; avatar animation must render at ≥ 30 FPS. |

### FR-2: Manufacturing Hero Dashboard

**Priority:** Must (F2)
**Owner:** Frontend Engineering / Data Engineering

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must provide a unified, role-aware landing dashboard that aggregates real-time and near-real-time manufacturing KPIs. KPIs must be displayed using high-density, glanceable visualizations (cards, sparklines, gauges) suitable for a manufacturing floor environment. |
| **Inputs** | Machine telemetry (OPC-UA / MTConnect); MES job-state transitions; ERP inventory and schedule data; user role from Active Directory / local auth. |
| **Outputs** | Rendered dashboard grid with KPI cards: Overall Equipment Effectiveness (OEE), Planned vs. Actual Production, Scrap Rate, Machine Availability, Job Queue Depth, Average Cycle Time. |
| **User Story** | *As a* plant manager, *I want* to see at a glance which production line is underperforming, *so that* I can reallocate resources before the shift ends. |
| **Constraints** | Dashboard must respect role-based access control (RBAC) — operators see line-level data only; managers see plant-wide data. Must degrade gracefully if machine telemetry is offline. |
| **Performance Target** | Dashboard initial load ≤ 1.5 seconds; KPI refresh interval ≤ 5 seconds for live data; ≤ 60 seconds for scheduled data. |

### FR-3: AI Search Animation

**Priority:** Must (F3)
**Owner:** Frontend Engineering

| Attribute | Description |
|-----------|-------------|
| **Description** | The global search component must feature a real-time, animated feedback loop that signals to the user that AI processing is underway. The animation must align with the Blue Holographic Theme (e.g., scan-line sweep, data-particle stream, holographic pulse). |
| **Inputs** | User keystrokes in the global search bar; search query string; backend search status events (started, processing, results_ready, error). |
| **Outputs** | Visual animation state in the search bar; transition to results list; error-state animation (red pulse) if search fails. |
| **User Story** | *As a* toolroom engineer, *I want* the search bar to show a satisfying animation while it finds my drawing, *so that* I know the system is working and I am not tempted to re-type my query. |
| **Constraints** | Animation must not block input or consume > 10% of GPU on target client hardware (Intel i5, integrated graphics, 1080p). Must be suppressible via user preference. |
| **Performance Target** | Animation start latency ≤ 100 ms after keystroke; animation frame rate ≥ 30 FPS; total search result return ≤ 1.5 seconds for 90th percentile. |

### FR-4: Blue Holographic Theme

**Priority:** Must (F4)
**Owner:** UX/UI Lead

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must implement a comprehensive, design-system-driven visual theme: dark background (#0A0F1A), electric blue accent (#00B4FF), cyan highlight (#00E5FF), glassmorphism panel surfaces (backdrop-filter: blur), and subtle glow effects on active elements. All components must consume the theme from a centralized token system. |
| **Inputs** | Theme token definitions (CSS variables / design tokens); component library markup. |
| **Outputs** | Consistently themed UI across all pages, modals, dashboards, and printable reports. |
| **User Story** | *As a* machine operator, *I want* the system to look like a modern industrial control interface, *so that* I feel confident using it and can clearly distinguish active vs. inactive elements under harsh shop-floor lighting. |
| **Constraints** | Theme must pass WCAG 2.1 AA contrast ratios for all text/background pairings. Glow effects must not cause eye strain during 8-hour shifts (max brightness: 120 cd/m² equivalent on standard monitors). |
| **Performance Target** | Glassmorphism panels must not increase page load time by > 200 ms. Theme tokens must be loadable in ≤ 50 ms. |

### FR-5: BOM Analysis

**Priority:** Should (F5)
**Owner:** AI Engineering / ERP Integration

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must provide an AI-powered Bill of Materials (BOM) analysis module that ingests BOM hierarchies, cross-references current inventory levels, and surfaces anomalies: missing components, over-consumption trends, material shortage forecasts, and suggested alternative materials. |
| **Inputs** | BOM data (parent-child part hierarchy, quantities, units); inventory on-hand, on-order, and allocated quantities; historical consumption data; supplier lead times. |
| **Outputs** | Anomaly report (flagged items with severity: Critical, Warning, Info); shortage forecast chart; suggested substitute part list with confidence scores. |
| **User Story** | *As a* production planner, *I want* the system to automatically flag a potential steel shortage in next week's mold builds, *so that* I can place a purchase order before the line stops. |
| **Constraints** | AI suggestions must be marked as "Advisory Only" and require manual approval before any BOM modification is persisted to the ERP. Must not auto-procure materials. |
| **Performance Target** | BOM analysis for a 500-line BOM ≤ 3 seconds; anomaly report generation ≤ 5 seconds; refresh on inventory change ≤ 10 seconds. |

### FR-6: Drawing Analysis

**Priority:** Should (F6)
**Owner:** AI Engineering / Document Management

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must accept uploaded engineering drawings (PDF, DWG, DXF) and use AI computer vision to extract critical dimensions, tolerances, geometric dimensioning and tolerancing (GD&T) symbols, and surface finish callouts. Extracted data must auto-populate quality checklists and job-card setup sheets. |
| **Inputs** | Uploaded drawing file (PDF, DWG, DXF); drawing scale and unit metadata (if available). |
| **Outputs** | Extracted dimension table; highlighted GD&T callout list; auto-generated quality inspection checklist; confidence score per extraction. |
| **User Story** | *As a* quality inspector, *I want* the system to read a new injection mold drawing and pre-fill my inspection checklist, *so that* I save setup time and reduce data-entry errors. |
| **Constraints** | Extraction confidence < 85% must trigger manual review. The system must not overwrite existing, manually entered job-card data without explicit confirmation. |
| **Performance Target** | Drawing upload → extraction complete ≤ 15 seconds for a 5-page PDF; ≤ 30 seconds for a complex DWG. Extraction accuracy ≥ 90% for clearly printed dimensions. |

### FR-7: Real-time Machine Status

**Priority:** Should (F7)
**Owner:** Data Engineering / IoT Integration

| Attribute | Description |
|-----------|-------------|
| **Description** | The system must ingest and display live machine telemetry from CNC machines, injection molding presses, and toolroom equipment. Telemetry includes: machine state (Idle, Running, Alarm, Setup), spindle load, feed rate override, coolant temperature, alarm codes, and cycle counter. |
| **Inputs** | OPC-UA server data stream; MTConnect agent output; Modbus TCP registers (for legacy machines). |
| **Outputs** | Real-time machine status cards on the dashboard; historical trend charts (last 24 hours); alarm notification banner. |
| **User Story** | *As a* CNC operator, *I want* to see the spindle temperature of my lathe in real time, *so that* I can stop the cut before thermal expansion ruins the tolerance. |
| **Constraints** | Must support offline buffering — if network drops, data must be cached locally and backfilled on reconnection. Must not interfere with machine control systems (read-only from MES). |
| **Performance Target** | Telemetry latency from machine → dashboard ≤ 5 seconds; alarm propagation ≤ 2 seconds; dashboard refresh for 20 machines ≤ 500 ms. |

### FR-8: CNC / Toolroom Dedicated Dashboard

**Priority:** Could (F8)
**Owner:** Frontend Engineering

| Attribute | Description |
|-----------|-------------|
| **Description** | A specialized dashboard view tailored to CNC operators and toolroom engineers. Displays tool-life remaining, tool-offset history, next calibration due date, current job queue, and machine-specific work instructions. |
| **Inputs** | Tool management database (tool ID, life used, life max, offset values); calibration schedule; job queue from MES. |
| **Outputs** | Tool-life visualization (radial progress bars); job queue with drag-and-drop prioritization; calibration alert list. |
| **User Story** | *As a* toolroom engineer, *I want* to see which tools are nearing end-of-life and which jobs are queued for my CNC cell, *so that* I can plan my prep and avoid unplanned downtime. |
| **Constraints** | Drag-and-drop queue reordering must require supervisor approval. Tool-life data must be editable only by authorized personnel. |
| **Performance Target** | Dashboard load ≤ 1.5 seconds; tool-life update latency ≤ 10 seconds after machine cycle end. |

### FR-9: Predictive Maintenance

**Priority:** Could (F9)
**Owner:** Data Science / IoT Integration

| Attribute | Description |
|-----------|-------------|
| **Description** | A machine-learning module that analyzes historical telemetry (vibration, temperature, current draw) to predict component failures before they occur. Generates maintenance work orders with recommended actions and confidence intervals. |
| **Inputs** | Historical telemetry (minimum 90 days); maintenance log (past failures, repairs, replacements); machine model metadata. |
| **Outputs** | Predictive alert (e.g., "Spindle bearing failure predicted within 72 hours — 85% confidence"); auto-generated maintenance work order; recommended spare parts list. |
| **User Story** | *As a* maintenance manager, *I want* to be warned 3 days before a spindle bearing is likely to fail, *so that* I can schedule replacement during the next planned downtime instead of an emergency stop. |
| **Constraints** | Predictions must be labeled with confidence intervals. The system must not auto-shutdown machines. False positive rate must not exceed 15%. |
| **Performance Target** | Model inference time per machine ≤ 2 seconds; prediction refresh frequency ≤ 1 per hour. |

### FR-10: Advanced Workflow Analytics

**Priority:** Could (F10)
**Owner:** Data Engineering / BI

| Attribute | Description |
|-----------|-------------|
| **Description** | A reporting module that provides deep-dive analytics on manufacturing workflows: job-card cycle time variance, operator efficiency ratings, bottleneck identification by station, and shift-over-shift comparison. |
| **Inputs** | MES job-state timestamps; operator logins; quality inspection results; machine utilization data. |
| **Outputs** | Interactive charts (cycle time trend, bottleneck heat map, efficiency leaderboard); downloadable CSV/PDF reports. |
| **User Story** | *As a* continuous improvement engineer, *I want* to see which job stations are consistently slowing down the mold build process, *so that* I can target training or tooling investment. |
| **Constraints** | Operator efficiency data must be anonymized in shared reports to comply with labor policies. Raw data exports must be restricted to supervisor+ roles. |
| **Performance Target** | Report generation for a 30-day window ≤ 5 seconds; chart interactivity (filter, drill-down) ≤ 500 ms. |

---

## 4. Non-Functional Requirements

All non-functional requirements are uniquely identified (NFR-1 through NFR-5+) and include measurable, testable targets.

### NFR-1: Performance

**ID:** NFR-1
**Category:** Performance
**Priority:** Must

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must deliver responsive performance across all user interactions, with strict upper bounds on page load, data refresh, and search latency. |
| **R1.1** | Initial dashboard load (time to first meaningful paint) must be ≤ 1.5 seconds on a corporate LAN (latency ≤ 20 ms). |
| **R1.2** | Search result return time must be ≤ 1.5 seconds for 90th percentile of queries against a 100,000-record dataset. |
| **R1.3** | Real-time KPI refresh interval must be ≤ 5 seconds for live machine telemetry. |
| **R1.4** | AI Copilot query response time must be ≤ 2.5 seconds for 90th percentile of natural-language queries. |
| **R1.5** | Client-side animation frame rate (search animation, holographic effects) must be ≥ 30 FPS on target hardware (Intel i5, integrated graphics, 1080p). |
| **Measurement** | Automated synthetic monitoring (Grafana k6 / Lighthouse CI); real-user monitoring (RUM) via JavaScript performance APIs. |

### NFR-2: Scalability

**ID:** NFR-2
**Category:** Scalability
**Priority:** Must

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must support the current user base and data volume with headroom for 3x growth without architectural redesign. |
| **R2.1** | Concurrent user support: must support 15 simultaneous users with peak load of 50 concurrent sessions (including read-only kiosk views). |
| **R2.2** | Data volume: must handle 5 years of historical MES/ERP data (estimated 2 million job records, 10 million telemetry points) without query degradation. |
| **R2.3** | Machine telemetry ingestion: must support ingestion of 20 machines × 10 metrics/second = 200 metrics/second with ≤ 5-second end-to-end latency. |
| **R2.4** | Horizontal scaling: database read replicas must be deployable without application code changes. |
| **Measurement** | Load testing with simulated 50 concurrent users; database query performance benchmarks on 5-year dataset. |

### NFR-3: Security

**ID:** NFR-3
**Category:** Security
**Priority:** Must

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must protect manufacturing data, intellectual property (drawings, BOMs), and operational integrity through defense-in-depth security controls. |
| **R3.1** | Authentication: all users must authenticate via corporate Active Directory (LDAP/SAML 2.0) or local multi-factor authentication (MFA). No anonymous access. |
| **R3.2** | Authorization: role-based access control (RBAC) must enforce least privilege — operator, engineer, supervisor, manager, admin roles with module-level and data-level granularity. |
| **R3.3** | Data encryption: all data at rest must use AES-256; all data in transit must use TLS 1.3. |
| **R3.4** | Audit logging: all create, update, delete operations must be logged with user ID, timestamp, IP address, and before/after state. Logs must be retained for 7 years. |
| **R3.5** | Drawing/BOM access: downloads of engineering drawings and BOM exports must require explicit supervisor approval and be watermarked with user ID and timestamp. |
| **Measurement** | Annual penetration testing; quarterly access control review; automated vulnerability scanning (OWASP ZAP). |

### NFR-4: Availability & Reliability

**ID:** NFR-4
**Category:** Reliability
**Priority:** Must

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must be highly available during production hours and must recover gracefully from component failures. |
| **R4.1** | Uptime: ≥ 99.5% availability during production hours (06:00–22:00, 7 days/week). |
| **R4.2** | Planned maintenance windows must be ≤ 4 hours/month and announced 72 hours in advance. |
| **R4.3** | Telemetry ingestion must be resilient: if the primary data pipeline fails, the system must switch to a local buffer queue and backfill when the pipeline recovers. |
| **R4.4** | No single point of failure for the dashboard rendering layer (load balancer + 2+ application servers). |
| **Measurement** | Uptime monitoring via heartbeat checks; disaster recovery drill every 6 months. |

### NFR-5: Accessibility

**ID:** NFR-5
**Category:** Accessibility
**Priority:** Must

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must be usable by all employees, including those with visual, motor, or cognitive impairments, in compliance with WCAG 2.1 Level AA. |
| **R5.1** | All interactive elements must be keyboard-navigable (Tab order, Enter/Space activation, Escape to close). |
| **R5.2** | Color must not be the sole means of conveying information — status indicators must include text labels or iconography. |
| **R5.3** | Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text and UI components. |
| **R5.4** | Screen reader compatibility: all images, charts, and icons must have descriptive alt text or ARIA labels. |
| **R5.5** | Focus indicators must be visible on all interactive elements (minimum 2 px outline or color shift). |
| **Measurement** | Automated testing (axe-core, Lighthouse); manual screen reader testing (NVDA, JAWS); annual third-party accessibility audit. |

### NFR-6: Maintainability

**ID:** NFR-6
**Category:** Maintainability
**Priority:** Should

| Attribute | Requirement |
|-----------|-------------|
| **Description** | The system must be maintainable by the internal IT team with minimal external dependency. |
| **R6.1** | All code must be version-controlled (Git) with documented branching strategy (GitFlow or trunk-based). |
| **R6.2** | API documentation must be auto-generated (OpenAPI/Swagger) and kept current with every release. |
| **R6.3** | Deployment must be automated via CI/CD pipeline (GitHub Actions / Azure DevOps) with blue-green or rolling deployment to minimize downtime. |
| **R6.4** | Third-party AI/model dependencies must be pinned to specific versions with documented rollback procedures. |
| **Measurement** | Code review coverage; CI/CD pipeline success rate; mean time to deploy a hotfix. |

---

## 5. Acceptance Criteria Matrix

The following matrix defines acceptance criteria using the **Given-When-Then** format for each requirement. Criteria are derived from the Functional and Non-Functional Requirements above and are linked to their MoSCoW priority.

| ID | Requirement | Given | When | Then | Priority |
|----|-------------|-------|------|------|----------|
| **AC-1** | FR-1: Industrial AI Copilot Persona | The user is on any authenticated page and the Copilot panel is open | The user types a natural-language query (e.g., "Show me today's OEE") | The Copilot responds within 2.5 seconds with a relevant answer, a contextual action button, and the avatar plays a "thinking" animation followed by a "speaking" animation. | **Must** |
| **AC-2** | FR-2: Manufacturing Hero Dashboard | The user logs in with a valid role (e.g., Plant Manager) | The user navigates to the Home/Dashboard page | The dashboard loads in ≤ 1.5 seconds, displays all relevant KPIs for the user's role, and refreshes live data every 5 seconds. | **Must** |
| **AC-3** | FR-2: Role-Based Filtering | The user logs in as an Operator (not a Manager) | The user views the dashboard | The dashboard displays only the production lines assigned to that operator; plant-wide KPIs are hidden. | **Must** |
| **AC-4** | FR-3: AI Search Animation | The user is on any page and clicks the global search bar | The user types 3+ characters and pauses for 300 ms | A holographic scan-line animation begins within 100 ms, runs at ≥ 30 FPS, and transitions smoothly to the results list when data arrives. | **Must** |
| **AC-5** | FR-4: Blue Holographic Theme | The user navigates to any module (Dashboard, BOM, Search, etc.) | The page renders | All components use the centralized theme tokens: dark background (#0A0F1A), blue accent (#00B4FF), cyan highlight (#00E5FF), and glassmorphism panels. Contrast ratios pass WCAG 2.1 AA. | **Must** |
| **AC-6** | FR-5: BOM Analysis | A BOM with ≥ 50 lines is loaded and inventory data is available | The user clicks "Analyze BOM" | The system returns an anomaly report within 5 seconds, flags items with Critical/Warning/Info severity, and suggests substitutes with confidence scores. | **Should** |
| **AC-7** | FR-5: BOM Advisory Safety | The user views an AI-suggested material substitution | The user attempts to auto-apply the substitution | The system displays a confirmation dialog stating "Advisory Only — Requires Manual Approval" and does not persist changes without explicit confirmation. | **Should** |
| **AC-8** | FR-6: Drawing Analysis | The user uploads a 5-page PDF engineering drawing | The upload completes | The system extracts dimensions, GD&T callouts, and surface finish data within 15 seconds, populates the inspection checklist, and marks items with confidence < 85% for manual review. | **Should** |
| **AC-9** | FR-7: Real-time Machine Status | A CNC machine is running a job and telemetry is active | 30 seconds elapse | The dashboard shows the machine state as "Running", displays the current spindle load, feed rate, and coolant temperature, and all values are within 5 seconds of real time. | **Should** |
| **AC-10** | FR-7: Alarm Propagation | A CNC machine triggers an alarm (e.g., spindle overload) | The alarm is raised | The alarm appears on the dashboard notification banner within 2 seconds, with the machine ID, alarm code, and timestamp. | **Should** |
| **AC-11** | FR-8: CNC/Toolroom Dashboard | The user is logged in as a Toolroom Engineer | The user navigates to the CNC/Toolroom Dashboard | The page loads in ≤ 1.5 seconds, shows tool-life progress bars, job queue, and calibration alerts with data no older than 10 seconds. | **Could** |
| **AC-12** | FR-9: Predictive Maintenance | 90 days of machine telemetry and maintenance history are available | The predictive model runs its hourly inference cycle | The system generates a maintenance alert (e.g., "Spindle bearing predicted failure in 72 hours — 85% confidence") and auto-creates a draft work order. | **Could** |
| **AC-13** | FR-10: Advanced Workflow Analytics | The user selects a 30-day reporting window and a workflow (e.g., Blow Molds) | The user clicks "Generate Report" | The report renders within 5 seconds, displays an interactive bottleneck heat map, and allows drill-down to individual job cards. | **Could** |
| **AC-14** | NFR-1: Performance — Dashboard Load | A standard client (Intel i5, integrated graphics, 1080p, Chrome) accesses the dashboard | The user initiates a page load | The time to first meaningful paint is ≤ 1.5 seconds, confirmed by Lighthouse CI over 10 consecutive runs. | **Must** |
| **AC-15** | NFR-1: Performance — Search Latency | The global search index contains 100,000 records | The user types a 5-character query | Results are returned within 1.5 seconds for 90% of queries, measured via synthetic monitoring. | **Must** |
| **AC-16** | NFR-2: Scalability — Concurrent Users | The system is under a synthetic load test | 50 concurrent users perform dashboard load, search, and BOM view operations simultaneously | All response times remain within NFR-1 thresholds; no HTTP 5xx errors occur. | **Must** |
| **AC-17** | NFR-3: Security — Authentication | An unauthenticated user attempts to access the dashboard | The user enters the dashboard URL | The system redirects to the corporate login page (AD/SAML) and denies access. | **Must** |
| **AC-18** | NFR-3: Security — RBAC | A user with "Operator" role attempts to access the Predictive Maintenance module | The user clicks the Predictive Maintenance menu item | The system displays a 403 Forbidden message and logs the access attempt with user ID, timestamp, and IP address. | **Must** |
| **AC-19** | NFR-3: Security — Drawing Watermark | A supervisor approves a drawing download | The user downloads the PDF | The downloaded PDF contains a visible watermark: user ID, timestamp, and "MITRA INTERNAL — CONFIDENTIAL". | **Must** |
| **AC-20** | NFR-4: Availability — Uptime | The system is monitored during production hours (06:00–22:00) over a 30-day period | The monitoring system records uptime | The measured uptime is ≥ 99.5%, excluding announced maintenance windows. | **Must** |
| **AC-21** | NFR-4: Availability — Telemetry Resilience | The primary OPC-UA data pipeline is intentionally disconnected | 5 minutes pass | The local buffer continues to collect machine data; when the pipeline reconnects, all buffered data is backfilled with correct timestamps. | **Must** |
| **AC-22** | NFR-5: Accessibility — Keyboard Navigation | A user navigates the dashboard using only the keyboard | The user presses Tab, Enter, and Escape | All interactive elements receive visible focus; modal dialogs close on Escape; no mouse-only interactions are required. | **Must** |
| **AC-23** | NFR-5: Accessibility — Color Independence | A user views a status indicator (e.g., machine alarm) | The indicator is rendered | The alarm status is conveyed by both color (red) and a text label (e.g., "ALARM") or an icon with an ARIA label. | **Must** |
| **AC-24** | NFR-6: Maintainability — CI/CD Deployment | A developer pushes a hotfix to the release branch | The CI/CD pipeline triggers | The pipeline completes automated tests, builds the release, and deploys via rolling update with zero downtime. Deployment time ≤ 15 minutes. | **Should** |

---

*Document Version: 3.1.0*
*Status: Draft for Review*
*Last Updated: 2025-06-02*
*Author: Requirements Engineering — MITRA v3.1 Project*
*Next Review: Design Specification Section 2 (System Architecture)*
