# Business data model

All operational records belong to a business through the required `businessId` field. New records also include `createdBy`, `createdByName`, `createdAt`, `updatedAt`, and `status` so the company and person responsible for each change remain traceable.

## Tables

- `projects`: customer work, dates, budget, progress, site, and assigned users.
- `tasks`: project or request actions, assignee, priority, due date, and completion.
- `quotations`: the existing quotation table, retained for historical compatibility. Its legacy `createdByAdminId` and `createdByAdminName` fields are normalized by the application.
- `invoices`: invoice identity, customer, project, totals, due date, status, and creator.
- `business_items`: one shared line-item table for quotations and invoices.
- `documents`: Appwrite Storage references linked to projects or other business records.
- `amc_contracts`: contract dates, value, visit plan, customer, and site.
- `amc_visits`: scheduled and completed contract visits, technicians, notes, and report document.

## Shared items

`business_items.parentType` is `quotation` or `invoice`. `parentId` stores the corresponding quotation or invoice ID. This keeps one consistent calculation model without maintaining separate invoice-item and quotation-item tables.

## Security

The newly created tables have row security enabled and no broad public table permissions. Server-side operations must confirm an active `business_memberships` record and the required role permission before reading or changing business data. `APPWRITE_API_KEY` must remain server-only.
