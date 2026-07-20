import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const collectionId = "marketplace_showcases";
const bucketId = "69032c8c002ad7e77e5c";

function services() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(key);
  return { databases: new Databases(client), storage: new Storage(client) };
}

async function activeMembership(
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
  return result.documents[0] ?? null;
}

async function creatorProfile(databases: Databases, userId: string) {
  const result = await databases.listDocuments(
    databaseId,
    "680b30be0039f9a1d03e",
    [Query.equal("user_id", userId), Query.limit(1)],
  );
  return result.documents[0] ?? null;
}

async function requireAccess(
  databases: Databases,
  businessId: string,
  userId: string,
) {
  if (!businessId || !userId) throw new Error("Business access is incomplete.");
  const membership = await activeMembership(databases, businessId, userId);
  if (!membership) throw new Error("Business access is not active.");
  return membership;
}

function visibilityData(value: string) {
  const visibility = ["published", "hidden", "draft"].includes(value)
    ? value
    : "draft";
  return {
    status: visibility === "published" ? "active" : visibility,
    isActive: visibility === "published",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    const { databases } = services();
    await requireAccess(databases, businessId, userId);
    const result = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("businessId", businessId),
      Query.orderDesc("createdAt"),
      Query.limit(100),
    ]);
    return NextResponse.json({ documents: result.documents });
  } catch (error: any) {
    const forbidden = error?.message?.includes("access");
    return NextResponse.json(
      { error: error?.message ?? "Listings could not be loaded." },
      { status: forbidden ? 403 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const businessId = String(form.get("businessId") ?? "");
    const userId = String(form.get("userId") ?? "");
    const title = String(form.get("title") ?? "").trim();
    if (!businessId || !userId || !title)
      return NextResponse.json(
        { error: "Business, creator, and product title are required." },
        { status: 400 },
      );

    const { databases, storage } = services();
    await requireAccess(databases, businessId, userId);
    const [business, profile] = await Promise.all([
      databases.getDocument(databaseId, "businesses", businessId),
      creatorProfile(databases, userId),
    ]);

    const image = form.get("image");
    let mediaId = "";
    let mediaUrl = "";
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/"))
        return NextResponse.json(
          { error: "Choose a JPG, PNG, or WebP product image." },
          { status: 400 },
        );
      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        InputFile.fromBuffer(Buffer.from(await image.arrayBuffer()), image.name),
      );
      mediaId = uploaded.$id;
      mediaUrl = `${endpoint.replace(/\/$/, "")}/storage/buckets/${bucketId}/files/${mediaId}/view?project=${projectId}`;
    }

    const now = new Date().toISOString();
    const visibility = String(form.get("visibility") ?? "draft");
    const document = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        businessId,
        businessName: String(business.name ?? "Business"),
        sellerId: userId,
        sellerName: String(profile?.name ?? business.name ?? "Business user"),
        sellerPhone: String(profile?.phone ?? ""),
        sellerType: "business",
        title,
        name: title,
        description: String(form.get("description") ?? "").trim(),
        category: String(form.get("category") ?? "Products").trim(),
        brand: String(form.get("brand") ?? business.name ?? "").trim(),
        price: Number(form.get("price") ?? 0),
        minOrderQty: String(form.get("minOrderQty") ?? "").trim(),
        unit: String(form.get("unit") ?? "Piece").trim(),
        location: String(form.get("location") ?? business.city ?? "").trim(),
        tags: String(form.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 10),
        mediaId,
        mediaUrl,
        mediaType: mediaId ? "image" : "",
        isService: false,
        isFeatured: false,
        views: 0,
        likes: 0,
        createdAt: now,
        ...visibilityData(visibility),
      },
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Product listing could not be created." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const listingId = String(body.listingId ?? "");
    const visibility = String(body.visibility ?? "draft");
    const { databases } = services();
    await requireAccess(databases, businessId, userId);
    const current = await databases.getDocument(
      databaseId,
      collectionId,
      listingId,
    );
    if (String(current.businessId ?? "") !== businessId)
      return NextResponse.json({ error: "Listing does not belong to this business." }, { status: 403 });
    const document = await databases.updateDocument(
      databaseId,
      collectionId,
      listingId,
      visibilityData(visibility),
    );
    return NextResponse.json({ document });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Listing visibility could not be changed." },
      { status: 500 },
    );
  }
}
