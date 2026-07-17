import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const calls = "internal_call_sessions";
const candidates = "internal_call_candidates";
const chats = "internal_chat_sessions";
function db() { const key = process.env.APPWRITE_API_KEY; if (!key) throw new Error("APPWRITE_API_KEY is not configured."); return new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(key)); }
function val(row: any, key: string) { return String(row?.[key] ?? "").trim(); }
async function chatAccess(databases: Databases, chatSessionId: string, userId: string) { const chat = await databases.getDocument(databaseId, chats, chatSessionId); if (!Array.isArray(chat.participantIds) || !chat.participantIds.map(String).includes(userId)) throw new Error("Call access denied."); return chat; }
async function callAccess(databases: Databases, callId: string, userId: string) { const call = await databases.getDocument(databaseId, calls, callId); if (![val(call,"callerId"), val(call,"calleeId")].includes(userId)) throw new Error("Call access denied."); return call; }

export async function GET(request: NextRequest) {
  try {
    const databases = db(); const userId = request.nextUrl.searchParams.get("userId") ?? ""; const callId = request.nextUrl.searchParams.get("callId") ?? "";
    if (callId) { const call = await callAccess(databases, callId, userId); const rows = await databases.listDocuments(databaseId, candidates, [Query.equal("callId", callId), Query.orderAsc("createdAt"), Query.limit(200)]); return NextResponse.json({ call, candidates: rows.documents }); }
    const rows = await databases.listDocuments(databaseId, calls, [Query.equal("calleeId", userId), Query.equal("status", "ringing"), Query.orderDesc("createdAt"), Query.limit(1)]);
    return NextResponse.json({ incoming: rows.documents[0] ?? null });
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
