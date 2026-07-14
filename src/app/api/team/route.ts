import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const userDataTable =
  process.env.NEXT_PUBLIC_APPWRITE_USERDATA_COLLECTION_ID ??
  process.env.NEXT_PUBLIC_CLIENTS_COLLECTION_ID ??
  "680b30be0039f9a1d03e";
const rolePermissions: Record<string, string[]> = {
  administrator: [
    "business.view",
    "business.manage",
    "team.view",
    "team.manage",
    "roles.manage",
    "projects.view",
    "projects.manage",
    "sites.view",
    "clients.view",
    "vendors.view",
    "tasks.view",
    "tasks.manage",
    "services.view",
    "services.manage",
    "finance.view",
    "documents.view",
    "documents.manage",
    "reports.view",
    "settings.manage",
  ],
  project_manager: [
    "business.view",
    "team.view",
    "projects.view",
    "projects.manage",
    "sites.view",
    "clients.view",
    "vendors.view",
    "tasks.view",
    "tasks.manage",
    "services.view",
    "services.manage",
    "documents.view",
    "documents.manage",
    "reports.view",
  ],
  accounts: [
    "business.view",
    "clients.view",
    "vendors.view",
    "projects.view",
    "finance.view",
    "finance.manage",
    "documents.view",
    "documents.manage",
    "reports.view",
  ],
  hr: [
    "business.view",
    "team.view",
    "team.manage",
    "projects.view",
    "tasks.view",
    "documents.view",
  ],
  technician: [
    "projects.view",
    "sites.view",
    "tasks.view",
    "tasks.manage",
    "services.view",
    "documents.view",
    "documents.manage",
  ],
  viewer: [
    "business.view",
    "projects.view",
    "sites.view",
    "tasks.view",
    "services.view",
    "documents.view",
    "reports.view",
  ],
};

function db() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  return new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
  );
}
async function manager(
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
  const row = result.documents[0];
  const permissions = Array.isArray(row?.permissions) ? row.permissions : [];
  if (
    !row ||
    (!permissions.includes("team.manage") &&
      !["owner", "administrator", "hr"].includes(String(row.role)))
  )
    throw new Error("Team management access is required.");
}
function phoneVariants(input: string) {
  const digits = input.replace(/\D/g, "");
  const national = digits.length > 10 ? digits.slice(-10) : digits;
  return [
    ...new Set(
      [input.trim(), digits, national, `+91${national}`].filter(Boolean),
    ),
  ];
}
function value(row: any, ...keys: string[]) {
  for (const key of keys) {
    const result = String(row?.[key] ?? "").trim();
    if (result) return result;
  }
  return "";
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    const databases = db();
    await manager(databases, businessId, userId);
    const result = await databases.listDocuments(
      databaseId,
      "team_invitations",
      [
        Query.equal("businessId", businessId),
        Query.equal("status", "pending"),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );
    return NextResponse.json({ invitations: result.documents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Invitations could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const userName = String(body.userName ?? "");
    const role = String(body.role ?? "technician");
    const phones = Array.isArray(body.phones) ? body.phones.map(String) : [];
    if (!businessId || !userId || !rolePermissions[role] || !phones.length)
      return NextResponse.json(
        { error: "Phone numbers and a valid role are required." },
        { status: 400 },
      );
    const databases = db();
    await manager(databases, businessId, userId);
    const results = [];
    for (const raw of phones) {
      const phone = phoneVariants(raw).at(-1) ?? raw;
      let profile: any = null;
      for (const candidate of phoneVariants(raw)) {
        try {
          const found = await databases.listDocuments(
            databaseId,
            userDataTable,
            [Query.equal("phone", candidate), Query.limit(1)],
          );
          if (found.documents[0]) {
            profile = found.documents[0];
            break;
          }
        } catch {}
      }
      if (profile) {
        const memberUserId =
          value(profile, "user_id", "userId", "authUserId") || profile.$id;
        const existing = await databases.listDocuments(
          databaseId,
          "business_memberships",
          [
            Query.equal("businessId", businessId),
            Query.equal("userId", memberUserId),
            Query.limit(1),
          ],
        );
        const payload = {
          businessId,
          userId: memberUserId,
          role,
          permissions: rolePermissions[role],
          memberName:
            value(profile, "name", "fullName", "customerId") || "Team member",
          memberPhone: value(profile, "phone") || phone,
          status: "active",
          onDuty: true,
          joinedAt: new Date().toISOString(),
        };
        const document = existing.documents[0]
          ? await databases.updateDocument(
              databaseId,
              "business_memberships",
              existing.documents[0].$id,
              payload,
            )
          : await databases.createDocument(
              databaseId,
              "business_memberships",
              ID.unique(),
              payload,
            );
        try {
          const pending = await databases.listDocuments(
            databaseId,
            "team_invitations",
            [
              Query.equal("businessId", businessId),
              Query.equal("phone", phone),
              Query.equal("status", "pending"),
              Query.limit(1),
            ],
          );
          if (pending.documents[0]) {
            await databases.updateDocument(
              databaseId,
              "team_invitations",
              pending.documents[0].$id,
              { status: "accepted", acceptedAt: new Date().toISOString() },
            );
          }
        } catch {}
        results.push({ phone, status: "added", document });
      } else {
        const existing = await databases.listDocuments(
          databaseId,
          "team_invitations",
          [
            Query.equal("businessId", businessId),
            Query.equal("phone", phone),
            Query.limit(1),
          ],
        );
        const payload = {
          businessId,
          phone,
          role,
          permissionsJson: JSON.stringify(rolePermissions[role]),
          status: "pending",
          invitedBy: userId,
          invitedByName: userName,
          invitedAt: new Date().toISOString(),
        };
        const invitation = existing.documents[0]
          ? await databases.updateDocument(
              databaseId,
              "team_invitations",
              existing.documents[0].$id,
              payload,
            )
          : await databases.createDocument(
              databaseId,
              "team_invitations",
              ID.unique(),
              payload,
            );
        results.push({ phone, status: "invited", invitation });
      }
    }
    return NextResponse.json({ results }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Team members could not be added." },
      { status: 500 },
    );
  }
}
