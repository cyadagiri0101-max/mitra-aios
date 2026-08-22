"""FastAPI REST API for MEKB — MITRA sync endpoints."""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, func, cast
from sqlalchemy.orm import Session
from sqlalchemy.types import String
from typing import List, Optional
from datetime import datetime

from models import SessionLocal, get_db
from models import (
    ProjectMaster, ProductMaster, MachineMaster, MaterialMaster,
    CycleTimeHistory, ProcessPlanning, PartList, ComponentDetail,
    DocumentIndex, ImportLog, DataSource, BottleFamily, NeckTypeMaster,
    CustomerMaster, FolderTemplateMaster, DocumentTypeMaster, EngineeringNote,
    ProjectCustomerLink,
)
from config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Mitra Engineering Knowledge Base — REST API for MITRA sync",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# HEALTH
# ============================================================
@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db_session)):
    try:
        project_count = db.query(ProjectMaster).count()
        return {
            "status": "healthy",
            "database": "connected",
            "projects": project_count,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {e}")


# ============================================================
# PROJECTS
# ============================================================
@app.get("/api/v1/projects", tags=["Projects"])
def list_projects(
    prefix: Optional[str] = Query(None, description="Filter by project prefix: BM, IM, IBM, PD, E, O, CMB, F, S"),
    search: Optional[str] = Query(None, description="Search in project name or number"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    q = db.query(ProjectMaster)
    if prefix:
        q = q.filter(ProjectMaster.project_prefix == prefix.upper())
    if search:
        like = f"%{search}%"
        q = q.filter(
            (ProjectMaster.project_number.ilike(like)) |
            (ProjectMaster.project_name.ilike(like))
        )
    total = q.count()
    rows = q.order_by(ProjectMaster.project_number).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": r.id,
                "project_number": r.project_number,
                "project_prefix": r.project_prefix,
                "project_name": r.project_name,
                "description": r.description,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "revision": r.revision,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/projects/{project_number}", tags=["Projects"])
def get_project(project_number: str, db: Session = Depends(get_db_session)):
    proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": proj.id,
        "project_number": proj.project_number,
        "project_prefix": proj.project_prefix,
        "project_name": proj.project_name,
        "description": proj.description,
        "status": proj.status,
        "created_at": proj.created_at.isoformat() if proj.created_at else None,
        "updated_at": proj.updated_at.isoformat() if proj.updated_at else None,
        "revision": proj.revision,
    }


@app.get("/api/v1/projects/{project_number}/cycle-times", tags=["Projects"])
def get_project_cycle_times(project_number: str, db: Session = Depends(get_db_session)):
    proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.query(CycleTimeHistory).filter(CycleTimeHistory.project_id == proj.id).all()
    return {
        "project_number": project_number,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "product_name": r.product_name,
                "product_weight_gm": r.product_weight_gm,
                "cavitation": r.cavitation,
                "cycle_time_sec": r.cycle_time_sec,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/projects/{project_number}/process-planning", tags=["Projects"])
def get_project_process_planning(project_number: str, db: Session = Depends(get_db_session)):
    proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.query(ProcessPlanning).filter(ProcessPlanning.project_id == proj.id).order_by(ProcessPlanning.step_number).all()
    return {
        "project_number": project_number,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "step_number": r.step_number,
                "step_name": r.step_name,
                "step_category": r.step_category,
                "status": r.status,
                "owner": r.owner,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/projects/{project_number}/part-list", tags=["Projects"])
def get_project_part_list(project_number: str, db: Session = Depends(get_db_session)):
    proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.query(PartList).filter(PartList.project_id == proj.id).all()
    return {
        "project_number": project_number,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "part_category": r.part_category,
                "part_number": r.part_number,
                "description": r.description,
                "material": r.material,
                "grade": r.grade,
                "quantity": r.quantity,
                "finished_size_l": r.finished_size_l,
                "finished_size_h": r.finished_size_h,
                "finished_size_w": r.finished_size_w,
                "weight": r.weight,
                "total_weight": r.total_weight,
                "rate": r.rate,
                "amount": r.amount,
                "supplier": r.supplier,
                "part_type": r.part_type,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/projects/{project_number}/documents", tags=["Projects"])
def get_project_documents(project_number: str, db: Session = Depends(get_db_session)):
    proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.query(DocumentIndex).filter(DocumentIndex.project_id == proj.id).order_by(DocumentIndex.serial_no).all()
    return {
        "project_number": project_number,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "serial_no": r.serial_no,
                "description": r.description,
                "sub_description": r.sub_description,
                "page_no": r.page_no,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/search", tags=["Search"])
def global_search(q: str = Query(..., description="Search term for engineering data"), db: Session = Depends(get_db_session)):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Invalid search query")
    like = f"%{query}%"

    project_rows = db.query(ProjectMaster).filter(
        or_(
            ProjectMaster.project_number.ilike(like),
            ProjectMaster.project_name.ilike(like),
            ProjectMaster.description.ilike(like),
        )
    ).order_by(ProjectMaster.project_number).limit(50).all()

    product_rows = db.query(ProductMaster).filter(
        or_(
            ProductMaster.product_name.ilike(like),
            ProductMaster.product_variant.ilike(like),
            ProductMaster.material.ilike(like),
            cast(ProductMaster.ai_tags, String).ilike(like),
        )
    ).limit(50).all()

    bottle_rows = db.query(BottleFamily).filter(
        or_(
            BottleFamily.family_name.ilike(like),
            BottleFamily.description.ilike(like),
            cast(BottleFamily.ai_tags, String).ilike(like),
        )
    ).limit(50).all()

    customer_rows = db.query(CustomerMaster).join(ProjectCustomerLink, ProjectCustomerLink.customer_id == CustomerMaster.id).filter(
        or_(
            CustomerMaster.customer_name.ilike(like),
            CustomerMaster.customer_code.ilike(like),
            cast(CustomerMaster.ai_tags, String).ilike(like),
        )
    ).distinct().limit(50).all()

    machine_rows = db.query(MachineMaster).filter(
        or_(
            MachineMaster.machine_code.ilike(like),
            MachineMaster.machine_name.ilike(like),
            MachineMaster.manufacturer.ilike(like),
            cast(MachineMaster.ai_tags, String).ilike(like),
        )
    ).limit(50).all()

    material_rows = db.query(MaterialMaster).filter(
        or_(
            MaterialMaster.material_code.ilike(like),
            MaterialMaster.material_name.ilike(like),
            MaterialMaster.material_type.ilike(like),
            MaterialMaster.grade.ilike(like),
            cast(MaterialMaster.ai_tags, String).ilike(like),
        )
    ).limit(50).all()

    neck_rows = db.query(NeckTypeMaster).filter(
        or_(
            NeckTypeMaster.neck_code.ilike(like),
            NeckTypeMaster.neck_name.ilike(like),
            NeckTypeMaster.thread_type.ilike(like),
            cast(NeckTypeMaster.ai_tags, String).ilike(like),
        )
    ).limit(50).all()

    cavitation_rows = db.query(CycleTimeHistory).filter(CycleTimeHistory.cavitation.ilike(like)).limit(50).all()

    document_rows = db.query(DocumentIndex).filter(
        or_(
            DocumentIndex.description.ilike(like),
            DocumentIndex.sub_description.ilike(like),
            DocumentIndex.remarks.ilike(like),
            DocumentIndex.source_file.ilike(like),
            DocumentIndex.source_sheet.ilike(like),
        )
    ).limit(50).all()

    return {
        "query": query,
        "project_results": [
            {
                "id": r.id,
                "project_number": r.project_number,
                "project_name": r.project_name,
                "description": r.description,
            }
            for r in project_rows
        ],
        "product_results": [
            {
                "id": r.id,
                "product_name": r.product_name,
                "product_variant": r.product_variant,
                "material": r.material,
                "volume_ml": r.volume_ml,
                "neck_type_id": r.neck_type_id,
            }
            for r in product_rows
        ],
        "bottle_family_results": [
            {
                "id": r.id,
                "family_name": r.family_name,
                "description": r.description,
            }
            for r in bottle_rows
        ],
        "customer_results": [
            {
                "id": r.id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
            }
            for r in customer_rows
        ],
        "machine_results": [
            {
                "id": r.id,
                "machine_code": r.machine_code,
                "machine_name": r.machine_name,
                "machine_type": r.machine_type,
                "max_cavitation": r.max_cavitation,
            }
            for r in machine_rows
        ],
        "material_results": [
            {
                "id": r.id,
                "material_code": r.material_code,
                "material_name": r.material_name,
                "material_type": r.material_type,
                "grade": r.grade,
            }
            for r in material_rows
        ],
        "neck_type_results": [
            {
                "id": r.id,
                "neck_code": r.neck_code,
                "neck_name": r.neck_name,
                "thread_type": r.thread_type,
            }
            for r in neck_rows
        ],
        "cavitation_results": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "cavitation": r.cavitation,
                "cycle_time_sec": r.cycle_time_sec,
            }
            for r in cavitation_rows
        ],
        "document_results": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "serial_no": r.serial_no,
                "description": r.description,
                "sub_description": r.sub_description,
                "page_no": r.page_no,
            }
            for r in document_rows
        ],
    }


@app.get("/api/v1/documents", tags=["Documents"])
def list_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db_session)):
    rows = db.query(DocumentIndex).order_by(DocumentIndex.id).offset(skip).limit(limit).all()
    return {
        "total": db.query(func.count(DocumentIndex.id)).scalar(),
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "serial_no": r.serial_no,
                "description": r.description,
                "sub_description": r.sub_description,
                "page_no": r.page_no,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/documents/{document_id}", tags=["Documents"])
def get_document(document_id: int, db: Session = Depends(get_db_session)):
    doc = db.query(DocumentIndex).filter(DocumentIndex.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "project_id": doc.project_id,
        "serial_no": doc.serial_no,
        "description": doc.description,
        "sub_description": doc.sub_description,
        "page_no": doc.page_no,
        "remarks": doc.remarks,
        "source_file": doc.source_file,
        "source_sheet": doc.source_sheet,
        "source_row": doc.source_row,
        "import_date": doc.import_date.isoformat() if doc.import_date else None,
    }


@app.get("/api/v1/dashboard/widgets", tags=["Dashboard"])
def get_dashboard_widgets(db: Session = Depends(get_db_session)):
    project_count = db.query(func.count(ProjectMaster.id)).scalar() or 0
    product_count = db.query(func.count(ProductMaster.id)).scalar() or 0
    document_count = db.query(func.count(DocumentIndex.id)).scalar() or 0
    latest_imports = db.query(ImportLog).order_by(ImportLog.started_at.desc()).limit(3).all()
    last_import = db.query(ImportLog).order_by(ImportLog.started_at.desc()).first()
    health = health_check(db)
    return {
        "projectCount": project_count,
        "productCount": product_count,
        "documentCount": document_count,
        "recentImports": [
            {
                "batchId": item.batch_id,
                "startedAt": item.started_at.isoformat() if item.started_at else None,
                "completedAt": item.completed_at.isoformat() if item.completed_at else None,
                "status": item.status,
                "filesProcessed": item.files_processed,
                "recordsImported": item.records_imported,
                "recordsUpdated": item.records_updated,
                "errorsCount": item.errors_count,
                "warningsCount": item.warnings_count,
            }
            for item in latest_imports
        ],
        "databaseHealth": {
            "status": health["status"],
            "database": health["database"],
            "projects": health["projects"],
            "timestamp": health["timestamp"],
        },
        "importStatus": {
            "lastBatchId": last_import.batch_id if last_import else None,
            "status": last_import.status if last_import else "unknown",
            "startedAt": last_import.started_at.isoformat() if last_import and last_import.started_at else None,
            "completedAt": last_import.completed_at.isoformat() if last_import and last_import.completed_at else None,
            "recordsImported": last_import.records_imported if last_import else 0,
            "errorsCount": last_import.errors_count if last_import else 0,
            "warningsCount": last_import.warnings_count if last_import else 0,
        },
    }


# ============================================================
# PRODUCTS
# ============================================================
@app.get("/api/v1/products", tags=["Products"])
def list_products(
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    q = db.query(ProductMaster)
    if search:
        like = f"%{search}%"
        q = q.filter(ProductMaster.product_name.ilike(like))
    total = q.count()
    rows = q.offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": r.id,
                "product_name": r.product_name,
                "product_variant": r.product_variant,
                "volume_ml": r.volume_ml,
                "weight_gm": r.weight_gm,
                "height_mm": r.height_mm,
                "material": r.material,
                "shape": r.shape,
                "description": r.description,
                "revision": r.revision,
            }
            for r in rows
        ],
    }


# ============================================================
# MACHINES
# ============================================================
@app.get("/api/v1/machines", tags=["Machines"])
def list_machines(
    type: Optional[str] = Query(None, description="Blow, Injection, IBM"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    q = db.query(MachineMaster)
    if type:
        q = q.filter(MachineMaster.machine_type == type)
    total = q.count()
    rows = q.offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "machine_code": r.machine_code,
                "machine_name": r.machine_name,
                "machine_type": r.machine_type,
                "manufacturer": r.manufacturer,
                "model": r.model,
                "max_cavitation": r.max_cavitation,
            }
            for r in rows
        ],
    }


# ============================================================
# MATERIALS
# ============================================================
@app.get("/api/v1/materials", tags=["Materials"])
def list_materials(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    rows = db.query(MaterialMaster).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": r.id,
                "material_code": r.material_code,
                "material_name": r.material_name,
                "material_type": r.material_type,
                "grade": r.grade,
                "supplier": r.supplier,
                "density_gcm3": r.density_gcm3,
            }
            for r in rows
        ],
    }


# ============================================================
# CYCLE TIMES
# ============================================================
@app.get("/api/v1/cycle-times", tags=["Cycle Times"])
def list_cycle_times(
    project_number: Optional[str] = Query(None),
    machine_code: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    q = db.query(CycleTimeHistory)
    if project_number:
        proj = db.query(ProjectMaster).filter(ProjectMaster.project_number == project_number.upper()).first()
        if proj:
            q = q.filter(CycleTimeHistory.project_id == proj.id)
    if machine_code:
        mach = db.query(MachineMaster).filter(MachineMaster.machine_code == machine_code).first()
        if mach:
            q = q.filter(CycleTimeHistory.machine_id == mach.id)
    total = q.count()
    rows = q.order_by(CycleTimeHistory.id.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "project_number": r.project.project_number if r.project else None,
                "machine_code": r.machine.machine_code if r.machine else None,
                "product_name": r.product_name,
                "product_weight_gm": r.product_weight_gm,
                "cavitation": r.cavitation,
                "cycle_time_sec": r.cycle_time_sec,
                "remarks": r.remarks,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


# ============================================================
# COMPONENT DETAILS
# ============================================================
@app.get("/api/v1/components", tags=["Components"])
def list_components(
    tool_no: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    shape: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    q = db.query(ComponentDetail)
    if tool_no:
        q = q.filter(ComponentDetail.tool_no.ilike(f"%{tool_no}%"))
    if material:
        q = q.filter(ComponentDetail.material.ilike(f"%{material}%"))
    if shape:
        q = q.filter(ComponentDetail.shape.ilike(f"%{shape}%"))
    total = q.count()
    rows = q.offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "tool_no": r.tool_no,
                "description": r.description,
                "cavity": r.cavity,
                "material": r.material,
                "component_weight_gm": r.component_weight_gm,
                "volume_ml": r.volume_ml,
                "shape": r.shape,
                "ma": r.ma,
                "mi": r.mi,
                "th": r.th,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_date": r.import_date.isoformat() if r.import_date else None,
            }
            for r in rows
        ],
    }


# ============================================================
# IMPORT LOGS
# ============================================================
@app.get("/api/v1/import-logs", tags=["Import Logs"])
def list_import_logs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db_session),
):
    rows = db.query(ImportLog).order_by(ImportLog.started_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "batch_id": r.batch_id,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "status": r.status,
                "files_processed": r.files_processed,
                "records_imported": r.records_imported,
                "records_updated": r.records_updated,
                "duplicates_found": r.duplicates_found,
                "errors_count": r.errors_count,
                "warnings_count": r.warnings_count,
                "validation_report_path": r.validation_report_path,
            }
            for r in rows
        ],
    }


# ============================================================
# SYNC ENDPOINT (for MITRA)
# ============================================================
@app.get("/api/v1/sync/projects", tags=["Sync"])
def sync_projects(
    since: Optional[datetime] = Query(None, description="ISO datetime — only return projects updated since this time"),
    db: Session = Depends(get_db_session),
):
    """MITRA calls this to get projects that have changed since last sync."""
    q = db.query(ProjectMaster)
    if since:
        q = q.filter(ProjectMaster.updated_at >= since)
    rows = q.all()
    return {
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "project_number": r.project_number,
                "project_prefix": r.project_prefix,
                "project_name": r.project_name,
                "description": r.description,
                "status": r.status,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "revision": r.revision,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/sync/all", tags=["Sync"])
def sync_all_counts(db: Session = Depends(get_db_session)):
    """Quick summary of all table counts for MITRA sync status."""
    from sqlalchemy import text
    tables = [
        "project_master", "product_master", "machine_master", "material_master",
        "cycle_time_history", "process_planning", "part_list", "component_detail",
        "document_index", "data_sources", "provenance"
    ]
    counts = {}
    for t in tables:
        counts[t] = db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "counts": counts,
    }
