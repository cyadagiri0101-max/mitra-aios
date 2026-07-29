# Knowledge Graph

## Purpose

This document defines the knowledge graph model for MITRA. The knowledge graph is one of MITRA's biggest differentiators — it connects entities across all domains into a traversable graph that grows with every completed project.

---

## Role of the Knowledge Graph

The knowledge graph serves three purposes:

1. **Traceability** — Traverse from any entity to its related entities across domains.
2. **Impact Analysis** — Before an engineering change, query "what entities will be affected?"
3. **AI Context** — The AI Copilot traverses the graph to provide context-aware recommendations.

---

## Graph Model

The graph consists of **nodes** (entities) and **edges** (relationships).

```
(Node) ──[Edge]──► (Node)
```

### Node Types by Domain

| Domain | Node Types |
|--------|------------|
| Commercial | Customer, Contact, RFQ, Quotation |
| Project | Project, Milestone, Task, Team |
| Engineering | Design, DrawingRevision, BOM, BOMItem, ProcessPlan, Operation, EngineeringChange |
| Manufacturing | Machine, ProductionPlan, WorkOrder, ProductionRun, Trial |
| Quality | InspectionPlan, InspectionResult, NCR, CAPA, CAPAAction |
| Service | Dispatch, Installation, MaintenanceLog, ServiceRequest, Warranty |
| Knowledge | Document, KnowledgeEntry |

### Edge Types

| Edge Type | Source → Target | Description |
|-----------|----------------|-------------|
| `BELONGS_TO` | Any → Project | Every entity belongs to a project |
| `ORIGINATES_FROM` | Quotation → RFQ | Quotation derived from RFQ |
| `ORIGINATES_FROM` | Project → Quotation | Project created from quotation |
| `PRODUCES` | Design → BOM | Design generates bill of materials |
| `PRODUCES` | BOM → ProcessPlan | BOM feeds process planning |
| `CONTAINS` | BOM → BOMItem | BOM contains items |
| `REFERENCES` | WorkOrder → BOMItem | Work order references a BOM item |
| `ASSIGNED_TO` | WorkOrder → Machine | Work order assigned to machine |
| `EXECUTED_AS` | ProductionRun → WorkOrder | Production run executes work order |
| `VERIFIED_BY` | InspectionResult → WorkOrder | Inspection verifies production |
| `TRIGGERED` | NCR → InspectionResult | NCR from inspection failure |
| `ADDRESSED_BY` | CAPA → NCR | CAPA addresses NCR |
| `SHIPPED_AS` | Dispatch → Project | Dispatch fulfills project |
| `INSTALLED_AT` | Installation → Dispatch | Installation after dispatch |
| `SUPPORTS` | MaintenanceLog → Project | Maintenance supports delivered mold |
| `CREATED` | User → Any | User created entity |
| `APPROVED_BY` | Any → User | User approved entity |
| `SIMILAR_TO` | KnowledgeEntry → KnowledgeEntry | Semantic similarity |
| `DERIVED_FROM` | KnowledgeEntry → Any | Knowledge extracted from entity |
| `CAUSED_BY` | NCR → EngineeringChange | NCR triggered engineering change |
| `RESOLVED_BY` | EngineeringChange → Design | Change resulted in design update |

---

## Graph Construction

### Event-Driven Construction

The graph is built incrementally from domain events:

```
Domain Event ──► Graph Builder
                    │
                    ├── Extract source and target entities
                    ├── Determine relationship type
                    ├── Create or update nodes
                    └── Create or update edge
```

### Example: DesignApproved event

```json
{
  "type": "design.approved",
  "data": {
    "designId": "des_123",
    "projectId": "proj_456",
    "approvedBy": "user_789"
  }
}
```

Graph updates:
```
Node: Design(des_123) ──[APPROVED_BY]──► Node: User(user_789)
Node: Design(des_123) ──[BELONGS_TO]──► Node: Project(proj_456)
```

### Example: NCRCreated event

```json
{
  "type": "ncr.created",
  "data": {
    "ncrId": "ncr_abc",
    "projectId": "proj_456",
    "inspectionResultId": "ins_xyz",
    "workOrderId": "wo_123"
  }
}
```

Graph updates:
```
Node: NCR(ncr_abc) ──[TRIGGERED]───────► Node: InspectionResult(ins_xyz)
Node: NCR(ncr_abc) ──[BELONGS_TO]──────► Node: Project(proj_456)
Node: NCR(ncr_abc) ──[RELATED_TO]──────► Node: WorkOrder(wo_123)
```

---

## Graph Database Schema

The graph is stored in PostgreSQL with dedicated tables (not a separate graph database):

```sql
-- Nodes table
CREATE TABLE knowledge.graph_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type       VARCHAR(50) NOT NULL,     -- e.g., 'design', 'project', 'ncr'
  domain          VARCHAR(50) NOT NULL,      -- e.g., 'engineering', 'quality'
  external_id     UUID NOT NULL,             -- reference to source entity
  project_id      UUID,                      -- optional, for project-scoped queries
  label           VARCHAR(300) NOT NULL,     -- human-readable name
  attributes      JSONB DEFAULT '{}',        -- domain-specific properties
  embedding       VECTOR(1536),              -- optional semantic embedding
  created_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE(node_type, external_id)
);

-- Edges table
CREATE TABLE knowledge.graph_edges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id  UUID NOT NULL REFERENCES knowledge.graph_nodes(id),
  target_node_id  UUID NOT NULL REFERENCES knowledge.graph_nodes(id),
  relation_type   VARCHAR(50) NOT NULL,     -- e.g., 'BELONGS_TO', 'PRODUCES'
  weight          DECIMAL(5,2) DEFAULT 1.0, -- relationship strength
  metadata        JSONB DEFAULT '{}',        -- context about the relationship
  created_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE(source_node_id, target_node_id, relation_type)
);

-- Indexes
CREATE INDEX idx_graph_nodes_type ON knowledge.graph_nodes (node_type);
CREATE INDEX idx_graph_nodes_domain ON knowledge.graph_nodes (domain);
CREATE INDEX idx_graph_nodes_external ON knowledge.graph_nodes (node_type, external_id);
CREATE INDEX idx_graph_edges_source ON knowledge.graph_edges (source_node_id);
CREATE INDEX idx_graph_edges_target ON knowledge.graph_edges (target_node_id);
CREATE INDEX idx_graph_edges_relation ON knowledge.graph_edges (relation_type);
```

---

## Query Patterns

### 1. Find all entities related to a project

```sql
WITH project_node AS (
  SELECT id FROM knowledge.graph_nodes
  WHERE node_type = 'project' AND external_id = :projectId
)
SELECT n.node_type, n.label, e.relation_type
FROM knowledge.graph_edges e
JOIN knowledge.graph_nodes n ON n.id = CASE
  WHEN e.source_node_id = (SELECT id FROM project_node) THEN e.target_node_id
  ELSE e.source_node_id
END
WHERE e.source_node_id = (SELECT id FROM project_node)
   OR e.target_node_id = (SELECT id FROM project_node);
```

### 2. Impact analysis ("What if we change Design X?")

```sql
-- Find all entities downstream of a design
WITH RECURSIVE impact AS (
  -- Base: starting node
  SELECT id, node_type, label, 0 AS depth
  FROM knowledge.graph_nodes
  WHERE node_type = 'design' AND external_id = :designId

  UNION ALL

  -- Recursive: follow edges outward
  SELECT n.id, n.node_type, n.label, i.depth + 1
  FROM impact i
  JOIN knowledge.graph_edges e ON e.source_node_id = i.id
  JOIN knowledge.graph_nodes n ON n.id = e.target_node_id
  WHERE i.depth < 5  -- limit traversal depth
)
SELECT DISTINCT node_type, label, depth FROM impact
ORDER BY depth, node_type;
```

### 3. Root cause analysis ("Why did NCR X happen?")

```sql
-- Trace backward from NCR to root cause
WITH RECURSIVE root_cause AS (
  SELECT id, node_type, label, 0 AS depth
  FROM knowledge.graph_nodes
  WHERE node_type = 'ncr' AND external_id = :ncrId

  UNION ALL

  SELECT n.id, n.node_type, n.label, r.depth + 1
  FROM root_cause r
  JOIN knowledge.graph_edges e ON e.target_node_id = r.id
  JOIN knowledge.graph_nodes n ON n.id = e.source_node_id
  WHERE r.depth < 10
)
SELECT node_type, label, depth FROM root_cause
ORDER BY depth DESC;
```

### 4. Similarity search ("Find similar designs")

```sql
-- Using node embeddings
SELECT n.label, n.attributes,
       1 - (n.embedding <=> :targetEmbedding) AS similarity
FROM knowledge.graph_nodes n
WHERE n.node_type = 'design'
  AND n.id != :currentNodeId
ORDER BY similarity DESC
LIMIT 10;
```

### 5. Cross-domain trace (Full lifecycle of a project)

```sql
SELECT n.node_type AS entity_type,
       n.domain,
       n.label,
       e.relation_type,
       parent.label AS parent_entity
FROM knowledge.graph_nodes n
JOIN knowledge.graph_edges e ON e.target_node_id = n.id
JOIN knowledge.graph_nodes parent ON parent.id = e.source_node_id
WHERE n.project_id = :projectId
ORDER BY n.node_type, n.label;
```

---

## Graph Visualization

The knowledge graph can be visualized in the UI using a force-directed graph layout:

```
[Project]
    │
    ├──[BELONGS_TO]──► [Design: Mold Base]
    │                       │
    │                       ├──[PRODUCES]──► [BOM: v1]
    │                       │                   │
    │                       │                   ├──[CONTAINS]──► [BOMItem: Plate A]
    │                       │                   ├──[CONTAINS]──► [BOMItem: Pin B]
    │                       │
    │                       ├──[APPROVED_BY]──► [User: Engineer A]
    │
    ├──[BELONGS_TO]──► [WorkOrder: WO-001]
    │                       │
    │                       ├──[ASSIGNED_TO]──► [Machine: CNC-01]
    │                       ├──[EXECUTED_AS]──► [ProductionRun: RUN-001]
    │                       │                       │
    │                       │                       └──[VERIFIED_BY]──► [InspectionResult: IR-001]
    │                       │                                             │
    │                       │                                             └──[TRIGGERED]──► [NCR: NCR-001]
    │                       │                                                               │
    │                       │                                                               └──[ADDRESSED_BY]──► [CAPA: CAPA-001]
```

---

## AI Integration

The knowledge graph provides context for the AI Copilot:

### Retrieval Flow

```
User Query: "What's the impact of changing pin material in design D-001?"
    │
    ▼
AI Copilot parses intent: impact_analysis
    │
    ▼
Graph Query: Traverse from Design(D-001) following
             PRODUCES, CONTAINS edges to find BOMItems
    │
    ▼
Graph Result: BOMItem(Plate A, Steel), BOMItem(Pin B, HSS)
    │
    ▼
Flattened context sent to LLM with query
    │
    ▼
Response with explanation and affected entities
```

### Knowledge Growth

```
Project Completed ──► Extract entities ──► Update graph nodes
                         │
                         ├── Create KnowledgeEntry with embeddings
                         ├── Link to source entities (DERIVED_FROM)
                         └── Link similar entries (SIMILAR_TO)
```

The graph does not replace the document store or relational database. It is an **index and relationship layer** that enables graph-based queries across all domains. The source of truth remains the domain tables.
