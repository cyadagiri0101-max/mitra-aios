#!/bin/bash
set -e

REPORT_FILE="VALIDATION_RAW_LOG.txt"
echo "CLEAN ROOM VALIDATION RAW LOG" > "$REPORT_FILE"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT_FILE"
echo "===============================================" >> "$REPORT_FILE"

log_section() {
  echo "" >> "$REPORT_FILE"
  echo "==================================================" >> "$REPORT_FILE"
  echo "$1" >> "$REPORT_FILE"
  echo "==================================================" >> "$REPORT_FILE"
}

log_cmd() {
  echo "" >> "$REPORT_FILE"
  echo "COMMAND: $1" >> "$REPORT_FILE"
}

# 1. Login
log_section "1. LOGIN"
log_cmd "POST http://localhost:3001/api/auth/login"
LOGIN_RES=$(curl -sS -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mitra.local","password":"Itk98NC0oE0zQjBc40AIxyJq"}' \
  -w "\nHTTP_STATUS:%{http_code}\n")
echo "$LOGIN_RES" >> "$REPORT_FILE"
TOKEN=$(echo "$LOGIN_RES" | grep '"access_token":"' | head -1 | sed 's/.*"access_token":"\([^"]*\)".*/\1/')
echo "TOKEN_EXTRACTED: ${TOKEN:0:50}..." >> "$REPORT_FILE"

# 2. Database health
log_section "2. DATABASE HEALTH"
log_cmd "GET http://localhost:3001/api/health"
curl -sS http://localhost:3001/api/health -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

# 3. Supplier CRUD
log_section "3. SUPPLIER CRUD"

log_cmd "POST /api/suppliers (Create)"
SUPPLIER_RES=$(curl -sS -X POST http://localhost:3001/api/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"supplierCode":"SUPP_CR_001","name":"Clean Room Supplier","contactPerson":"CR Person","email":"cr@supplier.com","phone":"+91 99999 00000","address":"Clean Room Address","status":"ACTIVE"}' \
  -w "\nHTTP_STATUS:%{http_code}\n")
echo "$SUPPLIER_RES" >> "$REPORT_FILE"
SUPPLIER_ID=$(echo "$SUPPLIER_RES" | head -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "SUPPLIER_ID: $SUPPLIER_ID" >> "$REPORT_FILE"

log_cmd "GET /api/suppliers (List)"
curl -sS "http://localhost:3001/api/suppliers" -H "Authorization: Bearer $TOKEN" -w "\nHTTP_STATUS:%{http_code}\n" | head -5 >> "$REPORT_FILE"

log_cmd "PATCH /api/suppliers/$SUPPLIER_ID (Update)"
curl -sS -X PATCH "http://localhost:3001/api/suppliers/$SUPPLIER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Updated Clean Room Supplier"}' \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

log_cmd "DELETE /api/suppliers/$SUPPLIER_ID (Delete)"
curl -sS -X DELETE "http://localhost:3001/api/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

# 4. Product CRUD
log_section "4. PRODUCT CRUD"

# Get a supplier ID for product
SUPP_ID=$(curl -sS "http://localhost:3001/api/suppliers" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "USING_SUPPLIER_ID: $SUPP_ID" >> "$REPORT_FILE"

log_cmd "POST /api/products (Create)"
PRODUCT_RES=$(curl -sS -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"productCode\":\"PROD_CR_001\",\"name\":\"Clean Room Product\",\"category\":\"Test\",\"supplierId\":\"$SUPP_ID\",\"supplierName\":\"Vikas Industrial Supplies\",\"unitPrice\":123.45,\"status\":\"ACTIVE\",\"description\":\"Clean room test product\"}" \
  -w "\nHTTP_STATUS:%{http_code}\n")
echo "$PRODUCT_RES" >> "$REPORT_FILE"
PRODUCT_ID=$(echo "$PRODUCT_RES" | head -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "PRODUCT_ID: $PRODUCT_ID" >> "$REPORT_FILE"

log_cmd "GET /api/products (List)"
curl -sS "http://localhost:3001/api/products" -H "Authorization: Bearer $TOKEN" -w "\nHTTP_STATUS:%{http_code}\n" | head -5 >> "$REPORT_FILE"

log_cmd "PATCH /api/products/$PRODUCT_ID (Update)"
curl -sS -X PATCH "http://localhost:3001/api/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Updated Clean Room Product"}' \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

log_cmd "DELETE /api/products/$PRODUCT_ID (Delete)"
curl -sS -X DELETE "http://localhost:3001/api/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

# 5. CAPA CRUD
log_section "5. CAPA CRUD"

log_cmd "POST /api/capa (Create)"
CAPA_RES=$(curl -sS -X POST http://localhost:3001/api/capa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"capaNumber":"CA-CR-001","problemDescription":"Clean room CAPA test","capaType":"CORRECTIVE","status":"OPEN","targetDate":"2026-12-31"}' \
  -w "\nHTTP_STATUS:%{http_code}\n")
echo "$CAPA_RES" >> "$REPORT_FILE"
CAPA_ID=$(echo "$CAPA_RES" | head -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "CAPA_ID: $CAPA_ID" >> "$REPORT_FILE"

log_cmd "GET /api/capa (List)"
curl -sS "http://localhost:3001/api/capa" -H "Authorization: Bearer $TOKEN" -w "\nHTTP_STATUS:%{http_code}\n" | head -5 >> "$REPORT_FILE"

log_cmd "PATCH /api/capa/$CAPA_ID (Update)"
curl -sS -X PATCH "http://localhost:3001/api/capa/$CAPA_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"CLOSED","rootCause":"Test root cause"}' \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

log_cmd "DELETE /api/capa/$CAPA_ID (Delete)"
curl -sS -X DELETE "http://localhost:3001/api/capa/$CAPA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

# 6. AI Health
log_section "6. AI HEALTH"
log_cmd "GET /api/ai/health"
curl -sS http://localhost:3001/api/ai/health -w "\nHTTP_STATUS:%{http_code}\n" >> "$REPORT_FILE"

# 7. Embeddings
log_section "7. OLLAMA EMBEDDINGS"
log_cmd "POST http://localhost:11434/api/embeddings"
curl -sS -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"nomic-embed-text","prompt":"clean room validation test"}' \
  -w "\nHTTP_STATUS:%{http_code}\n" | head -3 >> "$REPORT_FILE"

# 8. Vector search via backend service test
log_section "8. VECTOR SEARCH"
log_cmd "Backend EmbeddingService + VectorSearchService test"
podman exec mitra30_backend_1 node //tmp/test-embeddings2.js 2>&1 | tail -15 >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "===============================================" >> "$REPORT_FILE"
echo "RAW LOG COMPLETE" >> "$REPORT_FILE"
