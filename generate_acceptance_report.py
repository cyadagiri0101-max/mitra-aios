import json

with open(r"D:\Mitra3.0\acceptance_evidence.json", "r") as f:
    evidence = json.load(f)

with open(r"D:\Mitra3.0\acceptance_summary.json", "r") as f:
    summary = json.load(f)

lines = []
lines.append("# Acceptance Evidence Report")
lines.append("")
lines.append(f"**Date:** {summary['timestamp']}")
lines.append(f"**Total Checks:** {summary['total_checks']}")
lines.append(f"**Passed:** {summary['pass']}")
lines.append(f"**Failed:** {summary['fail']}")
lines.append("")
lines.append("## Summary Metrics")
lines.append("")

# Calculate category summaries
categories = {}
for e in evidence:
    cat = e["category"]
    if cat not in categories:
        categories[cat] = {"pass": 0, "fail": 0, "total": 0}
    categories[cat]["total"] += 1
    if e["status"] == "PASS":
        categories[cat]["pass"] += 1
    else:
        categories[cat]["fail"] += 1

lines.append("| Category | Pass | Fail | Total |")
lines.append("|----------|------|------|-------|")
for cat, stats in categories.items():
    lines.append(f"| {cat} | {stats['pass']} | {stats['fail']} | {stats['total']} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## Detailed Evidence")
lines.append("")

current_category = None
for e in evidence:
    if e["category"] != current_category:
        current_category = e["category"]
        lines.append(f"### {current_category}")
        lines.append("")
    lines.append(f"**Check:** {e['check']}")
    lines.append("")
    lines.append(f"**Status:** {'✅ PASS' if e['status'] == 'PASS' else '❌ FAIL'}")
    lines.append("")
    lines.append("**Query / Endpoint:**")
    lines.append(f"```")
    lines.append(f"{e['query']}")
    lines.append(f"```")
    lines.append("")
    lines.append(f"**Expected:** {e['expected']}")
    lines.append("")
    lines.append(f"**Actual:** {e['actual']}")
    lines.append("")
    lines.append(f"**Record Count:** {e['count']}")
    lines.append("")
    if e['samples']:
        lines.append("**Sample Records:**")
        lines.append("```json")
        lines.append(json.dumps(e['samples'], indent=2, default=str))
        lines.append("```")
        lines.append("")
    lines.append(f"**Root Cause:** {e['root_cause']}")
    lines.append("")
    if e['issue_type']:
        lines.append(f"**Issue Type:** {e['issue_type']}")
        lines.append("")
    lines.append("---")
    lines.append("")

with open(r"D:\Mitra3.0\docs\AcceptanceEvidenceReport.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Generated docs/AcceptanceEvidenceReport.md")
