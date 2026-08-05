import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { DataHubServerDatabase } from "@/lib/data-hub/server-database";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const calls = "internal_call_sessions";
const candidates = "internal_call_candidates";
const chats = "internal_chat_sessions";
function db() { return new DataHubServerDatabase(); }
function val(row: any, key: string) { return String(row?.[key] ?? "").trim(); }
function meteredJson(operation: string, body: Record<string, unknown>, estimatedRowsRead: number) {
  console.info(JSON.stringify({
    metric: "appwrite_rows_read",
    endpoint: "internal-calls",
    operation,
    estimatedRowsRead,
  }));
  const response = NextResponse.json(body);
  response.headers.set("Server-Timing", `appwrite-rows;desc="${estimatedRowsRead}"`);
  return response;
}
async function chatAccess(databases: DataHubServerDatabase, chatSessionId: string, userId: string) { const chat = await databases.getDocument(databaseId, chats, chatSessionId); if (!Array.isArray(chat.participantIds) || !chat.participantIds.map(String).includes(userId)) throw new Error("Call access denied."); return chat; }
async function callAccess(databases: DataHubServerDatabase, callId: string, userId: string) { const call = await databases.getDocument(databaseId, calls, callId); if (![val(call,"callerId"), val(call,"calleeId")].includes(userId)) throw new Error("Call access denied."); return call; }

export async function GET(request: NextRequest) {
  try {
    const databases = db(); const userId = request.nextUrl.searchParams.get("userId") ?? ""; const callId = request.nextUrl.searchParams.get("callId") ?? "";
    if (callId) { const call = await callAccess(databases, callId, userId); const rows = await databases.listDocuments(databaseId, candidates, [Query.equal("callId", callId), Query.orderDesc("createdAt"), Query.limit(50)]); return meteredJson("call-detail", { call, candidates: rows.documents.reverse() }, rows.documents.length + 1); }
    const rows = await databases.listDocuments(databaseId, calls, [Query.equal("calleeId", userId), Query.equal("status", "ringing"), Query.orderDesc("createdAt"), Query.limit(1)]);
    return meteredJson("incoming", { incoming: rows.documents[0] ?? null }, rows.documents.length);
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Call could not be loaded." }, { status: 400 }); }
}

export async function POST(request: NextRequest) {
  try {
    const databases = db(); const body = await request.json(); const action = String(body.action ?? "create"); const userId = String(body.userId ?? ""); const now = new Date().toISOString();
    if (action === "create") { const chat = await chatAccess(databases, String(body.chatSessionId), userId); const participantIds = chat.participantIds.map(String); const calleeId = participantIds.find((id: string) => id !== userId); if (!calleeId) throw new Error("No recipient is available."); const names = chat.participantNames?.map(String) ?? []; const callerIndex = participantIds.indexOf(userId); const calleeIndex = participantIds.indexOf(calleeId); const call = await databases.createDocument(databaseId, calls, ID.unique(), { chatSessionId: chat.$id, businessId: val(chat,"businessId"), callerId: userId, callerName: names[callerIndex] || "Member", calleeId, calleeName: names[calleeIndex] || "Member", mode: body.mode === "video" ? "video" : "voice", status: "ringing", offerSdp: String(body.offerSdp ?? ""), answerSdp: "", createdAt: now, answeredAt: "", endedAt: "" }); return NextResponse.json({ call }, { status: 201 }); }
    const call = await callAccess(databases, String(body.callId), userId);
    if (action === "candidate") { const row = await databases.createDocument(databaseId, candidates, ID.unique(), { callId: call.$id, senderId: userId, candidate: String(body.candidate ?? ""), sdpMid: String(body.sdpMid ?? ""), sdpMLineIndex: String(body.sdpMLineIndex ?? ""), createdAt: now }); return NextResponse.json({ candidate: row }, { status: 201 }); }
    const status = String(body.status ?? "ended"); const patch: Record<string,string> = { status }; if (body.answerSdp) patch.answerSdp = String(body.answerSdp); if (status === "accepted") patch.answeredAt = now; if (["ended","declined","missed"].includes(status)) patch.endedAt = now; const updated = await databases.updateDocument(databaseId, calls, call.$id, patch); return NextResponse.json({ call: updated });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Call could not be updated." }, { status: 400 }); }
}
