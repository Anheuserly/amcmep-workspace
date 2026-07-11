"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAllBusinesses, toBusiness } from "@/lib/services/appwriteServices";
import { ArrowLeft, Building2, CheckCircle, Edit3, Eye, MapPin, Search, Star, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { Business } from "@/types";

const statusColors = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  inactive: "bg-red-100 text-red-700",
};

const statusIcons = { active: CheckCircle, pending: Eye, inactive: XCircle };

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadBusinesses() {
      setIsLoading(true);
      try {
        const docs = await fetchAllBusinesses({ limit: 200 });
        if (alive) setBusinesses(docs.map(toBusiness));
      } catch {
        if (alive) toast.error("Unable to load businesses");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadBusinesses();
    return () => { alive = false; };
  }, []);

  const filtered = businesses.filter((business) => {
    const matchesSearch = `${business.name} ${business.city} ${business.categories.join(" ")}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || business.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <RoleGuard allowedRoles={["administrator"]}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-2">
          <a href="/admin" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
            <p className="mt-1 text-gray-500">Real business records from Appwrite</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search businesses..." className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "active", "pending", "inactive"] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${statusFilter === status ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading businesses...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Building2 className="h-12 w-12" />} title="No businesses found" description="Business records will appear here after onboarding." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((business) => {
              const StatusIcon = statusIcons[business.status];
              return (
                <Card key={business.$id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                        {business.logo ? <img src={business.logo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-gray-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{business.name}</h3>
                          <Badge className={statusColors[business.status]}><StatusIcon className="mr-1 h-3 w-3" />{business.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{business.description || "No description provided"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {business.city ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city}</span> : null}
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{business.rating || "New"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {business.categories.slice(0, 5).map((category) => <Badge key={category} variant="default" className="text-xs">{category}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost"><Edit3 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
