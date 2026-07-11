"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/utils";
import { fetchNotifications, toActivityEvent } from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  MessageSquare,
  ClipboardList,
  ShieldCheck,
  Briefcase,
  Building2,
  Bell,
  CheckCheck,
} from "lucide-react";
import type { ActivityEvent } from "@/types";

const typeIcons = {
  chat: MessageSquare,
  request: ClipboardList,
  amc: ShieldCheck,
  partner: Briefcase,
  business: Building2,
  system: Bell,
};

const typeColors = {
  chat: "bg-purple-50 text-purple-600",
  request: "bg-blue-50 text-blue-600",
  amc: "bg-green-50 text-green-600",
  partner: "bg-orange-50 text-orange-600",
  business: "bg-pink-50 text-pink-600",
  system: "bg-gray-50 text-gray-600",
};

export default function ActivityPage() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadNotifications() {
      if (!profile?.userId) return;
      setIsLoading(true);
      try {
        const docs = await fetchNotifications({ userId: profile.userId, limit: 80 });
        if (alive) setActivities(docs.map((doc) => toActivityEvent(doc, profile.userId)));
      } catch {
        if (alive) {
          setActivities([]);
          toast.error("Unable to load notifications");
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadNotifications();
    return () => { alive = false; };
  }, [profile]);

  const filtered = filter === "all" ? activities : activities.filter((a) => !a.isRead);
  const unreadCount = activities.filter((a) => !a.isRead).length;

  const markAllRead = () => {
    setActivities((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  const markRead = (id: string) => {
    setActivities((prev) => prev.map((a) => (a.$id === id ? { ...a, isRead: true } : a)));
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Center</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium ${
                filter === "all" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm font-medium ${
                filter === "unread" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Unread
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading notifications...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="No activities"
            description="You're all caught up! New notifications will appear here."
          />
        ) : (
          filtered.map((activity) => {
            const Icon = typeIcons[activity.type];
            return (
              <Card
                key={activity.$id}
                className={`cursor-pointer transition-colors ${
                  !activity.isRead ? "border-brand-200 bg-brand-50/30" : "hover:bg-gray-50"
                }`}
                onClick={() => markRead(activity.$id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[activity.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!activity.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {activity.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatRelative(activity.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                      {!activity.isRead && (
                        <div className="mt-2">
                          <span className="inline-block h-2 w-2 bg-brand-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
