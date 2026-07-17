/**
 * ANALYSIS: Why is project.tenant_id NULL even though admin user has tenant_id?
 * 
 * TRACE:
 * 1. ProjectController.create() receives user.tenantId from @CurrentUser() (which uses JwtAuthGuard)
 * 2. Controller calls service.create(dto, user.id, user.tenantId)
 * 3. ProjectService.create() receives tenantId parameter
 * 4. ProjectService creates project WITHOUT explicitly setting tenantId
 * 5. IndustrialSubscriber.beforeInsert() should auto-populate tenantId from requestContextStorage
 * 
 * THEORY:
 * The tenantId might not be in the request context because:
 * A) RequestContextInterceptor didn't run yet (unlikely - interceptors run after guards)
 * B) RequestContextInterceptor ran but didn't extract tenantId from req.user
 * C) req.user.tenantId is null/undefined (JWT token doesn't have it)
 * D) The AsyncLocalStorage is being destroyed before the beforeInsert hook runs
 * 
 * SOLUTION:
 * Check if tenantId parameter to ProjectService.create() should be explicitly assigned
 * instead of relying on request context.
 */

console.log(`
ROOT CAUSE ANALYSIS:
─────────────────────

ISSUE:
• POST /api/project succeeds (status 201)
• Project created in DB but with tenant_id = NULL
• GET /api/project returns 0 projects because it filters by user's tenant_id

DATABASE EVIDENCE:
• Admin user.tenant_id = 3b1862ad-23fd-4cb1-a6f4-dacad736d04c
• Created project.tenant_id = NULL
• Query: SELECT * FROM projects WHERE tenant_id = admin.tenant_id → 0 rows
• Query: SELECT * FROM projects WHERE tenant_id IS NULL → 1 row (our project!)

CODE FLOW:
1. ProjectController.create() receives @CurrentUser() user
   - user.tenantId should = 3b1862ad-23fd-4cb1-a6f4-dacad736d04c ✓

2. Controller calls ProjectService.create(dto, user.id, user.tenantId)
   - Parameters: (data, userId, tenantId)

3. ProjectService.create():
   • Creates project: this.projectRepo.create({ ...data, projectNumber, stage, ... })
   • Does NOT explicitly set: project.tenantId = tenantId
   • Saves project: this.projectRepo.save(project)
   • ⚠️  Relies on IndustrialSubscriber to set tenantId from request context

4. IndustrialSubscriber.beforeInsert():
   • Gets tenantId from requestContextStorage
   • Sets: event.entity.tenantId = tenantId (if entity.tenantId == null)
   • But RequestContext is populated by RequestContextInterceptor from req.user.tenantId
   • If req.user.tenantId is null, then requestContext.tenantId is null
   • Then IndustrialSubscriber doesn't set it!

ROOT CAUSE:
The ProjectService.create() method RECEIVES tenantId as a parameter but
IGNORES IT. Instead, it relies on the AsyncLocalStorage request context.

If the request context's tenantId is null or not set correctly, the project
will be created with tenant_id = NULL even though the parameter was passed.

EVIDENCE NEEDED:
✓ Admin user.tenant_id is not NULL
? Does the RequestContextInterceptor receive req.user.tenantId?
? Is the RequestContextInterceptor running BEFORE save()?
? Is AsyncLocalStorage context preserved across the save() call?

PROPOSED FIX:
Explicitly assign tenantId in ProjectService.create():

  const project = this.projectRepo.create({
    ...data,
    projectNumber,
    stage: ProjectStage.ENQUIRY,
    healthStatus: ProjectHealth.GREEN,
    stageEnteredAt: new Date(),
    createdBy: userId,
    updatedBy: userId,
    tenantId: tenantId ?? undefined,  // ← ADD THIS LINE
  });
`);
