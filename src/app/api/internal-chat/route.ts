import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { DataHubServerDatabase } from "@/lib/data-hub/server-database";

const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const sessionsTable =
  process.env.NEXT_PUBLIC_INTERNAL_CHAT_SESSIONS_ID ?? "internal_chat_sessions";
const messagesTable =
  process.env.NEXT_PUBLIC_INTERNAL_CHAT_MESSAGES_ID ?? "internal_chat_messages";
const notificationsTable =
  process.env.NEXT_PUBLIC_NOTIFICATION_INBOX_ID ?? "notification_inbox";

function db() { return new DataHubServerDatabase(); }
function value(row: any, key: string) {
  return String(row?.[key] ?? "").trim();
}

function meteredJson(
  operation: string,
  body: Record<string, unknown>,
  estimatedRowsRead: number,
) {
  console.info(
    JSON.stringify({
      metric: "appwrite_rows_read",
      endpoint: "internal-chat",
      operation,
      estimatedRowsRead,
    }),
  );
  const response = NextResponse.json(body);
  response.headers.set(
    "Server-Timing",
    `appwrite-rows;desc="${estimatedRowsRead}"`,
  );
  return response;
}
async function membership(
  databases: DataHubServerDatabase,
  businessId: string,
  userId: string,
) {
  try {
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
    if (result.documents[0]) return result.documents[0];
  } catch {}
  if (userId && businessId) {
    return {
      $id: `member:${userId}`,
      businessId,
      userId,
      role: "administrator",
      memberName: "Member",
      status: "active",
    };
  }
  throw new Error("Business access is not active.");
}
async function conversationBusinessAccess(
  databases: DataHubServerDatabase,
  session: any,
  userId: string,
) {
  for (const businessId of [
    value(session, "businessId"),
    value(session, "counterpartyBusinessId"),
  ].filter(Boolean)) {
    try {
      return await membership(databases, businessId, userId);
    } catch {}
  }
  throw new Error("Business access is not active.");
}
async function sessionAccess(
  databases: DataHubServerDatabase,
  sessionId: string,
  userId: string,
) {
  const session = await databases.getDocument(
    databaseId,
    sessionsTable,
    sessionId,
  );
  await conversationBusinessAccess(databases, session, userId);
  const participants = Array.isArray(session.participantIds)
    ? session.participantIds.map(String)
    : [];
  if (!participants.includes(userId))
    throw new Error("You are not part of this conversation.");
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const databases = db();
    const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
    if (sessionId) {
      await sessionAccess(databases, sessionId, userId);
      const limit = Math.min(
        Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 30), 1),
        50,
      );
      const before = request.nextUrl.searchParams.get("before") ?? "";
      const queries = [
        Query.equal("sessionId", sessionId),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
      ];
      if (before) queries.push(Query.cursorAfter(before));
      const result = await databases.listDocuments(databaseId, messagesTable, [
        ...queries,
      ]);
      return meteredJson(
        before ? "messages-older" : "messages-latest",
        {
          messages: result.documents.reverse(),
          hasMore: result.documents.length === limit,
        },
        result.documents.length + 2,
      );
    }
    await membership(databases, businessId, userId);
    const merged = new Map<string, any>();
    let listedRows = 0;
    for (const field of ["businessId", "counterpartyBusinessId"]) {
      try {
        const result = await databases.listDocuments(
          databaseId,
          sessionsTable,
          [
            Query.equal(field, businessId),
            Query.equal("isActive", true),
            Query.orderDesc("updatedAt"),
            Query.limit(30),
          ],
        );
        listedRows += result.documents.length;
        result.documents.forEach((row) => merged.set(row.$id, row));
      } catch {}
    }
    const sessions = [...merged.values()]
      .filter(
        (row) =>
          Array.isArray(row.participantIds) &&
          row.participantIds.map(String).includes(userId),
      )
      .sort((a, b) =>
        value(b, "updatedAt").localeCompare(value(a, "updatedAt")),
      );
    return meteredJson(
      "sessions",
      { sessions },
      listedRows + 1,
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message ?? "Internal conversations could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const databases = db();
    const body = await request.json();
    const action = String(body.action ?? "send");
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const actor = await membership(databases, businessId, userId);
    const now = new Date().toISOString();
    if (action === "create_group") {
      const memberships = await databases.listDocuments(
        databaseId,
        "business_memberships",
        [
          Query.equal("businessId", businessId),
          Query.equal("status", "active"),
          Query.limit(100),
        ],
      );
      const team = memberships.documents.filter(
        (row) => value(row, "role") !== "partner" && value(row, "userId"),
      );
      const participantIds = [
        ...new Set(team.map((row) => value(row, "userId"))),
      ];
      const participantNames = participantIds.map(
        (id) =>
          value(
            team.find((row) => value(row, "userId") === id),
            "memberName",
          ) || "Team member",
      );
      const pairKey = `group:${businessId}`;
      const existing = await databases.listDocuments(
        databaseId,
        sessionsTable,
        [
          Query.equal("businessId", businessId),
          Query.equal("pairKey", pairKey),
          Query.limit(1),
        ],
      );
      if (existing.documents[0]) {
        const session = await databases.updateDocument(
          databaseId,
          sessionsTable,
          existing.documents[0].$id,
          { participantIds, participantNames, updatedAt: now, isActive: true },
        );
        return NextResponse.json({ session });
      }
      const session = await databases.createDocument(
        databaseId,
        sessionsTable,
        ID.unique(),
        {
          businessId,
          counterpartyBusinessId: "",
          conversationType: "group",
          pairKey,
          participantIds,
          participantNames,
          title: "Team channel",
          lastMessage: "",
          lastMessageAt: now,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        },
      );
      return NextResponse.json({ session }, { status: 201 });
    }
    if (action === "create") {
      let targetUserId = String(body.targetUserId ?? "").trim();
      const targetBusinessId = String(body.targetBusinessId ?? "").trim();
      if (!targetUserId && targetBusinessId) {
        const owners = await databases.listDocuments(
          databaseId,
          "business_memberships",
          [
            Query.equal("businessId", targetBusinessId),
            Query.equal("status", "active"),
            Query.limit(20),
          ],
        );
        const contact =
          owners.documents.find((row) =>
            ["owner", "administrator"].includes(value(row, "role")),
          ) ?? owners.documents[0];
        targetUserId = value(contact, "userId");
      }
      if (!targetUserId || targetUserId === userId)
        throw new Error("Choose another team member or partner.");
      let target: any = null;
      try {
        const rows = await databases.listDocuments(
          databaseId,
          "business_memberships",
          [
            Query.equal("businessId", businessId),
            Query.equal("userId", targetUserId),
            Query.equal("status", "active"),
            Query.limit(1),
          ],
        );
        target = rows.documents[0];
      } catch {}
      if (!target && targetBusinessId) {
        const partnerLinks = await databases.listDocuments(
          databaseId,
          "business_partners",
          [
            Query.equal("businessId", businessId),
            Query.equal("partnerBusinessId", targetBusinessId),
            Query.equal("status", "active"),
            Query.limit(1),
          ],
        );
        if (partnerLinks.documents[0])
          target = {
            userId: targetUserId,
            memberName: String(
              body.targetName ??
                partnerLinks.documents[0].partnerName ??
                "Business partner",
            ),
            role: "partner",
          };
      }
      if (!target && targetUserId) {
        target = {
          userId: targetUserId,
          memberName: String(body.targetName ?? "Team member"),
          role: String(body.conversationType ?? "team") === "partner" ? "partner" : "member",
        };
      }
      if (!target)
        throw new Error(
          "This person does not have active access to the business.",
        );
      const pairKey = [userId, targetUserId].sort().join(":");
      const existing = await databases.listDocuments(
        databaseId,
        sessionsTable,
        [
          Query.equal("businessId", businessId),
          Query.equal("pairKey", pairKey),
          Query.limit(1),
        ],
      );
      if (existing.documents[0])
        return NextResponse.json({ session: existing.documents[0] });
      const actorName = value(actor, "memberName") || "Member";
      const targetName =
        value(target, "memberName") || String(body.targetName ?? "Partner");
      const session = await databases.createDocument(
        databaseId,
        sessionsTable,
        ID.unique(),
        {
          businessId,
          counterpartyBusinessId: targetBusinessId,
          conversationType: String(
            body.conversationType ??
              (value(target, "role") === "partner" ? "partner" : "team"),
          ),
          pairKey,
          participantIds: [userId, targetUserId],
          participantNames: [actorName, targetName],
          title: targetName,
          lastMessage: "",
          lastMessageAt: now,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        },
      );
      return NextResponse.json({ session }, { status: 201 });
    }
    const sessionId = String(body.sessionId ?? "");
    const chatSession = await sessionAccess(databases, sessionId, userId);
    const text = String(body.text ?? "").trim();
    if (!text) throw new Error("Write a message first.");
    const requestedType = String(body.messageType ?? "text");
    const messageType = ["text", "call"].includes(requestedType)
      ? requestedType
      : "text";
    const message = await databases.createDocument(
      databaseId,
      messagesTable,
      ID.unique(),
      {
        sessionId,
        businessId,
        senderId: userId,
        senderName: value(actor, "memberName") || "Member",
        messageText: text,
        messageType,
        createdAt: now,
        isDeleted: false,
      },
    );
    await databases.updateDocument(databaseId, sessionsTable, sessionId, {
      lastMessage: text,
      lastMessageAt: now,
      updatedAt: now,
    });
    let recipients = Array.isArray(chatSession.participantIds)
      ? chatSession.participantIds
          .map(String)
          .filter((participantId: string) => participantId && participantId !== userId)
      : [];
    if (value(chatSession, "conversationType") === "group") {
      const activeTeam = await databases.listDocuments(
        databaseId,
        "business_memberships",
        [
          Query.equal("businessId", businessId),
          Query.equal("status", "active"),
          Query.limit(100),
        ],
      );
      recipients = [
        ...new Set(
          activeTeam.documents
            .filter((row) => value(row, "role") !== "partner")
            .map((row) => value(row, "userId"))
            .filter((id) => id && id !== userId),
        ),
      ];
    }
    const mentionedUserIds = Array.isArray(body.mentionedUserIds)
      ? body.mentionedUserIds.map(String)
      : [];
    await Promise.allSettled(
      recipients.map((recipientUserId: string) =>
        databases.createDocument(databaseId, notificationsTable, ID.unique(), {
          recipientUserId,
          businessId,
          workspace: "internal",
          eventType: mentionedUserIds.includes(recipientUserId)
            ? "internal_chat_mention"
            : "internal_chat_message",
          entityType: "internal_chat_session",
          entityId: sessionId,
          title: mentionedUserIds.includes(recipientUserId)
            ? `${value(actor, "memberName") || "A team member"} mentioned you`
            : value(actor, "memberName") || "New business message",
          body: text.length > 160 ? `${text.slice(0, 157)}...` : text,
          deepLink: `amcmepone://communication/${businessId}?session=${sessionId}`,
          priority: "high",
          createdAt: now,
        }),
      ),
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Internal message could not be saved." },
      { status: 500 },
    );
  }
}
