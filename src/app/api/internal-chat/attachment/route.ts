import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  Compression,
  Databases,
  ID,
  Query,
  Storage,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const sessionsTable =
  process.env.NEXT_PUBLIC_INTERNAL_CHAT_SESSIONS_ID ?? "internal_chat_sessions";
const messagesTable =
  process.env.NEXT_PUBLIC_INTERNAL_CHAT_MESSAGES_ID ?? "internal_chat_messages";
const bucketId =
  process.env.NEXT_PUBLIC_INTERNAL_CHAT_FILES_BUCKET_ID ??
  "internal_chat_files";
const allowed = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "zip",
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
function value(row: any, key: string) {
  return String(row?.[key] ?? "").trim();
}
async function ensureBucket(storage: Storage) {
  try {
    await storage.getBucket(bucketId);
  } catch {
    await storage.createBucket(
      bucketId,
      "Internal communication files",
      [],
      false,
      true,
      20 * 1024 * 1024,
      [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "csv",
        "txt",
        "zip",
      ],
      Compression.None,
      true,
      true,
    );
  }
}
const attachmentAttributes = [
  ["fileId", 100],
  ["fileName", 255],
  ["fileMime", 150],
  ["fileSize", 30],
] as const;
async function ensureAttachmentSchema(databases: Databases) {
  for (const [key, size] of attachmentAttributes) {
    try {
      await databases.getAttribute(databaseId, messagesTable, key);
    } catch (error: any) {
      if (error?.code !== 404) throw error;
      await databases
        .createStringAttribute(databaseId, messagesTable, key, size, false, "")
        .catch((createError: any) => {
          if (createError?.code !== 409) throw createError;
        });
    }
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const attributes = await Promise.all(
      attachmentAttributes.map(([key]) =>
        databases.getAttribute(databaseId, messagesTable, key),
      ),
    );
    const failed: any = attributes.find(
      (attribute: any) => attribute.status === "failed",
    );
    if (failed)
      throw new Error(
        `Attachment field ${failed.key} could not be created: ${failed.error || "Appwrite schema error"}`,
      );
    if (attributes.every((attribute: any) => attribute.status === "available"))
      return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    "Attachment fields are still being prepared. Please try again in a moment.",
  );
}
async function access(databases: Databases, sessionId: string, userId: string) {
  const session = await databases.getDocument(
    databaseId,
    sessionsTable,
    sessionId,
  );
  if (
    !Array.isArray(session.participantIds) ||
    !session.participantIds.map(String).includes(userId)
  )
    throw new Error("You are not part of this conversation.");
  const businessIds = [
    value(session, "businessId"),
    value(session, "counterpartyBusinessId"),
  ].filter(Boolean);
  for (const businessId of businessIds) {
    const rows = await databases
      .listDocuments(databaseId, "business_memberships", [
        Query.equal("businessId", businessId),
        Query.equal("userId", userId),
        Query.equal("status", "active"),
        Query.limit(1),
      ])
      .catch(() => null);
    if (rows?.documents[0]) return { session, actor: rows.documents[0] };
  }
  throw new Error("Business access is not active.");
}

export async function POST(request: NextRequest) {
  try {
    const { databases, storage } = services();
    const data = await request.formData();
    const file = data.get("file");
    const sessionId = String(data.get("sessionId") ?? "");
    const userId = String(data.get("userId") ?? "");
    if (!(file instanceof File) || !sessionId || !userId)
      throw new Error("Choose a file first.");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("Files must be 20 MB or smaller.");
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.has(extension))
      throw new Error("This file type is not supported.");
    const { session, actor } = await access(databases, sessionId, userId);
    await ensureAttachmentSchema(databases);
    await ensureBucket(storage);
    const uploaded = await storage.createFile(
      bucketId,
      ID.unique(),
      InputFile.fromBuffer(Buffer.from(await file.arrayBuffer()), file.name),
    );
    const now = new Date().toISOString();
    const isImage = file.type.startsWith("image/");
    let message;
    try {
      message = await databases.createDocument(
        databaseId,
        messagesTable,
        ID.unique(),
        {
          sessionId,
          businessId: value(session, "businessId"),
          senderId: userId,
          senderName: value(actor, "memberName") || "Member",
          messageText: file.name,
          messageType: isImage ? "image" : "file",
          fileId: uploaded.$id,
          fileName: file.name,
          fileMime: file.type || "application/octet-stream",
          fileSize: String(file.size),
          createdAt: now,
          isDeleted: false,
        },
      );
    } catch (error) {
      await storage.deleteFile(bucketId, uploaded.$id).catch(() => undefined);
      throw error;
    }
    await databases.updateDocument(databaseId, sessionsTable, sessionId, {
      lastMessage: isImage ? "Shared an image" : `Shared ${file.name}`,
      lastMessageAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "File could not be shared." },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { databases, storage } = services();
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    const fileId = request.nextUrl.searchParams.get("fileId") ?? "";
    await access(databases, sessionId, userId);
    const messageRows = await databases.listDocuments(
      databaseId,
      messagesTable,
      [Query.equal("sessionId", sessionId), Query.limit(200)],
    );
    const message = messageRows.documents.find(
      (row) => value(row, "fileId") === fileId,
    );
    if (!message)
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    const bytes = await storage.getFileDownload(bucketId, fileId);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type":
          value(message, "fileMime") || "application/octet-stream",
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(value(message, "fileName") || "attachment")}`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "File could not be opened." },
      { status: 403 },
    );
  }
}
