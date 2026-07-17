# Validation Query Audit

## Query ID: Q1

**Purpose:** sql assignment

**SQL:**
```sql
SELECT id, project_number FROM project_master WHERE project_number IS NULL OR project_number = ''
```

**Tables referenced:** project_master

**Columns referenced:** id, project_number, project_number, project_number

**Column exists:** YES

**Invalid column names:** None

**Validator assumptions:** None

---

## Query ID: Q2

**Purpose:** sql assignment

**SQL:**
```sql
SELECT id, product_name FROM product_master WHERE project_id IS NULL
```

**Tables referenced:** product_master

**Columns referenced:** id, product_name, project_id

**Column exists:** YES

**Invalid column names:** None

**Validator assumptions:** None

---

## Query ID: Q3

**Purpose:** sql assignment

**SQL:**
```sql
SELECT COUNT(*) AS c FROM customer_master
```

**Tables referenced:** customer_master

**Columns referenced:** c

**Column exists:** NO

**Invalid column names:** c

**Validator assumptions:** None

---

## Query ID: Q4

**Purpose:** sql assignment

**SQL:**
```sql
SELECT COUNT(*) AS c FROM machine_master
```

**Tables referenced:** machine_master

**Columns referenced:** c

**Column exists:** NO

**Invalid column names:** c

**Validator assumptions:** None

---

## Query ID: Q5

**Purpose:** sql assignment

**SQL:**
```sql
SELECT COUNT(*) AS c FROM material_master
```

**Tables referenced:** material_master

**Columns referenced:** c

**Column exists:** NO

**Invalid column names:** c

**Validator assumptions:** None

---

## Query ID: Q6

**Purpose:** sql assignment

**SQL:**
```sql
SELECT COUNT(*) AS c FROM bottle_family
```

**Tables referenced:** bottle_family

**Columns referenced:** c

**Column exists:** NO

**Invalid column names:** c

**Validator assumptions:** None

---

## Query ID: Q7

**Purpose:** sql assignment

**SQL:**
```sql
SELECT ts.id, ts.spec_name FROM technical_specification ts
        LEFT JOIN bottle_family bf ON ts.bottle_family_id = bf.id
        WHERE bf.id IS NULL
```

**Tables referenced:** technical_specification, bottle_family

**Columns referenced:** ts.id, ts.spec_name, ts.bottle_family_id, bf.id, bf.id

**Column exists:** YES

**Invalid column names:** None

**Validator assumptions:** None

---

## Query ID: Q8

**Purpose:** sql assignment

**SQL:**
```sql
SELECT c.id FROM {child} c
            LEFT JOIN {parent} p ON c.{fk} = p.id
            WHERE c.{fk} IS NOT NULL AND p.id IS NULL
```

**Tables referenced:** None parsed

**Columns referenced:** c.id, child, c, parent, p, c, fk, p.id, c, fk, p.id

**Column exists:** NO

**Invalid column names:** c.id, child, c, parent, p, c, fk, p.id, c, fk, p.id

**Validator assumptions:** No table context for unqualified token 'child'; No table context for unqualified token 'c'; No table context for unqualified token 'parent'; No table context for unqualified token 'p'; No table context for unqualified token 'c'; No table context for unqualified token 'fk'; No table context for unqualified token 'c'; No table context for unqualified token 'fk'

---

## Query ID: Q9

**Purpose:** execute call

**SQL:**
```sql
SELECT COUNT(*) FROM project_master
```

**Tables referenced:** project_master

**Columns referenced:** None parsed

**Column exists:** YES

**Invalid column names:** None

**Validator assumptions:** None

---
