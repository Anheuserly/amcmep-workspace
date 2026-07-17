import { Client, Databases, Permission, Role, Storage } from "node-appwrite";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://fra.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "680b2b830035595d7746";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "680b2cfb002805548743";
const key = process.env.APPWRITE_API_KEY;
if (!key) {
  console.log(
    "APPWRITE_API_KEY is not available; skipping the remote communication schema check.",
  );
  process.exit(0);
}
const db = new Databases(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
);
const storage = new Storage(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
);

async function ensureCollection(id, name) {
  try {
    return await db.getCollection(databaseId, id);
  } catch {
    return db.createCollection(
      databaseId,
      id,
      name,
      [Permission.create(Role.users())],
      false,
      true,
    );
  }
}
async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const attribute = await db.getAttribute(databaseId, collectionId, key);
    if (attribute.status === "available") return attribute;
    if (attribute.status === "failed")
      throw new Error(
        `${collectionId}.${key}: ${attribute.error || "attribute creation failed"}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${collectionId}.${key} did not become available.`);
}
async function ensureString(
  collectionId,
  key,
  size,
  required = true,
  array = false,
  fallback = undefined,
) {
  try {
    await db.getAttribute(databaseId, collectionId, key);
  } catch {
    await db.createStringAttribute(
      databaseId,
      collectionId,
      key,
      size,
      required,
      fallback,
      array,
    );
  }
  await waitForAttribute(collectionId, key);
}
async function ensureBool(collectionId, key, required, fallback) {
  try {
    await db.getAttribute(databaseId, collectionId, key);
  } catch {
    await db.createBooleanAttribute(
      databaseId,
      collectionId,
      key,
      required,
      required ? undefined : fallback,
    );
  }
}
async function wait() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
async function ensureIndex(collectionId, key, attributes) {
  try {
    await db.getIndex(databaseId, collectionId, key);
  } catch {
    await db.createIndex(databaseId, collectionId, key, "key", attributes);
  }
}

await ensureCollection("internal_chat_sessions", "Internal chat sessions");
for (const [keyName, size, required, array, fallback] of [
  ["businessId", 100, true, false],
  ["counterpartyBusinessId", 100, false, false, ""],
  ["conversationType", 30, true, false],
  ["pairKey", 220, true, false],
  ["participantIds", 100, true, true],
  ["participantNames", 150, true, true],
  ["title", 150, false, false, ""],
  ["lastMessage", 1000, false, false, ""],
  ["lastMessageAt", 40, true, false],
  ["createdBy", 100, true, false],
  ["createdAt", 40, true, false],
  ["updatedAt", 40, true, false],
])
  await ensureString(
    "internal_chat_sessions",
    keyName,
    size,
    required,
    array,
    fallback,
  );
await ensureBool("internal_chat_sessions", "isActive", true, true);
await wait();
await ensureIndex("internal_chat_sessions", "business_active_updated", [
  "businessId",
  "isActive",
  "updatedAt",
]);
await ensureIndex("internal_chat_sessions", "counterparty_active_updated", [
  "counterpartyBusinessId",
  "isActive",
  "updatedAt",
]);
await ensureIndex("internal_chat_sessions", "business_pair", [
  "businessId",
  "pairKey",
]);
await ensureIndex("internal_chat_sessions", "updated", ["updatedAt"]);

await ensureCollection("internal_chat_messages", "Internal chat messages");
for (const [keyName, size, required, array, fallback] of [
  ["sessionId", 100, true, false],
  ["businessId", 100, true, false],
  ["senderId", 100, true, false],
  ["senderName", 150, true, false],
  ["messageText", 5000, true, false],
  ["messageType", 30, true, false],
  ["createdAt", 40, true, false],
  ["fileId", 100, false, false, ""],
  ["fileName", 255, false, false, ""],
  ["fileMime", 150, false, false, ""],
  ["fileSize", 30, false, false, ""],
])
  await ensureString(
    "internal_chat_messages",
    keyName,
    size,
    required,
    array,
    fallback,
  );
await ensureBool("internal_chat_messages", "isDeleted", true, false);
await wait();
await ensureIndex("internal_chat_messages", "session_created", [
  "sessionId",
  "createdAt",
]);
await ensureIndex("internal_chat_messages", "session_file", [
  "sessionId",
  "fileId",
]);

for (const collection of [
  "internal_call_sessions",
  "internal_call_candidates",
]) {
  await ensureCollection(
    collection,
    collection === "internal_call_sessions"
      ? "Internal call sessions"
      : "Internal call candidates",
  );
}
for (const [keyName, size, required, array, fallback] of [
  ["chatSessionId", 100, true, false],
  ["businessId", 100, true, false],
  ["callerId", 100, true, false],
  ["callerName", 150, true, false],
  ["calleeId", 100, true, false],
  ["calleeName", 150, true, false],
  ["mode", 20, true, false],
  ["status", 30, true, false],
  ["offerSdp", 50000, true, false],
  ["answerSdp", 50000, false, false, ""],
  ["createdAt", 40, true, false],
  ["answeredAt", 40, false, false, ""],
  ["endedAt", 40, false, false, ""],
])
  await ensureString(
    "internal_call_sessions",
    keyName,
    size,
    required,
    array,
    fallback,
  );
for (const [keyName, size, required, array, fallback] of [
  ["callId", 100, true, false],
  ["senderId", 100, true, false],
  ["candidate", 4000, true, false],
  ["sdpMid", 100, false, false, ""],
  ["sdpMLineIndex", 20, false, false, ""],
  ["createdAt", 40, true, false],
])
  await ensureString(
    "internal_call_candidates",
    keyName,
    size,
    required,
    array,
    fallback,
  );
await wait();
await ensureIndex("internal_call_sessions", "callee_status_created", [
  "calleeId",
  "status",
  "createdAt",
]);
await ensureIndex("internal_call_sessions", "chat_created", [
  "chatSessionId",
  "createdAt",
]);
await ensureIndex("internal_call_candidates", "call_created", [
  "callId",
  "createdAt",
]);

try {
  await storage.getBucket("internal_chat_files");
} catch {
  await storage.createBucket(
    "internal_chat_files",
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
    "none",
    true,
    true,
  );
}
console.log("Internal communication tables are ready.");
