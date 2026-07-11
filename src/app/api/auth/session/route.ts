import { NextRequest, NextResponse } from "next/server";
import { appwrite } from "@/lib/appwrite/client";

export async function GET() {
  try {
    const session = await appwrite.account.getSession("current");
    return NextResponse.json({
      success: true,
      session: {
        id: session.$id,
        userId: session.userId,
        provider: session.provider,
        createdAt: session.$createdAt,
        expiresAt: session.expire,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "No active session" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  try {
    await appwrite.account.deleteSession("current");
    return NextResponse.json({ success: true, message: "Session ended" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to end session" },
      { status: 500 }
    );
  }
}
