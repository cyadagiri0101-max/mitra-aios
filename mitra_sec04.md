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
