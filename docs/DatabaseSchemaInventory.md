# Database Schema Inventory

**Database file:** D:\MitraEngineeringLibrary\database\mekb.sqlite
**Database file size:** 659456 bytes
**SQLite version:** 3.50.4

## ai_search_tags

Row Count: 765

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| entity_type | VARCHAR(50) |  | No |  |
| entity_id | INTEGER |  | No |  |
| tag_name | VARCHAR(100) |  | No |  |
| tag_value | VARCHAR(500) |  | Yes |  |
| confidence | FLOAT |  | Yes |  |
| source | VARCHAR(50) |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| idx_ai_tag_entity | No | entity_type, entity_id | c | No |
| ix_ai_search_tags_id | No | id | c | No |
| ix_ai_search_tags_tag_name | No | tag_name | c | No |

---

## bottle_family

Row Count: 61

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| family_name | VARCHAR(200) |  | No |  |
| description | TEXT |  | Yes |  |
| typical_volume_range | VARCHAR(50) |  | Yes |  |
| typical_material | VARCHAR(100) |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_bottle_family_family_name | Yes | family_name | c | No |
| ix_bottle_family_id | No | id | c | No |

---

## component_detail

Row Count: 516

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| tool_no | VARCHAR(50) |  | Yes |  |
| description | VARCHAR(500) |  | Yes |  |
| cavity | INTEGER |  | Yes |  |
| material | VARCHAR(100) |  | Yes |  |
| component_weight_gm | FLOAT |  | Yes |  |
| volume_ml | FLOAT |  | Yes |  |
| shape | VARCHAR(50) |  | Yes |  |
| ma | VARCHAR(50) |  | Yes |  |
| mi | VARCHAR(50) |  | Yes |  |
| th | VARCHAR(50) |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| source_row | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_component_detail_id | No | id | c | No |
| ix_component_detail_tool_no | No | tool_no | c | No |

---

## customer_master

Row Count: 1

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| customer_code | VARCHAR(50) |  | No |  |
| customer_name | VARCHAR(300) |  | No |  |
| customer_type | VARCHAR(50) |  | Yes |  |
| region | VARCHAR(100) |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_customer_master_customer_code | Yes | customer_code | c | No |
| ix_customer_master_id | No | id | c | No |

---

## cycle_time_history

Row Count: 41

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| machine_id | INTEGER |  | Yes |  |
| product_name | VARCHAR(300) |  | Yes |  |
| product_weight_gm | FLOAT |  | Yes |  |
| cavitation | VARCHAR(50) |  | Yes |  |
| cycle_time_sec | FLOAT |  | Yes |  |
| remarks | TEXT |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| source_row | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| machine_id | machine_master(id) | NO ACTION | NO ACTION | NONE |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_cycle_time_history_id | No | id | c | No |

---

## data_sources

Row Count: 11

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| source_file | VARCHAR(500) |  | No |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| import_date | DATETIME |  | No |  |
| import_batch_id | VARCHAR(50) |  | No |  |
| file_hash | VARCHAR(64) |  | Yes |  |
| file_size | INTEGER |  | Yes |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_data_sources_id | No | id | c | No |
| ix_data_sources_import_batch_id | No | import_batch_id | c | No |

---

## document_index

Row Count: 86

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| serial_no | INTEGER |  | Yes |  |
| description | VARCHAR(500) |  | Yes |  |
| sub_description | VARCHAR(500) |  | Yes |  |
| page_no | VARCHAR(50) |  | Yes |  |
| remarks | TEXT |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| source_row | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_document_index_id | No | id | c | No |

---

## document_type_master

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| doc_type_code | VARCHAR(50) |  | No |  |
| doc_type_name | VARCHAR(200) |  | No |  |
| description | TEXT |  | Yes |  |
| file_extensions | VARCHAR(200) |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_document_type_master_id | No | id | c | No |
| sqlite_autoindex_document_type_master_1 | Yes | doc_type_code | u | No |

---

## engineering_notes

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| note_type | VARCHAR(50) |  | Yes |  |
| note_title | VARCHAR(300) |  | Yes |  |
| note_content | TEXT |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_line | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_engineering_notes_id | No | id | c | No |

---

## folder_template_master

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| template_name | VARCHAR(200) |  | No |  |
| project_prefix | VARCHAR(10) |  | No |  |
| folder_name | VARCHAR(200) |  | No |  |
| is_mandatory | BOOLEAN |  | Yes |  |
| sort_order | INTEGER |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_folder_template_master_id | No | id | c | No |
| sqlite_autoindex_folder_template_master_1 | Yes | project_prefix, folder_name | u | No |

---

## import_log

Row Count: 1

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| batch_id | VARCHAR(50) |  | No |  |
| started_at | DATETIME |  | No |  |
| completed_at | DATETIME |  | Yes |  |
| status | VARCHAR(20) |  | No |  |
| files_processed | INTEGER |  | Yes |  |
| records_imported | INTEGER |  | Yes |  |
| records_updated | INTEGER |  | Yes |  |
| duplicates_found | INTEGER |  | Yes |  |
| errors_count | INTEGER |  | Yes |  |
| warnings_count | INTEGER |  | Yes |  |
| unmapped_values | JSON |  | Yes |  |
| error_log | TEXT |  | Yes |  |
| validation_report_path | VARCHAR(500) |  | Yes |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_import_log_id | No | id | c | No |
| ix_import_log_batch_id | Yes | batch_id | c | No |

---

## machine_master

Row Count: 17

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| machine_code | VARCHAR(50) |  | No |  |
| machine_name | VARCHAR(200) |  | No |  |
| machine_type | VARCHAR(50) |  | Yes |  |
| manufacturer | VARCHAR(100) |  | Yes |  |
| model | VARCHAR(100) |  | Yes |  |
| max_cavitation | INTEGER |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_machine_master_machine_code | Yes | machine_code | c | No |
| ix_machine_master_id | No | id | c | No |

---

## material_master

Row Count: 2

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| material_code | VARCHAR(50) |  | No |  |
| material_name | VARCHAR(200) |  | No |  |
| material_type | VARCHAR(100) |  | Yes |  |
| grade | VARCHAR(200) |  | Yes |  |
| supplier | VARCHAR(200) |  | Yes |  |
| density_gcm3 | FLOAT |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_material_master_id | No | id | c | No |
| ix_material_master_material_code | Yes | material_code | c | No |

---

## neck_type_master

Row Count: 4

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| neck_code | VARCHAR(50) |  | No |  |
| neck_name | VARCHAR(200) |  | No |  |
| neck_size_mm | FLOAT |  | Yes |  |
| thread_type | VARCHAR(100) |  | Yes |  |
| description | TEXT |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_neck_type_master_neck_code | Yes | neck_code | c | No |
| ix_neck_type_master_id | No | id | c | No |

---

## part_list

Row Count: 115

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| part_category | VARCHAR(100) |  | No |  |
| part_number | VARCHAR(100) |  | Yes |  |
| description | VARCHAR(500) |  | No |  |
| material | VARCHAR(200) |  | Yes |  |
| grade | VARCHAR(200) |  | Yes |  |
| quantity | FLOAT |  | Yes |  |
| finished_size_l | FLOAT |  | Yes |  |
| finished_size_h | FLOAT |  | Yes |  |
| finished_size_w | FLOAT |  | Yes |  |
| weight | FLOAT |  | Yes |  |
| total_weight | FLOAT |  | Yes |  |
| rate | FLOAT |  | Yes |  |
| amount | FLOAT |  | Yes |  |
| supplier | VARCHAR(200) |  | Yes |  |
| part_type | VARCHAR(50) |  | Yes |  |
| remarks | TEXT |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| source_row | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_part_list_id | No | id | c | No |

---

## process_planning

Row Count: 227

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| step_number | INTEGER |  | Yes |  |
| step_name | VARCHAR(200) |  | No |  |
| step_category | VARCHAR(100) |  | Yes |  |
| status | VARCHAR(50) |  | Yes |  |
| planned_start | DATETIME |  | Yes |  |
| planned_end | DATETIME |  | Yes |  |
| actual_start | DATETIME |  | Yes |  |
| actual_end | DATETIME |  | Yes |  |
| owner | VARCHAR(100) |  | Yes |  |
| remarks | TEXT |  | Yes |  |
| source_file | VARCHAR(500) |  | Yes |  |
| source_sheet | VARCHAR(200) |  | Yes |  |
| source_row | INTEGER |  | Yes |  |
| import_date | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_process_planning_id | No | id | c | No |

---

## product_master

Row Count: 127

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | Yes |  |
| product_name | VARCHAR(300) |  | No |  |
| product_variant | VARCHAR(100) |  | Yes |  |
| bottle_family_id | INTEGER |  | Yes |  |
| volume_ml | FLOAT |  | Yes |  |
| weight_gm | FLOAT |  | Yes |  |
| height_mm | FLOAT |  | Yes |  |
| material | VARCHAR(100) |  | Yes |  |
| shape | VARCHAR(50) |  | Yes |  |
| neck_type_id | INTEGER |  | Yes |  |
| description | TEXT |  | Yes |  |
| ai_tags | JSON |  | Yes |  |
| created_at | DATETIME |  | No |  |
| updated_at | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| neck_type_id | neck_type_master(id) | NO ACTION | NO ACTION | NONE |
| bottle_family_id | bottle_family(id) | NO ACTION | NO ACTION | NONE |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_product_master_product_name | No | product_name | c | No |
| ix_product_master_product_variant | No | product_variant | c | No |
| ix_product_master_id | No | id | c | No |

---

## project_customer_link

Row Count: 1

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | No |  |
| customer_id | INTEGER |  | No |  |
| relationship_type | VARCHAR(50) |  | Yes |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| customer_id | customer_master(id) | NO ACTION | NO ACTION | NONE |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_project_customer_link_id | No | id | c | No |

---

## project_master

Row Count: 281

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_number | VARCHAR(20) |  | No |  |
| project_prefix | VARCHAR(10) |  | No |  |
| project_name | VARCHAR(300) |  | Yes |  |
| description | TEXT |  | Yes |  |
| status | VARCHAR(50) |  | Yes |  |
| created_at | DATETIME |  | No |  |
| updated_at | DATETIME |  | No |  |
| revision | INTEGER |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| idx_project_prefix_num | No | project_prefix, project_number | c | No |
| ix_project_master_id | No | id | c | No |
| ix_project_master_project_number | Yes | project_number | c | No |
| ix_project_master_project_prefix | No | project_prefix | c | No |

---

## project_product_link

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| project_id | INTEGER |  | No |  |
| product_id | INTEGER |  | No |  |
| relationship_type | VARCHAR(50) |  | Yes |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| product_id | product_master(id) | NO ACTION | NO ACTION | NONE |
| project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_project_product_link_id | No | id | c | No |

---

## project_relationships

Row Count: 161

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| parent_project_id | INTEGER |  | No |  |
| child_project_id | INTEGER |  | No |  |
| relationship_type | VARCHAR(50) |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| child_project_id | project_master(id) | NO ACTION | NO ACTION | NONE |
| parent_project_id | project_master(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_project_relationships_id | No | id | c | No |
| sqlite_autoindex_project_relationships_1 | Yes | parent_project_id, child_project_id | u | No |

---

## provenance

Row Count: 985

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| data_source_id | INTEGER |  | No |  |
| table_name | VARCHAR(100) |  | No |  |
| record_id | INTEGER |  | No |  |
| source_row_number | INTEGER |  | Yes |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| data_source_id | data_sources(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_provenance_id | No | id | c | No |

---

## revision_history

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| table_name | VARCHAR(100) |  | No |  |
| record_id | INTEGER |  | No |  |
| revision_number | INTEGER |  | No |  |
| changed_at | DATETIME |  | No |  |
| changed_by | VARCHAR(100) |  | No |  |
| old_values | JSON |  | Yes |  |
| new_values | JSON |  | Yes |  |
| change_type | VARCHAR(20) |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| (none) | | | | |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| idx_rev_table_rec | No | table_name, record_id | c | No |
| ix_revision_history_id | No | id | c | No |

---

## technical_specification

Row Count: 0

### Columns

| Name | Type | PK | Nullable | Default |
| ---- | ---- | -- | -------- | ------- |
| id | INTEGER | Yes | No |  |
| bottle_family_id | INTEGER |  | No |  |
| product_variant | VARCHAR(100) |  | Yes |  |
| spec_name | VARCHAR(200) |  | No |  |
| spec_value | VARCHAR(500) |  | Yes |  |
| spec_unit | VARCHAR(50) |  | Yes |  |
| spec_category | VARCHAR(100) |  | Yes |  |
| revision | INTEGER |  | No |  |
| created_at | DATETIME |  | No |  |

### Foreign Keys

| Column | References | On Update | On Delete | Match |
| ------ | ---------- | --------- | --------- | ----- |
| bottle_family_id | bottle_family(id) | NO ACTION | NO ACTION | NONE |

### Indexes

| Index | Unique | Columns | Origin | Partial |
| ----- | ------ | ------- | ------ | ------- |
| ix_technical_specification_id | No | id | c | No |

---

Total Tables: 24
Total Columns: 234
Total Foreign Keys: 18
Total Indexes: 43

Database File Size: 659456 bytes
SQLite Version: 3.50.4