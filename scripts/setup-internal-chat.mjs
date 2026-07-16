import { Client, Databases, Permission, Role } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "680b2b830035595d7746";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "680b2cfb002805548743";
const key = process.env.APPWRITE_API_KEY;
if (!key) throw new Error("APPWRITE_API_KEY is required.");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(key));

async function ensureCollection(id, name) {
  try { return await db.getCollection(databaseId, id); }
  catch { return db.createCollection(databaseId, id, name, [Permission.create(Role.users())], false, true); }
}
async function ensureString(collectionId, key, size, required = true, array = false, fallback = undefined) {
  try { await db.getAttribute(databaseId, collectionId, key); }
  catch { await db.createStringAttribute(databaseId, collectionId, key, size, required, fallback, array); }
}
async function ensureBool(collectionId, key, required, fallback) {
  try { await db.getAttribute(databaseId, collectionId, key); }
  catch { await db.createBooleanAttribute(databaseId, collectionId, key, required, required ? undefined : fallback); }
}
async function wait() { await new Promise((resolve) => setTimeout(resolve, 1200)); }
async function ensureIndex(collectionId, key, attributes) {
  try { await db.getIndex(databaseId, collectionId, key); }
  catch { await db.createIndex(databaseId, collectionId, key, "key", attributes); }
}

await ensureCollection("internal_chat_sessions", "Internal chat sessions");
for (const [keyName, size, required, array, fallback] of [
  ["businessId", 100, true, false], ["counterpartyBusinessId", 100, false, false, ""], ["conversationType", 30, true, false], ["pairKey", 220, true, false],
  ["participantIds", 100, true, true], ["participantNames", 150, true, true], ["title", 150, false, false, ""],
  ["lastMessage", 1000, false, false, ""], ["lastMessageAt", 40, true, false], ["createdBy", 100, true, false],
  ["createdAt", 40, true, false], ["updatedAt", 40, true, false],
]) await ensureString("internal_chat_sessions", keyName, size, required, array, fallback);
await ensureBool("internal_chat_sessions", "isActive", true, true);
await wait();
await ensureIndex("internal_chat_sessions", "business_active_updated", ["businessId", "isActive", "updatedAt"]);
await ensureIndex("internal_chat_sessions", "counterparty_active_updated", ["counterpartyBusinessId", "isActive", "updatedAt"]);
await ensureIndex("internal_chat_sessions", "business_pair", ["businessId", "pairKey"]);
await ensureIndex("internal_chat_sessions", "updated", ["updatedAt"]);

await ensureCollection("internal_chat_messages", "Internal chat messages");
for (const [keyName, size, required, array, fallback] of [
  ["sessionId", 100, true, false], ["businessId", 100, true, false], ["senderId", 100, true, false],
  ["senderName", 150, true, false], ["messageText", 5000, true, false], ["messageType", 30, true, false], ["createdAt", 40, true, false],
]) await ensureString("internal_chat_messages", keyName, size, required, array, fallback);
await ensureBool("internal_chat_messages", "isDeleted", true, false);
await wait();
await ensureIndex("internal_chat_messages", "session_created", ["sessionId", "createdAt"]);
console.log("Internal communication tables are ready.");
