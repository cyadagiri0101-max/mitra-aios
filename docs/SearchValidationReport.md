# Search Validation Report

**Date:** 2026-07-03  
**EKL Search Endpoint Used:** `GET /api/v1/projects?search={term}`  
**Mitra Search Endpoint Used:** `GET /api/v1/search?q={term}` (does not exist in EKL)

---

## 1. Method

Search terms were submitted directly to EKL's project search endpoint. Because Mitra's integration calls `/api/v1/search?q=...`, which is not implemented in EKL, the Mitra search path returns 404 for every term.

---

## 2. Search Results

### 2.1 Direct EKL Project Search

| Term | Projects Found | Notes |
|------|----------------|-------|
| BM454 | 1 | `BM454` project exists. |
| BM475 | 0 | No project with this number in EKL. |
| BM480 | 0 | No project with this number in EKL. |
| PD86 | 0 | No project with this prefix/number in EKL. |
| Vancouver | 0 | Not a project name in EKL. |
| Veedol | 0 | Not a project name in EKL (appears only in source file names). |
| Champagne | 2 | `BM161` and `BM162`, both named "Champagne 380ml". |
| Musketeer | 0 | Not a project name in EKL. |
| BMU70E+ | 0 | This is a machine code, not a project. |
| SEB101 | 0 | This is a machine code, not a project. |
| UMS100 | 0 | This is a machine code, not a project. |

### 2.2 Cross-Reference Against Other EKL Endpoints

| Term | `/projects?search=` | `/products?search=` | `/components?tool_no=` | Notes |
|------|---------------------|---------------------|------------------------|-------|
| Veedol | 0 | 0 | 0 | Source-file reference only. |
| Champagne | 2 | 1 | 0 | Product "Champagne 380ml" also exists. |
| BMU70E+ | 0 | 0 | 0 | Exists in `/machines` as machine code. |
| SEB101 | 0 | 0 | 0 | Exists in `/machines` as machine code. |
| UMS100 | 0 | 0 | 0 | Exists in `/machines` as machine code. |

---

## 3. Mitra Search Path Failure

Calling the path Mitra uses:

```bash
curl -s "http://localhost:8001/api/v1/search?q=BM454"
```

Result:

```json
{"detail":"Not Found"}
```

HTTP 404 for all terms. The `EngineeringLibraryService.search()` method therefore always throws `BadGatewayException` when EKL is reachable.

---

## 4. Conclusion

- EKL can search projects by name/number, but the endpoint is `/projects?search=`, not `/search`.
- Several requested terms are machine codes or source-file references rather than project names, so they naturally return no project matches.
- Mitra's search integration is currently non-functional due to the endpoint mismatch.

---

*Report generated automatically during EKL Integration Validation.*
