# Analytics Module Specification

## Business Objectives
- Provide operational and business intelligence across all domains.
- Enable data-driven decision making through dashboards, KPIs, and reports.
- Surface trends, bottlenecks, and improvement opportunities.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Manager | manager | View executive dashboards, create ad-hoc reports |
| Admin | admin | Configure KPIs, manage report templates |
| Viewer | viewer | View predefined dashboards and reports |

## Business Rules
- Dashboards and reports reflect data from all domains via read-only queries.
- Data freshness is configurable per dashboard (real-time, hourly, daily).
- KPIs are calculated from domain events and entity states.
- Reports can be exported to PDF, CSV, and Excel.
- Report access respects RBAC — users see only data they have permission to view.

## KPI Definitions

### Commercial KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| Pipeline Value | Sum of open quotation amounts | Daily |
| Win Rate | Won quotations / Total quotations (period) | Monthly |
| Average Quotation Value | Total quotation value / Quotation count | Monthly |
| Lead-to-Quote Time | Average days from RFQ to quotation | Monthly |

### Project KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| On-Time Delivery | Projects completed on or before delivery_date | Weekly |
| Schedule Variance | (Actual completion - planned completion) in days | Weekly |
| Active Projects | Projects not in "completed" status | Daily |
| Milestone Completion Rate | Completed milestones / Total milestones (period) | Weekly |

### Engineering KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| Design Approval Cycle | Average days from submission to approval | Weekly |
| Revision Frequency | Average revisions per design | Monthly |
| BOM Accuracy | (1 - BOM revisions / Total BOMs) × 100 | Monthly |

### Manufacturing KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| Production Output | Total quantity produced (period) | Daily |
| Scrap Rate | Scrap quantity / Produced quantity × 100 | Daily |
| Machine Utilization | Runtime / Available time × 100 | Daily |
| OEE | Availability × Performance × Quality | Daily |
| On-Time Work Orders | Work orders completed on schedule / Total | Weekly |

### Quality KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| NCR Rate | NCRs created / Total inspections (period) | Weekly |
| NCR Aging | Average days open NCRs have been open | Daily |
| CAPA Closure Rate | CAPAs closed / CAPAs initiated (period) | Monthly |
| First Pass Yield | Passed inspections / Total inspections × 100 | Daily |

### Service KPIs
| KPI | Formula | Refresh |
|-----|---------|---------|
| Response Time | Average hours from request to first action | Weekly |
| Resolution Time | Average days from request to resolution | Weekly |
| SLA Compliance | Requests resolved within SLA / Total × 100 | Weekly |
| Warranty Claim Rate | Claims filed / Active warranties | Monthly |

## Entity Models

Analytics data is served from **materialized views** and **read-only query endpoints**, not from dedicated domain tables. Each KPI has a corresponding materialized view refreshed on the configured schedule.

### Materialized Views (examples)
```sql
CREATE MATERIALIZED VIEW analytics.kpi_win_rate AS
SELECT
  DATE_TRUNC('month', accepted_at) AS month,
  COUNT(*) FILTER (WHERE status = 'accepted') AS won,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL / COUNT(*) * 100, 1) AS win_rate
FROM commercial.quotations
GROUP BY month;

CREATE MATERIALIZED VIEW analytics.kpi_machine_utilization AS
SELECT
  m.id AS machine_id,
  m.name AS machine_name,
  DATE_TRUNC('day', pr.start_time) AS day,
  SUM(EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) / 3600) AS runtime_hours
FROM manufacturing.machines m
LEFT JOIN manufacturing.work_orders wo ON wo.machine_id = m.id
LEFT JOIN manufacturing.production_runs pr ON pr.work_order_id = wo.id
GROUP BY m.id, m.name, day;
```

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/analytics/dashboards | List available dashboards |
| GET | /api/v1/analytics/dashboards/{id} | Get dashboard with widgets |
| GET | /api/v1/analytics/kpis | List all KPIs |
| GET | /api/v1/analytics/kpis/{kpi} | Get KPI value with history |
| GET | /api/v1/analytics/reports | List available reports |
| POST | /api/v1/analytics/reports/generate | Generate report (returns download URL) |
| GET | /api/v1/analytics/export/{reportId} | Download exported report |

## Events
Analytics is a consumer-only domain. It subscribes to events to refresh materialized views:
- All domain events → KPI recalculation triggers

## Permissions
| Resource | admin | manager | viewer |
|----------|-------|---------|--------|
| dashboard | CRUD | CRUD | R |
| kpi | R | R | R |
| report | CRUD | CRUD | R |
| export | CRUD | CRUD | R |

## Reports
- **Executive Summary** — All KPIs across domains, period-over-period comparison
- **Project Performance** — Detailed project-level schedule and budget variance
- **Manufacturing Report** — Production output, machine utilization, scrap analysis
- **Quality Report** — NCR trends, CAPA effectiveness, defect Pareto
- **Service Report** — Response/resolution times, warranty claims analysis
- **Custom Reports** — User-defined filters, dimensions, and metrics

## Dashboards
- **Executive Dashboard** — High-level KPIs across all domains (RAG status)
- **Commercial Pipeline** — Sales funnel, win rate, pipeline value
- **Project Portfolio** — Active projects, on-time delivery rate, schedule variance
- **Manufacturing** — OEE, machine utilization, scrap rate, output trends
- **Quality** — NCR rate, defect Pareto, CAPA status, first pass yield
- **Service** — Open requests, SLA compliance, warranty claims

## AI Capabilities
- **Trend Detection** (future) — Automatically surface statistically significant trends.
- **Anomaly Alerting** (future) — Alert when KPIs deviate beyond thresholds.
- **Forecasting** (future) — Predict future KPI values based on historical data.
- **Natural Language Query** (future) — "What was our scrap rate last quarter?" via AI Copilot.

## Integration Points
- **All Domains** — Reads from materialized views sourced from all domain tables.
- **Knowledge Domain** — Analytics data indexed for cross-reference.

## Future Enhancements
- Custom dashboard builder (drag-and-drop widgets).
- Scheduled report delivery via email.
- Drill-down from dashboard KPI to underlying data.
- Benchmarking against industry standards.
