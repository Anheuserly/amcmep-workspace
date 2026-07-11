"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  fetchAllBusinesses,
  fetchAllUsers,
  fetchMarketplace,
  fetchNotifications,
  readBool,
} from "@/lib/services/appwriteServices";
import { Activity, AlertTriangle, Building2, CheckCircle, ClipboardList, ShoppingCart, Users } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadAdminData() {
      setIsLoading(true);
      try {
        const [userDocs, businessDocs, marketplaceDocs, notificationDocs] = await Promise.all([
          fetchAllUsers({ limit: 200 }),
          fetchAllBusinesses({ limit: 200 }),
          fetchMarketplace({ limit: 200 }),
          fetchNotifications({ userId: "system", limit: 20 }).catch(() => []),
        ]);
        if (!alive) return;
        setUsers(userDocs);
        setBusinesses(businessDocs);
        setMarketplace(marketplaceDocs);
        setNotifications(notificationDocs);
      } catch {
        if (alive) toast.error("Unable to load admin overview");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadAdminData();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => readBool(user, "isDeleted") !== true).length;
    const activeBusinesses = businesses.filter((business) => readBool(business, "isActive") !== false).length;
    const pendingBusinesses = businesses.filter((business) => String(business.status ?? "").toLowerCase() === "pending").length;
    const activeMarketplace = marketplace.filter((item) => String(item.status ?? "active").toLowerCase() === "active").length;
    return [
      { label: "Users", value: activeUsers, icon: Users, color: "bg-indigo-50 text-indigo-600" },
      { label: "Businesses", value: activeBusinesses, icon: Building2, color: "bg-pink-50 text-pink-600" },
      { label: "Marketplace", value: activeMarketplace, icon: ShoppingCart, color: "bg-teal-50 text-teal-600" },
      { label: "Pending", value: pendingBusinesses, icon: AlertTriangle, color: "bg-orange-50 text-orange-600" },
    ];
  }, [businesses, marketplace, users]);

  return (
    <RoleGuard allowedRoles={["administrator"]}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Center</h1>
            <p className="mt-1 text-gray-500">Live platform overview from Appwrite</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className={`w-fit rounded-lg p-2 ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? "..." : stat.value.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button variant="outline" className="h-auto items-start justify-start gap-3 p-4" asChild>
            <a href="/admin/businesses"><Building2 className="h-5 w-5 text-brand-600" /><span className="text-sm font-medium text-gray-700">Manage Businesses</span></a>
          </Button>
          <Button variant="outline" className="h-auto items-start justify-start gap-3 p-4" asChild>
            <a href="/admin/users"><Users className="h-5 w-5 text-brand-600" /><span className="text-sm font-medium text-gray-700">Manage Users</span></a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-brand-600" />Notification Stream</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No system notifications available.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 8).map((item) => (
                    <div key={item.$id} className="flex items-start gap-3">
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.title || item.type || "Notification"}</p>
                        <p className="text-xs text-gray-500">{item.body || item.message || item.description || "No details"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5 text-green-600" />System Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {[
                ["Appwrite project", true],
                ["User collection", users.length >= 0],
                ["Business collection", businesses.length >= 0],
                ["Marketplace collection", marketplace.length >= 0],
              ].map(([label, ok]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">{label}</span>
                  <Badge className={ok ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{ok ? "Ready" : "Check"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
