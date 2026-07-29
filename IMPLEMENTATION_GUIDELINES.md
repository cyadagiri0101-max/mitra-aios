# Implementation Guidelines

## Purpose

This document defines the coding, testing, review, and deployment standards for MITRA development.

---

## Development Workflow

1. Branch from `main` for each feature or fix.
2. Implement following the domain boundaries defined in the architecture.
3. Write tests alongside implementation.
4. Submit pull request for review.
5. Pass all CI checks before merge.
6. Squash-merge to `main`.

---

## Coding Standards

### General

- TypeScript for all backend and frontend code.
- Strong typing required — no `any` unless unavoidable.
- ESLint + Prettier for consistent formatting.
- No commented-out code. Use version control.
- Functions should do one thing and be testable.

### Backend (NestJS)

- **Structure:** One NestJS module per bounded context.
- **Controllers:** Thin — handle HTTP concerns only.
- **Services:** Business logic lives here.
- **Repositories:** Data access abstraction.
- **DTOs:** Define input/output contracts per endpoint.
- **Validation:** Use class-validator decorators on DTOs.
- **Error handling:** Use NestJS exception filters — no raw try/catch in controllers.
- **Authentication:** Passport + JWT.
- **Authorization:** Custom guards checking RBAC on every protected route.
- **Audit logging:** Use a decorator or interceptor — never inline audit calls.
- **Database:** TypeORM with migrations. Schema-per-domain pattern (separate schemas for each bounded context).

**Naming conventions:**
```
domains/
└── {domain}/
    ├── {domain}.module.ts
    ├── controllers/
    │   └── {entity}.controller.ts
    ├── services/
    │   └── {entity}.service.ts
    ├── entities/
    │   └── {entity}.entity.ts
    ├── dto/
    │   ├── create-{entity}.dto.ts
    │   └── update-{entity}.dto.ts
    └── repositories/
        └── {entity}.repository.ts
```

### Frontend (React + Vite)

- **Structure:** Feature folders mirror the domain model.
- **Components:** Small, focused, composable.
- **State management:** React Query for server state; Context for local state.
- **API calls:** Typed clients generated or manually defined per domain.
- **Forms:** React Hook Form + Zod validation.
- **Routing:** React Router with lazy-loaded domain routes.
- **Styling:** Tailwind CSS with consistent design tokens.

---

## Testing Standards

### Backend Tests

- **Unit tests:** Jest. Test services in isolation (mocked repositories).
- **Integration tests:** Test controllers + services with test database.
- **E2E tests:** Supertest — test full request/response cycle.
- **Coverage target:** Minimum 80% line coverage per domain module.

### Frontend Tests

- **Unit tests:** Vitest for utility functions and hooks.
- **Component tests:** React Testing Library — test behavior, not implementation.
- **E2E tests:** Playwright for critical user journeys.

### Test Naming

```
// Unit
describe('{ServiceName}', () => {
  describe('{methodName}', () => {
    it('should {expected behavior} when {condition}', () => { ... });
  });
});

// Integration
describe('{ControllerName} ({method} /{route})', () => {
  it('should return {status} when {condition}', () => { ... });
});
```

### What to Test

- Core business logic and domain rules.
- Edge cases and error conditions.
- Authorization enforcement (unauthorized users get 401/403).
- Audit log entries are created on significant operations.
- Traceability fields (`projectId`, `created_at`) are populated.

---

## Review Standards

Every pull request must be reviewed before merging.

### Reviewer Checklist

- [ ] Code follows the domain boundaries (no leaking across contexts).
- [ ] New entities carry `projectId` and traceability fields.
- [ ] Audit logging is implemented for mutations.
- [ ] RBAC is enforced on new routes.
- [ ] Tests cover the change.
- [ ] No secrets, credentials, or hardcoded configuration.
- [ ] DTOs validate input appropriately.
- [ ] Error responses follow the standard format.
- [ ] Documentation is updated if interfaces change.

---

## Deployment Standards

### Container Build

```dockerfile
# Backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main"]
```

```dockerfile
# Frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Pre-deployment Checks

- [ ] Backend builds (`npm run build`)
- [ ] Frontend builds (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Database migrations run without error
- [ ] RBAC seed data is current
- [ ] Environment variables are configured
- [ ] Docker Compose stack starts successfully

### Environment Configuration

- `.env` files are never committed.
- Configuration is validated at startup (fail fast on missing vars).
- Secrets use Docker secrets or environment variables — never hardcoded.
- Different compose files for dev vs production.
