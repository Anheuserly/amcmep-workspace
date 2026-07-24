# Realtime Service Marketplace

## Purpose

AMC MEP uses one business-owned catalog for products and services. A business
publishes what it can currently supply, and customers see only published,
active listings. The same records drive discovery, service requests, and
provider routing across Workspace, One App Web, and Flutter.

## Shared Appwrite Contract

The existing `marketplace_showcases` table is the source of truth.

Required ownership and identity fields:

- `businessId`: business that owns the listing
- `adminId`: user who created the listing
- `businessName` and `sellerName`: display identity snapshots
- `isService`: `true` for service availability and `false` for products
- `isActive`: operational availability
- `status`: `active`, `draft`, `hidden`, `inactive`, or `archived`

Listing fields:

- `title`, `description`, `category`, `tags`
- `price`: use zero when a quotation is required
- `unit`: visit, job, month, unit, piece, or another business-defined unit
- `minOrderQty`: product minimum order or service coverage/response note
- `location`: service area or product location
- `mediaId`, `mediaUrl`, `mediaType`
- `createdAt`

The existing `marketplace_showcases` storage bucket remains the media source.
Do not create a second service catalog or separate invoice-item catalog.

## Business Workflow

1. Open Workspace and select the active business.
2. Open `Service availability`.
3. Add each service the business currently accepts.
4. Provide a clear category, location, scope, response note, and optional rate.
5. Set the record active and visible when it should appear to customers.
6. Hide or deactivate a record when capacity is unavailable.

Products continue to use `Product listings`. Both types retain the creator and
business identity so the same account can manage multiple businesses safely.

## Customer Discovery

Flutter and One App Web subscribe to realtime changes on
`marketplace_showcases`. Their service views show:

- service name and category
- provider business
- service area
- unit or visit basis
- image when available
- live availability state
- quote-required or price information

Static service arrays must not be used as customer-facing availability.

## Multi-Service Requests

The Flutter request form allows multiple active service listings to be
selected. One service request is created with:

- a concise comma-separated `serviceType` summary
- the full selected scope in `description`
- site, address, location, urgency, preferred date/time, requester, and phone

Phone remains required only when the user starts a service, AMC, or product
request. iOS uses manual phone entry. Android may use installed-SIM
verification before saving the phone to the user profile.

## Provider Routing

For service work, a business is eligible only when:

1. the business is active and accepts service requests;
2. it has an active, published `isService` listing matching the requested
   title, category, description, or tags;
3. the receiving member is an owner or has `receive_service_work`.

If there is no matching active service listing, no business opportunity is
broadcast. The customer request remains saved and can be reviewed without
notifying unrelated providers.

Product requirements continue to use product-requirement routing.

## AMC Services

Businesses that accept AMC work should publish explicit service listings such
as:

- Fire alarm AMC
- Electrical preventive maintenance
- Pump room AMC
- Plumbing maintenance
- Integrated facility AMC

AMC request routing should use these same active listings and coverage fields.
Contract terms, visits, assets, and invoices remain in the dedicated AMC and
commercial tables.

## Internal Communication

Team and partner discussion uses the existing:

- `internal_chat_sessions`
- `internal_chat_messages`
- `internal_chat_files`
- `internal_call_sessions`
- `internal_call_candidates`

Flutter business profiles open the matching Workspace communication surface,
so private chats, the team channel, attachments, voice calls, and video calls
continue in one conversation system. Customer/provider service-request chat
remains separate from internal business communication.

## Permissions

- Owners and administrators can publish, edit, hide, and deactivate listings.
- Members need `services.view` to see service availability management.
- Publishing requires the existing business/vendor management permission.
- Customers can read active public listings only.
- Internal chat participants must have active business or partner access.

## Realtime Channels

Clients subscribe to:

```text
databases.{databaseId}.tables.marketplace_showcases.rows
```

Web clients may additionally subscribe to the legacy documents channel during
Appwrite table migration. Changes are debounced before refreshing the catalog.

## Release Checklist

1. Confirm `marketplace_showcases` includes `businessId`, `isService`,
   `isActive`, `status`, and `unit`.
2. Confirm bucket read permissions allow public listing images.
3. Publish at least one active service from Workspace.
4. Verify it appears in Flutter Today, Flutter request creation, and One App
   Marketplace.
5. Select two services and create one request.
6. Confirm only matching provider businesses receive the opportunity.
7. Hide one listing and confirm it disappears after the realtime refresh.
8. Verify team discussion opens the correct business communication view.
