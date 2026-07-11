"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import {
  createRequest,
  fetchRequests,
  toServiceRequest,
  userIdentity,
} from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  ClipboardList, Search, Plus, MapPin, Calendar, IndianRupee,
  ArrowRight, CheckCircle, XCircle, X
} from "lucide-react";
import type { ServiceRequest } from "@/types";

const statusFilterOptions = ["all", "open", "in_progress", "completed", "cancelled", "awaiting_payment"];
const priorityColors = { low: "bg-gray-100 text-gray-700", medium: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700" };

function RequestsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRole, profile } = useAuth();
  const isAdmin = activeRole === "administrator";
  const isPartner = activeRole === "partner";

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get("action") === "create");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // New request form state
  const [newRequest, setNewRequest] = useState({ title: "", description: "", serviceType: "", siteAddress: "", priority: "medium" as const, scheduledAt: "" });

  useEffect(() => {
    let alive = true;
    async function loadRequests() {
      if (!profile?.userId) return;
      setIsLoading(true);
      try {
        const docs = await fetchRequests({ ...userIdentity(profile), limit: 100 });
        if (alive) setRequests(docs.map(toServiceRequest));
      } catch {
        if (alive) {
          setRequests([]);
          toast.error("Unable to load service requests");
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadRequests();
    return () => { alive = false; };
  }, [profile]);

  const filtered = requests.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) || r.siteAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const handleCreate = async () => {
    if (!newRequest.title || !newRequest.serviceType || !newRequest.siteAddress) {
      toast.error("Please fill all required fields");
      return;
    }
    const now = new Date().toISOString();
    try {
      const created = await createRequest({
        ...newRequest,
        status: "pending",
        type: "service",
        isActive: true,
        customerId: profile?.customerId || profile?.userId || "",
        user_id: profile?.userId || "",
        requestorUserId: profile?.userId || "",
        customerName: profile?.name || "",
        requestorName: profile?.name || "",
        customerPhone: profile?.phone || "",
        requestorPhone: profile?.phone || "",
        serviceDescription: newRequest.description,
        address: newRequest.siteAddress,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
        source: "amcmep_one_web",
      });
      setRequests((prev) => [toServiceRequest(created), ...prev]);
      setShowCreateModal(false);
      setNewRequest({ title: "", description: "", serviceType: "", siteAddress: "", priority: "medium", scheduledAt: "" });
      toast.success("Service request created");
    } catch {
      toast.error("Unable to create request");
    }
  };

  const handleStatusChange = (id: string, newStatus: ServiceRequest["status"]) => {
    setRequests((prev) => prev.map((r) => r.$id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
    toast.success(`Request updated to ${getStatusLabel(newStatus)}`);
  };

  const openDetail = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-500 mt-1">Manage and track all service requests</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Total</p><p className="text-2xl font-bold text-gray-900">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Open</p><p className="text-2xl font-bold text-blue-600">{counts.open}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">In Progress</p><p className="text-2xl font-bold text-orange-600">{counts.inProgress}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Completed</p><p className="text-2xl font-bold text-green-600">{counts.completed}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilterOptions.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{getStatusLabel(s)}</button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading your service requests...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="No requests found" description={searchQuery ? "Try adjusting your search or filters" : "Create your first service request"} action={<Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>} />
        ) : (
          filtered.map((req) => (
            <Card key={req.$id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openDetail(req)}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{req.title}</h3>
                      <Badge className={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
                      <Badge className={priorityColors[req.priority]}>{req.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{req.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><ClipboardList className="h-4 w-4" />{req.serviceType}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{req.siteAddress}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{req.scheduledAt ? formatDate(req.scheduledAt) : "Not scheduled"}</span>
                      {req.estimatedCost && <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />{req.estimatedCost.toLocaleString("en-IN")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && req.status === "open" && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.$id, "in_progress"); }}><CheckCircle className="h-4 w-4 mr-1" />Assign</Button>
                    )}
                    {(isAdmin || isPartner) && req.status === "in_progress" && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.$id, "completed"); }}><CheckCircle className="h-4 w-4 mr-1" />Complete</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(req); }}><ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">New Service Request</h2><button onClick={() => setShowCreateModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <Input label="Title" placeholder="Short service title" value={newRequest.title} onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="w-full h-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Describe the issue..." value={newRequest.description} onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })} /></div>
              <Input label="Service Type" placeholder="Service category" value={newRequest.serviceType} onChange={(e) => setNewRequest({ ...newRequest, serviceType: e.target.value })} />
              <Input label="Site Address" placeholder="Full address where service is needed" value={newRequest.siteAddress} onChange={(e) => setNewRequest({ ...newRequest, siteAddress: e.target.value })} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={newRequest.priority} onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value as any })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <Input label="Scheduled Date" type="date" value={newRequest.scheduledAt} onChange={(e) => setNewRequest({ ...newRequest, scheduledAt: e.target.value })} />
              <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button><Button className="flex-1" onClick={handleCreate}>Create Request</Button></div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">Request Details</h2><button onClick={() => setShowDetailModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap"><Badge className={getStatusColor(selectedRequest.status)}>{getStatusLabel(selectedRequest.status)}</Badge><Badge className={priorityColors[selectedRequest.priority]}>{selectedRequest.priority}</Badge></div>
              <h3 className="font-semibold text-lg">{selectedRequest.title}</h3>
              <p className="text-gray-600">{selectedRequest.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-gray-400" /><span>{selectedRequest.serviceType}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{selectedRequest.siteAddress}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{selectedRequest.scheduledAt ? formatDate(selectedRequest.scheduledAt) : "Not scheduled"}</span></div>
                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-gray-400" /><span>{selectedRequest.estimatedCost?.toLocaleString("en-IN") || "Not quoted"}</span></div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  {selectedRequest.status === "open" && <Button className="flex-1" onClick={() => { handleStatusChange(selectedRequest.$id, "in_progress"); setShowDetailModal(false); }}><CheckCircle className="h-4 w-4 mr-2" />Mark In Progress</Button>}
                  {selectedRequest.status === "in_progress" && <Button className="flex-1" onClick={() => { handleStatusChange(selectedRequest.$id, "completed"); setShowDetailModal(false); }}><CheckCircle className="h-4 w-4 mr-2" />Mark Complete</Button>}
                  {selectedRequest.status === "awaiting_payment" && <Button className="flex-1" onClick={() => { handleStatusChange(selectedRequest.$id, "completed"); setShowDetailModal(false); }}><IndianRupee className="h-4 w-4 mr-2" />Mark Paid</Button>}
                  <Button variant="outline" className="flex-1" onClick={() => { handleStatusChange(selectedRequest.$id, "cancelled"); setShowDetailModal(false); }}><XCircle className="h-4 w-4 mr-2" />Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto" /></div>}>
      <RequestsPageInner />
    </Suspense>
  );
}
