"""
PMM Data Library — Data Models (Dataclasses)
============================================
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class BlowMold:
    """Blow Mold project record."""
    original_tool_no: str
    normalized_project_no: str
    project_type: str
    description: str
    cavity: Optional[str] = None
    machine: Optional[str] = None
    volume: Optional[str] = None
    neck_type: Optional[str] = None
    end_customer: Optional[str] = None
    neck_material: Optional[str] = None
    body_material: Optional[str] = None
    base_material: Optional[str] = None
    inserts_cost: Optional[float] = None
    mask_parts_cost: Optional[float] = None
    mold_base_cost: Optional[float] = None
    std_part_cost: Optional[float] = None
    fasteners_cost: Optional[float] = None
    elec_cost: Optional[float] = None
    alpla_std_parts: Optional[float] = None
    wooden_box: Optional[float] = None
    total_cost: Optional[float] = None
    status: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


@dataclass
class InjectionMold:
    """Injection Mold project record."""
    original_tool_no: str
    normalized_project_no: str
    project_type: str
    description: str
    end_customer: Optional[str] = None
    status: Optional[str] = None
    mold_dispatch_date: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


@dataclass
class JobWork:
    """Job Work / Spare Parts record."""
    job_no: str
    description: str
    project_description: Optional[str] = None
    status: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


@dataclass
class ALPLAStdPart:
    """ALPLA Standard Parts record."""
    original_tool_no: str
    normalized_project_no: Optional[str] = None
    project_type: Optional[str] = None
    description: Optional[str] = None
    m_c_plat_form: Optional[str] = None
    neck_type: Optional[str] = None
    std_parts_status: Optional[str] = None
    mold_status: Optional[str] = None
    po_number: Optional[str] = None
    po_release_date: Optional[str] = None
    alpla_quote_no: Optional[str] = None
    remarks: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


@dataclass
class CommercialMold:
    """Commercial Mold Base record."""
    prathiraj_mold_no: str
    customer_mold_no: Optional[str] = None
    supplied_to: Optional[str] = None
    description: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


@dataclass
class PartListSummary:
    """Part List Cost Summary record."""
    project_no: str
    revision: str
    file_path: str
    inserts_cost: Optional[float] = None
    mask_parts_cost: Optional[float] = None
    mold_base_cost: Optional[float] = None
    standard_parts_cost: Optional[float] = None
    fasteners_cost: Optional[float] = None
    electrodes_cost: Optional[float] = None
    total_cost: Optional[float] = None


@dataclass
class PartListDetail:
    """Part List Detail record (individual parts)."""
    project_no: str
    revision: str
    part_category: str
    description: str
    material: Optional[str] = None
    quantity: Optional[str] = None
    rate: Optional[str] = None
    amount: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None
