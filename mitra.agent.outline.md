# MITRA v3.1 Design Specification — Unified Outline

## Document Info
- **Title**: MITRA v3.1 Design Specification & Implementation Roadmap
- **Date**: 2026-06-20
- **Version**: 1.0
- **Audience**: Engineering team, product stakeholders
- **Domain**: Blow Molds, Injection Molds, Toolroom, CNC Manufacturing
- **User Base**: 10–15 internal users

---

## Section 1: Formal Requirements Document

### 1.1 Executive Summary
- Purpose and scope of this specification
- Current state assessment (v1.7 → v3.1 evolution)
- Target state: 9.4 → 9.8 rating improvement

### 1.2 Feature Prioritization (MoSCoW)

#### Must Have (Phase 1)
- F1: Industrial AI Copilot Persona rebranding
- F2: Manufacturing Hero Dashboard (4 KPIs)
- F3: AI Search Animation with streaming states
- F4: Blue Holographic Interface theme

#### Should Have (Phase 2)
- F5: BOM Analysis AI Panel
- F6: Drawing Analysis (STEP/IGES/PDF/DWG)
- F7: Real-time Machine Status Integration

#### Could Have (Phase 3)
- F8: CNC/Toolroom Operations Dashboard
- F9: Predictive Maintenance Alerts
- F10: Advanced Workflow Analytics

#### Won't Have (This Cycle)
- External customer portal
- Multi-tenant architecture
- Mobile-native app

### 1.3 Functional Requirements

#### FR-1: AI Copilot Persona
- Replace generic greeting with "Production Intelligence Engine" branding
- All AI-facing labels must use industrial terminology
- Tone: technical, precise, authoritative (not casual/conversational)

#### FR-2: Hero Dashboard Widgets
- Machines Running: count of active CNC machines + utilization %
- Open Projects: total active projects by stage
- Pending Dispatches: items ready for shipment
- Overdue CAPAs: corrective actions past due date

#### FR-3: Search Animation
- Replace "Searching..." with contextual AI states
- Progressive disclosure: "Analyzing Projects..." → "Processing Drawings..." → "Generating Insights..."
- Stream results with typing animation

#### FR-4: BOM Analysis Panel
- Trigger: "Analyze BOM" button inside Project Details
- Output: Part complexity score, material classification, vendor lead times
- AI-generated risk assessment

#### FR-5: Drawing Analysis
- Upload support: STEP, IGES, PDF, DWG
- Output: Part Complexity, Suggested Machining Time, Risk Areas
- Confidence scoring per analysis

### 1.4 Non-Functional Requirements
- NFR-1: Response time < 2s for AI search
- NFR-2: Dashboard refresh every 30s
- NFR-3: Drawing upload limit: 50MB per file
- NFR-4: Support for 10–15 concurrent users
- NFR-5: WCAG 2.1 AA accessibility

### 1.5 Acceptance Criteria Matrix
| ID | Requirement | Given | When | Then | Priority |
|----|-------------|-------|------|------|----------|

---

## Section 2: Visual Design Direction

### 2.1 Design Philosophy
- From "generic SaaS dashboard" to "engineering workstation"
- Less toy-like, more industrial precision
- Blue holographic interface aesthetic

### 2.2 Color System
- Primary: Deep industrial blues (#0A192F, #112240, #233554)
- Accent: Cyan holographic (#64FFDA, #00B4D8)
- Status: Green (#2ECC71) running, Amber (#F39C12) warning, Red (#E74C3C) critical
- Neutral: Slate grays for backgrounds, white for primary text

### 2.3 Typography
- Headlines: Inter or Roboto Mono (monospace for technical feel)
- Body: Inter (clean, readable at small sizes)
- Data/Numbers: JetBrains Mono or SF Mono (tabular figures for alignment)
- Scale: 48px hero → 32px H1 → 24px H2 → 18px H3 → 14px body → 12px caption

### 2.4 Component Styles

#### AI Copilot Panel
- Background: gradient from #0A192F to #112240
- Border: 1px solid #64FFDA at 30% opacity
- Glow: subtle cyan box-shadow on active state
- Avatar: abstract geometric or waveform (not cartoon robot)

#### Hero Widgets
- Large numeric display (48px tabular figures)
- Trend indicator with delta vs previous period
- Color-coded status ring
- Background: card with subtle glassmorphism

#### Search Animation
- Full-screen overlay during search
- Animated waveform or data-stream visualization
- Typing effect for streaming results
- Cancel/resume controls

### 2.5 Layout Grid
- 12-column grid for dashboard
- Hero widgets: 4-column each (equal width on desktop)
- Gap: 24px between cards
- Padding: 32px page margins
- Responsive: stack to 2×2 on tablet, 1×4 on mobile

---

## Section 3: Implementation Roadmap

### 3.1 Phase 1: Foundation (v3.1 → v3.2) — Weeks 1–4
- Week 1: Brand language audit, AI persona copy replacement
- Week 2: Hero dashboard widget development
- Week 3: Search animation states + streaming UI
- Week 4: Blue holographic theme implementation, QA
- Deliverable: v3.2 release with quick wins
- Target score improvement: 9.4 → 9.6

### 3.2 Phase 2: Intelligence (v3.2 → v3.3) — Weeks 5–10
- Week 5–6: BOM analysis backend + AI integration
- Week 7–8: Drawing upload pipeline + analysis engine
- Week 9: Real-time machine data integration (IoT/MQTT)
- Week 10: Integration testing, performance tuning
- Deliverable: v3.3 with AI-powered features
- Target score improvement: 9.6 → 9.8

### 3.3 Phase 3: Operations (v3.3+) — Weeks 11–16
- Week 11–12: CNC/Toolroom dedicated dashboard
- Week 13–14: Predictive maintenance module
- Week 15: Advanced workflow analytics
- Week 16: Final QA, documentation, training
- Deliverable: v3.4+ complete manufacturing platform
- Target score: 9.8+

### 3.4 Dependencies & Risk Mitigation
| Dependency | Risk Level | Mitigation |
|------------|------------|------------|
| Machine IoT data | High | Start with manual entry fallback |
| AI model accuracy | Medium | Confidence scoring + human review |
| Drawing file parsing | Medium | Use established CAD libraries |

### 3.5 Resource Allocation
- 1 Frontend engineer (theme, animations, dashboard)
- 1 Backend engineer (API, AI integration, file processing)
- 1 AI/ML engineer (BOM analysis, drawing analysis)
- 1 QA engineer (testing, acceptance criteria)
- 0.5 Product designer (visual design, wireframes)

---

## Section 4: UI Copy & Microcopy

### 4.1 Brand Voice Guide
- **Persona**: Industrial AI Copilot — not a helper, but an intelligence engine
- **Tone**: Technical, precise, confident. No emojis in core UI (except search animation)
- **Language**: Manufacturing terminology, not consumer SaaS jargon
- **Avoid**: "Hello Admin 👋", "Welcome back!", "Let's get started!"
- **Use**: "MITRA AI Production Intelligence Engine", "System Status: Operational", "12 Active Projects"

### 4.2 Search Animation States
| State | Display Text | Duration |
|-------|-------------|----------|
| Init | "Initializing Search..." | 0.5s |
| Analyze | "Analyzing Projects..." | 1–2s |
| Process | "Processing Drawings..." | 1–2s |
| Generate | "Generating Insights..." | 1–2s |
| Stream | Streaming results with typing effect | Variable |

### 4.3 AI Panel Labels
- Button: "Analyze BOM" (not "Analyze")
- Result header: "BOM Intelligence Report"
- Complexity: "Part Complexity: High | Estimated Cycle: 14 hrs"
- Risk: "Risk Areas Detected: 3"
- Confidence: "Confidence: 87%"

### 4.4 Button Copy
- Primary: "Generate Report", "Run Analysis", "View Dispatch"
- Secondary: "Export BOM", "Download Drawing", "Schedule Task"
- Destructive: "Override Status", "Clear Queue"

### 4.5 Empty States
- Dashboard: "No active machines detected. Check connectivity."
- Search: "No projects match your criteria. Refine filters or create new."
- Analysis: "Upload a drawing to begin analysis."

### 4.6 Error Messages
- AI timeout: "Analysis timeout. Retry or contact engineering."
- Upload fail: "File format not supported. Accept: STEP, IGES, PDF, DWG."
- Connection: "Machine data unavailable. Last update: 14:32."

---

## Section 5: Dashboard Wireframe Concept

### 5.1 Overview
- Full-page manufacturing operations dashboard
- Target: 10–15 user internal system
- Primary use: At-a-glance operational status

### 5.2 Hero Widgets (Top Row, 4 columns)

#### Widget 1: Machines Running
- Large number: 8/12
- Label: "Machines Running"
- Sub: "67% Utilization"
- Status: Green indicator
- Trend: ↑ +2 vs yesterday

#### Widget 2: Open Projects
- Large number: 34
- Label: "Open Projects"
- Sub: "12 in Design, 8 in Manufacturing"
- Status: Amber (above target)
- Trend: → Stable

#### Widget 3: Pending Dispatches
- Large number: 7
- Label: "Pending Dispatches"
- Sub: "3 ready, 4 awaiting QC"
- Status: Green
- Trend: ↓ -3 vs yesterday

#### Widget 4: Overdue CAPAs
- Large number: 2
- Label: "Overdue CAPAs"
- Sub: "1 Critical, 1 High"
- Status: Red (requires attention)
- Trend: ↑ +1 vs last week

### 5.3 Secondary Content (Below Hero)
- Left 2/3: Workflow timeline visualization (Enquiry → Service)
- Right 1/3: Recent AI insights + activity feed

### 5.4 Layout Specifications
- Page: full-width, max 1440px centered
- Hero row: 4 equal cards, 24px gap, 32px padding
- Card: 280px min-height, rounded 8px corners
- Background: #0A192F base, cards at #112240
- Shadows: subtle 0 4px 24px rgba(0,0,0,0.2)

### 5.5 Interaction Patterns
- Click widget → drill-down to detail view
- Hover → subtle glow border effect
- Auto-refresh every 30 seconds with smooth count animation
- Alert on status change (red border pulse)

### 5.6 Responsive Behavior
- Desktop (1440px+): 4×1 hero row, 2/3 + 1/3 secondary
- Tablet (768px): 2×2 hero row, stacked secondary
- Mobile (<768px): 1×4 hero stack, secondary below
