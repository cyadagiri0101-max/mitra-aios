"""
PMM Data Library — Utility Functions
=====================================
Tool number normalization and project type inference.
"""
import re
from typing import Optional, Tuple


def normalize_tool_number(tool_no: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Normalize a tool number to standard format.

    Returns:
        (original, normalized, project_type)
        • M-xxx   → BMxxx   (Blow Mold, early numbering)
        • BM-xxx  → BMxxx   (Blow Mold, current numbering)
        • T-xxxx  → T-xxxx  (Blow Mold, legacy/customer numbers, kept as-is)
        • IM-xx   → IMxxx   (Injection Mold, 3-digit padded)
        • CMB-xx  → CMBxxx  (Commercial Mold Base)
        • S-xx    → S-xx    (Job Work / Spare, kept as-is)

    Examples:
        >>> normalize_tool_number("M-15")
        ('M-15', 'BM015', 'BM')
        >>> normalize_tool_number("BM-243")
        ('BM-243', 'BM243', 'BM')
        >>> normalize_tool_number("T-1147")
        ('T-1147', 'T-1147', 'BM')
        >>> normalize_tool_number("IM-8")
        ('IM-8', 'IM008', 'IM')
        >>> normalize_tool_number("IM-35")
        ('IM-35', 'IM035', 'IM')
    """
    if not tool_no or str(tool_no).strip().lower() in ('nan', 'none', '', 'null'):
        return None, None, None

    tool_no = str(tool_no).strip()

    match = re.match(r'^([A-Za-z]+)[-\s]?(\d+)([A-Z]|\([A-Z]\))?$', tool_no)
    if not match:
        return tool_no, tool_no, "UNKNOWN"

    prefix, num, suffix = match.groups()
    prefix = prefix.upper()
    suffix = suffix.replace('(', '').replace(')', '') if suffix else ""

    if prefix == "M":
        return tool_no, f"BM{num.zfill(3)}", "BM"
    elif prefix == "BM":
        return tool_no, f"BM{num.zfill(3)}", "BM"
    elif prefix == "IM":
        return tool_no, f"IM{num.zfill(3)}", "IM"
    elif prefix == "T":
        return tool_no, tool_no, "BM"
    elif prefix == "CMB":
        return tool_no, f"CMB{num.zfill(3)}", "CMB"
    elif prefix in ("S", "SPARE"):
        return tool_no, tool_no, "JOB_WORK"
    else:
        return tool_no, tool_no, "OTHER"


def infer_project_type(tool_no: str) -> str:
    """Infer project type from a raw tool number."""
    _, _, ptype = normalize_tool_number(tool_no)
    return ptype or "UNKNOWN"


def sort_key(project_no: str) -> tuple:
    """Return a sortable key for BM/IM numbers."""
    if not project_no:
        return ("ZZZ", 999999)
    m = re.match(r'([A-Z]+)(\d+)', str(project_no))
    if m:
        return (m.group(1), int(m.group(2)))
    return (str(project_no), 0)
