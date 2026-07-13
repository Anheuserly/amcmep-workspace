# AMC MEP Workspace

Business operations for AMC MEP 24x7 at `workspace.amcmep.in`.

## Product boundary

- `app.amcmep.in` remains the social and customer-facing One App.
- `workspace.amcmep.in` is available only to signed-in users with business access.
- Authentication is handled by One App. Guest workspace visits are sent to One App login with a validated return URL.
- Business access is resolved from the signed-in user's `userData.businessIds`, `userData.activeBusinessId`, and active `business_memberships` records.

## Existing Appwrite resources

The workspace intentionally reuses the existing schema. No duplicate tables are required for the initial release.

- `userData` (`680b30be0039f9a1d03e`): account identity and linked business IDs.
- `businesses`: business profile and owner information.
- `business_memberships`: owner, administrator, partner, and staff access.
- Existing request, assignment, AMC, notification, marketplace, and media resources provide operational records.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Set the Cloudflare custom domain to `workspace.amcmep.in`. Add both `https://app.amcmep.in` and `https://workspace.amcmep.in` as Web platforms in the Appwrite project so browser sessions and API origin checks are accepted.
