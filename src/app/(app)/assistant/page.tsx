"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  fetchAmcRecords,
  fetchAssignments,
  fetchChatSessions,
  fetchFeed,
  fetchMarketplace,
  fetchRequests,
  toAmcRecord,
  toPartnerAssignment,
  toServiceRequest,
  userIdentity,
} from "@/lib/services/appwriteServices";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

export default function AssistantPage() {
  const router = useRouter();
  const { activeRole, profile } = useAuth();
  const isPartner = activeRole === "partner" || activeRole === "administrator";
  const [stats, setStats] = useState({
    activeChats: 0,
    activeRequests: 0,
    activeAmc: 0,
    marketplaceItems: 0,
    feedPosts: 0,
    upcomingVisits: 0,
    assignedValue: 0,
    completedJobs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadAssistant() {
      setIsLoading(true);
      try {
        const identity = userIdentity(profile);
        const [chatDocs, requestDocs, amcDocs, feedDocs, marketplaceDocs, assignmentDocs] = await Promise.all([
          fetchChatSessions({ ...identity, limit: 100 }),
          fetchRequests({ ...identity, limit: 100 }),
          fetchAmcRecords({ ...identity, limit: 100 }),
          fetchFeed({ limit: 50 }),
          fetchMarketplace({ limit: 100 }),
          profile?.userId ? fetchAssignments({ partnerId: profile.userId, limit: 100 }) : Promise.resolve([]),
        ]);
        if (!alive) return;
        const requests = requestDocs.map(toServiceRequest);
        const amcs = amcDocs.map(toAmcRecord);
        const assignments = assignmentDocs.map(toPartnerAssignment);
        setStats({
          activeChats: chatDocs.length,
          activeRequests: requests.filter((request) => request.status !== "completed" && request.status !== "cancelled").length,
          activeAmc: amcs.filter((amc) => amc.status === "active" || amc.status === "expiring_soon").length,
          marketplaceItems: marketplaceDocs.length,
          feedPosts: feedDocs.length,
          upcomingVisits: amcs.filter((amc) => amc.nextVisitDate).length,
          assignedValue: assignments.reduce((sum, assignment) => sum + assignment.earnings, 0),
          completedJobs: assignments.filter((assignment) => assignment.status === "completed").length,
        });
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadAssistant();
    return () => { alive = false; };
  }, [profile]);

  const assistantModules = useMemo(() => [
    { title: "Chats", description: `${stats.activeChats} conversations`, icon: MessageSquare, color: "bg-purple-50 text-purple-600", href: "/chats" },
    { title: "Requests", description: `${stats.activeRequests} active requests`, icon: ClipboardList, color: "bg-blue-50 text-blue-600", href: "/requests" },
    { title: "AMC", description: `${stats.activeAmc} active contracts`, icon: ShieldCheck, color: "bg-green-50 text-green-600", href: "/amc" },
    { title: "Marketplace", description: `${stats.marketplaceItems} live listings`, icon: ShoppingCart, color: "bg-orange-50 text-orange-600", href: "/marketplace" },
    { title: "Feed", description: `${stats.feedPosts} recent posts`, icon: Newspaper, color: "bg-pink-50 text-pink-600", href: "/" },
    { title: "Visits", description: `${stats.upcomingVisits} scheduled visits`, icon: CalendarDays, color: "bg-teal-50 text-teal-600", href: "/amc" },
  ], [stats]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assistant</h1>
        <p className="text-gray-500 mt-1">{isLoading ? "Refreshing your live workspace..." : "Your central hub for live account activity"}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Open Requests", stats.activeRequests],
          ["Active AMC", stats.activeAmc],
          ["Unread Chats", stats.activeChats],
          ["Live Listings", stats.marketplaceItems],
        ].map(([label, value]) => (
          <Card key={label.toString()}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assistantModules.map((module) => (
          <Card key={module.title} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(module.href)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${module.color}`}><module.icon className="h-5 w-5" /></div>
                  <div><p className="font-semibold text-gray-900">{module.title}</p><p className="text-sm text-gray-500">{module.description}</p></div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isPartner && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-600" />Service Insights</CardTitle></CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="text-2xl font-bold text-gray-900">₹{stats.assignedValue.toLocaleString("en-IN")}</p><p className="text-xs text-gray-500 mt-1">Assigned Value</p></div>
              <div><p className="text-2xl font-bold text-gray-900">{stats.completedJobs}</p><p className="text-xs text-gray-500 mt-1">Completed Jobs</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
