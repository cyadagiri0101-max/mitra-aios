# Machine Validation Report
**Date:** 2026-07-03 14:35:53

## 4.1 Machines in Database

Total machines: **25**

| Machine Code | Machine Name | Type | Status |
|--------------|-------------|------|--------|
| Running Cycle Times - Other Machines | Running Cycle Times - Other Machines | Blow | INVALID |
| SPEEDEX | SPEEDEX | Blow | OK |
| SIKA | SIKA | Blow | OK |
| MAGIC | MAGIC | Blow | OK |
| CMP | CMP | Blow | OK |
| KAUTEX | KAUTEX | Blow | OK |
| SPEEDEX 100 | SPEEDEX 100 | Blow | OK |
| Merper | Merper | Blow | OK |
| CMP 1.0 Lit | CMP 1.0 Lit | Blow | INVALID |
| UMS 100 | UMS 100 | Blow | OK |
| Quoted Cycle Times | Quoted Cycle Times | Blow | OK |
| UNILOY | UNILOY | Blow | OK |
| UMS 140 | UMS 140 | Blow | OK |
| Running Cycle Times - ALPLA Machines | Running Cycle Times - ALPLA Machines | Blow | INVALID |
| BMU70E+ | BMU70E+ | Blow | OK |
| SEB101 | SEB101 | Blow | OK |
| SSB65 | SSB65 | Blow | OK |
| Machine performance Ranking | Machine performance Ranking | Blow | INVALID |
| KOTEX | KOTEX | Blow | OK |
| Notes :- | Notes :- | Blow | INVALID |
| 1. Cycle Time depends on the Product weight and ma | 1. Cycle Time depends on the Product weight and machine performace | Blow | INVALID |
| 2. For Kotex , sika and speedex - there will be no | 2. For Kotex , sika and speedex - there will be no major difference in cycle | Blow | INVALID |
| time even if it runs with single station | time even if it runs with single station | Blow | INVALID |
| BMU TC | BMU TC | Blow | OK |
| BMU70E | BMU70E | Blow | OK |

**Invalid machines:** 8

These are text notes/descriptions, not machine names:
- `Running Cycle Times - Other Machines`
- `CMP 1.0 Lit`
- `Running Cycle Times - ALPLA Machines`
- `Machine performance Ranking`
- `Notes :-`
- `1. Cycle Time depends on the Product weight and ma`
- `2. For Kotex , sika and speedex - there will be no`
- `time even if it runs with single station`

## 4.2 Machines from Source (Cycle Times File)

Source machines: 23

- `1. Cycle Time depends on the Product weight and machine performace` (NOTE - not a machine)
- `2. For Kotex , sika and speedex - there will be no major difference in cycle` (NOTE - not a machine)
- `BMU70E+` (VALID)
- `CMP` (VALID)
- `CMP 1.0 Lit` (NOTE - not a machine)
- `KAUTEX` (VALID)
- `KOTEX` (VALID)
- `MAGIC` (VALID)
- `Machine performance Ranking` (NOTE - not a machine)
- `Merper ` (VALID)
- `Notes :-` (NOTE - not a machine)
- `Quoted Cycle Times` (VALID)
- `Running Cycle Times - ALPLA Machines` (NOTE - not a machine)
- `Running Cycle Times - Other Machines` (NOTE - not a machine)
- `SEB101` (VALID)
- `SIKA` (VALID)
- `SPEEDEX` (VALID)
- `SPEEDEX 100` (VALID)
- `SSB65` (VALID)
- `UMS 100` (VALID)
- `UMS 140` (VALID)
- `UNILOY` (VALID)
- `time even if it runs with single station` (NOTE - not a machine)

## 4.3 Defects Found

- **Invalid machine entries:** 8 text rows imported as machines.
- **Root Cause:** Parser does not filter out text notes from the MACHINE column.
- **Impact:** Machine directory contains non-machine entries.

## 4.3 Post-Fix Results (2026-07-03)

**Text filtering has been implemented in `parsers/cycle_time_parser.py`.**

| Metric | Before Fix | After Fix | Status |
|--------|-----------|-----------|--------|
| Invalid machine entries | 6 | 0 | **FIXED** |
| Total machines in DB | 25 | 17 | **FIXED** |

**Implementation:** The parser now skips entries that:
- Start with `1.`, `2.`, `Notes`, `Machine performance`, `Running`, `Quoted`, or `time even`
- Are longer than 50 characters and contain `.` or `:` (indicating sentences, not machine names)

**Removed entries:**
- `1. Cycle Time depends on the Product weight and machine performace`
- `2. For Kotex , sika and speedex - there will be no major difference in cycle`
- `Machine performance Ranking`
- `Notes :-`
- `time even if it runs with single station`

**Remaining:** None.
