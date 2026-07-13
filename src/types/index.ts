export type UserRole = "customer" | "partner" | "vendor" | "administrator" | "guest";

export interface UserProfile {
  $id: string;
  userId: string;
  customerId?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  city?: string;
  state?: string;
  country?: string;
  roles: UserRole[];
  activeRole: UserRole;
  referralCode?: string;
  preferredLanguage: string;
  businessIds: string[];
  activeBusinessId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  $id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  categories: string[];
  servicesEnabled: boolean;
  vendorEnabled: boolean;
  status: "active" | "inactive" | "pending";
  ownerId: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface ServiceRequest {
  $id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed" | "cancelled" | "awaiting_payment";
  priority: "low" | "medium" | "high" | "urgent";
  serviceType: string;
  siteAddress: string;
  location?: { lat: number; lng: number };
  customerId: string;
  customerName: string;
  customerPhone: string;
  assignedTo?: string;
  assignedBusinessId?: string;
  estimatedCost?: number;
  finalCost?: number;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AMCRecord {
  $id: string;
  title: string;
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  status: "active" | "expired" | "expiring_soon" | "cancelled";
  amcType: string;
  startDate: string;
  endDate: string;
  cost: number;
  paymentStatus: "pending" | "paid" | "partial";
  visitCount: number;
  totalVisits: number;
  nextVisitDate?: string;
  siteAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  $id: string;
  type: "customer" | "business" | "partner" | "support";
  participantIds: string[];
  participantNames: string[];
  participantAvatars: string[];
  businessId?: string;
  businessName?: string;
  requestId?: string;
  amcId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  $id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: "text" | "image" | "audio" | "video" | "file";
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface FeedPost {
  $id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  content: string;
  mediaUrls: string[];
  mediaType?: "image" | "video" | "mixed";
  likes: number;
  likedBy?: string[];
  commentsCount: number;
  reposts: number;
  isLiked: boolean;
  isReposted: boolean;
  tags: string[];
  createdAt: string;
}

export interface FeedComment {
  $id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface MarketplaceItem {
  $id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  condition: "new" | "used" | "refurbished";
  sellerId: string;
  sellerName: string;
  sellerBusinessId?: string;
  status: "active" | "sold" | "reserved" | "inactive";
  location?: string;
  createdAt: string;
}

export interface ActivityEvent {
  $id: string;
  userId: string;
  type: "chat" | "request" | "amc" | "partner" | "business" | "system";
  title: string;
  description: string;
  referenceId: string;
  referenceType: string;
  isRead: boolean;
  createdAt: string;
}

export interface PartnerProfile {
  $id: string;
  userId: string;
  skills: string[];
  serviceAreas: string[];
  partnerType: "service" | "vendor" | "both";
  status: "active" | "inactive" | "pending";
  earnings: number;
  rating: number;
  completedJobs: number;
  createdAt: string;
}

export interface PartnerAssignment {
  $id: string;
  partnerId: string;
  requestId: string;
  businessId: string;
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  earnings: number;
  assignedAt: string;
  completedAt?: string;
}

export interface WorkspaceMembership {
  $id: string;
  businessId: string;
  userId: string;
  role: "owner" | "admin" | "partner" | "staff";
  permissions: string[];
  memberName?: string;
  memberPhone?: string;
  status?: string;
  onDuty?: boolean;
  joinedAt: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: number;
}

export type NotificationType =
  | "chat_message"
  | "service_request_update"
  | "amc_update"
  | "new_assignment"
  | "payment_received"
  | "system_announcement";

export interface AppNotification {
  $id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}
