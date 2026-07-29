# CRM Module Specification

## Business Objectives
- Digitize customer relationship management and communication history.
- Capture every customer interaction from inquiry to post-delivery.
- Enable sales pipeline visibility and forecasting.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Sales Rep | sales_rep | Create/edit customers, contacts, RFQs, quotations |
| Sales Manager | manager | Approve quotations, manage sales team, view pipeline |
| Admin | admin | Full CRM configuration, delete records |

## Business Rules
- A customer record must have at least one contact.
- Customer `email` must be unique across the system.
- Contacts can be flagged as `primary` (only one per customer).
- A customer can be marked `inactive` only if no active projects exist.
- RFQ `reference_number` is auto-generated with prefix `RFQ-{year}-{sequence}`.

## State Machine

### Customer
```
active ──► inactive
```

### RFQ
```
draft ──► submitted ──► under_review ──► quoted ──► won
                                              └──► lost
```

### Quotation
```
draft ──► sent ──► accepted ──► project_created
              │         └──► rejected
              └──► expired
```

## Entities
- **Customer** — id, name, industry, status, attributes, created_at
- **Contact** — id, customer_id, first_name, last_name, email, phone, role, is_primary
- **RFQ** — id, customer_id, reference_number, status, specifications, received_at
- **Quotation** — id, rfq_id, customer_id, version, status, amount, terms, valid_until

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/commercial/customers | List customers (paginated, filterable) |
| POST | /api/v1/commercial/customers | Create customer |
| GET | /api/v1/commercial/customers/{id} | Get customer with contacts |
| PUT | /api/v1/commercial/customers/{id} | Update customer |
| DELETE | /api/v1/commercial/customers/{id} | Soft-delete customer |
| GET | /api/v1/commercial/customers/{id}/contacts | List contacts |
| POST | /api/v1/commercial/customers/{id}/contacts | Add contact |
| GET | /api/v1/commercial/rfqs | List RFQs |
| POST | /api/v1/commercial/rfqs | Create RFQ |
| POST | /api/v1/commercial/rfqs/{id}/submit | Submit for review |
| POST | /api/v1/commercial/rfqs/{id}/quote | Generate quotation |
| GET | /api/v1/commercial/quotations | List quotations |
| POST | /api/v1/commercial/quotations/{id}/send | Send to customer |
| POST | /api/v1/commercial/quotations/{id}/accept | Accept quotation |
| POST | /api/v1/commercial/quotations/{id}/reject | Reject quotation |

## Events
| Event | When | Payload |
|-------|------|---------|
| CustomerCreated | New customer added | customerId, name |
| RFQSubmitted | RFQ submitted for review | rfqId, customerId, specifications |
| QuotationCreated | Quotation generated from RFQ | quotationId, rfqId, amount |
| QuotationAccepted | Customer accepts quotation | quotationId, projectName, deliveryDate |
| QuotationRejected | Customer rejects quotation | quotationId, reason |

## Permissions
See PERMISSION_MODEL.md — Commercial domain matrix.

## Reports
- Customer List — all customers with contact count and project count
- RFQ Pipeline — RFQs by status with aging
- Quotation Conversion — win/loss rate by customer and period
- Sales Activity — quotations created, sent, accepted per user

## Dashboards
- **Sales Pipeline** — RFQ funnel (draft → submitted → quoted → won/lost)
- **Customer Overview** — active customers, recent interactions, open quotations

## AI Capabilities
- **Lead Scoring** (future) — Rank prospects based on historical conversion patterns.
- **Quotation Optimization** (future) — Suggest pricing based on similar past quotations.

## Integration Points
- **Project Domain** — QuotationAccepted → ProjectCreated
- **Knowledge Domain** — Customer data indexed for cross-project reference

## Future Enhancements
- Email integration (send/receive tracking).
- Automated quotation generation from RFQ specifications.
- Customer portal for RFQ submission and quotation review.
