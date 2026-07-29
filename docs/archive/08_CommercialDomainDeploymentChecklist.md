# Commercial Domain Deployment Checklist

## Sprint 1 — Pre-Deployment Checks

---

### Database Migrations

| # | Migration | Description | Status |
|---|-----------|-------------|--------|
| 1 | `1700000000008-CommercialDomainSprint1.ts` | Creates `customers`, `contacts` tables, adds `project_id`/`terms` to `quotations`, updates status constraints | ✅ |
| 2 | `1700000000009-CommercialDomainForeignKeys.ts` | Adds FK from `contacts.customer_id` → `customers.id`, `quotations.enquiry_id` → `enquiries.id`, `quotation_items.quotation_id` → `quotations.id` | ✅ |

**Migration order:** Must run #8 before #9.

### Database Rollback

```bash
# Rollback to pre-Sprint 1 state
npx typeorm migration:revert  # reverts #9
npx typeorm migration:revert  # reverts #8
```

### Deployment Steps

1. **Run migrations**
   ```bash
   cd mitra-backend
   npm run migration:run
   ```

2. **Verify migrations applied**
   ```bash
   npm run migration:show
   ```

3. **Build backend**
   ```bash
   npm run build
   ```

4. **Build frontend**
   ```bash
   cd mitra-frontend
   npm run build
   ```

5. **Smoke test**
   ```bash
   # Verify endpoints respond
   curl -H "Authorization: Bearer $JWT" http://localhost:3000/commercial/customers
   curl -H "Authorization: Bearer $JWT" http://localhost:3000/commercial/enquiries
   curl -H "Authorization: Bearer $JWT" http://localhost:3000/commercial/quotations
   ```

### Verification After Deployment

| Check | Command |
|-------|---------|
| Customer creation | `curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"name":"Test Corp"}' http://localhost:3000/commercial/customers` |
| Quotation from RFQ | Create enquiry → submit → create quotation → send → accept → verify project created |
| FK constraint | Try deleting customer with contacts → verify contacts cascade deleted |

### New Files Deployed

| File | Type |
|------|------|
| `src/modules/commercial/entities/customer.entity.ts` | NEW |
| `src/modules/commercial/entities/contact.entity.ts` | NEW |
| `src/modules/commercial/dto/customer.dto.ts` | NEW |
| `src/modules/commercial/dto/contact.dto.ts` | NEW |
| `src/modules/commercial/services/customer.service.ts` | NEW |
| `src/modules/commercial/controllers/customer.controller.ts` | NEW |
| `src/modules/commercial/events/commercial.events.ts` | NEW |
| `src/common/interfaces/knowledge-hook.interface.ts` | NEW |
| `src/database/migrations/1700000000008-CommercialDomainSprint1.ts` | NEW |
| `src/database/migrations/1700000000009-CommercialDomainForeignKeys.ts` | NEW |

### Modified Files

| File | Changes |
|------|---------|
| `commercial.module.ts` | Added Customer, Contact entities; CustomerService, CustomerController; QuotationService, QuotationController; forwardRef(ProjectModule) |
| `enquiry.service.ts` | Added submit/review/cancel/markLost methods; fixed markLost validation |
| `enquiry.controller.ts` | Added action endpoints; @HttpCode(201) on create; fixed tenantId param |
| `quotation.service.ts` | New file; fixed generateQuotationNumber bug |
| `quotation.controller.ts` | New file; removed unused ProjectStage import |
| `customer.entity.ts` | Fixed eager:true removed |
| `CustomersPage.tsx` | Restructured form to match backend DTO |
| `QuotationsPage.tsx` | Added workflow action buttons and modals |

### Environment Requirements

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | - | JWT signing secret |
| No new environment variables added | - | - | Sprint 1 doesn't add new env vars |
