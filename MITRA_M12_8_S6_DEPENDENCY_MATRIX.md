# MITRA M12.8 S6 DEPENDENCY MATRIX

**GOVERNANCE POLICY:** Zero Additional External Dependencies
**DATE:** 2026-08-25

---

## 1. Subsystem Dependencies

| Workstream | Required Capabilities | Built-in Framework / Service | NPM Packages Added |
|---|---|---|---|
| **S6.1 Knowledge Fabric** | Metadata hashing, ORM entities | `crypto`, `typeorm` | **0** |
| **S6.2 Data Library** | SHA-256 state tracking | `fs`, `path`, `node:sqlite` | **0** |
| **S6.3 Advanced GraphRAG**| Graph traversal & fusion | `EngineeringHybridFusionService` | **0** |
| **S6.4 Semantic Intelligence**| Terminology & tolerance parsing | `EngineeringSynonymService` | **0** |
| **S6.5 Cross-Project AI** | Multi-project variance tool | `CrossProjectIntelligenceService` | **0** |
| **S6.6 Grounded Copilot** | Citation parsing, prompt templates | `EngineeringCitationValidatorService` | **0** |
| **S6.7 Benchmark Platform**| Empirical test assertions | `jest`, `ts-jest` | **0** |
| **S6.8 AI Observability** | Execution metrics logging | `@nestjs/common` `Logger` | **0** |
| **S6.9 Frontend UX** | Evidence-first UI views | React 18, Tailwind CSS, Lucide icons | **0** |
| **S6.10 Performance** | Sub-second in-memory fusion | Node.js V8 runtime | **0** |

$$\mathbf{NEW\_DEPENDENCIES = 0}$$
$$\mathbf{DATABASE\_MIGRATIONS = 0}$$
