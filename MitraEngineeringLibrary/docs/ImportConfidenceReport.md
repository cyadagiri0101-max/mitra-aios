# Import Confidence Report
**Date:** 2026-07-03 16:15:07

## 5.1 Confidence by Table
Confidence = (filled fields / total expected fields) x 100

| Table | Confidence | Status |
|-------|-----------|--------|
| project_master | 100.0% | HIGH |
| product_master | 75.3% | MEDIUM |
| cycle_time_history | 46.3% | LOW |
| process_planning | 100.0% | HIGH |
| part_list | 87.4% | HIGH |
| component_detail | 81.5% | HIGH |

## 5.2 Recommendations
- LOW confidence tables need parser improvements.
- MEDIUM confidence tables need NULL handling.
- HIGH confidence tables are production-ready.
