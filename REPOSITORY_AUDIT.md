# MITRA Repository Audit — Sprint 1 Baseline

Date: 2026-07-29

Executive Summary
- Objective: inventory temporary/debug/experimental files and classify them (KEEP / ARCHIVE / DELETE) without making automatic deletions. Preserve Sprint 1 baseline.
- Outcome: identified a small set of temporary and backup artifacts, an embedded `.venv` and `.ai_back up` artifact directories, several single-file debug helpers, and many outstanding TODO/FIXME markers in docs and code. Recommendations: archive large, non-source artifacts; remove or add to .gitignore runtime venvs; consolidate backups into `archive/` and add README for retention policy.

Evidence (selected)
- `.venv/` — local Python virtualenv checked in (many files under .venv/). Recommend: ARCHIVE or REMOVE from repo and add to `.gitignore`.
- `.ai_back up/` (note space in name) — large generated/backup index artifacts present. Recommend: ARCHIVE.
- `mitra-backend/docker-compose.backup.yml` — backup compose file. Recommend: ARCHIVE.
- `mitra-backend/seed-output.txt` — seed run output. Recommend: ARCHIVE.
- `bundle-search.txt`, `dummy.txt`, `dummy-search.txt` — development artifacts. Recommend: DELETE or move to `archive/`.
- `clean-room-validation.sh` — environment validation script used during debugging. Classification: KEEP (document and move to `scripts/validation/` in future) or ARCHIVE depending on policy.
- `migration-backup/` and `mitra-backend/scripts/backup/` — backup scripts and results. Recommend: ARCHIVE with retention note.
- `scripts/workflow_certification_probe.py` — validation probe used in certification. KEEP (operational), but update to match schema (already patched). Add a tests/integration note.
- `test/jest-e2e.json` and `mitra-backend/test/setup-test-db.sh` — e2e test scaffolding. KEEP, record improvements in TECHNICAL_DEBT_REGISTER.
- Many `TODO` / `FIXME` markers: 479 matches across ~111 files (search result snapshot). Recommend triage and ticketing.

Findings (classified)
- KEEP
  - `scripts/workflow_certification_probe.py` — live operational probe used for certification.
  - `mitra-backend/test/jest-e2e.json` and test setup helpers — keep as part of test harness.
  - `README` and primary docs (ARCHITECTURE.md, DOMAIN_MODEL.md, etc.) — keep; will be audited in docs phase.

- ARCHIVE
  - `.ai_back up/` directory (generated indexes / backups)
  - `.venv/` (local virtualenv snapshots)
  - `mitra-backend/docker-compose.backup.yml`
  - `mitra-backend/seed-output.txt` and other ad-hoc run logs
  - `migration-backup/` and `mitra-backend/scripts/backup/` outputs (keep scripts, archive results)

- DELETE (or move to `archive/` if retention needed)
  - `dummy.txt`, `dummy-search.txt`, `bundle-search.txt` (dev scratch files)
  - Single-use temp files created during ad-hoc runs (search pattern: `*-backup`, `*-output.txt`) unless required for audit retention.

Recommendations
- Add or update `.gitignore` to exclude runtime artifacts: `.venv/`, `*.output.txt`, `*.backup.yml`.
- Create an `archive/` top-level folder and move large, older artifacts there (manual step, do not delete automatically). Add `archive/README.md` with retention policy.
- Triage `TODO`/`FIXME` items into the backlog; prioritize security and test gaps first.
- Consolidate backup scripts under `scripts/backup/` and ensure produced artifacts are explicitly placed under `archive/`.

Priority & Estimated Effort
- High: remove/ignore `.venv/` and other binary blobs from git (1–2h, low risk)
- Medium: archive backup artifacts and add `archive/README.md` (2–4h)
- Medium: triage top-priority TODO/FIXME into tickets (4–8h across team)
- Low: delete dev scratch files after confirmation (1–2h)

Notes
- No automatic deletions performed by this audit. All archive/delete actions should be reviewed and executed as separate PRs.
