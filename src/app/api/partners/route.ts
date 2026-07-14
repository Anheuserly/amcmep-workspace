import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
function db() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  return new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
  );
}
async function access(
  databases: Databases,
  businessId: string,
  userId: string,
) {
  const result = await databases.listDocuments(
    databaseId,
    "business_memberships",
    [
      Query.equal("businessId", businessId),
      Query.equal("userId", userId),
      Query.equal("status", "active"),
      Query.limit(1),
    ],
  );
  if (!result.documents[0]) throw new Error("Business access is not active.");
  return result.documents[0];
}
function text(row: any, ...keys: string[]) {
  for (const key of keys) {
    const value = String(row?.[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const databases = db();
    await access(databases, businessId, userId);
    if (query) {
      const merged = new Map<string, any>();
      for (const field of ["name", "businessName", "phone", "city"]) {
        try {
          const result = await databases.listDocuments(
            databaseId,
            "businesses",
            [Query.search(field, query), Query.limit(20)],
          );
          result.documents.forEach((row) => {
            if (row.$id !== businessId) merged.set(row.$id, row);
          });
        } catch {}
      }
      return NextResponse.json({ businesses: [...merged.values()] });
    }
    const result = await databases.listDocuments(
      databaseId,
      "business_partners",
      [
        Query.equal("businessId", businessId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );
    return NextResponse.json({ partners: result.documents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Partners could not be loaded." },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const partnerBusinessId = String(body.partnerBusinessId ?? "");
    const databases = db();
    const membership = await access(databases, businessId, userId);
    const permissions = Array.isArray(membership.permissions)
      ? membership.permissions
      : [];
    if (
      !permissions.includes("team.manage") &&
      !permissions.includes("business.manage") &&
      !["owner", "administrator"].includes(String(membership.role))
    )
      throw new Error("Business management access is required.");
    const partner = await databases.getDocument(
      databaseId,
      "businesses",
      partnerBusinessId,
    );
    const existing = await databases.listDocuments(
      databaseId,
      "business_partners",
      [
        Query.equal("businessId", businessId),
        Query.equal("partnerBusinessId", partnerBusinessId),
        Query.limit(1),
      ],
    );
    const now = new Date().toISOString();
    const payload = {
      businessId,
      partnerBusinessId,
      partnerName: text(partner, "name", "businessName") || "Business partner",
      partnerPhone: text(partner, "phone"),
      partnerEmail: text(partner, "email"),
      partnerCity: text(partner, "city"),
      relationshipType: String(body.relationshipType ?? "service_partner"),
      status: "active",
      notes: String(body.notes ?? ""),
      createdBy: userId,
      createdAt: existing.documents[0]?.createdAt ?? now,
      updatedAt: now,
    };
    const document = existing.documents[0]
      ? await databases.updateDocument(
          databaseId,
          "business_partners",
          existing.documents[0].$id,
          payload,
        )
      : await databases.createDocument(
          databaseId,
          "business_partners",
          ID.unique(),
          payload,
        );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Partner could not be linked." },
      { status: 500 },
    );
  }
}
