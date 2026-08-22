# Validation Rules

Validation rules for Phase 1 analysis are limited to structural consistency, header normalization, and numeric parsing.

## General validation rules

- Preserve source file metadata including file name, sheet name, and row context.
- Skip blank rows and comment-only rows in structured worksheets.
- Infer header rows when explicit headers are missing.

## Field validation rules

- `CYCLE TIME` should parse to numeric seconds.
- `PRODUCT WEIGHT` should parse to numeric grams where possible.
- `QTY` / `Quantity` should parse to numeric quantity values.
- `Rate` and `Amount` should parse to numeric currency values when parseable.
- `project_code` should match `^[A-Z]{1,4}d{2,5}$` when extracted.

## Structural validation rules

- Detect and document merged cells rather than treating them as data values.
- Treat inconsistent column counts as a warning condition.

## Output requirements

- Generate a gap report that lists ambiguous headers, unknown codes, duplicate project numbers, and unrecognized folders.