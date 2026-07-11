import { NextRequest, NextResponse } from "next/server";
import {
  fetchChatMessages,
  fetchChatSessions,
  sendChatMessage,
  toChatMessage,
  toChatSession,
} from "@/lib/services/appwriteServices";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const phone = searchParams.get("phone") ?? "";

  try {
    if (sessionId) {
      const messages = await fetchChatMessages(sessionId);
      return NextResponse.json({ success: true, messages: messages.map(toChatMessage) });
    }

    if (!userId && !customerId && !phone) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    const sessions = await fetchChatSessions({ userId, customerId, phone });
    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => toChatSession(session, userId || customerId)),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load chats" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId?.toString().trim() ?? "";
    const content = body.content?.toString() ?? body.messageText?.toString() ?? "";
    const senderId = body.senderId?.toString().trim() ?? "";
    const senderName = body.senderName?.toString().trim() || "AMC MEP user";

    if (!sessionId || !content.trim() || !senderId) {
      return NextResponse.json({ success: false, error: "Missing session, message, or sender" }, { status: 400 });
    }

    const message = await sendChatMessage({ sessionId, messageText: content, senderId, senderName });
    return NextResponse.json({ success: true, message: toChatMessage(message) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Invalid request" }, { status: 400 });
  }
}
