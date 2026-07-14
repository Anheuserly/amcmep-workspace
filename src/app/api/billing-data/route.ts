import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";

function database() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  return new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
  );
}

async function requireAccess(
  databases: Databases,
  businessId: string,
  userId: string,
) {
  const response = await databases.listDocuments(
    databaseId,
    "business_memberships",
    [
      Query.equal("businessId", businessId),
      Query.equal("userId", userId),
      Query.equal("status", "active"),
      Query.limit(1),
    ],
  );
  const membership = response.documents[0];
  const permissions = Array.isArray(membership?.permissions)
    ? membership.permissions
    : [];
  if (
    !membership ||
    (!permissions.includes("finance.manage") &&
      !["owner", "administrator", "accounts"].includes(String(membership.role)))
  ) {
    throw new Error("Finance management access is required.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    if (!businessId || !userId)
      return NextResponse.json(
        { error: "Business details are required." },
        { status: 400 },
      );
    const databases = database();
    await requireAccess(databases, businessId, userId);
    const [profiles, parties, templates, items] = await Promise.all([
      databases.listDocuments(databaseId, "business_billing_profiles", [
        Query.equal("businessId", businessId),
        Query.limit(10),
      ]),
      databases.listDocuments(databaseId, "billing_parties", [
        Query.equal("businessId", businessId),
        Query.orderAsc("legalName"),
        Query.limit(200),
      ]),
      databases.listDocuments(databaseId, "document_templates", [
        Query.equal("businessId", businessId),
        Query.limit(100),
      ]),
      databases.listDocuments(databaseId, "item_catalog", [
        Query.equal("businessId", businessId),
        Query.equal("isActive", true),
        Query.orderAsc("name"),
        Query.limit(500),
      ]),
    ]);
    return NextResponse.json({
      profile: profiles.documents[0] ?? null,
      parties: parties.documents,
      templates: templates.documents,
      items: items.documents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Billing data could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const kind = String(body.kind ?? "");
    if (!businessId || !userId || !["profile", "party"].includes(kind))
      return NextResponse.json(
        { error: "Billing details are incomplete." },
        { status: 400 },
      );
    const databases = database();
    await requireAccess(databases, businessId, userId);
    const now = new Date().toISOString();
    const data = { ...(body.data ?? {}), businessId, updatedAt: now };
    if (kind === "profile") {
      const existing = await databases.listDocuments(
        databaseId,
        "business_billing_profiles",
        [Query.equal("businessId", businessId), Query.limit(1)],
      );
      const document = existing.documents[0]
        ? await databases.updateDocument(
            databaseId,
            "business_billing_profiles",
            existing.documents[0].$id,
            data,
          )
        : await databases.createDocument(
            databaseId,
            "business_billing_profiles",
            ID.unique(),
            { ...data, createdAt: now },
          );
      return NextResponse.json({ document });
    }
    const legalName = String(data.legalName ?? "").trim();
    if (!legalName)
      return NextResponse.json(
        { error: "Customer or company name is required." },
        { status: 400 },
      );
    const partyId = String(body.partyId ?? "");
    const payload = {
      ...data,
      legalName,
      partyType: String(data.partyType ?? "customer"),
      createdBy: userId,
    };
    const document = partyId
      ? await databases.updateDocument(
          databaseId,
          "billing_parties",
          partyId,
          payload,
        )
      : await databases.createDocument(
          databaseId,
          "billing_parties",
          ID.unique(),
          { ...payload, createdAt: now },
        );
    return NextResponse.json({ document });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Billing data could not be saved." },
      { status: 500 },
    );
  }
}
