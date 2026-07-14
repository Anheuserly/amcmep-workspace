import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const bucketId = "business_documents";
const allowedTables = new Set([
  "projects",
  "tasks",
  "quotations",
  "invoices",
  "documents",
  "amc_contracts",
  "amc_visits",
  "commercial_documents",
  "business_billing_profiles",
  "billing_parties",
  "document_templates",
  "business_items",
  "item_catalog",
]);

function services() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(key);
  return { databases: new Databases(client), storage: new Storage(client) };
}

async function membership(
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
  return result.documents[0];
}

export async function GET(request: NextRequest) {
  try {
    const table = request.nextUrl.searchParams.get("table") ?? "";
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    if (!allowedTables.has(table) || !businessId || !userId)
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const { databases } = services();
    if (!(await membership(databases, businessId, userId)))
      return NextResponse.json(
        { error: "Business access is not active." },
        { status: 403 },
      );
    const result = await databases.listDocuments(databaseId, table, [
      Query.equal("businessId", businessId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    return NextResponse.json({ documents: result.documents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Records could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      const table = String(body.table ?? "");
      const businessId = String(body.businessId ?? "");
      const userId = String(body.userId ?? "");
      if (
        !allowedTables.has(table) ||
        table === "documents" ||
        !businessId ||
        !userId
      )
        return NextResponse.json(
          { error: "Invalid record request." },
          { status: 400 },
        );
      const { databases } = services();
      if (!(await membership(databases, businessId, userId)))
        return NextResponse.json(
          { error: "Business access is not active." },
          { status: 403 },
        );
      const data = { ...(body.data ?? {}), businessId };
      const document = await databases.createDocument(
        databaseId,
        table,
        ID.unique(),
        data,
      );
      return NextResponse.json({ document }, { status: 201 });
    }
    const form = await request.formData();
    const businessId = String(form.get("businessId") ?? "");
    const userId = String(form.get("userId") ?? "");
    const userName = String(form.get("userName") ?? "");
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "document");
    const file = form.get("file");
    if (!businessId || !userId || !title || !(file instanceof File))
      return NextResponse.json(
        { error: "Document details are incomplete." },
        { status: 400 },
      );
    const { databases, storage } = services();
    if (!(await membership(databases, businessId, userId)))
      return NextResponse.json(
        { error: "Business access is not active." },
        { status: 403 },
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await storage.createFile(
      bucketId,
      ID.unique(),
      InputFile.fromBuffer(bytes, file.name),
    );
    const now = new Date().toISOString();
    const document = await databases.createDocument(
      databaseId,
      "documents",
      ID.unique(),
      {
        businessId,
        createdBy: userId,
        createdByName: userName,
        status: "active",
        createdAt: now,
        updatedAt: now,
        title,
        bucketId,
        fileId: uploaded.$id,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        category,
      },
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Document could not be uploaded." },
      { status: 500 },
    );
  }
}
