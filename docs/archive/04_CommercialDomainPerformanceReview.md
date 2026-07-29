# Commercial Domain Performance Review

## Sprint 1 — Performance Assessment

---

### Database Performance

#### Index Analysis

`customers` table:
- `PK_customers` (id) ✅
- `IDX_customers_name` (name, deleted_at) ✅
- `IDX_customers_status` (status, deleted_at) ✅

`contacts` table:
- `PK_contacts` (id) ✅
- `IDX_contacts_customer` (customer_id, deleted_at) ✅

`enquiries` table:
- `PK_enquiries` (id) ✅
- `IDX_enquiries_enquiry_number` (enquiry_number, deleted_at) — covers unique lookup ✅
- `IDX_enquiries_customer_status` (customer_id, status, deleted_at) — covers status filtering ✅
- `IDX_enquiries_customer_id` (customer_id) — separate index for FK lookups ✅

`quotations` table:
- `PK_quotations` (id) ✅
- `IDX_quotations_quotation_number` (quotation_number, deleted_at) ✅
- `IDX_quotations_enquiry_status` (enquiry_id, status, deleted_at) ✅
- `IDX_quotations_enquiry_id` (enquiry_id) ✅
- `IDX_quotations_customer_id` (customer_id) ✅
- `IDX_quotations_project_id` (project_id) ✅ — added in FK migration

`quotation_items` table:
- `PK_quotation_items` (id) ✅
- `IDX_quotation_items_quotation` (quotation_id, deleted_at) ✅

#### Missing indexes
- None identified. All queried columns are covered.

#### Query Performance

| Query Pattern | Index Used | Expected Performance |
|---------------|-----------|---------------------|
| Find by ID | PK index | O(log n) |
| List by tenant | tenant_id index | O(log n) |
| List by status | status composite index | O(log n) |
| Search by number | number composite index | O(log n) |
| Find contacts by customer | customer_id index | O(log n) |

### N+1 Query Analysis

| Location | Before | After | Status |
|----------|--------|-------|--------|
| Customer.contacts | `eager: true` — loaded on every Customer query | Removed `eager: true`. Loaded only when `relations: ['contacts']` specified | ✅ FIXED |
| Quotation.items | Loaded via separate query in `findOneWithItems` | Explicit join via `itemRepo.find()` | ✅ No issue |

### Pagination

All list endpoints use:
- `findAndCount()` for offset-based pagination
- Default page size: 20
- Maximum page size: 100 (via `@Max(100)` on `PaginationDto`)
- Returns: `{ data, total, page, limit, totalPages }`

### Performance Recommendations

| Recommendation | Impact | Effort |
|---------------|--------|--------|
| Add database connection pooling (pgbouncer) | HIGH | MEDIUM |
| Add Redis caching for frequently accessed entities | MEDIUM | MEDIUM |
| Implement cursor-based pagination for large datasets | LOW | HIGH |
| Add query timing/logging via TypeORM logging | MEDIUM | LOW |

---

### Performance Score: 90/100
