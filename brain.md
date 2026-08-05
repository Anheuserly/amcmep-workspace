# AMC MEP Workspace Brain

This file defines the durable product, architecture, authorization, and coding
rules for `workspace.amcmep.in`. Read it before changing any workspace feature.

## 1. Project Identity

**Repository:** `amcmep-workspace`

**Product:** business operations application at `workspace.amcmep.in`

**Stack:**

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS
- Appwrite browser SDK and server SDK
- PWA support

Workspace is for people with explicit access to one or more businesses. It is
not a public app and it is not a generic personal account dashboard.

## 2. Product Vision

Give business owners and authorized teams one dependable operating surface for
customers, requests, field work, partners, internal communication, catalogues,
commercial documents, files, and reporting.

The interface should be quiet, dense, professional, and optimized for repeated
business work rather than marketing.

## 3. System Boundary

- `amcmep.in`: public discovery.
- `app.amcmep.in`: customer/community identity and One App.
- `workspace.amcmep.in`: private business operations.
- Flutter One App: native customer and lightweight business workflows.

Business creation may originate in One App, but Workspace must support
selecting every business the user is authorized to operate.

## 4. Authentication and Authorization

- Authentication is shared with One App through Appwrite.
- Guest visits redirect to One App login using a validated return URL.
- Workspace access requires an owned business or active
  `business_memberships` record.
- `userData.businessIds` and `activeBusinessId` are navigation hints, not the
  sole authorization proof.
- Server routes must independently validate the current user, membership,
  business ID, permission, and record ownership.
- Hiding a sidebar item is not authorization.
- Never accept a client-supplied user ID or role as proof.

When no valid business exists, show the create-business handoff. Do not render
operational navigation as though access exists.

## 5. Business Roles

Core relationship distinctions:

- **Owner:** controls the business and its memberships.
- **Administrator/staff:** internal team member with role-based permissions.
- **Partner:** external person or company connected for service delivery,
  supply, subcontracting, or referral.
- **Customer/requestor:** external recipient of work, not a workspace member.

Do not merge Team and Business Partners. A partner may receive an assignment
without gaining internal finance, employee, or administrative access.

Permission definitions live in `src/lib/workspace/permissions.ts`. Extend that
system rather than adding page-specific role checks.

## 6. Architecture

### Application routes

- `src/app/(app)`: guarded operational pages and layout.
- `src/app/api`: server-authorized operations for members, listings, finance,
  internal chat, attachments, calls, invitations, and business access.

### Components

- `src/components/layout`: application shell and navigation.
- `src/components/workspace/WorkspaceDashboard.tsx`: business overview.
- `TeamManager.tsx`: internal team membership.
- `PartnerManager.tsx`: external business relationships.
- `InternalCommunication.tsx`: internal/team/partner conversations.
- `InternalCallDialog.tsx`: workspace call UI.
- `ItemCatalog.tsx` and `ProductListings.tsx`: reusable business catalogues.
- `CommercialDocuments.tsx`: invoice, quotation, proforma, purchase order, and
  work order surfaces.
- `BillingSettings.tsx`: reusable seller/billing identity.

### Data access

- `src/lib/appwrite/config.ts`: centralized IDs and buckets.
- Browser reads use the authenticated Appwrite session.
- Administrative or cross-record writes use server routes and
  `node-appwrite`.
- Setup scripts create or reconcile finance/internal-chat schema. They must be
  idempotent.

## 7. Shared Data and Schema Rules

Workspace reuses the shared AMC MEP database. Do not duplicate tables simply
to make a page easier.

Canonical concepts:

- `userData`: profile and linked business IDs.
- `businesses`: business identity.
- `business_memberships`: access and roles.
- `serviceRequests`: customer requirements and status.
- assignments: team/partner responsibility.
- marketplace listings: products, services, and AMC offers.
- clients and vendors: reusable commercial parties.
- item catalogue: reusable invoice/quotation line items.
- internal conversation/session and message records: private business
  communication.
- finance records: invoices, proformas, quotations, orders, payments, and
  expenses.

Schema changes must:

1. be checked against One App and Flutter usage;
2. remain backward-compatible with historical rows where practical;
3. include an idempotent setup/migration script;
4. avoid making optional legacy values crash the UI;
5. never store file metadata in attributes absent from the schema.

## 8. Finance Rules

- Seller GST, address, bank details, terms, signature, and numbering defaults
  belong to the business billing profile and should be reusable.
- Customer billing identities should be reusable across documents.
- Product/service catalogue items should be reusable in quotations, invoices,
  proformas, purchase orders, and work orders.
- A commercial document must snapshot critical seller, buyer, tax, and line
  data so historical records do not silently change when a profile is edited.
- Calculate tax and totals from structured numeric fields, not formatted
  strings.
- Never mark a payment successful based only on opening a UPI link or showing a
  QR.
- Platform receiving details and a business’s payout details are separate
  concepts.

## 9. Internal Communication Rules

- Internal team/partner communication must remain separate from
  customer-request chat.
- Reuse one direct session for the same business and participants.
- Team channels are business-scoped group conversations.
- Attachments use the configured storage bucket and schema-supported metadata.
- Authorization is checked when uploading and again when downloading.
- Conversation lists, message panes, headers, and composer should have
  independent stable scrolling.
- Load recent messages first and cursor-paginate older messages.
- Realtime subscriptions must target the active business/session.
- Do not poll full tables.
- Calls and notifications must preserve participant and business scope.

## 10. Listings and Assignments

- Every listing records its owning `businessId` and creator.
- Visibility is explicit: draft/private/paused listings are not public.
- A listing request is visible to the owning business and authorized assignees,
  not every workspace user.
- Owners/admins may assign work to authorized team members or connected
  partners.
- Partners accept or decline their assignment; ownership acceptance is not the
  same status transition.
- Request details must retain requestor, contact, address, coordinates, items,
  quantities, notes, schedule, source listing, and status history.

## 11. Coding and UI Standards

- Use TypeScript domain types and defensive Appwrite row parsing.
- Keep authorization in server routes and shared permission helpers.
- Use existing shared components before creating new page-local systems.
- Use Lucide icons for actions and tooltips where meaning is not obvious.
- Operational screens should favor tables, lists, split panes, and compact
  controls.
- Keep cards to individual repeated records; do not wrap whole sections in
  decorative cards.
- Sidebar and chat layout must remain usable at desktop and mobile widths.
- Keep long names, filenames, GST details, and addresses from overflowing.

## 12. Performance and Cost

### Runtime data authority

- Appwrite `Account` remains the authentication and lightweight identity authority only.
- PostgreSQL through Data Hub owns workspace businesses, roles, requests, finance, listings, communication metadata, and documents.
- MinIO owns uploaded file bytes through short-lived signed URLs.
- Firebase owns push delivery only.
- Browser calls must forward the current Appwrite JWT to Data Hub. Never replace an old admin Appwrite route with an unauthenticated or client-user-ID-trusting VPS route.
- Do not add new operational Appwrite database or bucket access.

- No repeated full-table polling.
- Subscribe only to active business/session/call records.
- Paginate messages, listings, requests, documents, and reports.
- Cache stable business, membership, category, and role records.
- Pause optional refresh when the page is hidden.
- Avoid running schema setup on every ordinary development request; prebuild
  scripts must be safe and economical.
- Add query instrumentation before guessing at Appwrite cost.

## 13. AI Guardrails

An AI agent must not:

- grant workspace access from `businessIds` alone;
- treat a partner as internal staff;
- create duplicate business, chat, finance, or catalogue tables;
- expose server API keys in client code;
- trust a query-string business ID without membership validation;
- store attachments with unsupported attributes;
- change document totals through string concatenation;
- make every user see every request;
- implement permissions only by hiding navigation;
- rewrite unrelated dirty files.

## 14. Verification

Before completing a material change:

```bash
npm run typecheck
npm run build
git diff --check
```

Test with:

- no business access;
- owner access;
- restricted team role;
- external partner;
- multiple businesses;
- direct URL to a forbidden business;
- attachment upload/download;
- chat session reuse and pagination;
- commercial-document totals and snapshots;
- mobile and desktop layouts.
