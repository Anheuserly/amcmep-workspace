import { Query, ID } from "appwrite";
import { appwrite } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
  AMCRecord,
  ActivityEvent,
  Business,
  ChatMessage,
  ChatSession,
  FeedComment,
  FeedPost,
  MarketplaceItem,
  PartnerAssignment,
  PartnerProfile,
  ServiceRequest,
  UserRole,
  WorkspaceMembership,
} from "@/types";

const DB_ID = appwriteConfig.databaseId;
const COLLECTIONS = {
  serviceRequests: "685c3b1d002324dcb294",
  chatSessions: "chat_sessions",
  chatMessages: "chat_messages",
  feed: "68a361040001a07e0b58",
  feedComments: "feed_comments",
  marketplace: "marketplace_showcases",
  clients: appwriteConfig.collections.userData,
  administrators: "681c97fa003d57ddf43d",
  businesses: "businesses",
  businessMemberships: "business_memberships",
  notificationInbox: "notification_inbox",
  assignments: "assignments",
  paymentConfig: "6888bdc300110b2eecca",
  partners: "680b308e002ef25fd54b",
  projects: "projects",
  tasks: "tasks",
  quotations: "quotations",
  invoices: "invoices",
  businessItems: "business_items",
  documents: "documents",
  amcContracts: "amc_contracts",
  amcVisits: "amc_visits",
  commercialDocuments: "commercial_documents",
  billingProfiles: "business_billing_profiles",
  billingParties: "billing_parties",
  documentTemplates: "document_templates",
} as const;

const BUCKETS = {
  feed: "68a364820028c8a86b65",
  chatMedia: "68b47a6b0031a9928058",
  marketplace: "69032c8c002ad7e77e5c",
} as const;

export function readString(data: any, key: string): string {
  return data?.[key]?.toString().trim() ?? "";
}

export function readInt(data: any, key: string): number {
  return parseInt(data?.[key]?.toString() ?? "0", 10) || 0;
}

export function readBool(data: any, key: string): boolean {
  const v = data?.[key];
  if (v === true) return true;
  if (v === false) return false;
  return (v?.toString().toLowerCase() ?? "") === "true";
}

export function readStringArray(data: any, key: string): string[] {
  const value = data?.[key];
  if (Array.isArray(value)) return value.map((item) => item?.toString().trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeStatus(value?: string): ServiceRequest["status"] {
  const status = (value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (["completed", "done", "closed", "resolved"].includes(status)) return "completed";
  if (["cancelled", "canceled", "rejected"].includes(status)) return "cancelled";
  if (["awaiting_payment", "payment_pending", "pending_payment"].includes(status)) return "awaiting_payment";
  if (["in_progress", "assigned", "accepted", "on_the_way", "ongoing", "started"].includes(status)) return "in_progress";
  return "open";
}

export function normalizePriority(value?: string): ServiceRequest["priority"] {
  const priority = (value ?? "").toLowerCase().trim();
  if (priority === "urgent" || priority === "high" || priority === "low") return priority;
  return "medium";
}

export function userIdentity(profile?: { userId?: string; customerId?: string; phone?: string } | null) {
  return {
    userId: profile?.userId ?? "",
    customerId: profile?.customerId || profile?.userId || "",
    phone: profile?.phone ?? "",
  };
}

export function toServiceRequest(doc: any): ServiceRequest {
  const createdAt = readString(doc, "createdAt") || doc?.$createdAt || new Date().toISOString();
  const updatedAt = readString(doc, "updatedAt") || doc?.$updatedAt || createdAt;
  const serviceType = readString(doc, "serviceType") || readString(doc, "type") || "Service";
  const title =
    readString(doc, "title") ||
    readString(doc, "requestTitle") ||
    readString(doc, "serviceName") ||
    `${serviceType} request`;
  const description =
    readString(doc, "description") ||
    readString(doc, "serviceDescription") ||
    readString(doc, "notes") ||
    readString(doc, "issueDescription") ||
    "Service request";

  return {
    $id: doc.$id,
    title,
    description,
    status: normalizeStatus(readString(doc, "status")),
    priority: normalizePriority(readString(doc, "priority")),
    serviceType,
    siteAddress:
      readString(doc, "siteAddress") ||
      readString(doc, "address") ||
      readString(doc, "requestorAddress") ||
      readString(doc, "customerAddress") ||
      [readString(doc, "city"), readString(doc, "state")].filter(Boolean).join(", "),
    customerId: readString(doc, "customerId") || readString(doc, "user_id") || readString(doc, "requestorUserId"),
    customerName: readString(doc, "customerName") || readString(doc, "requestorName") || readString(doc, "name"),
    customerPhone:
      readString(doc, "customerPhone") ||
      readString(doc, "clientPhone") ||
      readString(doc, "requestorPhone") ||
      readString(doc, "phone"),
    assignedTo: readString(doc, "assignedTo") || readString(doc, "partnerId") || undefined,
    assignedBusinessId: readString(doc, "assignedBusinessId") || readString(doc, "businessId") || undefined,
    estimatedCost: readInt(doc, "estimatedCost") || readInt(doc, "amount") || undefined,
    finalCost: readInt(doc, "finalCost") || undefined,
    scheduledAt: readString(doc, "scheduledAt") || readString(doc, "scheduledDate") || undefined,
    completedAt: readString(doc, "completedAt") || undefined,
    createdAt,
    updatedAt,
  };
}

export function toChatSession(doc: any, currentUserId?: string): ChatSession {
  const participantIds = readStringArray(doc, "participantIds");
  const participantNames = readStringArray(doc, "participantNames");
  const businessName =
    readString(doc, "businessName") ||
    readString(doc, "counterpartyName") ||
    readString(doc, "partnerName") ||
    readString(doc, "clientName") ||
    "Conversation";
  const currentId = currentUserId ?? "";
  const otherId =
    participantIds.find((id) => id !== currentId) ||
    readString(doc, "businessId") ||
    readString(doc, "partnerUserId") ||
    readString(doc, "clientId");
  const otherName =
    participantNames.find((name) => name.toLowerCase() !== "you") ||
    businessName;
  const chatType = readString(doc, "chatType") || readString(doc, "type") || "business";

  return {
    $id: doc.$id,
    type: chatType.includes("support") ? "support" : chatType.includes("partner") ? "partner" : "business",
    participantIds: [currentId, otherId].filter(Boolean),
    participantNames: ["You", otherName],
    participantAvatars: ["", readString(doc, "counterpartyAvatar")],
    businessId: readString(doc, "businessId") || undefined,
    businessName,
    requestId: readString(doc, "requestId") || readString(doc, "serviceRequestId") || undefined,
    amcId: readString(doc, "amcId") || undefined,
    lastMessage: readString(doc, "lastMessage"),
    lastMessageAt: readString(doc, "lastMessageTime") || readString(doc, "updatedAt") || doc.$updatedAt,
    unreadCount: readInt(doc, "unreadCount"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toChatMessage(doc: any): ChatMessage {
  return {
    $id: doc.$id,
    sessionId: readString(doc, "sessionId"),
    senderId: readString(doc, "senderId"),
    senderName: readString(doc, "senderName") || "AMC MEP",
    senderAvatar: readString(doc, "senderAvatar") || undefined,
    type: (readString(doc, "messageType") || readString(doc, "type") || "text") as ChatMessage["type"],
    content: readString(doc, "messageText") || readString(doc, "text") || readString(doc, "content"),
    mediaUrl: readString(doc, "mediaUrl") || undefined,
    createdAt: readString(doc, "timestamp") || readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toActivityEvent(doc: any, userId = ""): ActivityEvent {
  const type = readString(doc, "type") || readString(doc, "notificationType") || "system";
  const normalizedType =
    type.includes("chat") ? "chat" :
    type.includes("request") ? "request" :
    type.includes("amc") ? "amc" :
    type.includes("partner") ? "partner" :
    type.includes("business") ? "business" :
    "system";

  return {
    $id: doc.$id,
    userId: readString(doc, "recipientUserId") || readString(doc, "userId") || userId,
    type: normalizedType,
    title: readString(doc, "title") || "Notification",
    description: readString(doc, "body") || readString(doc, "message") || readString(doc, "description"),
    referenceId: readString(doc, "referenceId") || "",
    referenceType: readString(doc, "referenceType") || normalizedType,
    isRead: readBool(doc, "isRead"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toFeedPost(doc: any, currentUserId = ""): FeedPost {
  const likedBy = readStringArray(doc, "likedBy");
  const mediaUrl = readString(doc, "mediaUrl");
  const mediaUrls = readStringArray(doc, "mediaUrls");
  if (mediaUrl) mediaUrls.unshift(mediaUrl);
  const contentType = readString(doc, "contentType").toLowerCase();
  const mediaType = readString(doc, "mediaType").toLowerCase();
  const resolvedMediaType =
    mediaType ||
    (contentType.includes("video") || mediaUrl.match(/\.(mp4|mov|webm|mkv)(\?|$)/i)
      ? "video"
      : contentType.includes("image") || mediaUrl
      ? "image"
      : "");

  return {
    $id: doc.$id,
    authorId: readString(doc, "user_id") || readString(doc, "userId") || readString(doc, "authorUserId") || readString(doc, "authorId"),
    authorName: readString(doc, "author") || readString(doc, "authorName") || readString(doc, "name") || "AMC MEP user",
    authorAvatar: readString(doc, "authorAvatar") || undefined,
    authorRole: (readString(doc, "authorRole") || readString(doc, "role") || "customer") as UserRole,
    content: readString(doc, "content") || readString(doc, "text") || readString(doc, "description"),
    mediaUrls: mediaUrls.filter(Boolean),
    mediaType: (resolvedMediaType || undefined) as FeedPost["mediaType"],
    likes: readInt(doc, "likes"),
    likedBy,
    commentsCount: readInt(doc, "commentsCount"),
    reposts: readInt(doc, "reposts"),
    isLiked: currentUserId ? likedBy.includes(currentUserId) : false,
    isReposted: false,
    tags: readStringArray(doc, "tags"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toFeedComment(doc: any): FeedComment {
  return {
    $id: doc.$id,
    postId: readString(doc, "postId"),
    authorId: readString(doc, "userId") || readString(doc, "authorUserId"),
    authorName: readString(doc, "author") || readString(doc, "authorName") || "AMC MEP user",
    authorAvatar: readString(doc, "authorAvatar") || undefined,
    content: readString(doc, "text") || readString(doc, "content"),
    likes: readInt(doc, "likes"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toMarketplaceItem(doc: any): MarketplaceItem {
  const mediaId = readString(doc, "mediaId") || readString(doc, "imageId") || readString(doc, "fileId");
  const image = mediaId ? fileViewUrl(BUCKETS.marketplace, mediaId) : readString(doc, "imageUrl");
  const price = readInt(doc, "price") || readInt(doc, "amount") || readInt(doc, "rate");

  return {
    $id: doc.$id,
    title: readString(doc, "displayTitle") || readString(doc, "title") || readString(doc, "name") || "Marketplace listing",
    description: readString(doc, "description") || readString(doc, "details") || "",
    price,
    currency: readString(doc, "currency") || "INR",
    category: readString(doc, "category") || readString(doc, "serviceType") || "Services",
    images: image ? [image] : [],
    condition: (readString(doc, "condition") || "new") as MarketplaceItem["condition"],
    sellerId: readString(doc, "providerId") || readString(doc, "sellerId") || readString(doc, "userId"),
    sellerName: readString(doc, "sellerName") || readString(doc, "businessName") || readString(doc, "providerName") || "AMC MEP seller",
    sellerBusinessId: readString(doc, "businessId") || undefined,
    status: (readString(doc, "status") || "active") as MarketplaceItem["status"],
    location: readString(doc, "location") || readString(doc, "city") || undefined,
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toAmcRecord(doc: any): AMCRecord {
  const startDate = readString(doc, "amcStartDate") || readString(doc, "startDate") || readString(doc, "createdAt") || doc.$createdAt;
  const endDate = readString(doc, "amcEndDate") || readString(doc, "endDate") || readString(doc, "scheduledAt") || "";
  const now = Date.now();
  const end = endDate ? new Date(endDate).getTime() : 0;
  const derivedStatus =
    normalizeStatus(readString(doc, "status")) === "cancelled" ? "cancelled" :
    end && end < now ? "expired" :
    end && end - now < 1000 * 60 * 60 * 24 * 30 ? "expiring_soon" :
    "active";

  return {
    $id: doc.$id,
    title: readString(doc, "title") || readString(doc, "serviceType") || readString(doc, "amcType") || "AMC contract",
    businessId: readString(doc, "businessId") || readString(doc, "assignedBusinessId"),
    businessName: readString(doc, "businessName") || readString(doc, "providerName") || "AMC MEP provider",
    customerId: readString(doc, "customerId") || readString(doc, "user_id"),
    customerName: readString(doc, "customerName") || readString(doc, "requestorName") || readString(doc, "name"),
    status: derivedStatus,
    amcType: readString(doc, "amcType") || readString(doc, "serviceType") || "AMC",
    startDate,
    endDate: endDate || startDate,
    cost: readInt(doc, "cost") || readInt(doc, "estimatedCost") || readInt(doc, "amount"),
    paymentStatus: (readString(doc, "paymentStatus") || "pending") as AMCRecord["paymentStatus"],
    visitCount: readInt(doc, "visitCount") || readInt(doc, "completedVisits"),
    totalVisits: readInt(doc, "totalVisits") || readInt(doc, "visits") || 1,
    nextVisitDate: readString(doc, "nextVisitDate") || readString(doc, "scheduledAt") || undefined,
    siteAddress: readString(doc, "siteAddress") || readString(doc, "address") || readString(doc, "requestorAddress"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
    updatedAt: readString(doc, "updatedAt") || doc.$updatedAt,
  };
}

export function toBusiness(doc: any): Business {
  const categories = readStringArray(doc, "categories");
  const specialization = readStringArray(doc, "specialization");
  const servicesEnabledValue = doc?.servicesEnabled;
  return {
    $id: doc.$id,
    name: readString(doc, "businessName") || readString(doc, "name") || "Business",
    slug: readString(doc, "slug") || doc.$id,
    description: readString(doc, "description") || readString(doc, "businessType"),
    address: readString(doc, "address") || readString(doc, "addressLine1"),
    city: readString(doc, "city"),
    state: readString(doc, "state"),
    pincode: readString(doc, "pincode"),
    phone: readString(doc, "phone"),
    email: readString(doc, "email"),
    website: readString(doc, "website") || readString(doc, "websiteUrl"),
    logo: readString(doc, "logo") || readString(doc, "profileImage"),
    categories: categories.length ? categories : specialization,
    servicesEnabled: servicesEnabledValue === undefined || servicesEnabledValue === null ? true : readBool(doc, "servicesEnabled"),
    vendorEnabled: readBool(doc, "vendorEnabled"),
    status: (readString(doc, "status") || "active") as Business["status"],
    ownerId: readString(doc, "ownerId") || readString(doc, "user_id") || readString(doc, "ownerUserId"),
    rating: Number(readString(doc, "rating")) || 0,
    reviewCount: readInt(doc, "reviewCount"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toWorkspaceMembership(doc: any): WorkspaceMembership {
  const rawRole = readString(doc, "role") || "viewer";
  const role = rawRole === "admin" || rawRole === "staff" ? (rawRole === "admin" ? "administrator" : "technician") : rawRole;
  return {
    $id: doc.$id,
    businessId: readString(doc, "businessId"),
    userId: readString(doc, "userId") || readString(doc, "memberUserId"),
    role: role as WorkspaceMembership["role"],
    permissions: readStringArray(doc, "permissions"),
    memberName: readString(doc, "memberName"),
    memberPhone: readString(doc, "memberPhone"),
    status: readString(doc, "status") || "active",
    onDuty: readBool(doc, "onDuty"),
    joinedAt: readString(doc, "joinedAt") || doc.$createdAt,
  };
}

export function toPartnerProfile(doc: any): PartnerProfile {
  const skills = readStringArray(doc, "skills");
  const partnerSkills = readStringArray(doc, "partnerSkills");
  const serviceAreas = readStringArray(doc, "serviceAreas");
  const partnerServiceAreas = readStringArray(doc, "partnerServiceAreas");
  return {
    $id: doc.$id,
    userId: readString(doc, "userId") || readString(doc, "user_id"),
    skills: skills.length ? skills : partnerSkills,
    serviceAreas: serviceAreas.length ? serviceAreas : partnerServiceAreas,
    partnerType: (readString(doc, "partnerType") || "service") as PartnerProfile["partnerType"],
    status: (readString(doc, "status") || readString(doc, "partnerProgramStatus") || "pending") as PartnerProfile["status"],
    earnings: readInt(doc, "earnings"),
    rating: Number(readString(doc, "rating")) || 0,
    completedJobs: readInt(doc, "completedJobs"),
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export function toPartnerAssignment(doc: any): PartnerAssignment {
  return {
    $id: doc.$id,
    partnerId: readString(doc, "partnerId") || readString(doc, "assignedTo"),
    requestId: readString(doc, "requestId") || readString(doc, "serviceRequestId"),
    businessId: readString(doc, "businessId"),
    status: (readString(doc, "status") || "assigned") as PartnerAssignment["status"],
    earnings: readInt(doc, "earnings") || readInt(doc, "amount"),
    assignedAt: readString(doc, "assignedAt") || doc.$createdAt,
    completedAt: readString(doc, "completedAt") || undefined,
  };
}

function isVisibleRequest(data: any): boolean {
  if (readBool(data, "isActive") === false) return false;
  const status = readString(data, "status").toLowerCase().replace(/_/g, " ");
  const hidden = new Set(["account deleted", "deleted", "hidden", "removed", "privacy removed", "user deleted"]);
  return !hidden.has(status);
}

export function fileViewUrl(bucketId: string, fileId: string) {
  return `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;
}

export async function fetchRequests({ customerId, userId, phone, limit = 100 }: { customerId?: string; userId?: string; phone?: string; limit?: number }) {
  const merged = new Map<string, any>();
  async function pullBy(attribute: string, value?: string) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return;
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.serviceRequests, [
        Query.equal(attribute, trimmed), Query.orderDesc("$createdAt"), Query.limit(limit),
      ]);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  await pullBy("customerId", customerId);
  await pullBy("user_id", userId);
  await pullBy("requestorUserId", userId);
  await pullBy("customerPhone", phone);
  await pullBy("clientPhone", phone);
  return Array.from(merged.values()).filter((doc) => isVisibleRequest(doc)).filter((doc) => readString(doc, "type") !== "amc").sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
}

export async function createRequest(data: Record<string, any>) {
  return appwrite.databases.createDocument(DB_ID, COLLECTIONS.serviceRequests, ID.unique(), data);
}

export async function cancelRequest(docId: string, reason: string) {
  const now = new Date().toISOString();
  return appwrite.databases.updateDocument(DB_ID, COLLECTIONS.serviceRequests, docId, { status: "cancelled", cancelledAt: now, cancellationReason: reason, updatedAt: now, isActive: false });
}

export async function fetchAmcRecords({ customerId, userId, phone, limit = 100 }: { customerId?: string; userId?: string; phone?: string; limit?: number }) {
  const merged = new Map<string, any>();
  async function pullBy(attribute: string, value?: string) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return;
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.serviceRequests, [Query.equal(attribute, trimmed), Query.orderDesc("$createdAt"), Query.limit(limit)]);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  await pullBy("customerId", customerId);
  await pullBy("user_id", userId);
  await pullBy("requestorUserId", userId);
  await pullBy("customerPhone", phone);
  await pullBy("clientPhone", phone);
  return Array.from(merged.values()).filter((doc) => isVisibleRequest(doc)).filter((doc) => { const type = readString(doc, "type").toLowerCase(); const amcType = readString(doc, "amcType").trim(); return type === "amc" || amcType.length > 0; }).sort((a, b) => { const ae = readString(a, "amcEndDate"); const be = readString(b, "amcEndDate"); if (!ae && !be) return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime(); if (!ae) return 1; if (!be) return -1; return new Date(ae).getTime() - new Date(be).getTime(); });
}

export async function fetchChatSessions({ customerId, userId, phone, limit = 100 }: { customerId?: string; userId?: string; phone?: string; limit?: number }) {
  const merged = new Map<string, any>();
  const idCandidates = new Set([customerId?.trim() ?? "", userId?.trim() ?? ""].filter((e) => e));
  const cleanPhone = phone?.trim() ?? "";
  async function pullBy(attribute: string, value?: string) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return;
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.chatSessions, [Query.equal(attribute, trimmed), Query.orderDesc("$updatedAt"), Query.limit(limit)]);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  await pullBy("clientId", customerId); await pullBy("clientId", userId); await pullBy("participantUserId", userId); await pullBy("participantUserId", customerId); await pullBy("partnerUserId", userId); await pullBy("initiatorUserId", userId); await pullBy("initiatorUserId", customerId);
  if (cleanPhone) await pullBy("clientPhone", phone);
  const businessIds = new Set<string>();
  for (const id of [customerId, userId]) {
    if (!id?.trim()) continue;
    try {
      const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [Query.equal("user_id", id.trim()), Query.limit(10)]);
      for (const row of rows.documents) { const raw = row.data?.businessIds; if (Array.isArray(raw)) { for (const v of raw) { const s = v?.toString().trim(); if (s) businessIds.add(s); } } }
    } catch {}
  }
  for (const businessId of businessIds) await pullBy("businessId", businessId);
  return Array.from(merged.values()).filter((s) => {
    const chatType = readString(s, "chatType").toLowerCase();
    if (chatType === "partner_direct" || chatType === "partner_internal") return false;
    if (chatType.includes("partner") && !chatType.includes("client") && !readString(s, "clientId")) return false;
    const counterpartyType = readString(s, "counterpartyType").toLowerCase();
    if (counterpartyType === "partner" && !readString(s, "clientId")) return false;
    if (idCandidates.size > 0) { const sessionIds = new Set([readString(s, "clientId"), readString(s, "participantUserId"), readString(s, "initiatorUserId")].filter(Boolean)); const matchesId = [...sessionIds].some((id) => idCandidates.has(id)); const matchesPhone = cleanPhone && readString(s, "clientPhone") === cleanPhone; if (!matchesId && !matchesPhone) return false; }
    else if (cleanPhone) { if (readString(s, "clientPhone") !== cleanPhone) return false; } else { return false; }
    return true;
  }).sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime());
}

export async function fetchChatMessages(sessionId: string, limit = 150) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.chatMessages, [Query.equal("sessionId", sessionId), Query.orderAsc("$createdAt"), Query.limit(limit)]);
  return resp.documents.map((doc) => { const mediaUrl = readString(doc, "mediaUrl"); if (mediaUrl && !mediaUrl.startsWith("http")) return { ...doc, mediaUrl: fileViewUrl(BUCKETS.chatMedia, mediaUrl) }; return doc; });
}

export async function sendChatMessage({ sessionId, messageText, senderId, senderName }: { sessionId: string; messageText: string; senderId: string; senderName: string }) {
  const now = new Date().toISOString(); const text = messageText.trim(); if (!text) throw new Error("Write a message first.");
  const created = await appwrite.databases.createDocument(DB_ID, COLLECTIONS.chatMessages, ID.unique(), { sessionId, senderId, senderName, messageText: text, messageType: "text", mediaUrl: "", isRead: false, timestamp: now, replyToId: "", replyPreview: "", isDeleted: false, deletedBy: "", deletedAt: "" });
  try { await appwrite.databases.updateDocument(DB_ID, COLLECTIONS.chatSessions, sessionId, { lastMessage: text, lastMessageTime: now, updatedAt: now, isActive: true }); } catch {}
  return created;
}

export async function fetchFeed({ limit = 20, cursorAfter }: { limit?: number; cursorAfter?: string } = {}) {
  const queries: string[] = [Query.orderDesc("$createdAt"), Query.limit(limit), Query.equal("isActive", true)];
  if (cursorAfter) queries.push(Query.cursorAfter(cursorAfter));
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.feed, queries);
  return resp.documents.map((doc) => { const mediaUrl = readString(doc, "mediaUrl"); if (mediaUrl && !mediaUrl.startsWith("http")) return { ...doc, mediaUrl: fileViewUrl(BUCKETS.feed, mediaUrl) }; return doc; });
}

export async function fetchFeedPost(postId: string) {
  const doc = await appwrite.databases.getDocument(DB_ID, COLLECTIONS.feed, postId);
  const mediaUrl = readString(doc, "mediaUrl");
  if (mediaUrl && !mediaUrl.startsWith("http")) return { ...doc, mediaUrl: fileViewUrl(BUCKETS.feed, mediaUrl) };
  return doc;
}

export async function toggleFeedLike(postId: string, currentUserId: string, likedBy: string[], likes: number) {
  const liked = likedBy.includes(currentUserId);
  const updatedLikedBy = liked ? likedBy.filter((id) => id !== currentUserId) : [...likedBy, currentUserId];
  const updatedLikes = liked ? Math.max(0, likes - 1) : likes + 1;
  await appwrite.databases.updateDocument(DB_ID, COLLECTIONS.feed, postId, { likedBy: updatedLikedBy, likes: updatedLikes });
  return { likedBy: updatedLikedBy, likes: updatedLikes };
}

export async function fetchFeedComments(postId: string) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.feedComments, [Query.equal("postId", postId), Query.equal("isActive", true), Query.orderAsc("createdAt"), Query.limit(100)]);
  return resp.documents;
}

export async function addFeedComment({ postId, text, authorUserId, authorName }: { postId: string; text: string; authorUserId: string; authorName: string }) {
  const now = new Date().toISOString();
  const created = await appwrite.databases.createDocument(DB_ID, COLLECTIONS.feedComments, ID.unique(), { postId, userId: authorUserId, author: authorName, text: text.trim(), createdAt: now, isActive: true, parentCommentId: "", reactionSummary: "{}", reactedBy: [] });
  try { const post = await appwrite.databases.getDocument(DB_ID, COLLECTIONS.feed, postId); const currentCount = readInt(post, "commentsCount"); await appwrite.databases.updateDocument(DB_ID, COLLECTIONS.feed, postId, { commentsCount: currentCount + 1 }); } catch {}
  return created;
}

export async function createFeedPost({ content, authorUserId, authorName, authorRole }: { content: string; authorUserId: string; authorName: string; authorRole: string }) {
  const now = new Date().toISOString();
  return appwrite.databases.createDocument(DB_ID, COLLECTIONS.feed, ID.unique(), {
    userId: authorUserId,
    author: authorName,
    authorName,
    authorRole,
    content: content.trim(),
    mediaUrl: "",
    mediaType: "",
    likes: 0,
    likedBy: [],
    commentsCount: 0,
    reposts: 0,
    tags: [],
    createdAt: now,
    isActive: true,
  });
}

export async function fetchMarketplace({ limit = 120 }: { limit?: number } = {}) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.marketplace, [Query.orderDesc("$createdAt"), Query.limit(limit)]);
  return resp.documents.filter((doc) => readString(doc, "displayTitle").trim() || readString(doc, "title").trim());
}

export async function fetchAssignments({ partnerId, businessId, limit = 100 }: { partnerId?: string; businessId?: string; limit?: number } = {}) {
  const merged = new Map<string, any>();
  async function pullBy(attribute: string, value?: string) {
    if (!value?.trim()) return;
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.assignments, [Query.equal(attribute, value.trim()), Query.orderDesc("$createdAt"), Query.limit(limit)]);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  await pullBy("partnerId", partnerId);
  await pullBy("assignedTo", partnerId);
  await pullBy("businessId", businessId);
  return Array.from(merged.values());
}

export async function fetchPartnerProfile(userId?: string) {
  if (!userId?.trim()) return null;
  try {
    const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.partners, [Query.equal("user_id", userId.trim()), Query.limit(1)]);
    if (rows.documents.length > 0) return rows.documents[0];
  } catch {}
  try {
    const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [Query.equal("user_id", userId.trim()), Query.limit(1)]);
    if (rows.documents.length > 0) return rows.documents[0];
  } catch {}
  return null;
}

export async function fetchNotifications({ userId, limit = 50 }: { userId?: string; limit?: number }) {
  if (!userId?.trim()) return [];
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.notificationInbox, [Query.equal("recipientUserId", userId.trim()), Query.orderDesc("$createdAt"), Query.limit(limit)]);
  return resp.documents;
}

export async function fetchClientProfile(userId: string) {
  if (!userId?.trim()) return null;
  try { const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [Query.equal("user_id", userId.trim()), Query.limit(1)]); if (rows.documents.length > 0) return rows.documents[0]; } catch {}
  try { const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [Query.equal("customerId", userId.trim()), Query.limit(1)]); if (rows.documents.length > 0) return rows.documents[0]; } catch {}
  return null;
}

export async function updateClientProfile(docId: string, data: Record<string, any>) {
  return appwrite.databases.updateDocument(DB_ID, COLLECTIONS.clients, docId, data);
}

export function normalizePublicUserId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function validatePublicUserId(value: string) {
  const normalized = normalizePublicUserId(value);
  if (normalized.length < 4 || normalized.length > 24) {
    return { valid: false, value: normalized, message: "Use 4 to 24 characters." };
  }
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(normalized)) {
    return { valid: false, value: normalized, message: "Use letters, numbers, dots, dashes, or underscores." };
  }
  return { valid: true, value: normalized, message: "" };
}

export async function isPublicUserIdAvailable(customerId: string, currentDocId?: string) {
  const normalized = normalizePublicUserId(customerId);
  if (!normalized) return false;
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [
    Query.equal("customerId", normalized),
    Query.limit(2),
  ]);
  return resp.documents.every((doc) => doc.$id === currentDocId);
}

export async function fetchBusinesses({ ownerId, limit = 100 }: { ownerId?: string; limit?: number } = {}) {
  const merged = new Map<string, any>();
  async function pull(queries: string[]) {
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.businesses, queries);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  if (ownerId) {
    await pull([Query.equal("ownerId", ownerId), Query.limit(limit)]);
    await pull([Query.equal("ownerUserId", ownerId), Query.limit(limit)]);
    await pull([Query.equal("user_id", ownerId), Query.limit(limit)]);
  } else {
    await pull([Query.limit(limit)]);
  }
  return Array.from(merged.values()).filter((doc) => readBool(doc, "isActive") !== false);
}

export async function fetchBusinessMemberships(businessId: string) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.businessMemberships, [Query.equal("businessId", businessId), Query.equal("status", "active"), Query.limit(100)]);
  return resp.documents;
}

export async function findWorkspaceUsers(search: string, limit = 12) {
  const value = search.trim();
  if (value.length < 2) return [];
  const merged = new Map<string, any>();
  for (const attribute of ["customerId", "email", "phone", "name"]) {
    try {
      const response = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [
        Query.search(attribute, value),
        Query.limit(limit),
      ]);
      for (const document of response.documents) merged.set(document.$id, document);
    } catch {}
  }
  return Array.from(merged.values()).slice(0, limit);
}

export async function addWorkspaceMember(data: {
  businessId: string;
  userId: string;
  role: WorkspaceMembership["role"];
  permissions: string[];
  memberName: string;
  memberPhone?: string;
}) {
  const existing = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.businessMemberships, [
    Query.equal("businessId", data.businessId),
    Query.equal("userId", data.userId),
    Query.limit(1),
  ]);
  const payload = {
    ...data,
    memberPhone: data.memberPhone ?? "",
    status: "active",
    onDuty: true,
    joinedAt: new Date().toISOString(),
  };
  if (existing.documents[0]) {
    return appwrite.databases.updateDocument(DB_ID, COLLECTIONS.businessMemberships, existing.documents[0].$id, payload);
  }
  return appwrite.databases.createDocument(DB_ID, COLLECTIONS.businessMemberships, ID.unique(), payload);
}

export async function updateWorkspaceMember(memberId: string, data: Partial<Pick<WorkspaceMembership, "role" | "permissions" | "status" | "onDuty">>) {
  return appwrite.databases.updateDocument(DB_ID, COLLECTIONS.businessMemberships, memberId, data);
}

export async function fetchMembershipsForUser(userId: string) {
  if (!userId.trim()) return [];
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.businessMemberships, [
    Query.equal("userId", userId.trim()),
    Query.limit(100),
  ]);
  return resp.documents.filter((doc) => (readString(doc, "status") || "active") === "active");
}

export async function fetchBusinessesByIds(businessIds: string[]) {
  const uniqueIds = Array.from(new Set(businessIds.map((id) => id.trim()).filter(Boolean)));
  const rows = await Promise.all(
    uniqueIds.map(async (businessId) => {
      try {
        return await appwrite.databases.getDocument(DB_ID, COLLECTIONS.businesses, businessId);
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function fetchBusinessRequests(businessId: string, limit = 100) {
  if (!businessId.trim()) return [];
  const merged = new Map<string, any>();
  for (const attribute of ["assignedBusinessId", "businessId"]) {
    try {
      const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.serviceRequests, [
        Query.equal(attribute, businessId.trim()),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]);
      for (const doc of resp.documents) merged.set(doc.$id, doc);
    } catch {}
  }
  return Array.from(merged.values());
}

export type BusinessRecordTable = "projects" | "tasks" | "quotations" | "invoices" | "businessItems" | "documents" | "amcContracts" | "amcVisits" | "commercialDocuments" | "billingProfiles" | "billingParties" | "documentTemplates";

export async function fetchBusinessRecords(table: BusinessRecordTable, businessId: string, limit = 100, userId?: string) {
  if (!businessId.trim()) return [];
  if (userId) {
    const params = new URLSearchParams({ table: COLLECTIONS[table], businessId: businessId.trim(), userId });
    const response = await fetch(`/api/business-records?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Records could not be loaded.");
    return result.documents;
  }
  const response = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS[table], [
    Query.equal("businessId", businessId.trim()),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ]);
  return response.documents;
}

export async function createBusinessRecord(table: BusinessRecordTable, data: Record<string, unknown>) {
  return appwrite.databases.createDocument(DB_ID, COLLECTIONS[table], ID.unique(), data);
}

export function recordCreator(doc: any) {
  return {
    userId: readString(doc, "createdBy") || readString(doc, "createdByAdminId"),
    name: readString(doc, "createdByName") || readString(doc, "createdByAdminName"),
  };
}

export async function fetchAllUsers({ limit = 100 }: { limit?: number } = {}) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [Query.limit(limit)]);
  return resp.documents;
}

export async function fetchAllBusinesses({ limit = 100 }: { limit?: number } = {}) {
  const resp = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.businesses, [Query.limit(limit)]);
  return resp.documents;
}

export { BUCKETS, COLLECTIONS };
