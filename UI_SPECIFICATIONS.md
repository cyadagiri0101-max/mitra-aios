# UI Specifications

## Purpose

This document defines the UI architecture, component library, layout patterns, and navigation structure for MITRA.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 + Vite | SPA application shell |
| Language | TypeScript (strict mode) | Type safety |
| Routing | React Router v6 | Lazy-loaded domain routes |
| State | React Query (server) + Context (local) | Data fetching and UI state |
| Forms | React Hook Form + Zod | Form validation |
| Styling | Tailwind CSS | Utility-first styling |
| Components | Headless UI + custom | Accessible primitives |
| Icons | Lucide React | Consistent icon set |
| Charts | Recharts / D3 | Dashboard visualizations |
| Testing | Vitest + React Testing Library | Component testing |
| E2E | Playwright | Integration testing |

---

## Layout Structure

```
┌──────────────────────────────────────────────┐
│                  App Shell                     │
│  ┌──────┬──────────────────────────────────┐  │
│  │      │          Top Header              │  │
│  │      │  ┌──────┬──────┬──────┬──────┐   │  │
│  │ Side │  │Search│Notifications│Profile│   │  │
│  │ Bar  │  └──────┴──────┴──────┴──────┘   │  │
│  │      ├──────────────────────────────────┤  │
│  │  Nav │                                  │  │
│  │ ─────│         Main Content             │  │
│  │ CRM  │         (Outlet)                 │  │
│  │ Proj │                                  │  │
│  │ Eng  │                                  │  │
│  │ Mfg  │                                  │  │
│  │ Qual │                                  │  │
│  │ Serv │                                  │  │
│  │ Intelligence│                          │  │
│  │      └──────────────────────────────────┘  │
│  └──────┴──────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Shell Components

| Component | Description |
|-----------|-------------|
| `AppShell` | Root layout — sidebar + header + content area |
| `Sidebar` | Domain navigation with icons, active state, collapse toggle |
| `TopHeader` | Search bar, notification bell, user profile dropdown |
| `Breadcrumb` | Current location trail with domain/resource/id |
| `PageHeader` | Page title, action buttons, status badge |

---

## Navigation Structure

### Sidebar Menu
```
Commercial
├── Customers
├── RFQs
└── Quotations

Project
├── Projects
├── Milestones
├── Tasks
├── Teams
└── Timeline

Engineering
├── Designs
├── BOMs
├── Process Plans
└── Engineering Changes

Manufacturing
├── Production Plans
├── Machines
├── Work Orders
├── Production Runs
└── Trials

Quality
├── Inspection Plans
├── Inspection Results
├── NCRs
└── CAPAs

Service
├── Dispatch
├── Installations
├── Maintenance
├── Service Requests
└── Warranty

Analytics
├── Dashboards
├── KPIs
└── Reports

Administration
├── Users
├── Roles
└── Audit Log
```

### Route Structure
```typescript
const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Dashboard
      { path: '/', element: <Dashboard /> },

      // Commercial
      { path: '/commercial/customers', element: <CustomerList /> },
      { path: '/commercial/customers/:id', element: <CustomerDetail /> },
      { path: '/commercial/rfqs', element: <RfqList /> },
      { path: '/commercial/rfqs/:id', element: <RfqDetail /> },
      { path: '/commercial/quotations', element: <QuotationList /> },
      { path: '/commercial/quotations/:id', element: <QuotationDetail /> },

      // Project
      { path: '/project/projects', element: <ProjectList /> },
      { path: '/project/projects/:id', element: <ProjectDetail /> },
      { path: '/project/projects/:id/timeline', element: <ProjectTimeline /> },
      { path: '/project/projects/:id/tasks', element: <TaskBoard /> },

      // Engineering
      { path: '/engineering/designs', element: <DesignList /> },
      { path: '/engineering/designs/:id', element: <DesignDetail /> },
      { path: '/engineering/boms', element: <BomList /> },
      { path: '/engineering/boms/:id', element: <BomDetail /> },
      { path: '/engineering/process-plans', element: <ProcessPlanList /> },
      { path: '/engineering/engineering-changes', element: <EcList /> },

      // Manufacturing
      { path: '/manufacturing/plans', element: <ProductionPlanList /> },
      { path: '/manufacturing/machines', element: <MachineList /> },
      { path: '/manufacturing/work-orders', element: <WorkOrderList /> },
      { path: '/manufacturing/trials', element: <TrialList /> },

      // Quality
      { path: '/quality/inspection-plans', element: <InspectionPlanList /> },
      { path: '/quality/ncrs', element: <NcrList /> },
      { path: '/quality/ncrs/:id', element: <NcrDetail /> },
      { path: '/quality/capas', element: <CapaList /> },

      // Service
      { path: '/service/dispatch', element: <DispatchList /> },
      { path: '/service/service-requests', element: <ServiceRequestList /> },

      // Analytics
      { path: '/analytics/dashboards', element: <DashboardList /> },
      { path: '/analytics/kpis', element: <KpiDashboard /> },
      { path: '/analytics/reports', element: <ReportList /> },

      // Admin
      { path: '/admin/users', element: <UserList /> },
      { path: '/admin/roles', element: <RoleList /> },
      { path: '/admin/audit', element: <AuditLog /> },
    ],
  },
];
```

---

## Common UI Patterns

### Data Table
```
┌──────────────────────────────────────────────────┐
│ [Search...]      [Filter ▼]    [+ New Project]   │
├──────┬──────────┬──────────┬─────────┬──────────┤
│  #   │   Name   │  Status  │  Due    │ Actions  │
├──────┼──────────┼──────────┼─────────┼──────────┤
│  1   │ Proj A   │ Engineering │ 15-Dec │ [...] │
│  2   │ Proj B   │ Manufacturing │ 20-Jan │ [...] │
├──────┴──────────┴──────────┴─────────┴──────────┤
│ Page 1 of 10  [<] [1] [2] [...] [10] [>]         │
└──────────────────────────────────────────────────┘
```

**Component: `DataTable`**
```typescript
interface DataTableProps<T> {
  columns: ColumnDefinition<T>[];
  data: T[];
  loading?: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
}
```

### Detail Page
```
┌──────────────────────────────────────────────────┐
│ [← Back]  Project: Acme Panel     Status: ● Active │
├──────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │  Info Panel    │  │   Activity Timeline    │  │
│  │  Customer:...  │  │   - Design approved    │  │
│  │  Start:...     │  │   - BOM released       │  │
│  │  Delivery:...  │  │   - Work order started │  │
│  │  Priority:...  │  └────────────────────────┘  │
│  └───────────────┘                               │
│  ┌────────────────────────────────────────────┐  │
│  │  Tab: [Milestones] [Tasks] [Team] [Files]  │  │
│  ├────────────────────────────────────────────┤  │
│  │  Tab Content (outlet)                       │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### State Transition Button
```
[Submit] [Approve] [Reject] [Request Changes]
```
- Buttons only appear when the user has permission AND the transition is valid from the current state.
- Disabled button with tooltip explaining why it's unavailable.

### Status Badge
```
Status: ● draft     (gray)
        ● submitted (blue)
        ● approved  (green)
        ● rejected  (red)
        ● on_hold   (amber)
```

---

## Form Conventions

| Pattern | Implementation |
|---------|---------------|
| Form library | React Hook Form |
| Validation | Zod schema (mirrors DTO validation) |
| Submit button | Disabled while submitting, shows spinner |
| Errors | Inline below each field + summary toast |
| Required fields | Marked with red asterisk |
| Autosave | No — explicit save action |
| Confirmation | Destructive actions require confirmation dialog |

### Confirmation Dialog
```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## Responsive Behavior

| Breakpoint | Width | Layout |
|------------|-------|--------|
| sm | < 640px | Single column, sidebar collapsed to hamburger |
| md | 640-1023px | Two columns, sidebar as overlay |
| lg | 1024-1279px | Sidebar visible + main content |
| xl | >= 1280px | Sidebar + main + optional detail panel |

---

## Accessibility Requirements

- All interactive elements must be keyboard accessible.
- Forms use proper `<label>` associations.
- Status changes announced via aria-live regions.
- Color is never the sole indicator of status (use icons + text).
- Minimum contrast ratio: 4.5:1 for normal text.
- All icons have `aria-label` or `title` attributes.

---

## Empty State

```
┌────────────────────────────────────────┐
│                                        │
│           📄 No designs yet             │
│     Create your first design to        │
│     get started with this project.     │
│                                        │
│          [+ Create Design]             │
│                                        │
└────────────────────────────────────────┘
```

---

## Loading State

```
┌────────────────────────────────────────┐
│  ┌──────┐ ┌─────────────────────────┐  │
│  │ ████ │ │ ██████████████████████  │  │
│  │ ████ │ │ ██████████████████████  │  │
│  │ ████ │ │ ██████████████████████  │  │
│  └──────┘ └─────────────────────────┘  │
│           Loading...                    │
└────────────────────────────────────────┘
```
- Use skeleton loaders matching the final layout shape.
- Never show a full-page spinner for data loading.

---

## Error State

```
┌────────────────────────────────────────┐
│                                        │
│           ⚠ Something went wrong       │
│      Could not load project data.      │
│                                        │
│          [Try Again]  [Go Back]        │
│                                        │
└────────────────────────────────────────┘
```
- Distinguish between network errors, permission errors, and not-found errors.
- Show different messages and recovery actions for each.
