import { ID, Query } from "appwrite";
import { appwrite } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";
import { COLLECTIONS, readString, readStringArray } from "./appwriteServices";
import type { UserProfile, UserRole } from "@/types";

const DB_ID = appwriteConfig.databaseId;
const QR_LOGIN_COLLECTION = "qr_login_sessions";
const QR_PAYLOAD_PREFIX = "amcmep://qr-login/";
const QR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WEB_PROFILE_SESSION_KEY = "amcmep_one_web_profile_session";

type QrStatus = "pending" | "approved" | "used" | "expired" | "unknown";

export interface QrLoginSession {
  documentId: string;
  token: string;
  payload: string;
  status: QrStatus;
  requestedAt: string;
  expiresAt: string;
  approvedName: string;
  approvedPhone: string;
  approvedClientId: string;
  approvedUserId: string;
  approvedCustomerId: string;
}

export interface StoredProfileSession {
  profile: UserProfile;
  storedAt: string;
  method: "qr";
}

function buildQrToken() {
  const bytes = new Uint32Array(36);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => QR_ALPHABET[value % QR_ALPHABET.length]).join("");
}

function normalizeQrToken(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith(QR_PAYLOAD_PREFIX)) return trimmed.slice(QR_PAYLOAD_PREFIX.length).trim();
  try {
    const parsed = new URL(trimmed);
    const token = parsed.searchParams.get("token");
    if (token?.trim()) return token.trim();
  } catch {}
  return trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function toQrLoginSession(doc: any): QrLoginSession {
  const token = readString(doc, "token");
  return {
    documentId: doc.$id,
    token,
    payload: `${QR_PAYLOAD_PREFIX}${token}`,
    status: (readString(doc, "status") || "unknown") as QrStatus,
    requestedAt: readString(doc, "requestedAt") || doc.$createdAt,
    expiresAt: readString(doc, "expiresAt"),
    approvedName: readString(doc, "approvedName"),
    approvedPhone: readString(doc, "approvedPhone"),
    approvedClientId: readString(doc, "approvedClientId"),
    approvedUserId: readString(doc, "approvedUserId"),
    approvedCustomerId: readString(doc, "approvedCustomerId"),
  };
}

function buildCustomerId() {
  return `c${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

function mergedAuthMethods(raw: any, method: string) {
  const methods = new Set(readStringArray({ raw }, "raw"));
  methods.add(method);
  return Array.from(methods).filter(Boolean).sort();
}

export async function ensureAnonymousSession() {
  try {
    await appwrite.account.getSession("current");
  } catch {
    try {
      await appwrite.account.createAnonymousSession();
    } catch {}
  }
}

export async function clearCurrentSession() {
  try {
    await appwrite.account.deleteSession("current");
  } catch {}
}

export async function isEmailProfileRegistered(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [
    Query.equal("email", normalized),
    Query.limit(1),
  ]);
  return rows.documents.length > 0;
}

export async function linkEmailClientProfile({
  accountId,
  email,
  name,
  referrerId,
}: {
  accountId: string;
  email: string;
  name?: string;
  referrerId?: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  let existing: any | undefined;

  for (const query of [Query.equal("user_id", accountId), Query.equal("email", normalizedEmail)]) {
    try {
      const rows = await appwrite.databases.listDocuments(DB_ID, COLLECTIONS.clients, [query, Query.limit(1)]);
      if (rows.documents.length > 0) {
        existing = rows.documents[0];
        break;
      }
    } catch {}
  }

  const displayName = name?.trim() || readString(existing ?? {}, "name") || "Client User";
  const customerId = readString(existing ?? {}, "customerId") || buildCustomerId();
  const data = {
    user_id: accountId,
    email: normalizedEmail,
    name: displayName,
    customerId,
    isDeleted: false,
    isActive: true,
    profileComplete: true,
    updatedAt: now,
    lastLoginAt: now,
    authMethods: mergedAuthMethods(existing?.authMethods, "email"),
    roles: readStringArray(existing ?? {}, "roles").length ? readStringArray(existing, "roles") : ["customer"],
    activeRole: readString(existing ?? {}, "activeRole") || "customer",
    customerEnabled: true,
    ...(referrerId?.trim() && !existing?.referrerId
      ? { referrerId: referrerId.trim().toUpperCase() }
      : {}),
  };

  if (existing) {
    return appwrite.databases.updateDocument(DB_ID, COLLECTIONS.clients, existing.$id, data);
  }

  return appwrite.databases.createDocument(DB_ID, COLLECTIONS.clients, ID.unique(), {
    ...data,
    createdAt: now,
    phone: "",
    countryCode: "",
  });
}

export async function createQrLoginSession() {
  await ensureAnonymousSession();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  const token = buildQrToken();
  const doc = await appwrite.databases.createDocument(DB_ID, QR_LOGIN_COLLECTION, ID.unique(), {
    token,
    status: "pending",
    requestedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    requesterPlatform: "web",
    requesterDeviceId: typeof navigator === "undefined" ? "web" : navigator.userAgent.slice(0, 120),
    requesterDeviceModel: "AMC MEP web",
  });
  return toQrLoginSession(doc);
}

export async function fetchQrLoginSession(tokenOrPayload: string) {
  const token = normalizeQrToken(tokenOrPayload);
  if (!token) return null;
  const rows = await appwrite.databases.listDocuments(DB_ID, QR_LOGIN_COLLECTION, [
    Query.equal("token", token),
    Query.limit(1),
  ]);
  return rows.documents[0] ? toQrLoginSession(rows.documents[0]) : null;
}

export async function consumeApprovedQrLogin(tokenOrPayload: string): Promise<UserProfile> {
  const session = await fetchQrLoginSession(tokenOrPayload);
  if (!session) throw new Error("QR login request was not found.");
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    try {
      await appwrite.databases.updateDocument(DB_ID, QR_LOGIN_COLLECTION, session.documentId, { status: "expired" });
    } catch {}
    throw new Error("QR login expired. Generate a new code.");
  }
  if (session.status !== "approved") throw new Error("Waiting for approval from your phone.");
  if (!session.approvedPhone || !session.approvedClientId) throw new Error("QR login approval is incomplete.");

  const now = new Date().toISOString();
  const profile: UserProfile = {
    $id: session.approvedClientId,
    userId: session.approvedUserId || session.approvedCustomerId || session.approvedClientId,
    customerId: session.approvedCustomerId,
    name: session.approvedName || "Client User",
    email: "",
    phone: session.approvedPhone,
    roles: ["customer"],
    activeRole: "customer",
    businessIds: [],
    activeBusinessId: undefined,
    preferredLanguage: "en",
    createdAt: session.requestedAt,
    updatedAt: now,
  };

  localStorage.setItem(WEB_PROFILE_SESSION_KEY, JSON.stringify({ profile, storedAt: now, method: "qr" } satisfies StoredProfileSession));
  try {
    await appwrite.databases.updateDocument(DB_ID, QR_LOGIN_COLLECTION, session.documentId, {
      status: "used",
      consumedAt: now,
    });
  } catch {}
  return profile;
}

export function loadStoredProfileSession(): StoredProfileSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEB_PROFILE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredProfileSession() {
  if (typeof window !== "undefined") localStorage.removeItem(WEB_PROFILE_SESSION_KEY);
}
