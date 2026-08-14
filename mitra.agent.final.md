# MITRA v3.1 Design Specification & Implementation Roadmap

**Date:** 2026-06-20
**Version:** 1.0
**Audience:** Engineering team, product stakeholders
**Domain:** Blow Molds, Injection Molds, Toolroom, CNC Manufacturing
**User Base:** 10–15 internal users

---

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


---

# MITRA v3.1 — Design Specification

## Section 2: Visual Design Direction

**Version:** 3.1
**Date:** 2025-06-06
**Status:** Draft — Pending Design Review
**Owner:** Design / Engineering

---

## 2.1 Design Philosophy

MITRA v3.1 abandons the generic, consumer-SaaS aesthetic of v1.7 in favor of a disciplined **engineering workstation** visual language. The interface must communicate precision, industrial authority, and operator trust — not playful accessibility. Every surface, shadow, and pixel serves the goal of reducing cognitive load in high-throughput CNC manufacturing, blow mold, injection mold, and toolroom environments. The design treats the operator as a trained technician, not a casual consumer.

The "Industrial AI Copilot" persona is expressed through a **blue holographic** visual metaphor: deep, atmospheric blues evoke the controlled environment of a precision shop floor, while cyan accents suggest real-time telemetry and machine-state visualization. Interface elements feel like machined components — tight tolerances, high contrast, zero decorative excess. Glassmorphism is used sparingly and only where it supports depth hierarchy (hero widgets, copilot panels), never as gratuitous visual noise. The overall tone is **calm under pressure**: information density is high, but the visual system prevents fatigue through disciplined rhythm, consistent spatial logic, and restrained color application.

---

## 2.2 Color System

All colors are specified as hex values and carry strict usage rules. Deviations require design review sign-off.

| Token | Hex | Usage | Rule |
|---|---|---|---|
| `--color-bg-deep` | `#0A192F` | Application background, dark canvas | Use for all top-level chrome, sidebar, and global navigation backgrounds. Never use pure black (`#000000`). |
| `--color-bg-surface` | `#112240` | Card backgrounds, panel surfaces, modals | Primary surface for data containers, form sections, and secondary panels. |
| `--color-bg-elevated` | `#233554` | Hover states, active selections, tertiary surfaces, borders | Use for row hovers in tables, selected list items, and subtle structural borders. |
| `--color-accent-primary` | `#64FFDA` | Primary interactive accents, active indicators, AI copilot chrome, focus rings | Use for primary CTAs, active tab underlines, and copilot panel borders. Minimum 3:1 contrast against `#112240`. |
| `--color-accent-secondary` | `#00B4D8` | Secondary interactive elements, live telemetry, real-time data streams | Use for live graphs, streaming indicators, and secondary action buttons. |
| `--color-status-success` | `#2ECC71` | Machine OK, process running, task completed, healthy telemetry | Use for status badges, trend-up arrows, and confirmation toasts. |
| `--color-status-warning` | `#F39C12` | Attention required, non-critical alert, queued state, maintenance due | Use for warning banners, paused job indicators, and amber status rings. |
| `--color-status-error` | `#E74C3C` | Critical fault, machine down, safety alert, failed operation | Use for error banners, emergency stop indicators, and red status rings. Never use for decorative text. |
| `--color-neutral-100` | `#E6F1FF` | Primary text on dark backgrounds, headings, key labels | White-tinted blue prevents clinical sterility. Body text must remain fully legible. |
| `--color-neutral-200` | `#8892B0` | Secondary text, metadata, disabled states, placeholders | Captions, timestamps, helper text, inactive navigation. |
| `--color-neutral-300` | `#495670` | Structural borders, dividers, inactive track backgrounds | Used for table borders, card separators, and input field borders in default state. |

### Color Usage Rules

1. **Background hierarchy:** Deep → Surface → Elevated. Never skip a level in the hierarchy (e.g., do not place a `#233554` card directly on `#0A192F` without a `#112240` container).
2. **Accent discipline:** `#64FFDA` must not occupy more than 5% of the viewport at any time. It is a signal, not a surface.
3. **Status color isolation:** Status colors (green, amber, red) are reserved exclusively for telemetry and operational state. They must not be used for branding, decorative icons, or non-semantic UI elements.
4. **Text on surfaces:** Primary text (`#E6F1FF`) on Surface (`#112240`) meets WCAG AA for large text and AA for normal text. Secondary text (`#8892B0`) is exempt from AA normal text but must still be legible at 100% zoom on a calibrated monitor.
5. **Border rule:** All structural borders use `#495670` at 1px. Elevation is communicated via shadow and background shift, not border darkening.

---

## 2.3 Typography Scale

The type system is engineered for technical legibility. Monospace fonts are used for all data-dense and numeric contexts to reinforce the industrial workstation identity and ensure tabular alignment.

### Font Families

| Role | Font | Fallback Stack | Notes |
|---|---|---|---|
| Headlines | `Inter` | `system-ui, -apple-system, sans-serif` | Geometric, high x-height, excellent for UI at scale. |
| Technical Headlines | `Roboto Mono` | `ui-monospace, monospace` | Optional monospace variant for H1/H2 in purely technical views (e.g., G-code previews, diagnostics). |
| Body | `Inter` | `system-ui, -apple-system, sans-serif` | Same family as headlines for cohesion. |
| Data / Numbers | `JetBrains Mono` | `SF Mono, Roboto Mono, ui-monospace, monospace` | Tabular figures (`font-variant-numeric: tabular-nums`) are mandatory for all numeric columns. |

### Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `--type-hero` | `48px` | `1.1` | `700` (Bold) | `-0.5px` | Hero KPI numerals, machine readouts, primary dashboard metrics. |
| `--type-h1` | `32px` | `1.2` | `600` (Semibold) | `-0.3px` | Page titles, primary section headers. |
| `--type-h2` | `24px` | `1.3` | `600` (Semibold) | `-0.2px` | Panel titles, widget headers, card titles. |
| `--type-h3` | `18px` | `1.4` | `600` (Semibold) | `-0.1px` | Sub-section headers, table column titles, form group labels. |
| `--type-body` | `14px` | `1.6` | `400` (Regular) | `0` | Primary body text, descriptions, table cell content, form inputs. |
| `--type-caption` | `12px` | `1.5` | `400` (Regular) | `0.2px` | Metadata, timestamps, helper text, badge labels, unit labels on KPIs. |

### Typography Rules

1. **Monospace enforcement:** All numeric data (OEE, spindle RPM, temperature, cycle count, dimensional tolerances) must render in `JetBrains Mono` with `font-variant-numeric: tabular-nums`. This prevents column jitter in tables and aligns decimal points.
2. **Hero numerals:** The 48px hero size is reserved exclusively for primary dashboard KPIs and large machine-state readouts. Do not use for marketing copy or non-data text.
3. **Line height discipline:** Headlines use tight line heights (`1.1–1.3`) to prevent excessive vertical spacing in dense layouts. Body text uses a relaxed `1.6` for readability in paragraphs and table cells.
4. **Case convention:** UI labels and headings use Sentence case. All-caps is reserved for 12px caption badges and status labels only.
5. **Anti-aliasing:** Apply `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` globally to prevent muddy text on dark backgrounds.

---

## 2.4 Component Styles

### 2.4.1 AI Copilot Panel

The copilot is a persistent, collapsible side panel (or floating overlay on mobile) that embodies the "holographic" identity. It must feel like a machine interface, not a chatbot.

| Property | Specification |
|---|---|
| **Background** | `linear-gradient(135deg, rgba(17, 34, 64, 0.95) 0%, rgba(10, 25, 47, 0.98) 100%)` |
| **Border** | `1px solid rgba(100, 255, 218, 0.3)` |
| **Border Radius** | `12px` |
| **Shadow** | `0 0 24px rgba(100, 255, 218, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4)` |
| **Padding** | `24px` |
| **Width** | `360px` (desktop); `100vw` (mobile, full-screen overlay) |
| **Glow Effect** | `box-shadow: inset 0 0 60px rgba(100, 255, 218, 0.04);` — subtle inner glow creating a "lit from within" effect |
| **Avatar** | Abstract, non-figurative. A pulsing cyan ring (`64px` diameter, `2px` stroke, `#64FFDA` at 60% opacity) with a slow radial gradient center (`rgba(100, 255, 218, 0.2)`). No cartoon face, no robot illustration. Pulse: `animation: pulse-glow 3s ease-in-out infinite;` |
| **Typography** | Copilot responses in `--type-body` (`14px`, `Inter`, `#E6F1FF`). User prompts in `--type-body` with `#8892B0`. |
| **Input Field** | Background `#0A192F`, border `1px solid #495670`, focus border `#64FFDA`, border-radius `8px`, padding `12px 16px`. |
| **Suggested Prompt Chips** | Background `#233554`, border `1px solid #495670`, border-radius `20px`, padding `6px 14px`, `--type-caption` (`12px`), hover: border `#64FFDA` at 50% opacity. |

**Behavior:** When the copilot is actively processing, the border opacity animates from `0.3` to `0.6` and the avatar ring pulse speed increases. When idle, the glow subsides to a steady, low-energy state.

---

### 2.4.2 Hero Widgets

Hero widgets are the primary information surfaces on the dashboard. They present machine-state KPIs at a glance and must be scannable from across a shop floor.

| Property | Specification |
|---|---|
| **Background** | `rgba(17, 34, 64, 0.6)` with `backdrop-filter: blur(12px)` — controlled glassmorphism |
| **Border** | `1px solid rgba(73, 86, 112, 0.5)` |
| **Border Radius** | `16px` |
| **Padding** | `24px` |
| **Shadow** | `0 4px 24px rgba(0, 0, 0, 0.3)` |
| **Width** | `4 of 12 columns` on desktop (`~calc(33.333% - 16px)` accounting for gap); `6 of 12` on tablet; `12 of 12` on mobile |

#### Hero Widget Internal Structure

| Element | Style |
|---|---|
| **Label** | `--type-caption` (`12px`, `#8892B0`, `Inter`), top-left, uppercase optional |
| **Value** | `--type-hero` (`48px`, `JetBrains Mono`, `#E6F1FF`, `font-variant-numeric: tabular-nums`), centered or left-aligned |
| **Unit** | `--type-caption` (`12px`, `#8892B0`), inline with value, baseline-aligned, `4px` left margin |
| **Trend Indicator** | Small arrow icon (`12px`) + percentage. Up = `#2ECC71`, Down = `#E74C3C`, Flat = `#8892B0`. Positioned below value or inline-right. |
| **Status Ring** | A `4px` circular SVG progress ring around the value or as a top-right badge. Colors: `#2ECC71` (Running/OK), `#F39C12` (Idle/Warning), `#E74C3C` (Fault/Stopped). Ring stroke opacity: `0.8` for active, `0.3` for inactive. |
| **Secondary Line** | Optional `--type-caption` (`12px`, `#8892B0`) below trend, e.g., "Last updated: 14:02:33" |

**Example layout:**
```
┌────────────────────────────┐
│  OEE (OVERALL)             │  ← Label, 12px, #8892B0
│                            │
│  ████████████  87.4%       │  ← Status ring (green, 87.4% fill)
│                            │
│  ▲ 2.3% vs yesterday       │  ← Trend, 12px, #2ECC71
│  Last cycle: 14:02:33      │  ← Secondary line, 12px, #8892B0
└────────────────────────────┘
```

**Glassmorphism rule:** Backdrop blur is fixed at `12px`. Do not exceed `20px` (excessive blur destroys context) or go below `8px` (insufficient depth separation). Background opacity must stay between `0.5` and `0.7` to maintain text legibility.

---

### 2.4.3 Search Animation Overlay

The global search is a full-screen takeover that activates via keyboard shortcut (`Cmd+K` / `Ctrl+K`) or a persistent top-bar search icon. It is designed to feel like querying a machine database, not a web search engine.

| Property | Specification |
|---|---|
| **Overlay Background** | `rgba(10, 25, 47, 0.92)` with `backdrop-filter: blur(8px)` |
| **Entry Animation** | `opacity: 0 → 1` over `200ms` ease-out; background blur animates from `0px` to `8px` over `300ms` |
| **Exit Animation** | `opacity: 1 → 0` over `150ms` ease-in; blur fades to `0px` |
| **Modal Container** | Max-width `720px`, centered horizontally, `48px` from top edge, background transparent (no container box — the search field floats on the overlay) |

#### Search Input Field

| Property | Specification |
|---|---|
| **Background** | Transparent (`rgba(0,0,0,0)`) |
| **Border** | `2px solid #64FFDA` at `40%` opacity, focus state: `100%` opacity |
| **Border Radius** | `12px` |
| **Padding** | `20px 24px` |
| **Typography** | `--type-h2` (`24px`, `Inter`, `#E6F1FF`) for input text; placeholder `#8892B0` |
| **Prefix Icon** | Magnifying glass, `20px`, `#8892B0`, `16px` left padding |
| **Suffix** | "ESC to close" caption, `12px`, `#8892B0`, `16px` right padding |

#### Animated Waveform

Below the input field, an animated waveform visualization provides feedback that the system is "listening" or indexing.

| Property | Specification |
|---|---|
| **Height** | `40px` |
| **Color** | `rgba(100, 255, 218, 0.4)` idle; `rgba(100, 255, 218, 0.8)` active typing |
| **Style** | 32 vertical bars (`2px` width, `4px` gap), heights randomized via Perlin-like noise, smoothed. Bars animate at `15fps` with a gentle undulating wave pattern. |
| **Position** | Centered below input field, `24px` margin-top |

#### Typing Effect

As the user types, the AI copilot generates a live-response preview below the waveform using a character-by-character reveal.

| Property | Specification |
|---|---|
| **Typography** | `--type-body` (`14px`, `Inter`, `#E6F1FF`) |
| **Effect** | Characters appear at `20ms` intervals per character, staggered by word. Cursor: a blinking `2px` vertical bar (`#64FFDA`), `1s` blink cycle. |
| **Background** | None — text floats on the dark overlay. |
| **Max Lines** | `6` lines before scrolling; overflow handled with a subtle `fade-out` gradient at the bottom `40px` |

#### Cancel / Resume Controls

| Property | Specification |
|---|---|
| **Cancel** | Icon: square stop icon (`14px`), color `#E74C3C`. Position: inline-right of the waveform. Action: halts the typing animation and replaces the preview with "Search paused." |
| **Resume** | Icon: play triangle (`14px`), color `#2ECC71`. Appears only when search is paused. Action: resumes typing animation from the halted character index. |
| **Keyboard Shortcuts** | `Esc` → Cancel / Close overlay. `Enter` → Submit full search. `↑/↓` → Navigate results list. |

**Results List:** Below the typing area, a list of up to `5` results. Each result is a `72px` tall row with `16px` horizontal padding, `#112240` background on hover, `1px` bottom border `#495670`. Selected result: left border `3px solid #64FFDA`, background `#233554`.

---

## 2.5 Layout Grid

The layout system is built on a 12-column fluid grid. All spacing values are derived from a `4px` base unit (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).

### Desktop (≥ 1440px)

| Property | Value |
|---|---|
| **Grid Columns** | 12 |
| **Column Width** | Fluid (`100% / 12`) |
| **Gutter** | `24px` |
| **Page Margin** | `32px` (left and right) |
| **Max Content Width** | `1440px`, centered |
| **Hero Widget Span** | 4 columns each (`33.333%` minus gutter compensation) |
| **Section Padding** | `32px` top/bottom between major sections |
| **Card Gap** | `24px` between adjacent cards/widgets |

### Tablet (768px – 1439px)

| Property | Value |
|---|---|
| **Grid Columns** | 12 (retained for consistency, but often behaves as 6 effective units) |
| **Gutter** | `16px` |
| **Page Margin** | `24px` |
| **Hero Widget Span** | 6 columns each (`50%`) |
| **Card Gap** | `16px` |
| **Copilot Panel** | Collapses to a `48px` floating action button (FAB) in bottom-right; panel opens as a `400px` overlay from the right edge. |

### Mobile (< 768px)

| Property | Value |
|---|---|
| **Grid Columns** | 4 (simplified from 12 for mental model clarity) |
| **Gutter** | `16px` |
| **Page Margin** | `16px` |
| **Hero Widget Span** | 4 columns full-width (`100%`) — stacked vertically |
| **Card Gap** | `16px` |
| **Copilot Panel** | Full-screen overlay (`100vw × 100vh`), slide-up animation from bottom. Input field pinned to bottom. |
| **Search Overlay** | Full-screen, input field at top with `16px` margin, results fill remainder. |
| **Typography** | Hero numerals scale down to `36px` to prevent overflow. H1 → `28px`, H2 → `22px`. |

### Grid Rules

1. **No fractional columns:** Widgets must align to integer column boundaries. Do not create 5-column or 7-column custom spans; use the 12-column math (e.g., `span 8 + span 4`, not `span 5 + span 7`).
2. **Consistent gutters:** The `24px` desktop gutter is sacred. Do not shrink it to save space in dense dashboards — use the card internal padding instead.
3. **Vertical rhythm:** All vertical spacing must be a multiple of `8px`. Section breaks are `32px` or `48px`. Never use arbitrary `17px` or `23px` margins.
4. **Breakpoint logic:** At `1440px`, the grid locks to a centered `1440px` max-width. Between `768px` and `1439px`, the grid is fluid with `24px` margins. Below `768px`, the grid is fluid with `16px` margins.
5. **Z-index stacking:** The copilot panel (`z-index: 100`), search overlay (`z-index: 200`), and emergency alerts (`z-index: 300`) must maintain this hierarchy at all times. No other element exceeds `z-index: 50`.

---

## 2.6 Summary of Key Specifications

| Category | Key Value | Token |
|---|---|---|
| Deepest Background | `#0A192F` | `--color-bg-deep` |
| Primary Accent | `#64FFDA` | `--color-accent-primary` |
| Hero Type | `48px / JetBrains Mono / 700` | `--type-hero` |
| Body Type | `14px / Inter / 400` | `--type-body` |
| Hero Widget Background | `rgba(17,34,64,0.6) + blur(12px)` | — |
| Copilot Border | `1px solid rgba(100,255,218,0.3)` | — |
| Desktop Page Margin | `32px` | — |
| Desktop Gutter | `24px` | — |
| Mobile Breakpoint | `< 768px` | — |

---

**End of Section 2**


---

# Section 3: Implementation Roadmap

## MITRA v3.1 — Design Specification Document

**Version:** 3.1 → 3.4+
**Team Size:** 4.5 FTE (1 Frontend, 1 Backend, 1 AI/ML, 1 QA, 0.5 Product Designer)
**Current System Rating:** 9.4/10
**Target System Rating:** 9.8/10
**Industry:** Industrial Manufacturing (Blow Molds, Injection Molds, Toolroom, CNC Manufacturing)
**User Base:** 10–15 internal users

---

## Overview

This roadmap defines the phased implementation strategy to evolve MITRA from its current v3.1 baseline (rated 9.4/10) to a 9.8+ rated platform. The plan is structured across three phases spanning 16 weeks, with each phase delivering incremental value while managing resource constraints and technical risks. The sequencing prioritizes foundational UI/UX improvements first, followed by AI-driven intelligence capabilities, and finally operational domain-specific enhancements.

The roadmap assumes a 4.5-person team with no additional headcount. Work is sequenced to avoid parallel high-risk streams and to ensure QA coverage at each phase boundary.

---

## Phase 1: Foundation (v3.1 → v3.2) — Weeks 1–4

**Objective:** Elevate the user experience through brand consistency, AI interaction refinement, and visual modernization. Establish the design system and component library that subsequent phases will leverage.

**Target Score:** 9.4 → 9.6

### Week 1: Brand Language Audit & AI Persona Copy Replacement (F1)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Comprehensive audit of all user-facing copy | Product Designer (0.5 FTE) | 3 days | — |
| Define MITRA brand voice guidelines (professional, precise, manufacturing-focused) | Product Designer | 2 days | Audit complete |
| Replace generic AI persona copy with domain-specific language | Frontend Engineer | 4 days | Guidelines ready |
| Review and approve all copy changes | Product Designer + QA | 1 day | Frontend delivery |

**Key Deliverable:** F1 — AI Persona Copy Refinement
**Risk:** Low. Primarily editorial work with clear acceptance criteria.

### Week 2: Hero Dashboard Widget Development (F2)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Design hero widget wireframes and mockups | Product Designer | 3 days | F1 style guide |
| Implement hero widget component (React/Vue) | Frontend Engineer | 4 days | Designs approved |
| Backend API endpoints for widget data aggregation | Backend Engineer | 3 days | Frontend contract |
| Widget integration and initial QA | QA Engineer | 2 days | Frontend + Backend ready |

**Key Deliverable:** F2 — Hero Dashboard Widget
**Risk:** Low-Medium. Requires backend aggregation logic; mitigated by clear data contracts.

### Week 3: Search Animation States & Streaming UI (F3)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Design search interaction states (loading, streaming, complete, error) | Product Designer | 2 days | — |
| Implement animation framework and state transitions | Frontend Engineer | 4 days | Designs approved |
| Streaming response handler for real-time search results | Backend Engineer | 3 days | Frontend contract |
| End-to-end search flow testing | QA Engineer | 2 days | Implementation complete |

**Key Deliverable:** F3 — Search Animation & Streaming UI
**Risk:** Medium. Streaming UI requires careful handling of partial data states and error boundaries.

### Week 4: Blue Holographic Theme Implementation & QA

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Implement blue holographic theme (CSS variables, component overrides) | Frontend Engineer | 4 days | F1–F3 stable |
| Theme toggle and accessibility compliance (contrast ratios) | Frontend Engineer | 2 days | Theme base |
| Comprehensive QA regression suite (all F1–F4 features) | QA Engineer | 3 days | All features ready |
| Bug fixes and stabilization | All Engineers | 2 days | QA feedback |
| v3.2 release preparation and deployment | Backend Engineer | 1 day | QA sign-off |

**Key Deliverable:** F4 — Blue Holographic Theme + v3.2 Release
**Risk:** Low. Visual theme work with established component library.

### Phase 1 Exit Criteria

- [ ] All F1–F4 features deployed to production
- [ ] QA sign-off with zero critical/blocker bugs
- [ ] User acceptance feedback collected (NPS or rating)
- [ ] System rating target: 9.6/10

---

## Phase 2: Intelligence (v3.2 → v3.3) — Weeks 5–10

**Objective:** Introduce AI-driven intelligence capabilities that deliver measurable operational value. This phase requires tight collaboration between Backend and AI/ML engineers, with Frontend focused on integration and UI surfaces.

**Target Score:** 9.6 → 9.8

### Weeks 5–6: BOM Analysis Backend & AI Integration (F5)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| BOM data model design and schema migration | Backend Engineer | 4 days | v3.2 stable |
| BOM analysis AI model training/ fine-tuning | AI/ML Engineer | 6 days | Schema defined |
| API layer for BOM analysis (upload, process, results) | Backend Engineer | 4 days | Model ready |
| Frontend BOM upload interface and results viewer | Frontend Engineer | 5 days | API contract |
| Integration testing (BOM end-to-end) | QA Engineer | 2 days | All components ready |

**Key Deliverable:** F5 — BOM Analysis Engine
**Risk:** High. AI model accuracy for manufacturing BOMs is unproven; mitigated via confidence scoring (see Risk Register).

### Weeks 7–8: Drawing Upload Pipeline & Analysis Engine (F6)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Drawing file upload pipeline (CAD formats: DWG, DXF, STEP) | Backend Engineer | 4 days | F5 API patterns |
| Drawing parsing and feature extraction service | AI/ML Engineer | 6 days | Pipeline ready |
| Drawing viewer and annotation UI | Frontend Engineer | 5 days | Extraction API |
| Drawing analysis results dashboard | Frontend Engineer | 3 days | Viewer stable |
| QA validation with sample drawing set | QA Engineer | 2 days | All components ready |

**Key Deliverable:** F6 — Drawing Upload & Analysis Pipeline
**Risk:** Medium. CAD file parsing complexity; mitigated by leveraging established CAD libraries (see Risk Register).

### Week 9: Real-Time Machine Data Integration (F7)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Machine IoT connector architecture (MQTT/OPC-UA) | Backend Engineer | 3 days | — |
| Data ingestion pipeline and time-series storage | Backend Engineer | 3 days | Connector ready |
| Real-time machine status dashboard | Frontend Engineer | 3 days | Pipeline ready |
| Alerting and threshold configuration | Backend Engineer | 2 days | Dashboard ready |
| QA testing with simulated machine data | QA Engineer | 2 days | All components ready |

**Key Deliverable:** F7 — Real-Time Machine Data Integration
**Risk:** High. Machine IoT data availability is uncertain; mitigated by manual fallback (see Risk Register).

### Week 10: Integration Testing & Performance Tuning

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Full integration test suite (F5–F7) | QA Engineer | 4 days | All features ready |
| Performance benchmarking (load, latency) | Backend Engineer | 3 days | QA test plan |
| AI model accuracy validation and threshold tuning | AI/ML Engineer | 3 days | Test results |
| Frontend bundle optimization and lazy loading | Frontend Engineer | 2 days | Performance report |
| Bug fixes and v3.3 release preparation | All Engineers | 3 days | QA + performance sign-off |

**Key Deliverable:** v3.3 Release
**Risk:** Medium. Integration complexity between AI, backend, and machine data; mitigated by dedicated integration week.

### Phase 2 Exit Criteria

- [ ] F5–F7 features deployed to production
- [ ] AI model accuracy meets confidence threshold (≥85% for BOM, ≥80% for drawings)
- [ ] Machine data pipeline validated or manual fallback activated
- [ ] Performance benchmarks meet SLA (p95 < 500ms for dashboard, p99 < 2s for analysis)
- [ ] System rating target: 9.8/10

---

## Phase 3: Operations (v3.3+) — Weeks 11–16

**Objective:** Deliver domain-specific operational capabilities for CNC and Toolroom workflows, predictive maintenance, and advanced analytics. This phase consolidates the platform into a complete manufacturing intelligence solution.

**Target Score:** 9.8+

### Weeks 11–12: CNC/Toolroom Dedicated Dashboard (F8)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| CNC/Toolroom workflow mapping and requirements | Product Designer | 3 days | v3.3 stable |
| Dashboard layout and widget design (job queues, spindle status, tool life) | Product Designer | 3 days | Requirements approved |
| Backend APIs for CNC/Toolroom-specific data | Backend Engineer | 5 days | Design contract |
| Dashboard implementation and widget assembly | Frontend Engineer | 6 days | APIs ready |
| Machine operator feedback loop | QA Engineer + Product Designer | 2 days | Dashboard ready |

**Key Deliverable:** F8 — CNC/Toolroom Dashboard
**Risk:** Medium. Requires deep domain knowledge; mitigated by close collaboration with manufacturing team.

### Weeks 13–14: Predictive Maintenance Module (F9)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Maintenance data model and historical failure log integration | Backend Engineer | 3 days | F8 data |
| Predictive maintenance ML model (time-to-failure, anomaly detection) | AI/ML Engineer | 6 days | Data model ready |
| Maintenance alert and scheduling UI | Frontend Engineer | 4 days | Model API ready |
| Maintenance report generation | Backend Engineer | 2 days | Alert UI ready |
| QA validation with historical failure scenarios | QA Engineer | 3 days | All components ready |

**Key Deliverable:** F9 — Predictive Maintenance Module
**Risk:** Medium. ML model requires sufficient historical data; mitigated by phased model training with manual override.

### Week 15: Advanced Workflow Analytics (F10)

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Workflow analytics data pipeline (job tracking, cycle time, bottleneck detection) | Backend Engineer | 3 days | F8–F9 data |
| Analytics dashboard (trends, KPIs, drill-down) | Frontend Engineer | 4 days | Pipeline ready |
| Export and reporting capabilities (PDF, Excel) | Frontend Engineer | 2 days | Dashboard ready |
| Analytics accuracy validation | QA Engineer | 2 days | All components ready |

**Key Deliverable:** F10 — Advanced Workflow Analytics
**Risk:** Low-Medium. Primarily aggregation and visualization of existing data.

### Week 16: Final QA, Documentation & Training

| Activity | Owner | Effort | Dependencies |
|----------|-------|--------|--------------|
| Full platform regression test suite | QA Engineer | 4 days | F10 stable |
| User documentation and feature guides | Product Designer | 3 days | All features ready |
| Internal training sessions (manufacturing team) | Product Designer + All Engineers | 2 days | Documentation ready |
| v3.4+ release and deployment | Backend Engineer | 2 days | QA sign-off |
| Post-release monitoring and hotfix window | All Engineers | 2 days | Deployment complete |

**Key Deliverable:** v3.4+ Complete Platform
**Risk:** Low. Standard release and documentation activities.

### Phase 3 Exit Criteria

- [ ] F8–F10 features deployed to production
- [ ] All manufacturing workflows (Blow Molds, Injection Molds, Toolroom, CNC) supported
- [ ] User documentation complete and training delivered
- [ ] System rating target: 9.8+/10
- [ ] Zero critical bugs for 7 days post-release

---

## Dependencies & Risk Mitigation

The following risk register identifies the highest-impact dependencies across the roadmap, with mitigation strategies aligned to the team's capacity and the manufacturing environment's operational constraints.

| Risk ID | Risk Description | Likelihood | Impact | Mitigation Strategy | Owner | Phase |
|---------|-------------------|------------|--------|---------------------|-------|-------|
| R-01 | **Machine IoT data unavailable** — CNC/Toolroom machines lack IoT connectivity or data export capability. | High | High | **Manual fallback:** Machine operators enter status via tablet/terminal. Backend accepts manual and automated data streams interchangeably. Backend Engineer implements dual-input API. | Backend Engineer | 2, 3 |
| R-02 | **AI model accuracy below threshold** — BOM or drawing analysis produces unreliable results, eroding user trust. | Medium | High | **Confidence scoring + human review:** Every AI output carries a confidence score. Scores below 85% trigger manual review queue. AI/ML Engineer continuously retrains with reviewed corrections. | AI/ML Engineer | 2, 3 |
| R-03 | **Drawing file parsing failures** — Complex CAD files (DWG, DXF, STEP) fail to parse or lose geometric fidelity. | Medium | Medium | **Established CAD libraries:** Use Open CASCADE / Teigha File Converter for STEP/DWG, and dxf-parser for DXF. Fallback to thumbnail + metadata extraction if full parsing fails. | Backend Engineer | 2 |
| R-04 | **Frontend theme complexity** — Blue holographic theme introduces performance degradation or accessibility issues. | Low | Medium | **Component library:** All theme elements are componentized with CSS variables. Performance budget enforced (no animation > 16ms frame time). Accessibility audit passes WCAG 2.1 AA. | Frontend Engineer | 1 |
| R-05 | **Resource bottleneck during Phase 2** — AI/ML Engineer overloaded with F5, F6, and F7 model work simultaneously. | Medium | High | **Sequential scheduling:** F5 and F6 are back-to-back, not parallel. F7 machine data integration is backend-heavy; AI/ML Engineer supports only anomaly detection model, not full pipeline. | Project Lead | 2 |
| R-06 | **User adoption resistance** — Manufacturing team prefers existing workflows over new AI features. | Medium | Medium | **Training + opt-in:** All AI features are opt-in during Phase 2. Phase 3 includes mandatory training. Feedback loop via in-app survey after each feature use. | Product Designer | 2, 3 |
| R-07 | **QA capacity overload** — Single QA Engineer cannot cover 3 features + integration + regression in Phase 2. | Medium | High | **Automated test coverage:** Backend and AI/ML engineers write unit/integration tests before QA handoff. Frontend uses Cypress/Playwright for critical path automation. QA focuses on exploratory and edge-case testing. | QA Engineer | 2, 3 |

---

## Resource Allocation

The team is fixed at 4.5 FTE with no planned expansion. The allocation below ensures each phase has the right expertise at the right time, with no engineer carrying more than one high-risk stream simultaneously.

### Phase 1: Foundation (Weeks 1–4)

| Role | Allocation | Primary Work | Secondary Work |
|------|------------|--------------|------------------|
| **Frontend Engineer** | 100% | F2 (Hero Widget), F3 (Search UI), F4 (Theme) | F1 copy integration |
| **Backend Engineer** | 40% | F2 API aggregation, F3 streaming API | Architecture planning for Phase 2 |
| **AI/ML Engineer** | 10% | Consultation on F1 AI persona language | Phase 2 model preparation |
| **QA Engineer** | 100% | F1–F4 feature testing, regression | Test automation framework setup |
| **Product Designer** | 100% | F1 audit, F2 design, F3 interaction design, F4 theme spec | Brand guidelines documentation |

### Phase 2: Intelligence (Weeks 5–10)

| Role | Allocation | Primary Work | Secondary Work |
|------|------------|--------------|------------------|
| **Frontend Engineer** | 60% | F5 BOM UI, F6 Drawing Viewer, F7 Machine Dashboard | F5–F7 integration polish |
| **Backend Engineer** | 100% | F5 BOM API, F6 Upload Pipeline, F7 IoT Connector, Integration | Performance tuning |
| **AI/ML Engineer** | 100% | F5 BOM Model, F6 Drawing Extraction, F7 Anomaly Detection | Model accuracy monitoring |
| **QA Engineer** | 100% | F5–F7 feature testing, integration testing, performance validation | Automated test suite expansion |
| **Product Designer** | 50% | F6 Drawing UI, F7 Dashboard wireframes | User feedback analysis from Phase 1 |

### Phase 3: Operations (Weeks 11–16)

| Role | Allocation | Primary Work | Secondary Work |
|------|------------|--------------|------------------|
| **Frontend Engineer** | 80% | F8 CNC Dashboard, F9 Maintenance UI, F10 Analytics Dashboard | Documentation screenshots, training support |
| **Backend Engineer** | 80% | F8 CNC APIs, F9 Data Model, F10 Analytics Pipeline | Deployment and monitoring |
| **AI/ML Engineer** | 80% | F9 Predictive Maintenance Model | F10 analytics insights, model maintenance |
| **QA Engineer** | 100% | F8–F10 testing, full regression, release validation | Documentation review |
| **Product Designer** | 100% | F8 workflow design, training materials, documentation | Post-release user feedback collection |

### Resource Allocation Summary Chart

```
Phase 1 (Weeks 1–4)        Phase 2 (Weeks 5–10)       Phase 3 (Weeks 11–16)
├─ Frontend:     ████████████████████ 100%   ████████████░░░░░░░░ 60%   ████████████████░░░░ 80%
├─ Backend:      ████████░░░░░░░░░░░░  40%   ████████████████████ 100%  ████████████████░░░░ 80%
├─ AI/ML:        █░░░░░░░░░░░░░░░░░░░  10%   ████████████████████ 100%  ████████████████░░░░ 80%
├─ QA:           ████████████████████ 100%   ████████████████████ 100%  ████████████████████ 100%
└─ Prod. Design: ████████████████████ 100%   ██████████░░░░░░░░░░  50%  ████████████████████ 100%
```

**Key:**
- Phase 1 is Frontend-heavy (UI/UX foundation).
- Phase 2 is Backend and AI/ML-heavy (intelligence layer).
- Phase 3 is balanced across all roles with increased Product Designer involvement for documentation and training.
- QA Engineer maintains 100% allocation throughout to ensure quality gates at each phase.

---

## Milestone Summary Table

| Phase | Timeline | Key Deliverables | Target Score | Primary Risks | Mitigation |
|-------|----------|------------------|--------------|---------------|------------|
| **Phase 1: Foundation** | Weeks 1–4 | F1 AI Persona Copy, F2 Hero Dashboard Widget, F3 Search Animation & Streaming, F4 Blue Holographic Theme, **v3.2 Release** | 9.4 → 9.6 | R-04: Theme performance/a11y | Component library + WCAG 2.1 AA compliance |
| **Phase 2: Intelligence** | Weeks 5–10 | F5 BOM Analysis Engine, F6 Drawing Upload & Analysis, F7 Real-Time Machine Data, **v3.3 Release** | 9.6 → 9.8 | R-01: Machine IoT data, R-02: AI model accuracy, R-05: Resource bottleneck | Manual fallback, confidence scoring + human review, sequential scheduling |
| **Phase 3: Operations** | Weeks 11–16 | F8 CNC/Toolroom Dashboard, F9 Predictive Maintenance, F10 Workflow Analytics, Documentation, Training, **v3.4+ Release** | 9.8+ | R-06: User adoption resistance, R-07: QA capacity | Opt-in features + training, automated testing + exploratory QA focus |

---

## Critical Path & Gantt-Style Timeline

```
Week:    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16
         ├────┴────┴────┴────┤
         │  Phase 1: Foundation  │
         │  F1 │ F2 │ F3 │ F4   │
         │     │    │    │      │
         ├─────┴────┴────┴──────┴────┴────┴────┴────┴────┤
         │           Phase 2: Intelligence                │
         │           F5    │   F6    │ F7 │ Integration  │
         │                 │         │    │              │
         ├─────────────────┴─────────┴────┴─────────────┴────┴────┴────┴────┤
         │                           Phase 3: Operations                      │
         │                           F8   │  F9   │ F10 │ Final QA & Release  │
         │                                │       │     │                     │
         ▼                                ▼       ▼     ▼                     ▼
      v3.2                             v3.3                              v3.4+
    Release                          Release                            Release
```

**Critical Path Notes:**
- The critical path runs through Phase 2 (F5 → F6 → F7) because these features are sequential and represent the highest technical complexity.
- Phase 1 is largely parallelizable (F1, F2, F3 can overlap with design-led dependencies).
- Phase 3 has a soft dependency on Phase 2 machine data (F7) for F8 and F9, but the manual fallback (R-01) ensures this is not a hard blocker.
- QA is a continuous thread across all phases, with dedicated regression windows at Weeks 4, 10, and 16.

---

## Success Metrics & Tracking

| Metric | Baseline (v3.1) | Phase 1 Target | Phase 2 Target | Phase 3 Target | Measurement Method |
|--------|-----------------|----------------|----------------|----------------|------------------|
| System Rating | 9.4/10 | 9.6/10 | 9.8/10 | 9.8+/10 | Quarterly user survey |
| Dashboard Load Time | — | < 2s | < 1s | < 1s | Lighthouse / RUM |
| AI Analysis Accuracy | — | — | ≥ 85% (BOM), ≥ 80% (Drawings) | ≥ 90% (all) | Confidence score tracking |
| Machine Data Coverage | 0% | — | ≥ 50% (or manual fallback) | ≥ 80% | IoT connection status |
| User Feature Adoption | — | 100% (F1–F4 mandatory) | ≥ 60% (F5–F7 opt-in) | ≥ 80% (all features) | In-app analytics |
| Critical Bug Count | — | 0 | 0 | 0 | JIRA / issue tracker |

---

## Assumptions & Constraints

1. **Team Stability:** No engineer attrition during the 16-week period. Any departure would require a 2-week onboarding buffer and Phase 2 timeline extension.
2. **Infrastructure:** Cloud compute and storage resources remain available for AI model training and machine data ingestion without additional procurement.
3. **User Access:** Manufacturing team provides 2–3 hours/week for feedback sessions during Weeks 4, 10, and 16.
4. **CAD Library Licensing:** Established CAD libraries (Open CASCADE, Teigha) are already licensed or open-source; no procurement delays.
5. **Machine IoT:** At least 50% of CNC/Toolroom machines have data export capability by Week 9; otherwise, manual fallback is fully activated.
6. **No Scope Creep:** Features F1–F10 are fixed. New requests are triaged for v3.5+ unless they replace an existing feature with equal or lower effort.

---

## Appendix: Feature Reference

| Feature ID | Feature Name | Description |
|------------|--------------|-------------|
| F1 | AI Persona Copy Replacement | Domain-specific AI language tailored to manufacturing workflows |
| F2 | Hero Dashboard Widget | At-a-glance manufacturing KPIs and status summary |
| F3 | Search Animation & Streaming UI | Real-time search with animated state transitions and streaming results |
| F4 | Blue Holographic Theme | Modern visual theme with holographic effects and brand consistency |
| F5 | BOM Analysis Engine | AI-driven Bill of Materials analysis and anomaly detection |
| F6 | Drawing Upload & Analysis | CAD file upload, parsing, and intelligent feature extraction |
| F7 | Real-Time Machine Data | Live IoT data ingestion from CNC and Toolroom machines |
| F8 | CNC/Toolroom Dashboard | Dedicated operational dashboard for manufacturing floor workflows |
| F9 | Predictive Maintenance | ML-based time-to-failure prediction and maintenance scheduling |
| F10 | Advanced Workflow Analytics | Job tracking, cycle time analysis, and bottleneck detection |

---

*Document Version: 1.0*
*Last Updated: 2025-07-15*
*Next Review: Phase 1 Exit (Week 4)*


---

# Section 4: UI Copy & Microcopy

## MITRA v3.1 Design Specification

**Document Version:** 3.1
**Last Updated:** 2026-05-23
**System:** MITRA Production Intelligence Engine
**Scope:** All user-facing UI text, labels, tooltips, empty states, error messages, and microcopy across the ERP/MES interface.

---

## 1. Brand Voice Guide

### 1.1 Persona Definition

| Attribute | Description |
|-----------|-------------|
| **Name** | MITRA AI Production Intelligence Engine |
| **Role** | Industrial AI copilot embedded within the manufacturing execution system |
| **Identity** | An intelligence engine, not a digital assistant. It does not serve; it processes, analyzes, and reports. |
| **Relationship to User** | Peer-level technical operator. The user is the engineer. MITRA is the system. There is no hierarchy, no subservience, no personality performance. |

### 1.2 Tone

| Quality | Application |
|---------|-------------|
| **Technical** | Use manufacturing terminology (BOM, CAPA, cycle time, dispatch, toolroom, feed rate). Avoid consumer SaaS abstractions. |
| **Precise** | Every statement carries a specific value, status, or action. No filler words. No hedging. |
| **Confident** | State facts as facts. "Analysis complete" — not "It looks like the analysis might be done." |
| **Understated** | Let the data speak. The system does not congratulate the user. It does not apologize for complexity. It presents information and waits for the next instruction. |

### 1.3 Language Rules

| Rule | Directive | Example |
|------|-----------|---------|
| **Use** | Manufacturing terminology | BOM, CAPA, cycle time, dispatch, toolroom, feed rate, spindle load, OEE, downtime code |
| **Avoid** | Consumer SaaS jargon | "Streamline your workflow," "Unlock potential," "Supercharge productivity" |
| **Use** | Status-oriented phrasing | "System Status: Operational," "12 Active Projects," "Analysis Complete" |
| **Avoid** | Conversational filler | "Hello Admin," "Welcome back," "Let's get started," "Here you go" |
| **Use** | Data-first construction | Subject → Status → Value. "Queue: 4 pending items." |
| **Avoid** | Emotional framing | "Yay," "Oops," "Uh-oh," "Great job" |
| **Use** | Active voice, present tense | "Machine status updated." Not "The machine status has been updated." |
| **Avoid** | Exclamation points | None in core UI. Use periods for statements. Colons for labels. |

### 1.4 Avoid List (Prohibited Phrases)

The following phrases and their variants are **not permitted** in any MITRA v3.1 UI surface:

| Prohibited Phrase | Rationale |
|-------------------|-----------|
| "Hello Admin 👋" | Positions the system as a greeter, not an engine. The emoji introduces emotional framing that undermines technical authority. |
| "Welcome back!" | Assumes a personal relationship. The system does not welcome; it reports status. |
| "Let's get started!" | Infantilizes the user. The engineer knows what they need to do. |
| "Oops!" | Trivializes system failures. Errors are technical events, not social mishaps. |
| "Yay!" / "Great job!" | Manufactures false positivity. The system does not evaluate user performance. |
| "Something went wrong" | Vague. Every error message must specify what, where, and the next action. |
| "Just" / "Simply" / "Easy" | Minimizes user expertise. If the action were simple, the engineer would not need the system. |
| "Need help?" / "We're here to help" | The system is not a support agent. It is a tool. |

### 1.5 Use List (Preferred Phrases)

| Preferred Phrase | Context | Rationale |
|------------------|---------|-----------|
| "MITRA AI Production Intelligence Engine" | System header, about panel, documentation | Reinforces the intelligence engine identity. No diminutive forms ("Mitra," "the AI"). |
| "System Status: Operational" | Dashboard status banner | States condition without commentary. Colon separates label from value. |
| "12 Active Projects" | Dashboard metric | Number-first for scanability. "Active" implies state without needing a verb. |
| "Analysis Complete" | AI panel completion | Present tense. No exclamation. No "Your." |
| "Queue: 4 Pending Items" | Task queue header | Label-colon-value pattern. Predictable, scannable. |
| "Data Sync: 14:32" | Connection status | Timestamp as precision signal. No "last updated" fluff. |
| "Operation Failed. Reference ID: #{{id}}." | Generic error | Fact-first. Reference ID enables engineering traceability. |
| "Access Denied. Contact Administrator." | Auth failure | Cause stated. Action stated. No apology. |

### 1.6 Formality Level

| Level | Application |
|-------|-------------|
| **Professional / Enterprise** | All UI copy. The system interfaces with engineers, production managers, and plant supervisors. The register is formal but not archaic. |
| **No Contractions** | Use "does not" not "doesn't." Use "cannot" not "can't." Contractions soften tone and reduce scanability in technical contexts. |
| **No Colloquialisms** | No "head's up," "FYI," "heads-up," "BTW." |
| **Imperative for Actions** | "Run Analysis." Not "Please run analysis." Not "Would you like to run analysis?" |
| **Declarative for Status** | "Analysis complete." Not "The analysis is now complete." |

### 1.7 Brand Personality Summary

| Trait | Expression |
|-------|------------|
| **Serious** | No humor. No whimsy. No personality performance. |
| **Bold** | Short sentences. Strong verbs. No hedging. |
| **Technical** | Domain terminology used correctly and consistently. |
| **Understated** | The system is present but not intrusive. It reports. It does not announce. |

---

## 2. Search Animation States

### 2.1 State Machine: Search Operation

The search interface in MITRA v3.1 supports AI-augmented project and drawing search. During query execution, the system displays progress states to signal system activity and manage user wait perception. The animation text must reinforce the intelligence engine identity — the system is processing, not "thinking" or "working hard."

| State | Display Text | Duration | Visual Cue | Rationale |
|-------|--------------|----------|------------|-----------|
| **Init** | "Initializing Search..." | 0.5s | Pulsing dots (3-dot ellipsis) | "Initializing" signals system preparation, not user action. The ellipsis indicates continuation. Dots pulse to show active process. |
| **Analyze** | "Analyzing Projects..." | 1–2s | Waveform bar (equalizer animation) | "Analyzing" specifies the operation. "Projects" anchors the domain. Waveform suggests data processing, not idle waiting. |
| **Process** | "Processing Drawings..." | 1–2s | Data stream (horizontal line with moving particles) | "Processing" is precise. "Drawings" specifies the artifact type. Data stream visualizes file traversal. |
| **Generate** | "Generating Insights..." | 1–2s | Spark icon (geometric, not emoji) | "Generating" frames the AI as producing output, not "thinking." "Insights" is the only acceptable abstraction — it implies actionable intelligence, not raw data. Spark icon signals output production. |
| **Stream** | "Streaming Results..." | Variable | Typing effect (characters appear left-to-right) | "Streaming" describes the delivery mechanism. "Results" is the output noun. Typing effect mirrors real-time data arrival. |
| **Complete** | "Analysis Complete" | — | Static checkmark (geometric, monochrome) | No ellipsis. Final state. Checkmark confirms termination without celebration. |

### 2.2 Alternative Text Options by State

Each state includes two alternative display texts for variant contexts (e.g., narrow panels, secondary search flows, or user preference for terseness).

| State | Primary Text | Alternative A | Rationale for Alt A | Alternative B | Rationale for Alt B |
|-------|--------------|---------------|---------------------|---------------|---------------------|
| **Init** | "Initializing Search..." | "Search Init..." | Shorter for compact panels or mobile view. "Init" is standard technical abbreviation. | "Search Queue Active" | Passive construction for status bar embeds where brevity is required. |
| **Analyze** | "Analyzing Projects..." | "Project Scan..." | "Scan" implies systematic traversal. Useful for machine-level search contexts. | "Querying Project Index" | More technical. "Index" signals database operation. Use in engineering/advanced user modes. |
| **Process** | "Processing Drawings..." | "Drawing Parse..." | "Parse" is technical term for file interpretation. Appropriate for toolroom or CAD-heavy workflows. | "File Processing..." | Generic. Use when drawing type is unknown or mixed artifact search. |
| **Generate** | "Generating Insights..." | "Compiling Results..." | "Compiling" frames the AI as an aggregator. Use when the operation is primarily synthesis, not generation. | "Intelligence Build..." | "Build" implies construction. "Intelligence" preserves the engine identity. |
| **Stream** | "Streaming Results..." | "Data Incoming..." | Direct, urgent. Use in real-time monitoring contexts where immediacy matters. | "Output Render..." | Technical framing. Use when the result is graphical or drawing-heavy. |
| **Complete** | "Analysis Complete" | "Search Done" | Minimal. Use in toast notifications or compact status bars. | "Results Ready" | Slightly more descriptive. Use when the next action is viewing results. |

### 2.3 Animation Design Notes

- **No emojis.** All visual cues are geometric SVG icons, monochrome, 1px stroke weight.
- **Punctuation.** Ellipsis on active states. Period on terminal states. No exclamation points.
- **Capitalization.** Title case for all animation text. "Analyzing Projects" not "Analyzing projects."
- **Language.** Never anthropomorphize. "Analyzing" not "Thinking." "Processing" not "Working."

---

## 3. AI Panel Labels

### 3.1 Primary AI Panel: BOM Analysis

The AI Panel is the primary interface for MITRA's production intelligence capabilities. Every label, button, and output header must reinforce the system-as-engine identity.

| Element | Label Text | Context | Rationale |
|---------|------------|---------|-----------|
| **Button** | "Analyze BOM" | Primary action button in AI panel header | "Analyze" is the action. "BOM" specifies the target. Not "Analyze" (too vague) or "Run BOM Analysis" (wordy). The direct object is necessary for precision. |
| **Result Header** | "BOM Intelligence Report" | Header of the generated analysis output | "Intelligence Report" frames the output as a formal deliverable, not a casual suggestion. "BOM" anchors the domain. Not "Analysis Results" (too generic). |
| **Complexity Metric** | "Part Complexity: High | Estimated Cycle: 14 hrs" | Summary line beneath the report header | Two precise metrics separated by pipe. "Part Complexity" uses manufacturing terminology. "Estimated Cycle" specifies the unit. "High" is a calibrated severity level, not "Very High" or "Extreme." |
| **Risk Indicator** | "Risk Areas Detected: 3" | Alert section within the report | "Risk Areas" is the standard manufacturing term. "Detected" implies system observation, not prediction. Number is absolute. Not "Potential Risks Found" (hedged). |
| **Confidence Score** | "Confidence: 87%" | Footer or metadata line of the report | Single word label. Percentage without decimal precision. "Confidence" is the correct ML term. Not "Accuracy" (different metric) or "Sureness" (non-technical). |
| **Drawing Input** | "Upload Drawing (STEP, IGES, PDF, DWG)" | File upload field label | Parenthetical lists accepted formats in order of preference. No "Drag and drop here" (instructional, not labeling). No "Supported formats" (redundant). |

### 3.2 Tooltip Text

Tooltips appear on hover (desktop) or long-press (mobile). They are concise and technical.

| Element | Tooltip Text | Rationale |
|---------|--------------|-----------|
| **"Analyze BOM" button** | "Execute bill-of-materials analysis against current project data." | "Execute" is the technical verb. "Bill-of-materials" is spelled out once. "Against current project data" specifies the data source. |
| **"BOM Intelligence Report" header** | "Structured analysis output: complexity, risk, and cycle estimation." | Defines the three output categories. "Structured" signals machine-readability. |
| **"Part Complexity" metric** | "Complexity derived from feature count, tolerance stack, and material specification." | Explains the inputs without revealing proprietary algorithm details. |
| **"Risk Areas Detected"** | "Identified deviations from standard manufacturing parameters." | "Deviations" is the technical term. "Standard manufacturing parameters" frames the baseline. |
| **"Confidence" score** | "Model confidence based on training data similarity to input." | Accurate ML description. Not "How sure we are" (colloquial). |
| **"Upload Drawing" field** | "Accepts STEP, IGES, PDF, DWG. Max 50 MB." | Format recap + constraint. No instructional text. |

### 3.3 AI Panel: Drawing Analysis (Secondary)

| Element | Label Text | Context | Rationale |
|---------|------------|---------|-----------|
| **Button** | "Analyze Drawing" | Drawing analysis mode | Parallel construction to "Analyze BOM." "Drawing" specifies the artifact type. |
| **Result Header** | "Drawing Intelligence Report" | Output header | Consistent with BOM naming convention. "Drawing" specifies the domain. |
| **Feature Detection** | "Features Detected: 23 | Critical: 4" | Summary metric | "Features" is CAD terminology. "Critical" subset is flagged. Pipe separator maintains scannability. |
| **Tolerance Analysis** | "Tolerance Stack: 8 levels | Risk: 2" | Tolerance section header | "Tolerance Stack" is standard GD&T terminology. "Levels" specifies depth. |
| **Material Suggestion** | "Material Match: H13 Steel (Grade: Tooling)" | Material section | "Material Match" implies recommendation, not mandate. Grade specifies application category. |

---

## 4. Button Copy

### 4.1 Primary Actions

Primary actions execute the core function of the current interface. They use strong, specific verbs.

| Button | Primary Label | Rationale | Alternative A | Rationale for Alt A | Alternative B | Rationale for Alt B |
|--------|-------------|-----------|---------------|---------------------|---------------|---------------------|
| **Generate report** | "Generate Report" | "Generate" implies production from data. "Report" is the formal output. Not "Create Report" (less precise) or "Get Report" (passive). | "Build Report" | "Build" implies construction from components. Use in contexts where the report is assembled from multiple data sources. | "Export Analysis" | "Export" signals data transfer. Use when the report is destined for external systems or PDF generation. |
| **Run analysis** | "Run Analysis" | "Run" is the standard verb for executing a computational process. "Analysis" is the operation. Not "Start Analysis" (less precise) or "Do Analysis" (colloquial). | "Execute Analysis" | More formal. "Execute" is the precise technical verb. Use in formal documentation or admin interfaces. | "Process Data" | "Process" frames the operation as data transformation. Use when the input is raw sensor or machine data. |
| **View dispatch** | "View Dispatch" | "View" is the correct verb for opening a read-only record. "Dispatch" is the manufacturing term for the production order. Not "See Dispatch" (imprecise) or "Open Dispatch" (implies editability). | "Dispatch Details" | Noun phrase. Use in navigation menus where verb+object construction is inconsistent with other items. | "Load Dispatch" | "Load" implies data retrieval. Use in contexts where the dispatch is pulled from a remote or queued source. |
| **Schedule task** | "Schedule Task" | "Schedule" is the precise verb for time-based assignment. "Task" is the unit of work. Not "Plan Task" (less specific) or "Add Task" (misses the temporal aspect). | "Queue Task" | "Queue" implies FIFO ordering. Use in production scheduling where order matters. | "Assign Task" | "Assign" implies ownership. Use when the task requires operator or machine assignment, not just time scheduling. |

### 4.2 Secondary Actions

Secondary actions support the primary workflow without altering core data.

| Button | Primary Label | Rationale | Alternative A | Rationale for Alt A | Alternative B | Rationale for Alt B |
|--------|-------------|-----------|---------------|---------------------|---------------|---------------------|
| **Export BOM** | "Export BOM" | "Export" is the standard verb for data extraction. "BOM" is the target artifact. Not "Download BOM" (less precise for data) or "Save BOM" (implies local storage). | "Extract BOM" | "Extract" implies pulling from a larger dataset. Use in contexts where the BOM is a subset of a master data structure. | "BOM Output" | Noun phrase. Use in batch operation menus where all items are noun-labeled. |
| **Download drawing** | "Download Drawing" | "Download" is correct for file transfer to local storage. "Drawing" is the artifact. Not "Get Drawing" (imprecise) or "Save Drawing" (ambiguous). | "Retrieve Drawing" | "Retrieve" implies fetching from an archive or PDM system. Use in toolroom or legacy data contexts. | "Drawing Export" | Noun phrase. Use in toolbar contexts where brevity is required. |
| **View history** | "View History" | "View" for read-only. "History" is the complete record. Not "See History" (imprecise) or "Show History" (system-centric, not user-centric). | "History Log" | Noun phrase. Use in navigation panels. "Log" implies formal audit trail. | "Past Operations" | Descriptive. Use when "History" is ambiguous (e.g., in a module with multiple history types). |

### 4.3 Destructive Actions

Destructive actions alter system state in ways that may be difficult to reverse. They require explicit, non-ambiguous labeling.

| Button | Primary Label | Rationale | Alternative A | Rationale for Alt A | Alternative B | Rationale for Alt B |
|--------|-------------|-----------|---------------|---------------------|---------------|---------------------|
| **Override status** | "Override Status" | "Override" is the precise term for superseding an automatic state. "Status" is the target. Not "Change Status" (too generic) or "Force Status" (implies coercion, not engineering). | "Force Status" | "Force" is the standard term for manual override in control systems. Use in machine control or SCADA-adjacent interfaces. | "Manual Override" | "Manual" specifies the source. Use when distinguishing from automatic status updates. |
| **Clear queue** | "Clear Queue" | "Clear" is the standard verb for emptying a FIFO structure. "Queue" is the manufacturing term. Not "Empty Queue" (less common in software) or "Delete Queue" (implies removing the queue itself, not its contents). | "Purge Queue" | "Purge" implies permanent removal. Use when the queue items are discarded, not just reset. | "Reset Queue" | "Reset" implies returning to initial state. Use when the queue is cleared and order rules are reapplied. |
| **Cancel operation** | "Cancel Operation" | "Cancel" is the standard term for aborting an in-progress process. "Operation" is the manufacturing term for the unit of work. Not "Stop Operation" (less formal) or "Abort Operation" (too severe for routine use). | "Abort Operation" | "Abort" is the emergency term. Use when the operation is safety-critical or machine-in-motion. | "Terminate Operation" | "Terminate" implies finality. Use in long-running processes where "Cancel" might suggest pausability. |

### 4.4 Navigation Actions

Navigation buttons move the user between sections.

| Button | Primary Label | Rationale | Alternative A | Rationale for Alt A | Alternative B | Rationale for Alt B |
|--------|-------------|-----------|---------------|---------------------|---------------|---------------------|
| **Back to dashboard** | "Back to Dashboard" | "Back to" is the standard return construction. "Dashboard" is the home view. Not "Return to Dashboard" (longer, no benefit) or "Home" (too vague). | "Dashboard" | Single word. Use in breadcrumb or compact navigation bars. | "Main View" | "Main View" is system-centric. Use in embedded or iframe contexts where "Dashboard" is ambiguous. |
| **Project details** | "Project Details" | Noun phrase. "Project" is the domain unit. "Details" implies the full record. Not "View Project" (ambiguous — could mean open for editing) or "Project Info" (less formal). | "Project Record" | "Record" implies formal database entry. Use in audit or traceability contexts. | "Project Overview" | "Overview" implies summary. Use when the destination is a high-level summary, not full details. |
| **Machine status** | "Machine Status" | Noun phrase. "Machine" is the asset. "Status" is the condition. Not "Machine Info" (too broad) or "View Machine" (implies navigation to machine record, not status panel). | "Equipment Status" | "Equipment" is the broader manufacturing term. Use in contexts where "Machine" is too narrow (e.g., including fixtures or sensors). | "Live Status" | "Live" implies real-time data. Use in monitoring or Andon-style displays. |

### 4.5 Button Design Notes

- **Capitalization.** Title case for all button labels. "Generate Report" not "Generate report."
- **Verb specificity.** Each button uses the most precise verb for the action. See table above.
- **No ellipsis.** Buttons do not use trailing ellipsis. "Generate Report" not "Generate Report..."
- **No articles.** Buttons omit "a," "an," "the." "Generate Report" not "Generate the Report."

---

## 5. Empty States

Empty states appear when a screen, panel, or list has no data to display. They must inform the user of the condition and, where applicable, direct the next action. They do not apologize, entertain, or suggest system failure where none exists.

### 5.1 Dashboard Empty State

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "No active machines detected. Check connectivity." | States the condition factually. "Detected" implies the system is scanning. "Check connectivity" is the precise next action. No apology. No "It looks like." |
| **Alternative A** | "Machine data unavailable. Verify network or sensor status." | "Unavailable" frames the condition as a data state, not a system failure. "Verify network or sensor status" offers two diagnostic paths. |
| **Alternative B** | "Zero active machines. Review connection settings." | "Zero" is the numerical fact. "Review connection settings" is more specific than "Check connectivity." Use in admin or IT-facing contexts. |

### 5.2 Search Empty State

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "No projects match your criteria. Refine filters or create new." | "Match your criteria" attributes the empty result to the search parameters, not system failure. Two actions offered: refine or create. |
| **Alternative A** | "Zero results for current query. Adjust parameters or clear filters." | "Zero results" is the numerical statement. "Adjust parameters" is technical. "Clear filters" is a direct action. |
| **Alternative B** | "No matching projects found. Modify search terms or add project." | "No matching projects found" is the passive construction. "Modify search terms" is the user action. "Add project" is the alternative path. |

### 5.3 Analysis Empty State

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "Upload a drawing to begin analysis." | Imperative instruction. "Drawing" specifies the input type. "Begin analysis" frames the action as starting a process. |
| **Alternative A** | "No drawing data. Import STEP, IGES, PDF, or DWG." | "No drawing data" states the data condition. Import formats are listed. Use when the user needs explicit format guidance. |
| **Alternative B** | "Analysis requires drawing input. Select file to proceed." | "Requires" frames the dependency. "Select file to proceed" is the action sequence. |

### 5.4 BOM Empty State

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "No BOM data available. Import from ERP or create manually." | "No BOM data available" states the condition. Two paths: ERP import (system integration) or manual creation (user action). |
| **Alternative A** | "BOM record empty. Sync with ERP or enter components." | "BOM record empty" uses database terminology. "Sync with ERP" is the technical action. "Enter components" is the manual path. |
| **Alternative B** | "Missing bill of materials. Retrieve from ERP or build new." | "Missing" frames the condition as an absence. "Retrieve from ERP" is the fetch action. "Build new" is the construction action. |

### 5.5 CAPA Empty State

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "No overdue CAPAs. System operating within parameters." | "No overdue CAPAs" is the positive condition. "System operating within parameters" frames the absence of CAPAs as normal system health, not a missing data issue. |
| **Alternative A** | "Zero open CAPA items. All corrective actions current." | "Zero open CAPA items" is the numerical fact. "All corrective actions current" frames the state as compliance. |
| **Alternative B** | "CAPA queue empty. No corrective actions pending." | "CAPA queue empty" uses queue terminology. "No corrective actions pending" is the operational statement. |

### 5.6 Empty State Design Notes

- **No illustrations of empty boxes, sad robots, or confused characters.** Empty states use a monochrome geometric icon (e.g., a simple line-drawn document or machine outline) if any icon is used at all.
- **No "Nothing to see here."** Every empty state explains the condition and offers a next action.
- **No exclamation points.** Even in positive empty states like CAPA. The period is sufficient.
- **Active voice.** The user is the implied actor. "Upload a drawing" not "A drawing must be uploaded."

---

## 6. Error Messages

Error messages in MITRA v3.1 must communicate the failure mode, provide diagnostic information, and specify the next action. They do not apologize, use humor, or minimize the issue.

### 6.1 AI Timeout Error

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "Analysis timeout. Retry or contact engineering." | "Timeout" is the precise technical term. "Retry" is the user action. "Contact engineering" is the escalation path. No "Sorry." No "It seems." |
| **Alternative A** | "AI analysis exceeded time limit. Retry with reduced scope or contact support." | "Exceeded time limit" is more explicit. "Reduced scope" offers a self-service mitigation. "Support" is the escalation term. |
| **Alternative B** | "Analysis terminated: duration limit. Retry or submit ticket." | "Terminated" is the system action. "Duration limit" specifies the constraint. "Submit ticket" is the formal support action. |

### 6.2 Upload Fail Error

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "File format not supported. Accept: STEP, IGES, PDF, DWG." | "File format not supported" states the rejection cause. "Accept:" lists valid formats. No "Oops." No "Please try again with." |
| **Alternative A** | "Upload rejected: invalid format. Valid types: STEP, IGES, PDF, DWG." | "Upload rejected" frames the action as system-controlled. "Invalid format" is the cause. "Valid types" lists alternatives. |
| **Alternative B** | "Unsupported file type. Convert to STEP, IGES, PDF, or DWG." | "Unsupported file type" is the common error phrasing. "Convert to" offers the remediation path. |

### 6.3 Connection Error

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "Machine data unavailable. Last update: 14:32." | "Unavailable" states the data state. Timestamp provides diagnostic context. The user knows whether 14:32 is recent or stale. No "We can't connect." |
| **Alternative A** | "Connection to machine data source lost. Last sync: 14:32." | "Connection... lost" specifies the network condition. "Last sync" implies regular data transfer. |
| **Alternative B** | "Machine data stale. Last received: 14:32. Verify connection." | "Stale" implies age. "Last received" specifies the data event. "Verify connection" is the user action. |

### 6.4 Authentication Error

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "Access denied. Contact administrator for permissions." | "Access denied" is the standard security term. "Contact administrator" is the escalation path. "For permissions" specifies the resolution. Not "You don't have permission" (second person, accusatory). |
| **Alternative A** | "Insufficient privileges. Request access from system administrator." | "Insufficient privileges" is the formal security term. "Request access" is the user action. "System administrator" specifies the role. |
| **Alternative B** | "Authorization failed. Administrator approval required." | "Authorization failed" frames the error as a process failure, not a user failure. "Administrator approval required" specifies the dependency. |

### 6.5 Generic Error

| Variant | Text | Rationale |
|---------|------|-----------|
| **Primary** | "Operation failed. Reference ID: #{{id}}. Contact support." | "Operation failed" is the general statement. "Reference ID" enables traceability. "Contact support" is the action. The ID is machine-generated and displayed in monospace for copy-paste. |
| **Alternative A** | "System error occurred. Reference: #{{id}}. Report to engineering." | "System error occurred" is the passive framing. "Report to engineering" specifies the recipient. |
| **Alternative B** | "Failure code: #{{id}}. Retry operation or escalate." | "Failure code" is the technical term. "Retry operation or escalate" offers two paths. |

### 6.6 Error Message Design Notes

- **Structure.** Cause → Diagnostic → Action. Every error follows this pattern.
- **No "Please."** Errors are statements, not requests. "Contact support" not "Please contact support."
- **No "Sorry."** The system does not apologize for technical failures. It reports them.
- **Reference IDs.** All errors that do not have an obvious self-service resolution include a reference ID. Format: `#{{id}}` (hash, alphanumeric, monospace).
- **No exclamation points.** Even in critical errors. The severity is conveyed by the content, not punctuation.

---

## 7. Greeting Patterns

### 7.1 Before / After Comparison Table

The following table shows the transformation from generic SaaS greetings to MITRA v3.1 industrial greetings across five common interaction scenarios.

| Scenario | Current (Generic SaaS) | Rationale for Current Problems | New (MITRA v3.1) | Rationale for New Approach |
|----------|------------------------|-------------------------------|------------------|---------------------------|
| **Login** | "Welcome back, Admin 👋" | "Welcome back" assumes a personal relationship. "Admin" is a role, not a name. The emoji undermines technical tone. | "MITRA AI Production Intelligence Engine. System Status: Operational." | States the system identity and operational status. No greeting. No user name. The system is the subject. |
| **Return to dashboard** | "Hello Admin 👋, here's your dashboard" | "Hello" is a social greeting, not a status report. "Your" implies ownership of the interface, not the data. The emoji persists. | "Dashboard: 12 Active Projects | 3 Machines Online | 1 Alert" | Data-first dashboard entry. The user sees what matters immediately. No greeting. No possession framing. |
| **AI interaction start** | "Hey there, ready to help you analyze" | "Hey there" is casual. "Ready to help" frames the AI as a servant. "You" centers the user, not the system. | "Production Intelligence Engine Active. Awaiting instruction." | "Active" is the status. "Awaiting instruction" frames the user as the operator and the system as the tool. No "help." No "ready." |
| **Search initiation** | "Let's find what you're looking for" | "Let's" implies partnership. "What you're looking for" is vague. The system knows the user is searching projects. | "Search initialized. Enter parameters or select from recent queries." | "Search initialized" is the system action. "Enter parameters" is the instruction. "Recent queries" offers efficiency. |
| **Analysis complete** | "Yay, your analysis is done" | "Yay" is emotional performance. "Your analysis" implies the user performed it. "Done" is colloquial. | "Analysis Complete. Results generated." | "Analysis Complete" is the terminal state. "Results generated" states the output. No emotion. No possession. |

### 7.2 Greeting Pattern Principles

| Principle | Application |
|-----------|-------------|
| **No social greetings** | "Hello," "Hi," "Hey," "Welcome back," "Good morning" — none appear in core UI. The system is not a hotel concierge. |
| **No user name personalization** | "Admin," "{{user_name}}" — not used in greetings. The user knows their own name. The system reports status. |
| **No emojis** | No hand waves, smiles, stars, or checkmarks in text. Geometric monochrome icons only. |
| **No exclamation points** | No "Analysis Complete!" No "Welcome!" The period is the standard terminal punctuation. |
| **System-as-subject** | The system is the grammatical subject. "System Status: Operational." Not "You are logged in." |
| **Data-first entry** | Every screen opens with the most important data, not a greeting. The dashboard opens with metrics. The AI panel opens with status. |

### 7.3 Scenario-Specific Greeting Patterns

#### Login Screen

| Element | Text | Rationale |
|---------|------|-----------|
| **System header** | "MITRA AI Production Intelligence Engine" | Full system name. No version number. No tagline. |
| **Status line** | "System Status: Operational | Version: 3.1" | Status and version. The user knows immediately if the system is ready. |
| **Login prompt** | "Enter credentials to access production data." | Imperative instruction. "Production data" specifies the asset being accessed. |
| **No "Welcome to MITRA"** | — | Not used. The system name is sufficient. |

#### Dashboard Return

| Element | Text | Rationale |
|---------|------|-----------|
| **Header** | "Production Dashboard" | Functional name. No "Your." No "My." |
| **Metrics row** | "Active Projects: 12 | Machines Online: 3 | Alerts: 1" | Three key metrics. Pipe-separated. Numbers are right-aligned for scanability. |
| **No greeting** | — | The metrics are the greeting. |

#### AI Interaction Start

| Element | Text | Rationale |
|---------|------|-----------|
| **Panel header** | "Production Intelligence Engine" | Consistent identity. |
| **Status line** | "Engine Active. Awaiting instruction." | Two sentences. Both declarative. No "How can I help?" |
| **Input placeholder** | "Enter query or select analysis type." | Instruction, not invitation. |

#### Search Initiation

| Element | Text | Rationale |
|---------|------|-----------|
| **Search field placeholder** | "Search projects, drawings, or BOMs." | Lists searchable entities. No "What are you looking for?" |
| **Recent queries label** | "Recent Queries" | Functional label. No "Your recent searches." |

#### Analysis Complete

| Element | Text | Rationale |
|---------|------|-----------|
| **Completion banner** | "Analysis Complete." | Two words. No embellishment. |
| **Result prompt** | "Review generated report or execute new analysis." | Two actions offered. "Review" and "execute" are the precise verbs. |
| **No celebratory text** | — | No "Great job." No "All done." The completion is its own signal. |

---

## 8. Appendices

### 8.1 Terminology Glossary

| Term | Definition | Usage Context |
|------|------------|---------------|
| **BOM** | Bill of Materials | Manufacturing, procurement, AI analysis |
| **CAPA** | Corrective and Preventive Action | Quality management, compliance |
| **Cycle** | Cycle time (production) | Scheduling, analysis output |
| **Dispatch** | Production order or work dispatch | Shop floor, scheduling |
| **Drawing** | CAD drawing or technical drawing | Toolroom, analysis, file management |
| **OEE** | Overall Equipment Effectiveness | Dashboard, machine status |
| **Queue** | FIFO task or operation queue | Scheduling, operations |
| **STEP / IGES / DWG** | CAD file formats | Upload, import, analysis |
| **Tolerance** | Dimensional tolerance (GD&T) | Drawing analysis, quality |
| **Toolroom** | Mold and tool manufacturing area | Navigation, project classification |

### 8.2 Punctuation Rules

| Symbol | Usage | Example |
|--------|-------|---------|
| **Period (.)** | Terminal punctuation for all statements. | "Analysis complete." |
| **Colon (:)** | Separates label from value. | "System Status: Operational" |
| **Pipe (\|)** | Separates discrete metrics or alternatives. | "12 Active Projects | 3 Machines Online" |
| **Ellipsis (...)** | Indicates continuation or in-progress state. | "Initializing Search..." |
| **No exclamation point (!)** | Not used in core UI. | — |
| **No question mark (?)** | Not used in button labels or instructions. | — |
| **No em dash (—)** | Not used in microcopy. | — |

### 8.3 Capitalization Rules

| Rule | Application | Example |
|------|-------------|---------|
| **Title case** | All button labels, headers, navigation items. | "Generate Report," "BOM Intelligence Report" |
| **Sentence case** | Body text, tooltips, empty states, error messages. | "Upload a drawing to begin analysis." |
| **All caps** | Acronyms only. Never for emphasis. | "BOM," "CAPA," "ERP" |
| **Lowercase** | Prepositions and articles in title case only if 4+ letters. | "Back to Dashboard" ("to" is lowercase) |

---

## 9. Implementation Notes for Engineering

1. **Localization:** All strings in this document are source English. Translations must preserve the technical tone. Do not translate "MITRA AI Production Intelligence Engine."

2. **Dynamic Values:** Values shown in `{{brackets}}` are template variables. The actual implementation must preserve the surrounding text structure.

3. **Truncation:** Button labels have a maximum display length of 24 characters. Alternative labels (Alt B in button tables) are provided for constrained spaces.

4. **Accessibility:** Screen readers must read the label text exactly as written. No `aria-label` text may soften the tone or add conversational filler.

5. **Consistency Audit:** Any new UI text introduced after this document must be reviewed against Section 1 (Brand Voice Guide) and Section 8 (Punctuation/Capitalization Rules).

---

*End of Section 4: UI Copy & Microcopy*


---

# Section 5: Dashboard Wireframe Concept

## MITRA v3.1 Design Specification — Manufacturing Operations Dashboard

---

## 1. Overview

The MITRA v3.1 Dashboard is a full-page manufacturing operations overview designed as the primary landing screen for all 10–15 internal users of the system. Its core purpose is to provide an at-a-glance operational status of the entire manufacturing facility — from machine floor utilization to quality compliance — without requiring the user to navigate into departmental modules. The layout is optimized for a single large monitor or workstation display, prioritizing immediate visual comprehension over dense data tables. The design philosophy centers on **hero widgets** that surface only the most critical operational signals, supported by a secondary layer of workflow visibility and AI-driven insights. All visual elements follow a dark-themed, high-contrast industrial aesthetic suitable for extended use in factory-floor and office environments.

---

## 2. Hero Widgets (Top Row)

The hero row consists of four equal-width cards displayed horizontally across the top of the viewport. Each card functions as an independent operational beacon, combining a large metric, contextual sub-data, trend direction, and status indication. The row is designed to be read in under 3 seconds by a floor supervisor walking past a display.

### 2.1 Widget 1: Machines Running

```
┌─────────────────────────────────────┐
│  ●            ↑ +2 vs yesterday     │
│                                     │
│           8/12                      │
│        Machines Running             │
│         67% Utilization             │
│                                     │
│  [Background: #112240]              │
└─────────────────────────────────────┘
```

| Attribute | Specification |
|-----------|---------------|
| **Primary Number** | `8/12` — rendered in 48px tabular figures (`font-variant-numeric: tabular-nums;`) using `font-family: 'JetBrains Mono', 'SF Mono', monospace;` |
| **Label** | `Machines Running` — 14px, `font-weight: 500`, color: `#CCD6F6` |
| **Sub-label** | `67% Utilization` — 12px, color: `#8892B0` |
| **Status Indicator** | Green circle (`●`), 8px diameter, color: `#2ECC71`, positioned top-left of card |
| **Trend** | `↑ +2 vs yesterday` — 12px, color: `#2ECC71`, positioned top-right |
| **Background** | `#112240` |
| **Border** | `1px solid #233554` |
| **Border-radius** | `8px` |
| **Min-height** | `280px` |
| **Padding** | `32px` |
| **Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |
| **Interaction: Click** | Navigates to `/machines` — full machine list view with status filter pre-applied to "Running". Transition: `300ms ease-out` slide-right + fade. |
| **Interaction: Alert** | When any machine transitions from Running → Stopped/Down: card border pulses red (`#E74C3C`) for 3 seconds at `1.5s` cycle (`animation: pulse-red 1.5s ease-in-out 2`). Simultaneously, the status indicator changes to red (`●`). |
| **Interaction: Hover** | Border glow: `box-shadow: 0 0 0 1px rgba(100,255,218,0.5);` — subtle cyan (`#64FFDA` at 50% opacity) |

### 2.2 Widget 2: Open Projects

```
┌─────────────────────────────────────┐
│  ●            → Stable              │
│                                     │
│            34                       │
│         Open Projects               │
│    12 in Design, 8 in Manufacturing   │
│                                     │
│  [Background: #112240]              │
└─────────────────────────────────────┘
```

| Attribute | Specification |
|-----------|---------------|
| **Primary Number** | `34` — 48px tabular figures, monospace |
| **Label** | `Open Projects` — 14px, `font-weight: 500`, color: `#CCD6F6` |
| **Sub-label** | `12 in Design, 8 in Manufacturing` — 12px, color: `#8892B0` |
| **Status Indicator** | Amber circle (`●`), 8px diameter, color: `#F39C12`, positioned top-left |
| **Status Rationale** | Amber because current count (34) exceeds target threshold of 30 |
| **Trend** | `→ Stable` — 12px, color: `#8892B0`, positioned top-right |
| **Background** | `#112240` |
| **Border** | `1px solid #233554` |
| **Border-radius** | `8px` |
| **Min-height** | `280px` |
| **Padding** | `32px` |
| **Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |
| **Interaction: Click** | Navigates to `/projects/pipeline` — project pipeline kanban view. Transition: `300ms ease-out` slide-right + fade. |
| **Interaction: Alert** | When open project count exceeds 30: card border changes to amber (`#F39C12`) with `1px solid`. Border remains amber until count drops to ≤30. |
| **Interaction: Hover** | Border glow: `box-shadow: 0 0 0 1px rgba(100,255,218,0.5);` |

### 2.3 Widget 3: Pending Dispatches

```
┌─────────────────────────────────────┐
│  ●            ↓ -3 vs yesterday     │
│                                     │
│             7                       │
│       Pending Dispatches            │
│     3 ready, 4 awaiting QC          │
│                                     │
│  [Background: #112240]              │
└─────────────────────────────────────┘
```

| Attribute | Specification |
|-----------|---------------|
| **Primary Number** | `7` — 48px tabular figures, monospace |
| **Label** | `Pending Dispatches` — 14px, `font-weight: 500`, color: `#CCD6F6` |
| **Sub-label** | `3 ready, 4 awaiting QC` — 12px, color: `#8892B0` |
| **Status Indicator** | Green circle (`●`), 8px diameter, color: `#2ECC71`, positioned top-left |
| **Trend** | `↓ -3 vs yesterday` — 12px, color: `#2ECC71` (green because decrease is favorable), positioned top-right |
| **Background** | `#112240` |
| **Border** | `1px solid #233554` |
| **Border-radius** | `8px` |
| **Min-height** | `280px` |
| **Padding** | `32px` |
| **Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |
| **Interaction: Click** | Navigates to `/dispatch/queue` — dispatch queue view with pending filter pre-applied. Transition: `300ms ease-out` slide-right + fade. |
| **Interaction: Alert** | When pending dispatch count exceeds 10: card border changes to amber (`#F39C12`) with `1px solid`. Border remains amber until count drops to ≤10. |
| **Interaction: Hover** | Border glow: `box-shadow: 0 0 0 1px rgba(100,255,218,0.5);` |

### 2.4 Widget 4: Overdue CAPAs

```
┌─────────────────────────────────────┐
│  ●            ↑ +1 vs last week     │
│                                     │
│             2                       │
│        Overdue CAPAs                │
│      1 Critical, 1 High             │
│                                     │
│  [Background: #112240]              │
└─────────────────────────────────────┘
```

| Attribute | Specification |
|-----------|---------------|
| **Primary Number** | `2` — 48px tabular figures, monospace |
| **Label** | `Overdue CAPAs` — 14px, `font-weight: 500`, color: `#CCD6F6` |
| **Sub-label** | `1 Critical, 1 High` — 12px, color: `#E74C3C` (sub-label uses red to emphasize severity) |
| **Status Indicator** | Red circle (`●`), 8px diameter, color: `#E74C3C`, positioned top-left |
| **Status Rationale** | Red because any overdue CAPA requires immediate quality attention |
| **Trend** | `↑ +1 vs last week` — 12px, color: `#E74C3C` (red because increase is unfavorable), positioned top-right |
| **Background** | `#112240` |
| **Border** | `1px solid #233554` |
| **Border-radius** | `8px` |
| **Min-height** | `280px` |
| **Padding** | `32px` |
| **Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |
| **Interaction: Click** | Navigates to `/quality/capas?status=overdue` — CAPA detail view with overdue filter pre-applied. Transition: `300ms ease-out` slide-right + fade. |
| **Interaction: Alert** | When a new CAPA becomes overdue: card border pulses red (`#E74C3C`) for 3 seconds at `1.5s` cycle (`animation: pulse-red 1.5s ease-in-out 2`). A system notification is simultaneously dispatched to the Quality module owner. Border remains `1px solid #E74C3C` (steady, not pulsing) while any CAPA remains overdue. |
| **Interaction: Hover** | Border glow: `box-shadow: 0 0 0 1px rgba(100,255,218,0.5);` |

### Alert Animation Specification

```css
@keyframes pulse-red {
  0%, 100% { border-color: #233554; box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
  50% { border-color: #E74C3C; box-shadow: 0 0 12px rgba(231,76,60,0.4); }
}
```

---

## 3. Secondary Content (Below Hero)

The secondary content area occupies the remaining viewport height below the hero row. It is divided into a **2/3 + 1/3** split with a `24px` gap between columns. This area provides operational depth beyond the hero KPIs — showing the full manufacturing workflow and recent system intelligence.

### 3.1 Left Column: Workflow Timeline Visualization (2/3 Width)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Manufacturing Workflow Pipeline                                         │
│                                                                          │
│  [Enquiry]   [Quotation]   [Design]   [Planning]   [Manufacturing]      │
│     5           3            12          8            14                  │
│                                                                          │
│  [Quality]   [Dispatch]   [Service]                                    │
│     6          7            2                                          │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│  Active Stage: Manufacturing (14 items) — highlighted in cyan        │
└──────────────────────────────────────────────────────────────────────────┘
```

| Attribute | Specification |
|-----------|---------------|
| **Container Background** | `#112240` |
| **Container Border** | `1px solid #233554` |
| **Border-radius** | `8px` |
| **Padding** | `24px` |
| **Title** | `Manufacturing Workflow Pipeline` — 16px, `font-weight: 600`, color: `#CCD6F6` |
| **Stage Display** | 8 horizontal stage cards arranged left-to-right, wrapping to second row if needed |
| **Stage Card Dimensions** | `min-width: 120px`, `padding: 16px 20px`, `border-radius: 6px` |
| **Stage Card Default State** | Background: `#0A192F`, Border: `1px solid #233554`, text: `#8892B0` |
| **Stage Card Active State** | Border: `2px solid #64FFDA` (cyan), background: `rgba(100,255,218,0.05)`, text: `#CCD6F6` |
| **Stage Count** | Displayed below stage name in 24px tabular figures, color: `#CCD6F6` |
| **Stage Names** | `Enquiry` → `Quotation` → `Design` → `Planning` → `Manufacturing` → `Quality` → `Dispatch` → `Service` |
| **Inter-stage Connector** | Dashed horizontal line (`1px dashed #233554`) between each stage card, with right-arrow `→` icon (`#64FFDA`) |
| **Stage Counts (Example)** | Enquiry: 5, Quotation: 3, Design: 12, Planning: 8, Manufacturing: 14, Quality: 6, Dispatch: 7, Service: 2 |
| **Active Stage Logic** | The stage with the highest item count (or the most recently updated stage, if counts are tied) is designated "Active" and receives the cyan highlight border. In the example above, **Manufacturing** (14 items) is active. |
| **Interaction: Click** | Clicking any stage card filters the global project list to show only projects in that stage. Filter state is reflected in the URL (`/projects?stage=manufacturing`). The clicked card transitions to active state while others remain default. |
| **Interaction: Hover** | Stage card border transitions to `1px solid #64FFDA` over `200ms ease-out`. Cursor: `pointer`. |
| **Auto-refresh** | Stage counts update every 30 seconds with smooth count-up animation (`duration: 800ms`, `easing: ease-out`). |

### 3.2 Right Column: Recent AI Insights + Activity Feed (1/3 Width)

```
┌─────────────────────────────────────┐
│  AI Insights                        │
│  ┌─────────────────────────────┐  │
│  │ ⚠ Project B-2024-041        │  │
│  │ machining time exceeds        │  │
│  │ estimate by 23%               │  │
│  │ 14:32 Today                   │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ 📊 Machine MX-7 utilization │  │
│  │ dropped to 34% — recommend  │  │
│  │ scheduling inspection       │  │
│  │ 11:15 Today                   │  │
│  └─────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│  Activity Feed                      │
│  ┌─────────────────────────────┐  │
│  │ 👤 Rajesh K. updated        │  │
│  │ quotation Q-2024-112        │  │
│  │ 14:28 Today                   │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ 🔧 Machine M-03 marked      │  │
│  │ under maintenance           │  │
│  │ 12:45 Today                   │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ 📦 Dispatch D-2024-089      │  │
│  │ cleared QC, ready for ship  │  │
│  │ Yesterday 09:15               │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### AI Insights Section

| Attribute | Specification |
|-----------|---------------|
| **Section Title** | `AI Insights` — 14px, `font-weight: 600`, color: `#64FFDA`, uppercase, letter-spacing: `0.05em` |
| **Insight Card** | Background: `#0A192F`, Border: `1px solid #233554`, Border-radius: `6px`, Padding: `16px`, Margin-bottom: `12px` |
| **Insight Icon** | `⚠` (warning) for alerts, `📊` (chart) for analytics, `🔔` (bell) for notifications — 14px, color matches indicator type |
| **Insight Text** | 13px, color: `#CCD6F6`, line-height: `1.5`, max 3 lines with ellipsis overflow |
| **Insight Timestamp** | 11px, color: `#6B7280`, positioned bottom-right of card |
| **Insight Generation** | Generated by backend AI analysis module every 15 minutes, cached, max 3 insights displayed |
| **Example Insights** | `Project B-2024-041 machining time exceeds estimate by 23%` / `Machine MX-7 utilization dropped to 34% — recommend scheduling inspection` / `3 CAPAs due for closure this week` |
| **Interaction: Click** | Clicking an insight card navigates to the relevant detail view (project, machine, or CAPA). |

#### Activity Feed Section

| Attribute | Specification |
|-----------|---------------|
| **Section Title** | `Activity Feed` — 14px, `font-weight: 600`, color: `#8892B0`, uppercase, letter-spacing: `0.05em`, separated by `1px solid #233554` horizontal rule from AI Insights |
| **Activity Item** | Padding: `12px 0`, border-bottom: `1px solid rgba(35,53,84,0.5)` |
| **Activity Icon** | User avatar (20px circle) or system icon (`🔧`, `📦`, `👤`) — color: `#64FFDA` for system actions, `#8892B0` for user actions |
| **Activity Text** | 13px, color: `#CCD6F6`, line-height: `1.4` |
| **Activity Timestamp** | 11px, color: `#6B7280` |
| **Timestamp Format** | Same-day: `HH:MM Today` (e.g., `14:32 Today`). Previous day: `Yesterday HH:MM` (e.g., `Yesterday 09:15`). Older: `MMM DD, HH:MM` (e.g., `Jun 18, 08:30`). |
| **Max Items** | 6 items visible, with `overflow-y: auto` and custom scrollbar styling (`::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #233554; border-radius: 2px; }`) |
| **Activity Types** | User actions (update, create, approve), system events (machine status change, schedule trigger, alert), dispatch events (QC cleared, shipment confirmed) |
| **Auto-refresh** | New activity items append to top in real-time via WebSocket; existing items slide down with `300ms ease-out` transition. |

---

## 4. Layout Specifications

### 4.1 Global Container

| Property | Value |
|----------|-------|
| **Page Background** | `#0A192F` |
| **Content Max-width** | `1440px` |
| **Content Alignment** | Centered horizontally (`margin: 0 auto;`) |
| **Vertical Padding** | `32px` top, `32px` bottom |
| **Horizontal Padding** | `24px` left/right (desktop), `16px` (tablet), `12px` (mobile) |

### 4.2 Hero Row Layout

| Property | Value |
|----------|-------|
| **Display** | CSS Grid: `grid-template-columns: repeat(4, 1fr);` |
| **Gap** | `24px` |
| **Padding** | `32px` inside each card |
| **Card Min-height** | `280px` |
| **Card Border-radius** | `8px` |
| **Card Background** | `#112240` |
| **Card Border** | `1px solid #233554` |
| **Card Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |
| **Card Margin-bottom** | `24px` (gap to secondary row) |

### 4.3 Secondary Row Layout

| Property | Value |
|----------|-------|
| **Display** | CSS Grid: `grid-template-columns: 2fr 1fr;` |
| **Gap** | `24px` |
| **Left Column** | Workflow Timeline (2/3 width) |
| **Right Column** | AI Insights + Activity Feed (1/3 width) |
| **Column Min-height** | `400px` |
| **Column Background** | `#112240` |
| **Column Border** | `1px solid #233554` |
| **Column Border-radius** | `8px` |
| **Column Padding** | `24px` |
| **Column Shadow** | `0 4px 24px rgba(0,0,0,0.2)` |

### 4.4 ASCII Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Page Background: #0A192F                                                           │
│  Max-width: 1440px, Centered                                                        │
│  Padding: 32px 24px                                                                  │
│                                                                                      │
│  ┌────────────────── HERO ROW (4 equal cards, 24px gap) ───────────────────────────┐│
│  │                                                                                   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         ││
│  │  │  ●        ↑  │  │  ●        →  │  │  ●        ↓  │  │  ●        ↑  │         ││
│  │  │              │  │              │  │              │  │              │         ││
│  │  │     8/12     │  │      34      │  │       7      │  │       2      │         ││
│  │  │  Machines    │  │   Open       │  │   Pending    │  │   Overdue    │         ││
│  │  │  Running     │  │   Projects   │  │   Dispatches │  │   CAPAs      │         ││
│  │  │  67% Util    │  │ 12 Des, 8 Mfg│  │ 3 ready, 4 QC│  │ 1 Crit, 1 Hi │         ││
│  │  │  280px min   │  │  280px min   │  │  280px min   │  │  280px min   │         ││
│  │  │  bg:#112240  │  │  bg:#112240  │  │  bg:#112240  │  │  bg:#112240  │         ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         ││
│  │                                                                                   ││
│  └──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│  ┌────────────────── SECONDARY ROW (2/3 + 1/3, 24px gap) ──────────────────────────┐│
│  │                                                                                   ││
│  │  ┌────────────────────────────────────────┐  ┌────────────────────────┐        ││
│  │  │  Manufacturing Workflow Pipeline       │  │  AI Insights           │        ││
│  │  │  ┌────┐→┌────┐→┌────┐→┌────┐→┌────┐   │  │  ┌──────────────────┐  │        ││
│  │  │  │Enq │ │Quo │ │Des │ │Pln │ │Mfg │   │  │  │ ⚠ B-2024-041...  │  │        ││
│  │  │  │  5 │ │  3 │ │ 12 │ │  8 │ │ 14 │   │  │  │ 14:32 Today      │  │        ││
│  │  │  └────┘ └────┘ └────┘ └────┘ └────┘   │  │  └──────────────────┘  │        ││
│  │  │  ┌────┐→┌────┐→┌────┐                 │  │  ┌──────────────────┐  │        ││
│  │  │  │Qua │ │Dis │ │Ser │                 │  │  │ 📊 MX-7 util...  │  │        ││
│  │  │  │  6 │ │  7 │ │  2 │                 │  │  │ 11:15 Today      │  │        ││
│  │  │  └────┘ └────┘ └────┘                 │  │  └──────────────────┘  │        ││
│  │  │  Active: Manufacturing (cyan border)   │  │  ─────────────────────  │        ││
│  │  │                                        │  │  Activity Feed          │        ││
│  │  │  2/3 width (66.67%)                    │  │  ┌──────────────────┐  │        ││
│  │  │  min-height: 400px                     │  │  │ 👤 Rajesh K. ... │  │        ││
│  │  │  bg:#112240                            │  │  │ 14:28 Today      │  │        ││
│  │  │                                        │  │  └──────────────────┘  │        ││
│  │  │                                        │  │  ┌──────────────────┐  │        ││
│  │  │                                        │  │  │ 🔧 M-03 maint... │  │        ││
│  │  │                                        │  │  │ 12:45 Today      │  │        ││
│  │  │                                        │  │  └──────────────────┘  │        ││
│  │  │                                        │  │  ┌──────────────────┐  │        ││
│  │  │                                        │  │  │ 📦 D-2024-089... │  │        ││
│  │  │                                        │  │  │ Yesterday 09:15  │  │        ││
│  │  │                                        │  │  └──────────────────┘  │        ││
│  │  │                                        │  │  1/3 width (33.33%)    │        ││
│  │  │                                        │  │  min-height: 400px     │        ││
│  │  │                                        │  │  bg:#112240            │        ││
│  │  └────────────────────────────────────────┘  └────────────────────────┘        ││
│  │                                                                                   ││
│  └──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Click-to-Drill-Down

| Trigger | Action | Transition |
|---------|--------|------------|
| **Click any hero widget** | Navigate to associated detail view | `300ms ease-out` — current page fades out (`opacity: 1 → 0`), detail view slides in from right (`translateX(20px) → 0`) and fades in (`opacity: 0 → 1`) |
| **Click workflow stage** | Filter project list by stage | URL updates to `/projects?stage={stageName}`, filter panel slides in from left with `200ms ease-out` |
| **Click AI insight** | Navigate to relevant entity detail | Same transition as hero widget |
| **Click activity item** | Expand item or navigate to source | If navigable, same transition; if not, expand in-place with `150ms ease-out` height animation |

### 5.2 Hover Effects

| Element | Hover State | CSS |
|---------|-------------|-----|
| **Hero Widget** | Subtle cyan glow border | `box-shadow: 0 0 0 1px rgba(100,255,218,0.5); transition: box-shadow 200ms ease-out;` |
| **Workflow Stage Card** | Cyan border highlight | `border: 1px solid #64FFDA; transition: border-color 200ms ease-out; cursor: pointer;` |
| **AI Insight Card** | Slight background lift | `background: rgba(100,255,218,0.03); border-color: #64FFDA; transition: all 200ms ease-out;` |
| **Activity Item** | Text brightens | `color: #CCD6F6; transition: color 150ms ease-out;` |

### 5.3 Auto-Refresh & Count-Up Animation

| Property | Specification |
|----------|---------------|
| **Refresh Interval** | `30 seconds` |
| **Data Fetch** | Background fetch via API (`GET /api/dashboard/metrics`) — no page reload |
| **Count-Up Animation** | When a number changes, animate from previous value to new value over `800ms` using `ease-out` easing. Use `requestAnimationFrame` for smooth interpolation. |
| **Number Format** | Tabular figures (`font-variant-numeric: tabular-nums`) prevent layout shift during count-up. |
| **Trend Arrow Update** | Trend arrows and values update simultaneously with count-up, color-coded by direction and favorability. |
| **Status Indicator Update** | Status circle color transitions smoothly over `300ms` when threshold conditions change. |
| **Visual Indicator** | A subtle pulsing dot (`●`, `8px`, `#64FFDA`) appears top-right of the hero row during refresh, fading out after completion. |

### 5.4 Alert on Status Change

| Trigger | Visual Effect | Duration | Audio (Optional) |
|---------|-------------|----------|------------------|
| **Machine goes down** | Card border pulses red (`#E74C3C`) | `3 seconds` (2 cycles at `1.5s` each) | Short alert tone (if enabled in user settings) |
| **New overdue CAPA** | Card border pulses red + system notification | `3 seconds` + persistent notification | Short alert tone |
| **Open projects > 30** | Steady amber border (`#F39C12`) | Persistent until count ≤ 30 | None |
| **Pending dispatches > 10** | Steady amber border (`#F39C12`) | Persistent until count ≤ 10 | None |
| **Status returns to normal** | Border transitions back to `#233554` over `500ms` | `500ms` | None |

### 5.5 Right-Click Context Menu

| Trigger | Menu Items | Action |
|---------|------------|--------|
| **Right-click any hero widget** | `Export` → `Export as PNG` / `Export as CSV` | Downloads widget data in selected format |
| | `Pin` → `Pin to Dashboard` / `Unpin` | Fixes widget position (prevents reordering in future customizable layout) |
| | `Configure` → `Set Thresholds` / `Hide Widget` | Opens threshold configuration modal or removes widget from view |
| **Menu Style** | Background: `#112240`, Border: `1px solid #233554`, Border-radius: `6px`, Shadow: `0 8px 32px rgba(0,0,0,0.3)`, Padding: `8px 0`, Item hover: `background: rgba(100,255,218,0.08)` |
| **Menu Position** | Appears at cursor position, flips to left if near right edge of viewport |
| **Dismiss** | Click outside, press `Escape`, or select an item |

### 5.6 Keyboard Shortcuts

| Key | Action | Focus Indicator |
|-----|--------|-----------------|
| `1` | Focus / activate **Widget 1: Machines Running** | `outline: 2px solid #64FFDA; outline-offset: 4px;` |
| `2` | Focus / activate **Widget 2: Open Projects** | Same as above |
| `3` | Focus / activate **Widget 3: Pending Dispatches** | Same as above |
| `4` | Focus / activate **Widget 4: Overdue CAPAs** | Same as above |
| `Enter` (while focused) | Trigger click action (drill-down to detail view) | — |
| `Escape` | Return to dashboard from any drill-down view | Reverse transition: slide from left, `300ms ease-out` |
| `R` | Force manual refresh of all dashboard data | Refresh indicator pulses once |
| `?` | Open keyboard shortcuts help overlay | Modal with shortcut list, dismissible via `Escape` or click outside |

---

## 6. Responsive Behavior

### 6.1 Desktop (≥ 1440px)

| Property | Value |
|----------|-------|
| **Hero Row** | `grid-template-columns: repeat(4, 1fr);` — 4 cards in single horizontal row |
| **Secondary Row** | `grid-template-columns: 2fr 1fr;` — 2/3 + 1/3 split |
| **Workflow Timeline** | All 8 stages in single horizontal row with `→` connectors |
| **Font Sizes** | Hero numbers: `48px`, Labels: `14px`, Sub-labels: `12px`, Timestamps: `11px` |
| **Padding** | Page: `32px 24px`, Cards: `32px`, Secondary columns: `24px` |
| **Gap** | `24px` between all grid items |
| **Max-width** | `1440px` centered |

### 6.2 Tablet (768px – 1439px)

| Property | Value |
|----------|-------|
| **Hero Row** | `grid-template-columns: repeat(2, 1fr);` — 2×2 grid (2 rows of 2 cards) |
| **Secondary Row** | `grid-template-columns: 1fr;` — stacked vertically (workflow timeline on top, AI insights + activity below) |
| **Workflow Timeline** | 8 stages wrap to 2 rows of 4 stages each, with `→` connectors and `↓` wrap indicators between rows |
| **Font Sizes** | Hero numbers: `40px`, Labels: `13px`, Sub-labels: `11px`, Timestamps: `11px` |
| **Padding** | Page: `24px 16px`, Cards: `24px`, Secondary columns: `20px` |
| **Gap** | `20px` between hero cards, `20px` between stacked secondary sections |
| **Card Min-height** | `240px` |
| **Max-width** | `100%` (full width with padding) |

### 6.3 Mobile (< 768px)

| Property | Value |
|----------|-------|
| **Hero Row** | `grid-template-columns: 1fr;` — single vertical stack of 4 cards |
| **Secondary Row** | `grid-template-columns: 1fr;` — stacked vertically below hero |
| **Workflow Timeline** | Horizontal scroll container (`overflow-x: auto`, `white-space: nowrap`) with all 8 stages in a single scrollable row. Snap to stage (`scroll-snap-type: x mandatory; scroll-snap-align: start;`). Stage cards: `min-width: 140px`. |
| **Font Sizes** | Hero numbers: `36px`, Labels: `14px`, Sub-labels: `12px`, Timestamps: `11px` |
| **Padding** | Page: `16px 12px`, Cards: `20px`, Secondary columns: `16px` |
| **Gap** | `16px` between all items |
| **Card Min-height** | `200px` |
| **Touch Interactions** | Tap to drill-down. Swipe left/right on workflow timeline. Long-press (500ms) on hero widget to trigger context menu (replaces right-click). |
| **Keyboard Shortcuts** | `1`–`4` shortcuts still active. `?` opens mobile-optimized shortcut sheet (bottom sheet, slide-up). |
| **Max-width** | `100%` |

### 6.4 Responsive Transition

All layout changes between breakpoints use smooth transitions:

```css
.dashboard-grid {
  transition: grid-template-columns 300ms ease-out, gap 300ms ease-out;
}

.hero-card {
  transition: min-height 300ms ease-out, padding 300ms ease-out;
}
```

### 6.5 Breakpoint Summary Table

| Breakpoint | Hero Layout | Secondary Layout | Workflow Timeline | Hero Number Size | Card Min-height |
|------------|-------------|------------------|-------------------|------------------|-----------------|
| ≥ 1440px | 4×1 horizontal | 2/3 + 1/3 side-by-side | Single row, all 8 stages | 48px | 280px |
| 768–1439px | 2×2 grid | Stacked vertical | 2 rows of 4 stages | 40px | 240px |
| < 768px | 1×4 vertical stack | Stacked vertical | Horizontal scroll | 36px | 200px |

---

## 7. Color Coding & Status Indicators

### 7.1 Color Palette

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Green** | `#2ECC71` | `rgb(46,204,113)` | Normal / Running / On Track / Positive trend (favorable decrease) |
| **Amber** | `#F39C12` | `rgb(243,156,18)` | Warning / Above Target / Needs Attention / Approaching threshold |
| **Red** | `#E74C3C` | `rgb(231,76,60)` | Critical / Overdue / Down / Negative trend (unfavorable increase) |
| **Cyan** | `#64FFDA` | `rgb(100,255,218)` | Active / Selected / Interactive / Hover highlight / Focus ring |
| **Gray** | `#6B7280` | `rgb(107,114,128)` | Inactive / Disabled / Offline / Neutral trend / Disabled elements |
| **Dark Navy (Base)** | `#0A192F` | `rgb(10,25,47)` | Page background |
| **Card Navy** | `#112240` | `rgb(17,34,64)` | Card and panel backgrounds |
| **Border Navy** | `#233554` | `rgb(35,53,84)` | Default borders, dividers, inactive states |
| **Text Primary** | `#CCD6F6` | `rgb(204,214,246)` | Primary labels, headings, active numbers |
| **Text Secondary** | `#8892B0` | `rgb(136,146,176)` | Sub-labels, secondary text, stable trends |
| **Text Muted** | `#6B7280` | `rgb(107,114,128)` | Timestamps, disabled text, placeholders |

### 7.2 Status Indicator Rules

| Indicator | Color | Applies When | Visual Form |
|-----------|-------|------------|-------------|
| **Green** | `#2ECC71` | Machines: ≥ 50% running; Projects: ≤ 30 open; Dispatches: ≤ 10 pending; CAPAs: 0 overdue; Trend: favorable change | Filled circle (`●`), 8px, top-left of card |
| **Amber** | `#F39C12` | Projects: > 30 open (but ≤ 40); Dispatches: > 10 pending (but ≤ 15); CAPAs: 0 overdue but ≥ 1 due within 48h; General: above normal threshold but not critical | Filled circle (`●`), 8px, top-left of card |
| **Red** | `#E74C3C` | Machines: < 50% running or any machine down; Projects: > 40 open; Dispatches: > 15 pending; CAPAs: ≥ 1 overdue; Trend: unfavorable increase on critical metric | Filled circle (`●`), 8px, top-left of card |
| **Cyan** | `#64FFDA` | Workflow stage with highest item count (active stage); Currently focused element (keyboard nav); Hover state borders | Border highlight (`2px solid`), focus ring (`2px solid`), hover glow (`box-shadow`) |
| **Gray** | `#6B7280` | Workflow stages with 0 items; Disabled menu items; Offline machines; Neutral/stable trend indicator | Filled circle (`●`), 8px, or text color |

### 7.3 Trend Color Rules

| Trend Direction | Color Logic | Example |
|-----------------|-------------|---------|
| `↑` Increase | Green if favorable (e.g., machines running up); Red if unfavorable (e.g., overdue CAPAs up) | `↑ +2 vs yesterday` on Machines = Green; `↑ +1 vs last week` on Overdue CAPAs = Red |
| `↓` Decrease | Green if favorable (e.g., pending dispatches down); Red if unfavorable (e.g., machines running down) | `↓ -3 vs yesterday` on Pending Dispatches = Green; `↓ -2 vs yesterday` on Machines Running = Red |
| `→` Stable | Always Gray (`#8892B0`) regardless of metric | `→ Stable` on Open Projects = Gray |

### 7.4 Threshold Matrix

| Widget | Green Threshold | Amber Threshold | Red Threshold | Alert Trigger |
|--------|-----------------|-----------------|---------------|---------------|
| **Machines Running** | ≥ 50% utilization | — | < 50% or any machine down | Machine status change to Down/Stopped |
| **Open Projects** | ≤ 30 | 31–40 | > 40 | Count crosses 30 or 40 |
| **Pending Dispatches** | ≤ 10 | 11–15 | > 15 | Count crosses 10 or 15 |
| **Overdue CAPAs** | 0 | 0 (with due within 48h) | ≥ 1 | New CAPA becomes overdue |

---

## 8. Accessibility Considerations

| Requirement | Implementation |
|-------------|---------------|
| **Color Contrast** | All text meets WCAG AA contrast ratios against `#112240` and `#0A192F` backgrounds. Primary text `#CCD6F6` on `#112240` = ratio ~8.5:1. |
| **Status Indicators** | Color alone is not used to convey status. Each status circle is accompanied by a text label (e.g., "67% Utilization", "1 Critical, 1 High") and trend arrows with text direction. |
| **Keyboard Navigation** | Full keyboard operability: `Tab` cycles through all interactive elements, `1`–`4` direct-focus widgets, `Enter` activates, `Escape` dismisses, `?` opens help. |
| **Focus Indicators** | All focusable elements have visible `2px solid #64FFDA` outline with `4px` offset. Never suppressed. |
| **Screen Reader** | Each hero widget is a single `role="region"` with `aria-label` describing the metric and status (e.g., "Machines Running: 8 of 12, 67% utilization, 2 more than yesterday"). |
| **Motion** | `prefers-reduced-motion: reduce` disables count-up animations, transition effects, and border pulses. Status changes update instantly without animation. |
| **Touch Targets** | Minimum touch target size on mobile: `44px × 44px` for all interactive elements (stage cards, insight cards, menu items). |

---

## 9. Implementation Notes for Developers

1. **Framework Recommendation**: React 18+ with CSS Grid for layout, `framer-motion` for transitions, and `@tanstack/react-query` for 30-second polling with background refetch.
2. **Number Animation**: Use `countUp.js` or custom `requestAnimationFrame` implementation for tabular count-up. Ensure `font-variant-numeric: tabular-nums` is applied to prevent layout shift.
3. **WebSocket**: Activity feed should use a persistent WebSocket connection (`wss://`) for real-time updates. AI insights can be HTTP-polling every 15 minutes.
4. **CSS Custom Properties**: Define all color tokens as CSS variables in `:root` for theme consistency and easy future theming.
5. **Asset Loading**: Monospace font (JetBrains Mono or similar) should be preloaded to prevent FOUT on hero numbers.
6. **Performance**: Hero widgets should be server-rendered (SSR) for initial load. Subsequent updates are client-side only.
7. **State Management**: Dashboard filter state (active workflow stage, drill-down navigation) should be persisted in URL query parameters to support bookmarking and back-button behavior.

---

*Document Version: v3.1.0*
*Last Updated: 2024*
*Author: Wireframe_Writer — MITRA v3.1 Design Specification*


---

