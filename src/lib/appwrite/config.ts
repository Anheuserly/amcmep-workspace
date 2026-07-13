export const appwriteConfig = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1",
  projectId:
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746",
  projectName:
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME ?? "SHREE GANESH ENTERPRIESES",
  databaseId:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743",
  collections: {
    administrators:
      process.env.NEXT_PUBLIC_ADMINISTRATORS_COLLECTION_ID ?? "681c97fa003d57ddf43d",
    providers:
      process.env.NEXT_PUBLIC_PROVIDERS_COLLECTION_ID ?? "680b308e002ef25fd54b",
    clients:
      process.env.NEXT_PUBLIC_CLIENTS_COLLECTION_ID ?? "680b30be0039f9a1d03e",
    userData:
      process.env.NEXT_PUBLIC_APPWRITE_USERDATA_COLLECTION_ID ??
      process.env.NEXT_PUBLIC_CLIENTS_COLLECTION_ID ??
      "680b30be0039f9a1d03e",
    serviceRequests:
      process.env.NEXT_PUBLIC_APPWRITE_SERVICE_REQUESTS_COLLECTION_ID ?? "685c3b1d002324dcb294",
    feed:
      process.env.NEXT_PUBLIC_APPWRITE_FEED_COLLECTION_ID ?? "68a361040001a07e0b58",
    feedReports:
      process.env.NEXT_PUBLIC_APPWRITE_FEED_REPORTS_COLLECTION_ID ?? "reported_posts",
    referralRewards:
      process.env.NEXT_PUBLIC_APPWRITE_REFERRAL_REWARDS_COLLECTION_ID ?? "referral_rewards",
    searchDocuments:
      process.env.NEXT_PUBLIC_APPWRITE_SEARCH_COLLECTION_ID ?? "search_documents",
    queryLogs:
      process.env.NEXT_PUBLIC_APPWRITE_QUERY_LOGS_COLLECTION_ID ?? "search_queries",
    userProfiles:
      process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILES_COLLECTION_ID ?? "user_profiles",
    serviceRegistry:
      process.env.NEXT_PUBLIC_APPWRITE_SERVICE_REGISTRY_COLLECTION_ID ?? "service_registry",
    businessDomains:
      process.env.NEXT_PUBLIC_APPWRITE_BUSINESS_DOMAINS_COLLECTION_ID ?? "business_domains",
    marketplaceItems:
      process.env.NEXT_PUBLIC_APPWRITE_MARKETPLACE_ITEMS_COLLECTION_ID ??
      process.env.NEXT_PUBLIC_APPWRITE_MARKETPLACE_SHOWCASES_COLLECTION_ID ??
      "marketplace_showcases",
    searchSuggestions:
      process.env.NEXT_PUBLIC_APPWRITE_SEARCH_SUGGESTIONS_COLLECTION_ID ?? "search_suggestions",
    chatSessions:
      process.env.NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID ?? "chat_sessions",
    chatMessages:
      process.env.NEXT_PUBLIC_APPWRITE_CHAT_MESSAGES_COLLECTION_ID ?? "chat_messages",
    amcRecords:
      process.env.NEXT_PUBLIC_APPWRITE_AMC_COLLECTION_ID ?? "amc_records",
    businesses:
      process.env.NEXT_PUBLIC_APPWRITE_BUSINESSES_COLLECTION_ID ?? "businesses",
    partnerPrograms:
      process.env.NEXT_PUBLIC_APPWRITE_PARTNER_PROGRAMS_COLLECTION_ID ?? "partner_programs",
  },
  buckets: {
    drive: process.env.NEXT_PUBLIC_APPWRITE_DRIVE_BUCKET_ID ?? "amcmep_drive",
    marketplaceMedia:
      process.env.NEXT_PUBLIC_APPWRITE_MARKETPLACE_MEDIA_BUCKET_ID ?? "69032c8c002ad7e77e5c",
    feedMedia:
      process.env.NEXT_PUBLIC_APPWRITE_FEED_MEDIA_BUCKET_ID ?? "68a364820028c8a86b65",
    chatMedia:
      process.env.NEXT_PUBLIC_APPWRITE_CHAT_MEDIA_BUCKET_ID ?? "68b47a6b0031a9928058",
  },
} as const;

export function hasPublicAppwriteConfig() {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId);
}
