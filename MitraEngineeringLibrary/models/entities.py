"""MEKB Database Schema — All Entities with Provenance & Revision Tracking"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey,
    UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import relationship
from models.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String(500), nullable=False)
    source_sheet = Column(String(200), nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    import_batch_id = Column(String(50), index=True, nullable=False)
    file_hash = Column(String(64), nullable=True)
    file_size = Column(Integer, nullable=True)
    records = relationship("Provenance", back_populates="data_source")


class Provenance(Base):
    __tablename__ = "provenance"
    id = Column(Integer, primary_key=True, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    source_row_number = Column(Integer, nullable=True)
    data_source = relationship("DataSource", back_populates="records")


class RevisionHistory(Base):
    __tablename__ = "revision_history"
    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    revision_number = Column(Integer, nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by = Column(String(100), default="importer", nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    change_type = Column(String(20), nullable=False)
    __table_args__ = (Index("idx_rev_table_rec", "table_name", "record_id"),)


class ProjectMaster(Base):
    __tablename__ = "project_master"
    id = Column(Integer, primary_key=True, index=True)
    project_number = Column(String(20), unique=True, nullable=False, index=True)
    project_prefix = Column(String(10), nullable=False, index=True)
    project_name = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    products = relationship("ProductMaster", back_populates="project")
    cycle_times = relationship("CycleTimeHistory", back_populates="project")
    process_plannings = relationship("ProcessPlanning", back_populates="project")
    part_lists = relationship("PartList", back_populates="project")
    engineering_notes = relationship("EngineeringNote", back_populates="project")
    __table_args__ = (Index("idx_project_prefix_num", "project_prefix", "project_number"),)


class ProductMaster(Base):
    __tablename__ = "product_master"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    product_name = Column(String(300), nullable=False, index=True)
    product_variant = Column(String(100), nullable=True, index=True)
    bottle_family_id = Column(Integer, ForeignKey("bottle_family.id"), nullable=True)
    volume_ml = Column(Float, nullable=True)
    weight_gm = Column(Float, nullable=True)
    height_mm = Column(Float, nullable=True)
    material = Column(String(100), nullable=True)
    shape = Column(String(50), nullable=True)
    neck_type_id = Column(Integer, ForeignKey("neck_type_master.id"), nullable=True)
    description = Column(Text, nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    project = relationship("ProjectMaster", back_populates="products")
    bottle_family = relationship("BottleFamily", back_populates="products")
    neck_type = relationship("NeckTypeMaster", back_populates="products")
    project_links = relationship("ProjectProductLink", back_populates="product")


class BottleFamily(Base):
    __tablename__ = "bottle_family"
    id = Column(Integer, primary_key=True, index=True)
    family_name = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    typical_volume_range = Column(String(50), nullable=True)
    typical_material = Column(String(100), nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    products = relationship("ProductMaster", back_populates="bottle_family")
    technical_specs = relationship("TechnicalSpecification", back_populates="bottle_family")


class TechnicalSpecification(Base):
    __tablename__ = "technical_specification"
    id = Column(Integer, primary_key=True, index=True)
    bottle_family_id = Column(Integer, ForeignKey("bottle_family.id"), nullable=False)
    product_variant = Column(String(100), nullable=True)
    spec_name = Column(String(200), nullable=False)
    spec_value = Column(String(500), nullable=True)
    spec_unit = Column(String(50), nullable=True)
    spec_category = Column(String(100), nullable=True)
    revision = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    bottle_family = relationship("BottleFamily", back_populates="technical_specs")


class CustomerMaster(Base):
    __tablename__ = "customer_master"
    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(50), unique=True, nullable=False, index=True)
    customer_name = Column(String(300), nullable=False)
    customer_type = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    projects = relationship("ProjectCustomerLink", back_populates="customer")


class MachineMaster(Base):
    __tablename__ = "machine_master"
    id = Column(Integer, primary_key=True, index=True)
    machine_code = Column(String(50), unique=True, nullable=False, index=True)
    machine_name = Column(String(200), nullable=False)
    machine_type = Column(String(50), nullable=True)
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    max_cavitation = Column(Integer, nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    cycle_times = relationship("CycleTimeHistory", back_populates="machine")


class MaterialMaster(Base):
    __tablename__ = "material_master"
    id = Column(Integer, primary_key=True, index=True)
    material_code = Column(String(50), unique=True, nullable=False, index=True)
    material_name = Column(String(200), nullable=False)
    material_type = Column(String(100), nullable=True)
    grade = Column(String(200), nullable=True)
    supplier = Column(String(200), nullable=True)
    density_gcm3 = Column(Float, nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NeckTypeMaster(Base):
    __tablename__ = "neck_type_master"
    id = Column(Integer, primary_key=True, index=True)
    neck_code = Column(String(50), unique=True, nullable=False, index=True)
    neck_name = Column(String(200), nullable=False)
    neck_size_mm = Column(Float, nullable=True)
    thread_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    products = relationship("ProductMaster", back_populates="neck_type")


class FolderTemplateMaster(Base):
    __tablename__ = "folder_template_master"
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(200), nullable=False)
    project_prefix = Column(String(10), nullable=False)
    folder_name = Column(String(200), nullable=False)
    is_mandatory = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("project_prefix", "folder_name", name="uq_folder_template"),)


class DocumentTypeMaster(Base):
    __tablename__ = "document_type_master"
    id = Column(Integer, primary_key=True, index=True)
    doc_type_code = Column(String(50), unique=True, nullable=False)
    doc_type_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_extensions = Column(String(200), nullable=True)
    ai_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AISearchTag(Base):
    __tablename__ = "ai_search_tags"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    tag_name = Column(String(100), nullable=False, index=True)
    tag_value = Column(String(500), nullable=True)
    confidence = Column(Float, default=1.0)
    source = Column(String(50), default="importer")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (Index("idx_ai_tag_entity", "entity_type", "entity_id"),)


class ProjectProductLink(Base):
    __tablename__ = "project_product_link"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product_master.id"), nullable=False)
    relationship_type = Column(String(50), default="primary", nullable=True)
    product = relationship("ProductMaster", back_populates="project_links")


class ProjectCustomerLink(Base):
    __tablename__ = "project_customer_link"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customer_master.id"), nullable=False)
    relationship_type = Column(String(50), default="primary", nullable=True)
    customer = relationship("CustomerMaster", back_populates="projects")


class ProjectRelationship(Base):
    __tablename__ = "project_relationships"
    id = Column(Integer, primary_key=True, index=True)
    parent_project_id = Column(Integer, ForeignKey("project_master.id"), nullable=False)
    child_project_id = Column(Integer, ForeignKey("project_master.id"), nullable=False)
    relationship_type = Column(String(50), default="derives_from", nullable=False)
    __table_args__ = (UniqueConstraint("parent_project_id", "child_project_id", name="uq_proj_rel"),)


class CycleTimeHistory(Base):
    __tablename__ = "cycle_time_history"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    machine_id = Column(Integer, ForeignKey("machine_master.id"), nullable=True)
    product_name = Column(String(300), nullable=True)
    product_weight_gm = Column(Float, nullable=True)
    cavitation = Column(String(50), nullable=True)
    cycle_time_sec = Column(Float, nullable=True)
    remarks = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    source_sheet = Column(String(200), nullable=True)
    source_row = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    project = relationship("ProjectMaster", back_populates="cycle_times")
    machine = relationship("MachineMaster", back_populates="cycle_times")


class ProcessPlanning(Base):
    __tablename__ = "process_planning"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    step_number = Column(Integer, nullable=True)
    step_name = Column(String(200), nullable=False)
    step_category = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True)
    planned_start = Column(DateTime, nullable=True)
    planned_end = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    owner = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    source_sheet = Column(String(200), nullable=True)
    source_row = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    project = relationship("ProjectMaster", back_populates="process_plannings")


class PartList(Base):
    __tablename__ = "part_list"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    part_category = Column(String(100), nullable=False)
    part_number = Column(String(100), nullable=True)
    description = Column(String(500), nullable=False)
    material = Column(String(200), nullable=True)
    grade = Column(String(200), nullable=True)
    quantity = Column(Float, nullable=True)
    finished_size_l = Column(Float, nullable=True)
    finished_size_h = Column(Float, nullable=True)
    finished_size_w = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    total_weight = Column(Float, nullable=True)
    rate = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    supplier = Column(String(200), nullable=True)
    part_type = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    source_sheet = Column(String(200), nullable=True)
    source_row = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    project = relationship("ProjectMaster", back_populates="part_lists")


class ComponentDetail(Base):
    __tablename__ = "component_detail"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    tool_no = Column(String(50), nullable=True, index=True)
    description = Column(String(500), nullable=True)
    cavity = Column(Integer, nullable=True)
    material = Column(String(100), nullable=True)
    component_weight_gm = Column(Float, nullable=True)
    volume_ml = Column(Float, nullable=True)
    shape = Column(String(50), nullable=True)
    ma = Column(String(50), nullable=True)
    mi = Column(String(50), nullable=True)
    th = Column(String(50), nullable=True)
    source_file = Column(String(500), nullable=True)
    source_sheet = Column(String(200), nullable=True)
    source_row = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)


class EngineeringNote(Base):
    __tablename__ = "engineering_notes"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    note_type = Column(String(50), nullable=True)
    note_title = Column(String(300), nullable=True)
    note_content = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    source_line = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    project = relationship("ProjectMaster", back_populates="engineering_notes")


class DocumentIndex(Base):
    __tablename__ = "document_index"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("project_master.id"), nullable=True)
    serial_no = Column(Integer, nullable=True)
    description = Column(String(500), nullable=True)
    sub_description = Column(String(500), nullable=True)
    page_no = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    source_sheet = Column(String(200), nullable=True)
    source_row = Column(Integer, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    revision = Column(Integer, default=1, nullable=False)


class ImportLog(Base):
    __tablename__ = "import_log"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), unique=True, nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="RUNNING", nullable=False)
    files_processed = Column(Integer, default=0)
    records_imported = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    duplicates_found = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    warnings_count = Column(Integer, default=0)
    unmapped_values = Column(JSON, nullable=True)
    error_log = Column(Text, nullable=True)
    validation_report_path = Column(String(500), nullable=True)
