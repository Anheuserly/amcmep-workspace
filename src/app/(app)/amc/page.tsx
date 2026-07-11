"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import { createRequest, fetchAmcRecords, toAmcRecord, userIdentity } from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  ShieldCheck, Search, Plus, Calendar, MapPin, IndianRupee, CheckCircle,
  RefreshCw, Clock, X, ArrowRight
} from "lucide-react";
import type { AMCRecord } from "@/types";

const statusFilterOptions = ["all", "active", "expiring_soon", "expired", "cancelled"];
const paymentColors = { pending: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700", partial: "bg-blue-100 text-blue-700" };

export default function AMCPage() {
  const { profile } = useAuth();
  const [amcList, setAmcList] = useState<AMCRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAMC, setSelectedAMC] = useState<AMCRecord | null>(null);
  const [newAMC, setNewAMC] = useState({ title: "", businessName: "", amcType: "", startDate: "", endDate: "", cost: "", siteAddress: "", totalVisits: "4" });

  const filtered = amcList.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || a.amcType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: amcList.length,
    active: amcList.filter((a) => a.status === "active").length,
    expiringSoon: amcList.filter((a) => a.status === "expiring_soon").length,
    expired: amcList.filter((a) => a.status === "expired").length,
  };

  useEffect(() => {
    let alive = true;
    async function loadAmc() {
      if (!profile?.userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const docs = await fetchAmcRecords({ ...userIdentity(profile), limit: 100 });
        if (alive) setAmcList(docs.map(toAmcRecord));
      } catch {
        if (alive) toast.error("Unable to load AMC contracts");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadAmc();
    return () => { alive = false; };
  }, [profile]);

  const handleCreate = async () => {
    if (!newAMC.title || !newAMC.businessName || !newAMC.amcType || !newAMC.startDate || !newAMC.endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const now = new Date().toISOString();
      const created = await createRequest({
        title: newAMC.title,
        businessName: newAMC.businessName,
        amcType: newAMC.amcType,
        serviceType: newAMC.amcType,
        type: "amc",
        amcStartDate: newAMC.startDate,
        amcEndDate: newAMC.endDate,
        cost: Number(newAMC.cost) || 0,
        totalVisits: Number(newAMC.totalVisits) || 4,
        siteAddress: newAMC.siteAddress,
        address: newAMC.siteAddress,
        customerId: profile?.customerId || profile?.userId || "",
        user_id: profile?.userId || "",
        customerName: profile?.name || "",
        requestorName: profile?.name || "",
        status: "active",
        paymentStatus: "pending",
        createdAt: now,
        updatedAt: now,
        isActive: true,
        source: "amcmep_one_web",
      });
      setAmcList((prev) => [toAmcRecord(created), ...prev]);
      setShowCreateModal(false);
      setNewAMC({ title: "", businessName: "", amcType: "", startDate: "", endDate: "", cost: "", siteAddress: "", totalVisits: "4" });
      toast.success("AMC contract created");
    } catch {
      toast.error("Unable to create AMC");
    }
  };

  const handleRenew = (id: string) => {
    setAmcList((prev) => prev.map((a) => a.$id === id ? { ...a, status: "active" as const, startDate: new Date().toISOString().split("T")[0], endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split("T")[0], visitCount: 0, updatedAt: new Date().toISOString() } : a));
    toast.success("AMC renewed successfully!");
  };

  const openDetail = (amc: AMCRecord) => { setSelectedAMC(amc); setShowDetailModal(true); };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AMC Contracts</h1>
          <p className="text-gray-500 mt-1">Manage annual maintenance contracts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New AMC
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Total</p><p className="text-2xl font-bold text-gray-900">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Active</p><p className="text-2xl font-bold text-green-600">{counts.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Expiring Soon</p><p className="text-2xl font-bold text-orange-600">{counts.expiringSoon}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Expired</p><p className="text-2xl font-bold text-red-600">{counts.expired}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search AMC contracts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilterOptions.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{getStatusLabel(s)}</button>
          ))}
        </div>
      </div>

      {/* AMC List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading AMC contracts...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-12 w-12" />} title="No AMC contracts found" description={searchQuery ? "Try adjusting your search" : "Create your first AMC contract"} action={<Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-2" />New AMC</Button>} />
        ) : (
          filtered.map((amc) => {
            const visitProgress = amc.totalVisits > 0 ? (amc.visitCount / amc.totalVisits) * 100 : 0;
            return (
              <Card key={amc.$id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openDetail(amc)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{amc.title}</h3>
                        <Badge className={getStatusColor(amc.status)}>{getStatusLabel(amc.status)}</Badge>
                        <Badge className={paymentColors[amc.paymentStatus]}>{amc.paymentStatus}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{amc.businessName} • {amc.amcType}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(amc.startDate)} - {formatDate(amc.endDate)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{amc.siteAddress}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />{amc.cost.toLocaleString("en-IN")}</span>
                      </div>
                      {/* Visit Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Visits: {amc.visitCount}/{amc.totalVisits}</span>
                          <span>{Math.round(visitProgress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${visitProgress}%` }} />
                        </div>
                      </div>
                      {amc.nextVisitDate && (
                        <p className="text-xs text-brand-600 mt-2 flex items-center gap-1"><Clock className="h-3 w-3" />Next visit: {formatDate(amc.nextVisitDate)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(amc.status === "expired" || amc.status === "expiring_soon") && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRenew(amc.$id); }}><RefreshCw className="h-4 w-4 mr-1" />Renew</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(amc); }}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">New AMC Contract</h2><button onClick={() => setShowCreateModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <Input label="Title" placeholder="Contract title" value={newAMC.title} onChange={(e) => setNewAMC({ ...newAMC, title: e.target.value })} />
              <Input label="Business Name" placeholder="Service provider name" value={newAMC.businessName} onChange={(e) => setNewAMC({ ...newAMC, businessName: e.target.value })} />
              <Input label="AMC Type" placeholder="Maintenance category" value={newAMC.amcType} onChange={(e) => setNewAMC({ ...newAMC, amcType: e.target.value })} />
              <Input label="Site Address" placeholder="Service location address" value={newAMC.siteAddress} onChange={(e) => setNewAMC({ ...newAMC, siteAddress: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Date" type="date" value={newAMC.startDate} onChange={(e) => setNewAMC({ ...newAMC, startDate: e.target.value })} />
                <Input label="End Date" type="date" value={newAMC.endDate} onChange={(e) => setNewAMC({ ...newAMC, endDate: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Cost (₹)" type="number" placeholder="Contract amount" value={newAMC.cost} onChange={(e) => setNewAMC({ ...newAMC, cost: e.target.value })} />
                <Input label="Total Visits" type="number" placeholder="Planned visits" value={newAMC.totalVisits} onChange={(e) => setNewAMC({ ...newAMC, totalVisits: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button><Button className="flex-1" onClick={handleCreate}>Create AMC</Button></div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAMC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">AMC Details</h2><button onClick={() => setShowDetailModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap"><Badge className={getStatusColor(selectedAMC.status)}>{getStatusLabel(selectedAMC.status)}</Badge><Badge className={paymentColors[selectedAMC.paymentStatus]}>{selectedAMC.paymentStatus}</Badge></div>
              <h3 className="font-semibold text-lg">{selectedAMC.title}</h3>
              <p className="text-gray-600">{selectedAMC.businessName} • {selectedAMC.amcType}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{formatDate(selectedAMC.startDate)} - {formatDate(selectedAMC.endDate)}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{selectedAMC.siteAddress}</span></div>
                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-gray-400" /><span>₹{selectedAMC.cost.toLocaleString("en-IN")}</span></div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gray-400" /><span>Visits: {selectedAMC.visitCount}/{selectedAMC.totalVisits}</span></div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-brand-600 rounded-full" style={{ width: `${selectedAMC.totalVisits > 0 ? (selectedAMC.visitCount / selectedAMC.totalVisits) * 100 : 0}%` }} /></div>
              {(selectedAMC.status === "expired" || selectedAMC.status === "expiring_soon") && (
                <Button className="w-full" onClick={() => { handleRenew(selectedAMC.$id); setShowDetailModal(false); }}><RefreshCw className="h-4 w-4 mr-2" />Renew Contract</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
