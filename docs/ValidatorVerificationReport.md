# Validator Verification Report

## Summary

- Executed SQL statements in acceptance_evidence.py: 67
- Reviewed / verified statements: 67
- VALID: 67
- VALID (Expected ORM Difference): 0
- FALSE POSITIVE: 0
- NOT VERIFIABLE: 0
- VERIFIED DEFECT: 0

## Verification Notes

All SQL statements in `acceptance_evidence.py` were inspected manually against `docs/DatabaseSchemaInventory.md`.

The 67 statements were counted from the executed SQL paths in the validator, including the initial project-count query and every query used in the integrity, relationship, duplicate, null-FK, orphan, and feature-completeness sections.
Every referenced table and column exists in the schema inventory.
Every JOIN and WHERE reference uses valid table aliases and valid columns.
No syntax issues were identified in the SQL statements as written for SQLite.

## Query Classification

1. `SELECT COUNT(*) FROM project_master`
   - Classification: VALID
2. `SELECT id, project_number FROM project_master WHERE project_number IS NULL OR project_number = ''`
   - Classification: VALID
3. `SELECT id, product_name FROM product_master WHERE project_id IS NULL`
   - Classification: VALID
4. `SELECT COUNT(*) AS c FROM customer_master`
   - Classification: VALID
5. `SELECT COUNT(*) AS c FROM machine_master`
   - Classification: VALID
6. `SELECT COUNT(*) AS c FROM material_master`
   - Classification: VALID
7. `SELECT COUNT(*) AS c FROM bottle_family`
   - Classification: VALID
8. `SELECT ts.id, ts.spec_name FROM technical_specification ts LEFT JOIN bottle_family bf ON ts.bottle_family_id = bf.id WHERE bf.id IS NULL`
   - Classification: VALID

### Orphan checks

9. `SELECT c.id FROM product_master c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
10. `SELECT c.id FROM product_master c LEFT JOIN bottle_family p ON c.bottle_family_id = p.id WHERE c.bottle_family_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
11. `SELECT c.id FROM product_master c LEFT JOIN neck_type_master p ON c.neck_type_id = p.id WHERE c.neck_type_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
12. `SELECT c.id FROM cycle_time_history c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
13. `SELECT c.id FROM cycle_time_history c LEFT JOIN machine_master p ON c.machine_id = p.id WHERE c.machine_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
14. `SELECT c.id FROM process_planning c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
15. `SELECT c.id FROM part_list c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
16. `SELECT c.id FROM component_detail c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
17. `SELECT c.id FROM document_index c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
18. `SELECT c.id FROM engineering_notes c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
19. `SELECT c.id FROM project_product_link c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
20. `SELECT c.id FROM project_product_link c LEFT JOIN product_master p ON c.product_id = p.id WHERE c.product_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
21. `SELECT c.id FROM project_customer_link c LEFT JOIN project_master p ON c.project_id = p.id WHERE c.project_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID
22. `SELECT c.id FROM project_customer_link c LEFT JOIN customer_master p ON c.customer_id = p.id WHERE c.customer_id IS NOT NULL AND p.id IS NULL`
   - Classification: VALID

### Engineering relationship checks

23. `SELECT COUNT(DISTINCT project_id) FROM product_master WHERE project_id IS NOT NULL`
   - Classification: VALID
24. `SELECT COUNT(DISTINCT p.project_id) FROM product_master p JOIN bottle_family bf ON p.bottle_family_id = bf.id WHERE p.project_id IS NOT NULL`
   - Classification: VALID
25. `SELECT COUNT(DISTINCT project_id) FROM project_customer_link`
   - Classification: VALID
26. `SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL`
   - Classification: VALID
27. `SELECT COUNT(DISTINCT p.project_id) FROM product_master p WHERE p.project_id IS NOT NULL AND p.material IS NOT NULL`
   - Classification: VALID
28. `SELECT COUNT(DISTINCT p.project_id) FROM product_master p WHERE p.project_id IS NOT NULL AND p.volume_ml IS NOT NULL`
   - Classification: VALID
29. `SELECT COUNT(DISTINCT p.project_id) FROM product_master p WHERE p.project_id IS NOT NULL AND p.neck_type_id IS NOT NULL`
   - Classification: VALID
30. `SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL AND cavitation IS NOT NULL`
   - Classification: VALID
31. `SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL`
   - Classification: VALID
32. `SELECT COUNT(DISTINCT project_id) FROM process_planning WHERE project_id IS NOT NULL`
   - Classification: VALID
33. `SELECT COUNT(DISTINCT project_id) FROM part_list WHERE project_id IS NOT NULL`
   - Classification: VALID
34. `SELECT COUNT(DISTINCT project_id) FROM component_detail WHERE project_id IS NOT NULL`
   - Classification: VALID
35. `SELECT COUNT(DISTINCT project_id) FROM document_index WHERE project_id IS NOT NULL`
   - Classification: VALID

### Duplicate validation checks

36. `SELECT project_number FROM project_master GROUP BY project_number HAVING COUNT(*) > 1`
   - Classification: VALID
37. `SELECT product_name || '|' || COALESCE(product_variant,'') AS key FROM product_master GROUP BY key HAVING COUNT(*) > 1`
   - Classification: VALID
38. `SELECT customer_code FROM customer_master GROUP BY customer_code HAVING COUNT(*) > 1`
   - Classification: VALID
39. `SELECT machine_code FROM machine_master GROUP BY machine_code HAVING COUNT(*) > 1`
   - Classification: VALID
40. `SELECT material_code FROM material_master GROUP BY material_code HAVING COUNT(*) > 1`
   - Classification: VALID
41. `SELECT project_id, machine_id, product_name, cavitation, cycle_time_sec FROM cycle_time_history WHERE project_id IS NOT NULL GROUP BY project_id, machine_id, product_name, cavitation, cycle_time_sec HAVING COUNT(*) > 1`
   - Classification: VALID
42. `SELECT project_id, serial_no FROM document_index GROUP BY project_id, serial_no HAVING COUNT(*) > 1`
   - Classification: VALID
43. `SELECT project_id, tool_no, description, material FROM component_detail GROUP BY project_id, tool_no, description, material HAVING COUNT(*) > 1`
   - Classification: VALID
44. `SELECT project_id, description, material FROM part_list GROUP BY project_id, description, material HAVING COUNT(*) > 1`
   - Classification: VALID

### NULL FK inspection queries

45. `SELECT id, product_name, machine_id, cavitation FROM cycle_time_history WHERE project_id IS NULL`
   - Classification: VALID
46. `SELECT id, project_id, product_name FROM cycle_time_history WHERE machine_id IS NULL`
   - Classification: VALID
47. `SELECT id, description FROM part_list WHERE project_id IS NULL`
   - Classification: VALID
48. `SELECT id, tool_no FROM component_detail WHERE project_id IS NULL`
   - Classification: VALID
49. `SELECT id, serial_no FROM document_index WHERE project_id IS NULL`
   - Classification: VALID
50. `SELECT id, step_name FROM process_planning WHERE project_id IS NULL`
   - Classification: VALID
51. `SELECT id, product_name FROM product_master WHERE bottle_family_id IS NULL`
   - Classification: VALID

### Orphan validation queries

52. `SELECT id, serial_no FROM document_index WHERE project_id IS NULL`
   - Classification: VALID
53. `SELECT id, product_name FROM cycle_time_history WHERE project_id IS NULL`
   - Classification: VALID
54. `SELECT id, description FROM part_list WHERE project_id IS NULL`
   - Classification: VALID
55. `SELECT id, tool_no FROM component_detail WHERE project_id IS NULL`
   - Classification: VALID
56. `SELECT id, product_name FROM product_master WHERE project_id IS NULL`
   - Classification: VALID
57. `SELECT cm.id, cm.customer_code FROM customer_master cm WHERE NOT EXISTS (SELECT 1 FROM project_customer_link pcl WHERE pcl.customer_id = cm.id)`
   - Classification: VALID
58. `SELECT bf.id, bf.family_name FROM bottle_family bf WHERE NOT EXISTS (SELECT 1 FROM product_master p WHERE p.bottle_family_id = bf.id)`
   - Classification: VALID

### Feature completeness queries

59. `SELECT COUNT(*) AS c FROM product_master`
   - Classification: VALID
60. `SELECT COUNT(*) AS c FROM customer_master`
   - Classification: VALID
61. `SELECT COUNT(*) AS c FROM machine_master`
   - Classification: VALID
62. `SELECT COUNT(*) AS c FROM material_master`
   - Classification: VALID
63. `SELECT COUNT(*) AS c FROM document_index`
   - Classification: VALID
64. `SELECT COUNT(*) AS c FROM cycle_time_history`
   - Classification: VALID
65. `SELECT COUNT(*) AS c FROM part_list`
   - Classification: VALID
66. `SELECT COUNT(*) AS c FROM process_planning`
   - Classification: VALID
67. `SELECT COUNT(*) AS c FROM component_detail`
   - Classification: VALID

## Conclusion

All SQL statements in `acceptance_evidence.py` are verified against `docs/DatabaseSchemaInventory.md` and classified as VALID.
No VERIFIED DEFECTS were found.
