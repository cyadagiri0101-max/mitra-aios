# MITRA M12.5 SPRINT 2 — SECURITY & GOVERNANCE GATE
**STATUS:** SECURITY CONSTRAINTS VERIFIED & ENFORCED

---

## 1. Security Invariants for Frontend Implementation
1. **Server-Derived Tenant Resolution:** The frontend must never pass `tenantId` in request bodies or query parameters. Tenant context is resolved strictly from JWT credentials on the backend.
2. **Client-Side Authorization as UX Only:** Role checks on the UI (e.g. disabling allocation creation for non-planners) are purely ergonomic. Backend `RolesGuard` remains the authoritative policy enforcement point.
3. **No Autonomous Decision Execution:** The UI must display explicit badges indicating that recommendations are advisory:
   $$\mathbf{isAutonomousDecision:\ false}$$
   Reallocation actions require explicit human confirmation via modal forms.
4. **Secret Protection:** No API keys, JWT secrets, or administrative credentials in frontend source code.
5. **Read-Only Engineering Library:** Zero frontend features may attempt file write, rename, or deletion operations against `MitraEngineeringLibrary`.
