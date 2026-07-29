# Workflow Engine

## Purpose

This document defines the state machine patterns and workflow orchestration for MITRA. Every domain module is a state machine — entities transition through defined states via events and actions.

---

## Architecture

```
User Action ──► Controller ──► Service
                                  │
                                  ▼
                          State Machine Engine
                            │           │
                            ▼           ▼
                      Validate      Execute Side
                      Transition    Effects
                            │           │
                            ▼           ▼
                        Update        Publish
                        Entity        Event
                            │           │
                            ▼           ▼
                        Audit Log    Consumers
```

The workflow engine is not a separate service. It is a **pattern** applied consistently in every domain service.

---

## State Machine Pattern

Every stateful entity follows this pattern:

```typescript
interface StateMachine<S extends string, T extends string> {
  currentState: S;
  transitions: Map<S, Map<T, Transition>>;
}

interface Transition {
  targetState: string;
  guards: Guard[];              // conditions that must be true
  effects: Effect[];             // side effects to execute
}
```

### Guard Examples

```typescript
// Transition guards
userHasPermission('commercial:quotation', 'approve'),
projectInStatus('engineering', 'manufacturing'),
entityBelongsToUser(currentUser),
allRequiredFieldsFilled(entity),
noActiveNCRForEntity(entityId),
```

### Effect Examples

```typescript
// Side effects executed on successful transition
publishEvent('quotation.accepted', payload),
notifyUser(projectLead, 'Design approved'),
createTask('Update BOM', projectId),
updateProjectTimeline(milestoneId),
```

---

## Domain State Machines

### 1. RFQ

```
States:    draft ──► submitted ──► under_review ──► quoted ──► won
                                                        │
                                                        └──► lost
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| draft | submit | submitted | All required fields filled | Notify sales manager |
| submitted | assign_reviewer | under_review | User is sales manager | - |
| under_review | quote | quoted | Valid quotation entered | Create quotation |
| quoted | win | won | Customer accepts | Publish QuotationAccepted |
| quoted | lose | lost | Customer rejects or expires | Log reason |

### 2. Quotation

```
States:    draft ──► sent ──► accepted ──► project_created
                            │
                            └──► rejected
                            │
                            └──► expired
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| draft | send | sent | Quotation approved internally | Email to customer |
| sent | accept | accepted | Within valid_until | Publish QuotationAccepted |
| sent | reject | rejected | - | Log rejection reason |
| sent | expire | expired | valid_until < today | - |

### 3. Project

```
States:    planning ──► engineering ──► manufacturing ──► trial ──► dispatch ──► completed
             │              │                 │             │          │
             │              │                 │             │          └──► service
             │              │                 │             │
             │              │                 │             └──► quality_hold
             │              │                 │
             │              │                 └──► rework
             │              │
             │              └──► design_review
             │
             └──► on_hold ──► resumed
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| planning | start_engineering | engineering | Design team assigned | Publish MilestoneReached |
| engineering | design_approved | manufacturing | All designs approved | Publish DesignApproved |
| manufacturing | production_complete | trial | All work orders done | Schedule trial |
| trial | trial_passed | dispatch | Trial results >= threshold | Publish TrialConducted |
| trial | trial_failed | manufacturing | Trial results < threshold | Create rework tasks |
| dispatch | delivered | completed | Customer accepts delivery | Publish ProjectCompleted |
| * | hold | on_hold | Manager action | Notify stakeholders |
| on_hold | resume | {previous state} | Hold reason resolved | - |

### 4. Design

```
States:    draft ──► under_review ──► approved ──► superseded
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| draft | submit_review | under_review | CAD file attached | Notify reviewer |
| under_review | approve | approved | Reviewer approval | Publish DesignApproved |
| under_review | request_changes | draft | Changes requested | Notify designer |
| approved | supersede | superseded | New revision created | Archive previous revision |

### 5. BOM

```
States:    draft ──► released ──► revised
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| draft | release | released | All BOM items validated | Publish BOMCreated |
| released | revise | revised | Engineering change exists | Create new BOM version |
| released | supersede | superseded | Replacement BOM exists | Archive |

### 6. Work Order

```
States:    pending ──► released ──► in_progress ──► completed ──► closed
                              │                        │
                              └──► cancelled            └──► on_hold
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| pending | release | released | Machine available, material ready | Publish WorkOrderReleased |
| released | start | in_progress | Operator assigned | Publish ProductionRunStarted |
| in_progress | complete | completed | All quantity produced | Publish ProductionRunCompleted |
| in_progress | report_issue | on_hold | Issue detected | Create NCR |
| on_hold | resolve | in_progress | Issue resolved | - |
| pending | cancel | cancelled | Manager approval | - |

### 7. NCR

```
States:    open ──► under_investigation ──► actioned ──► closed
             │                                │
             └──► rejected                    └──► escalated
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| open | investigate | under_investigation | QA engineer assigned | - |
| under_investigation | action | actioned | Root cause identified | Initiate CAPA if needed |
| actioned | verify | closed | Effectiveness verified | Publish NCR closed |
| actioned | escalate | escalated | Beyond project scope | Notify management |
| open | reject | rejected | Not a valid NCR | Log reason |

### 8. CAPA

```
States:    initiated ──► in_progress ──► verification ──► closed
                                    │
                                    └──► on_hold
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| initiated | start | in_progress | Actions defined and assigned | - |
| in_progress | complete_actions | verification | All actions completed | Schedule verification |
| verification | verify_close | closed | Effectiveness verified | Publish CAPAClosed |
| verification | reopen | in_progress | Effectiveness not verified | Create follow-up actions |

### 9. Service Request

```
States:    open ──► in_progress ──► resolved ──► closed
             │                         │
             └──► on_hold              └──► reopened
```

| From | Action | To | Guards | Effects |
|------|--------|----|--------|---------|
| open | assign | in_progress | Service tech available | Notify assignee |
| in_progress | resolve | resolved | Resolution documented | Publish ServiceRequestResolved |
| resolved | close | closed | Customer confirmation | - |
| resolved | reopen | in_progress | Issue persists | Reset SLA timer |
| open | hold | on_hold | Parts not available | - |

---

## Cross-Domain Workflows

These workflows span multiple bounded contexts and are orchestrated via the event bus.

### Quote-to-Project

```
Commercial              Project
────────────────────────────────────────────────
quotation.accepted ──► project.created
                        milestone.reached (planning)
```

### Design-to-Manufacturing

```
Engineering                Manufacturing           Quality
────────────────────────────────────────────────────────────────
design.approved ──► production_plan.created
                    process_plan.created
                    work_order.released ──► inspection_plan.created
```

### Issue-to-Closure

```
Quality                    Engineering              Knowledge
────────────────────────────────────────────────────────────────
ncr.created ──► engineering.change.requested
capa.initiated
                    │
                    ▼
              change.approved ──► knowledge.entry.created (lesson learned)
```

### Project-to-Knowledge

```
Project              Knowledge
────────────────────────────────────────────────
project.completed ──► knowledge.entry.created (lessons learned, best practices, design rules)
```

---

## Workflow Engine Interface

```typescript
interface WorkflowEngine {
  // Transition an entity to a new state
  transition(
    domain: string,
    entityType: string,
    entityId: string,
    action: string,
    context: TransitionContext
  ): Promise<TransitionResult>;

  // Get current state and available actions
  getState(
    domain: string,
    entityType: string,
    entityId: string
  ): Promise<EntityState>;

  // Get state history for an entity
  getHistory(
    domain: string,
    entityType: string,
    entityId: string
  ): Promise<StateTransition[]>;
}

interface TransitionContext {
  actorId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface TransitionResult {
  success: boolean;
  previousState: string;
  newState: string;
  eventsPublished: string[];
  error?: string;
}
```

---

## State Transition History

Every state transition is recorded:

```sql
state_transitions (
  id              UUID PRIMARY KEY,
  domain          VARCHAR(50),
  entity_type     VARCHAR(50),
  entity_id       UUID,
  from_state      VARCHAR(50),
  to_state        VARCHAR(50),
  action          VARCHAR(50),
  actor_id        UUID,
  reason          TEXT,
  metadata        JSONB,
  timestamp       TIMESTAMP DEFAULT NOW()
);
```

This table enables:
- Full state history for any entity.
- Time-in-state analysis for bottlenecks.
- Audit of who changed what and why.
- Replay of entity lifecycle for traceability.
