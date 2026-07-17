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
