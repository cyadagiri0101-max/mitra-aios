# Model Schema Comparison

## Verified Matches

- Model: Provenance
  - Table: provenance
  - Relationship: data_source
  - SQLAlchemy definition: relationship target=DataSource definition=relationship('DataSource', back_populates='records')
  - SQLite definition: N/A
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: Target model exists as DataSource and resolves to table data_sources.
  - Recommendation: Confirm that the relationship is intended and supported by opposite-side foreign keys.

- Model: ProjectMaster
  - Table: project_master
  - Relationship: engineering_notes
  - SQLAlchemy definition: relationship target=EngineeringNote definition=relationship('EngineeringNote', back_populates='project')
  - SQLite definition: N/A
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: Target model exists as EngineeringNote and resolves to table engineering_notes.
  - Recommendation: Confirm that the relationship is intended and supported by opposite-side foreign keys.

## Expected ORM Differences

- Model: DataSource
  - Table: data_sources
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: RevisionHistory
  - Table: revision_history
  - Column: changed_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: RevisionHistory
  - Table: revision_history
  - Column: changed_by
  - SQLite definition: type=VARCHAR(100) pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=String(100) primary_key=False nullable=False default='importer' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectMaster
  - Table: project_master
  - Column: status
  - SQLite definition: type=VARCHAR(50) pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=String(50) primary_key=False nullable=True default='ACTIVE' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectMaster
  - Table: project_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectMaster
  - Table: project_master
  - Column: updated_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectMaster
  - Table: project_master
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProductMaster
  - Table: product_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProductMaster
  - Table: product_master
  - Column: updated_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProductMaster
  - Table: product_master
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: BottleFamily
  - Table: bottle_family
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: TechnicalSpecification
  - Table: technical_specification
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: TechnicalSpecification
  - Table: technical_specification
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: CustomerMaster
  - Table: customer_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: MachineMaster
  - Table: machine_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: MaterialMaster
  - Table: material_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: NeckTypeMaster
  - Table: neck_type_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: FolderTemplateMaster
  - Table: folder_template_master
  - Column: is_mandatory
  - SQLite definition: type=BOOLEAN pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Boolean primary_key=False nullable=None default=False foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: FolderTemplateMaster
  - Table: folder_template_master
  - Column: sort_order
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: FolderTemplateMaster
  - Table: folder_template_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: DocumentTypeMaster
  - Table: document_type_master
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: AISearchTag
  - Table: ai_search_tags
  - Column: confidence
  - SQLite definition: type=FLOAT pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Float primary_key=False nullable=None default=1.0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: AISearchTag
  - Table: ai_search_tags
  - Column: source
  - SQLite definition: type=VARCHAR(50) pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=String(50) primary_key=False nullable=None default='importer' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: AISearchTag
  - Table: ai_search_tags
  - Column: created_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectProductLink
  - Table: project_product_link
  - Column: relationship_type
  - SQLite definition: type=VARCHAR(50) pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=String(50) primary_key=False nullable=True default='primary' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectCustomerLink
  - Table: project_customer_link
  - Column: relationship_type
  - SQLite definition: type=VARCHAR(50) pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=String(50) primary_key=False nullable=True default='primary' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProjectRelationship
  - Table: project_relationships
  - Column: relationship_type
  - SQLite definition: type=VARCHAR(50) pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=String(50) primary_key=False nullable=False default='derives_from' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: CycleTimeHistory
  - Table: cycle_time_history
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: CycleTimeHistory
  - Table: cycle_time_history
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProcessPlanning
  - Table: process_planning
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ProcessPlanning
  - Table: process_planning
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: PartList
  - Table: part_list
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: PartList
  - Table: part_list
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ComponentDetail
  - Table: component_detail
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ComponentDetail
  - Table: component_detail
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: EngineeringNote
  - Table: engineering_notes
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: EngineeringNote
  - Table: engineering_notes
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: DocumentIndex
  - Table: document_index
  - Column: import_date
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: DocumentIndex
  - Table: document_index
  - Column: revision
  - SQLite definition: type=INTEGER pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=False default=1 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: started_at
  - SQLite definition: type=DATETIME pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=DateTime primary_key=False nullable=False default=datetime.utcnow foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: status
  - SQLite definition: type=VARCHAR(20) pk=0 notnull=1 default=None
  - SQLAlchemy definition: type=String(20) primary_key=False nullable=False default='RUNNING' foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: files_processed
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: records_imported
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: records_updated
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: duplicates_found
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: errors_count
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

- Model: ImportLog
  - Table: import_log
  - Column: warnings_count
  - SQLite definition: type=INTEGER pk=0 notnull=0 default=None
  - SQLAlchemy definition: type=Integer primary_key=False nullable=None default=0 foreign_key=None
  - Is this actually different?: NO
  - Is this expected ORM behavior?: YES
  - Is this a verified defect?: NO
  - Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.
  - Recommendation: Treat as expected ORM difference unless application behavior proves otherwise.

## Verified Model Defects

None

## NOT VERIFIABLE Items

None

## Summary

Total reported default differences verified as Expected ORM Differences: 47
Total reported relationship mismatches verified as valid ORM relationships: 2
Total verified defects: 0
Total NOT VERIFIABLE items: 0

Overall verification result: All reported mismatches were classified; no verified defects were found in the model-vs-database comparison.