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
