# Business data model

All operational records belong to a business through the required `businessId` field. New records also include `createdBy`, `createdByName`, `createdAt`, `updatedAt`, and `status` so the company and person responsible for each change remain traceable.

## Tables

- `projects`: customer work, dates, budget, progress, site, and assigned users.
- `tasks`: project or request actions, assignee, priority, due date, and completion.
- `quotations` and `invoices`: retained for historical compatibility.
- `commercial_documents`: shared headers for quotations, proforma invoices, tax invoices, purchase orders, and work orders. Every issued record stores immutable seller, buyer, GST, bank, terms, signature, and total snapshots.
- `business_items`: one shared line-item table for all commercial document types, including HSN/SAC, quantity, unit, discount, GST rate, taxable value, and line total.
- `business_billing_profiles`: reusable legal, GST, address, bank, and authorized-signatory details for each company.
- `billing_parties`: reusable customer and supplier billing/shipping identities.
- `document_templates`: company-specific numbering, terms, notes, branding, and signature defaults by document type.
- `documents`: Appwrite Storage references linked to projects or other business records.
- `amc_contracts`: contract dates, value, visit plan, customer, and site.
- `amc_visits`: scheduled and completed contract visits, technicians, notes, and report document.

## Shared items

`business_items.parentType` is `quotation`, `proforma_invoice`, `tax_invoice`, `purchase_order`, or `work_order`. `parentId` stores the corresponding `commercial_documents` ID. This keeps one consistent calculation model without maintaining duplicate item tables.

## GST calculation

Each item carries its own GST rate. Matching seller and buyer GST state codes produce CGST and SGST; different state codes produce IGST. The server recalculates every line and stores subtotal, discount, taxable value, and tax totals on the document.

## Security

The newly created tables have row security enabled and no broad public table permissions. Server-side operations must confirm an active `business_memberships` record and the required role permission before reading or changing business data. `APPWRITE_API_KEY` must remain server-only.
