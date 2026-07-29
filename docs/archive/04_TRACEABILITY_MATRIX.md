# Traceability Matrix

> Maps business requirements → specifications → implementation across all layers.
> Reference: Constitution → Roadmap → Architecture → Implementation

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Complete / matches spec |
| ⚠️ | Partial / needs work |
| ❌ | Missing / not implemented |
| — | Not applicable |

---

## 1. Commercial Domain

### Business Requirement: Digitize customer acquisition

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Customer management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Contact management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| RFQ management | ⚠️ EnquiryController | ⚠️ EnquiriesPage | ⚠️ enquiries | ⚠️ /commercial/enquiries | ❌ | ✅ |
| Quotation management | ⚠️ QuotationEntity | ⚠️ QuotationsPage | ⚠️ quotations | ⚠️ No dedicated controller | ❌ | ✅ |
| Quotation→Project conversion | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| RFQ lifecycle (draft→submitted→quoted→won/lost) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quotation lifecycle (draft→sent→accepted→rejected) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Requirement Score** | **20%** | **30%** | **20%** | **10%** | **0%** | **60%** |

---

## 2. Project Domain

### Business Requirement: Manage complete mold development

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Project CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project stage transitions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Milestone management | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ✅ |
| Task management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Team management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Timeline / Gantt | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Project health calculation | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **Requirement Score** | **55%** | **30%** | **55%** | **40%** | **30%** | **100%** |

---

## 3. Engineering Domain

### Business Requirement: Manage engineering activities

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Design part management | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Drawing revision control | ✅ | ❌ | ✅ | ⚠️ | ❌ | ✅ |
| Design approval workflow | ⚠️ | ❌ | ✅ | ❌ | ❌ | ✅ |
| BOM management | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| BOM release/revise lifecycle | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Process planning | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Engineering change management | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Engineering decision log | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Requirement Score** | **55%** | **50%** | **60%** | **30%** | **0%** | **100%** |

---

## 4. Manufacturing Domain

### Business Requirement: Digitize manufacturing execution

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Machine master data | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Machine status tracking | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Machine allocation | ⚠️ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Production planning | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Work order management | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Work order lifecycle | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Production run recording | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Trial management | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| **Requirement Score** | **35%** | **40%** | **50%** | **20%** | **5%** | **100%** |

---

## 5. Quality Domain

### Business Requirement: Ensure quality throughout lifecycle

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Inspection plan management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Inspection result recording | ❌ | ❌ | ⚠️ | ❌ | ❌ | ✅ |
| NCR management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| NCR lifecycle (open→investigation→actioned→closed) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CAPA management | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| CAPA lifecycle (initiated→in_progress→verification→closed) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CAPA action management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| NCR→CAPA link enforcement | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quality reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Requirement Score** | **5%** | **10%** | **10%** | **5%** | **0%** | **100%** |

---

## 6. Service Domain

### Business Requirement: Support molds after delivery

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Dispatch management | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| Dispatch status (prepared→shipped→delivered) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Installation tracking | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Maintenance logging | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Service request management | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| Service request lifecycle | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Warranty management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Spare parts inventory | ⚠️ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Requirement Score** | **15%** | **20%** | **20%** | **10%** | **0%** | **100%** |

---

## 7. Knowledge Domain

### Business Requirement: Capture and reuse engineering knowledge

| Spec Requirement | Backend | Frontend | Database | API | Tests | Deploy |
|-----------------|---------|----------|----------|-----|-------|--------|
| Document management | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| Engineering knowledge base | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Knowledge graph nodes | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Knowledge graph edges | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Graph traversal queries | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Impact analysis | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI copilot | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vector search / embeddings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Requirement Score** | **35%** | **40%** | **35%** | **35%** | **15%** | **100%** |

---

## 8. Cross-Cutting

### Event System
| Spec Requirement | Implemented | Verified |
|-----------------|-------------|----------|
| Event bus (Redis Streams) | ❌ | No EventDispatcher service |
| Domain events published | ❌ | Zero events emitted |
| Event consumers | ❌ | Zero subscribers |
| Event versioning | ❌ | Not implemented |
| Dead-letter queue | ❌ | Not implemented |
| **Score** | **0%** | |

### Workflow Engine
| Spec Requirement | Implemented | Verified |
|-----------------|-------------|----------|
| State machine engine | ✅ | WorkflowService with state/transition entities |
| Mold project lifecycle | ✅ | 16-stage MOLD_ALLOWED_TRANSITIONS |
| Domain integration | ❌ | Only project uses workflow engine |
| Transition history | ✅ | WorkflowInstance.history JSONB |
| Guard enforcement | ✅ | Role and permission checks on transitions |
| **Score** | **60%** | |

### Security
| Spec Requirement | Implemented | Verified |
|-----------------|-------------|----------|
| JWT Authentication | ✅ | JwtAuthGuard, JwtStrategy, login/refresh |
| RBAC enforcement | ✅ | RolesGuard, PermissionsGuard (global) |
| Audit logging | ✅ | AuditInterceptor + AuditService |
| TLS/HTTPS | ⚠️ | Nginx config exists, dev mode HTTP |
| Field-level encryption | ❌ | Not implemented |
| Secrets management | ❌ | No Vault, no Docker secrets |
| File access security | ❌ | No presigned URLs |
| **Score** | **55%** | |

### Testing
| Spec Requirement | Backend | Frontend |
|-----------------|---------|----------|
| Unit tests | ✅ 28 spec files | ❌ 0 files |
| Integration tests | ⚠️ 5 e2e files | — |
| E2E tests | ❌ Not for domains | ❌ |
| Coverage > 80% | ❌ Not measured | ❌ |
| CI integration | ✅ | ❌ |
| **Score** | **40%** | **0%** |
