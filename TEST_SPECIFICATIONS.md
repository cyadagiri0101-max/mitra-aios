# Test Specifications

## Purpose

This document defines the testing strategy, coverage requirements, and test implementation standards for MITRA.

---

## Testing Pyramid

```
         ╱─────╲
        ╱  E2E  ╲          ← Critical user journeys (Playwright)
       ╱─────────╲
      ╱Integration╲         ← API contract + service tests (Jest + Supertest)
     ╱─────────────╲
    ╱   Unit Tests   ╲      ← Services, utils, domain logic (Jest/Vitest)
   ╱───────────────────╲
```

| Level | Target | Coverage | Runs On |
|-------|--------|----------|---------|
| Unit | Services, utilities, domain logic | 80%+ | Every commit |
| Integration | Controllers + services + DB | 70%+ | Every PR |
| E2E | Critical user journeys | Key paths | Before release |
| Performance | API endpoints under load | N/A | Before release |

---

## Backend Testing

### Framework: Jest + Supertest

### Unit Tests

**Pattern:** Test services in isolation with mocked dependencies.

```typescript
// src/domains/engineering/services/design.service.spec.ts
describe('DesignService', () => {
  let service: DesignService;
  let repository: MockType<DesignRepository>;
  let eventDispatcher: MockType<EventDispatcher>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DesignService,
        { provide: DesignRepository, useFactory: mockRepository },
        { provide: EventDispatcher, useFactory: mockEventDispatcher },
      ],
    }).compile();

    service = module.get(DesignService);
    repository = module.get(DesignRepository);
    eventDispatcher = module.get(EventDispatcher);
  });

  describe('submitForReview', () => {
    it('should transition design to under_review when conditions met', async () => {
      repository.findById.mockResolvedValue(createMockDesign({ status: 'draft', cadFileRef: 'file.step' }));
      const result = await service.submitForReview('des_001', { actorId: 'user_001' });
      expect(result.status).toBe('under_review');
      expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'under_review' }));
      expect(eventDispatcher.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'design.submitted' }));
    });

    it('should throw when design has no CAD file', async () => {
      repository.findById.mockResolvedValue(createMockDesign({ status: 'draft', cadFileRef: null }));
      await expect(service.submitForReview('des_001', { actorId: 'user_001' }))
        .rejects.toThrow('Cannot submit: CAD file not uploaded');
    });

    it('should throw when design is already approved', async () => {
      repository.findById.mockResolvedValue(createMockDesign({ status: 'approved' }));
      await expect(service.submitForReview('des_001', { actorId: 'user_001' }))
        .rejects.toThrow('Cannot submit: Design is already approved');
    });
  });
});
```

### Integration Tests

**Pattern:** Test controller + service with real database (test container or in-memory).

```typescript
// test/integration/engineering/designs.integration.spec.ts
describe('POST /api/v1/engineering/designs/:id/submit', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, TestDatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Seed test data
    authToken = await createTestUser(app, ['engineer']);
    await seedDesign(app, { id: 'des_001', projectId: 'proj_001', cadFileRef: 'file.step' });
  });

  it('should return 200 and transition design to under_review', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/engineering/designs/des_001/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Ready for review' })
      .expect(200);

    expect(response.body.data.status).toBe('under_review');

    // Verify event was published
    const event = await getPublishedEvent('design.submitted', 'des_001');
    expect(event).toBeDefined();
    expect(event.data.submittedBy).toBeDefined();
  });

  it('should return 401 without auth token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/engineering/designs/des_001/submit')
      .expect(401);
  });

  it('should return 403 for viewer role', async () => {
    const viewerToken = await createTestUser(app, ['viewer']);
    await request(app.getHttpServer())
      .post('/api/v1/engineering/designs/des_001/submit')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });
});
```

### What to Test Per Domain

| Domain | Unit Test Targets | Integration Test Targets |
|--------|-------------------|------------------------|
| Commercial | CustomerService, RfqService, QuotationService | Customer CRUD, RFQ workflow, Quotation lifecycle |
| Project | ProjectService, MilestoneService, TaskService | Project CRUD, milestone completion, task transitions |
| Engineering | DesignService, BomService, ProcessPlanService, EngineeringChangeService | Design approval flow, BOM release, EC lifecycle |
| Manufacturing | WorkOrderService, ProductionRunService, TrialService | Work order lifecycle, run recording, trial result |
| Quality | InspectionService, NcrService, CapaService | Inspection result, NCR workflow, CAPA lifecycle |
| Service | DispatchService, ServiceRequestService | Dispatch creation, service request resolution |
| Security | AuthService, PermissionGuard | Login, token refresh, permission enforcement |

---

## Frontend Testing

### Framework: Vitest + React Testing Library

### Component Tests

```typescript
// src/pages/engineering/DesignList/DesignList.test.tsx
describe('DesignList', () => {
  it('should display designs in a table', async () => {
    mockApi.getDesigns.mockResolvedValue(mockDesigns);

    render(<DesignList projectId="proj_001" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('DSN-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('should show empty state when no designs exist', async () => {
    mockApi.getDesigns.mockResolvedValue([]);

    render(<DesignList projectId="proj_001" />);

    await waitFor(() => {
      expect(screen.getByText(/No designs yet/i)).toBeInTheDocument();
    });
  });

  it('should navigate to create design on button click', async () => {
    const navigate = vi.fn();
    render(<DesignList projectId="proj_001" />, { wrapper: withRouter(navigate) });

    await userEvent.click(screen.getByText('Create Design'));
    expect(navigate).toHaveBeenCalledWith('/engineering/designs/new?project=proj_001');
  });
});
```

### Hook Tests

```typescript
// src/hooks/usePermissions.test.ts
describe('usePermissions', () => {
  it('should return true when user has the required permission', () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: { 'engineering:design': ['create', 'read'] } },
    });
    const { result } = renderHook(() => usePermission('engineering:design', 'create'));
    expect(result.current).toBe(true);
  });

  it('should return false when user lacks the required permission', () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: { 'engineering:design': ['read'] } },
    });
    const { result } = renderHook(() => usePermission('engineering:design', 'create'));
    expect(result.current).toBe(false);
  });
});
```

### What to Test in Frontend

| Category | Examples |
|----------|----------|
| List pages | Renders data, empty state, loading state, error state |
| Detail pages | Renders entity info, tabs, action buttons visibility |
| Forms | Validation errors, submission behavior, success state |
| State transitions | Button enabled/disabled based on current state |
| Permissions | UI elements shown/hidden based on user role |

---

## E2E Tests

### Framework: Playwright

### Critical Journeys

```typescript
// e2e/critical-journeys/quote-to-project.spec.ts
test('Quote-to-Project full flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@mitra.local');
  await page.fill('[name="password"]', 'testPassword123!');
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL('/');

  // Create customer
  await page.click('text=Commercial');
  await page.click('text=Customers');
  await page.click('text=New Customer');
  await page.fill('[name="name"]', 'E2E Test Customer');
  await page.click('text=Save');
  await expect(page.locator('text=E2E Test Customer')).toBeVisible();

  // Create RFQ
  await page.click('text=RFQs');
  await page.click('text=New RFQ');
  await page.selectOption('[name="customer_id"]', 'E2E Test Customer');
  await page.click('text=Save');
  await page.click('text=Submit');

  // Create quotation
  await page.click('text=Quote');
  await page.fill('[name="amount"]', '50000');
  await page.click('text=Save');
  await page.click('text=Send');

  // Accept quotation → creates project
  await page.click('text=Accept');
  await page.fill('[name="project_name"]', 'E2E Test Project');
  await page.click('text=Confirm');

  // Verify project created
  await page.click('text=Project');
  await expect(page.locator('text=E2E Test Project')).toBeVisible();
});
```

### Key Journeys to Cover

| Journey | Domains | Priority |
|---------|---------|----------|
| Quote-to-Project | Commercial → Project | Critical |
| Design-to-BOM-Release | Engineering | Critical |
| Work-Order-to-Production | Engineering → Manufacturing | Critical |
| Inspection-to-NCR-to-CAPA | Manufacturing → Quality | Critical |
| Dispatch-to-Installation | Quality → Service | High |
| Login-to-Dashboard | Security | Critical |

---

## Performance Tests

### API Benchmarking

```typescript
// test/performance/projects.list.perf.ts
describe('GET /api/v1/project/projects (performance)', () => {
  it('should respond within 200ms with 10K projects seeded', async () => {
    await seedProjects(10000);

    const start = Date.now();
    const response = await request(app.getHttpServer())
      .get('/api/v1/project/projects?page=1&pageSize=20&status=engineering')
      .set('Authorization', `Bearer ${adminToken}`);

    const duration = Date.now() - start;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200); // ms
    expect(response.body.meta.totalItems).toBeGreaterThan(0);
  });
});
```

### Performance Targets

| Endpoint Type | Target (p95) | Load |
|--------------|-------------|------|
| List (paginated) | < 200ms | 10K records |
| Detail (single) | < 100ms | 10K records |
| Create | < 500ms | Standard payload |
| State transition | < 500ms | Standard payload |
| Login | < 1s | Standard |
| Report generation | < 5s | 100K records |

---

## Coverage Targets

| Module | Unit | Integration |
|--------|------|-------------|
| Commercial | 85% | 75% |
| Project | 85% | 75% |
| Engineering | 85% | 75% |
| Manufacturing | 80% | 70% |
| Quality | 85% | 75% |
| Service | 80% | 70% |
| Security/Auth | 90% | 80% |
| Shared/Common | 90% | - |

---

## Test Infrastructure

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: mitra_test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  e2e:
    needs: unit
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16, env: { POSTGRES_DB: mitra_test, POSTGRES_PASSWORD: test }, ports: ['5432:5432'] }
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```
