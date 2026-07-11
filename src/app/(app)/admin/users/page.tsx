"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAllUsers, readBool, readString, readStringArray } from "@/lib/services/appwriteServices";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: UserRole[];
  status: "active" | "suspended" | "pending";
  createdAt: string;
};

const statusColors = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function mapUser(doc: any): AdminUser {
  const roles = readStringArray(doc, "roles") as UserRole[];
  const isDeleted = readBool(doc, "isDeleted");
  const isActive = readBool(doc, "isActive");
  return {
    id: doc.$id,
    name: readString(doc, "name") || readString(doc, "displayName") || "AMC MEP user",
    email: readString(doc, "email"),
    phone: readString(doc, "phone"),
    roles: roles.length ? roles : ["customer"],
    status: isDeleted ? "suspended" : isActive === false ? "pending" : "active",
    createdAt: readString(doc, "createdAt") || doc.$createdAt,
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "partner" | "administrator">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadUsers() {
      setIsLoading(true);
      try {
        const docs = await fetchAllUsers({ limit: 200 });
        if (alive) setUsers(docs.map(mapUser));
      } catch {
        if (alive) toast.error("Unable to load users");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadUsers();
    return () => { alive = false; };
  }, []);

  const filtered = users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <RoleGuard allowedRoles={["administrator"]}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <a href="/admin" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-500">Real users from the AMC MEP app database</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search users..." className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "customer", "partner", "administrator"] as const).map((role) => (
              <button key={role} onClick={() => setRoleFilter(role)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${roleFilter === role ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {role === "all" ? "All roles" : role}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "active", "suspended", "pending"] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${statusFilter === status ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading users...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8"><EmptyState icon={<Users className="h-12 w-12" />} title="No users found" description="Users will appear here after they create accounts in the app." /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Roles</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={user.name} size="sm" /><span className="font-medium">{user.name}</span></div></td>
                      <td className="px-4 py-3"><div className="text-xs text-gray-500">{user.email || "No email"}</div><div className="text-xs text-gray-400">{user.phone || "No phone"}</div></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{user.roles.map((role) => <Badge key={role} variant={role === "administrator" ? "danger" : role === "partner" ? "info" : "default"}>{role}</Badge>)}</div></td>
                      <td className="px-4 py-3"><Badge className={statusColors[user.status]}>{user.status}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-gray-500">Showing {filtered.length} of {users.length} users</p>
      </div>
    </RoleGuard>
  );
}
