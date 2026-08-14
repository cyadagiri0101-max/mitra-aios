# PretestExecutionInvestigation

## Objective

Prove whether `npm run test:e2e` invokes `pretest:e2e` and whether the full E2E execution flow runs against the same prepared environment.

## Findings

### 1. package.json validation

The backend `package.json` defines:

- `pretest:e2e`: `bash test/setup-test-db.sh`
- `test:e2e`: `jest --config ./test/jest-e2e.json`

This confirms the intended npm lifecycle: `npm run test:e2e` should automatically invoke `pretest:e2e` before Jest.

### 2. npm lifecycle evidence

A verbose npm execution of `npm run test:e2e --loglevel verbose` produced these lifecycle lines:

- `npm verbose title npm run test:e2e`
- `> mitra-v2-backend@3.2.0 pretest:e2e`
- `> bash test/setup-test-db.sh`
- `> mitra-v2-backend@3.2.0 test:e2e`
- `> jest --config ./test/jest-e2e.json`

This proves `pretest:e2e` is executed and is not bypassed by npm.

### 3. Executed commands

The exact executed command flow from npm is:

1. `bash test/setup-test-db.sh`
2. `jest --config ./test/jest-e2e.json`

No alternative lifecycle path was observed.

### 4. Environment and runtime configuration

The npm lifecycle evidence shows the pretest hook is invoked. However, the current investigation has not yet proven whether the Jest runtime process uses the same prepared database connection settings as the setup script.

### 5. Root cause status

- Verified: `pretest:e2e` is executed as part of `npm run test:e2e`.
- Not proven: the cause of the failing E2E run is NOT npm lifecycle bypass.
- Therefore: the next issue to investigate is the runtime application startup/environment used by Jest, not the npm script flow.

### 6. Minimal fix

No fix to npm scripts is required at this stage.

If a fix is needed later, it would be limited to ensuring the lifecycle scripts remain configured as:

- `pretest:e2e`: `bash test/setup-test-db.sh`
- `test:e2e`: `jest --config ./test/jest-e2e.json`

No application code changes were made.

## Evidence

- `package.json` scripts:
  - `pretest:e2e`: `bash test/setup-test-db.sh`
  - `test:e2e`: `jest --config ./test/jest-e2e.json`
- npm verbose lifecycle output proving `pretest:e2e` runs prior to `test:e2e`.

## Conclusion

The npm lifecycle is correct. `pretest:e2e` is not skipped. The failure is not caused by npm bypassing the pretest lifecycle.

The next verified step is to inspect the actual Jest runtime startup and environment used during `test:e2e`.
