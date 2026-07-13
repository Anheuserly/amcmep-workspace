"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  IndianRupee,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
import {
  fetchAssignments,
  fetchBusinessMemberships,
  fetchBusinessRequests,
  fetchBusinessesByIds,
  fetchMembershipsForUser,
  fetchNotifications,
  toBusiness,
  toPartnerAssignment,
  toServiceRequest,
  toWorkspaceMembership,
} from "@/lib/services/appwriteServices";
import type { Business, PartnerAssignment, ServiceRequest, WorkspaceMembership } from "@/types";

type WorkspaceState = {
  businesses: Business[];
  memberships: WorkspaceMembership[];
  members: WorkspaceMembership[];
  requests: ServiceRequest[];
  assignments: PartnerAssignment[];
  notifications: any[];
};

const emptyState: WorkspaceState = {
  businesses: [],
  memberships: [],
  members: [],
  requests: [],
  assignments: [],
  notifications: [],
};

export function WorkspaceDashboard() {
  const { profile, activeRole } = useAuth();
  const [state, setState] = useState<WorkspaceState>(emptyState);
  const [activeBusinessId, setActiveBusinessId] = useState(profile?.activeBusinessId ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadAccess() {
      if (!profile?.userId) return;
      setLoading(true);
      try {
        const membershipDocs = await fetchMembershipsForUser(profile.userId);
        const memberships = membershipDocs.map(toWorkspaceMembership);
        const businessIds = Array.from(new Set([...profile.businessIds, ...memberships.map((item) => item.businessId)].filter(Boolean)));
        const businesses = (await fetchBusinessesByIds(businessIds)).map(toBusiness);
        if (!alive) return;
        const preferred = profile.activeBusinessId && businesses.some((item) => item.$id === profile.activeBusinessId)
          ? profile.activeBusinessId
          : businesses[0]?.$id ?? "";
        setActiveBusinessId((current) => current && businesses.some((item) => item.$id === current) ? current : preferred);
        setState((current) => ({ ...current, businesses, memberships }));
      } catch {
        if (alive) toast.error("Workspace access could not be loaded.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadAccess();
    return () => { alive = false; };
  }, [profile?.activeBusinessId, profile?.businessIds, profile?.userId]);

  useEffect(() => {
    let alive = true;
    async function loadBusiness() {
      if (!activeBusinessId || !profile?.userId) {
        setState((current) => ({ ...current, members: [], requests: [], assignments: [], notifications: [] }));
        return;
      }
      setLoading(true);
      try {
        const [memberDocs, requestDocs, assignmentDocs, notifications] = await Promise.all([
          fetchBusinessMemberships(activeBusinessId),
          fetchBusinessRequests(activeBusinessId),
          fetchAssignments({ businessId: activeBusinessId, limit: 100 }),
          fetchNotifications({ userId: profile.userId, limit: 20 }),
        ]);
        if (!alive) return;
        setState((current) => ({
          ...current,
          members: memberDocs.map(toWorkspaceMembership),
          requests: requestDocs.map(toServiceRequest),
          assignments: assignmentDocs.map(toPartnerAssignment),
          notifications,
        }));
      } catch {
        if (alive) toast.error("Business records could not be loaded.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadBusiness();
    return () => { alive = false; };
  }, [activeBusinessId, profile?.userId]);

  const activeBusiness = state.businesses.find((item) => item.$id === activeBusinessId);
  const viewerMembership = state.memberships.find((item) => item.businessId === activeBusinessId);
  const isManager = viewerMembership?.role === "owner" || viewerMembership?.role === "admin" || activeBusiness?.ownerId === profile?.userId;
  const openRequests = state.requests.filter((item) => item.status === "open" || item.status === "in_progress");
  const completed = state.assignments.filter((item) => item.status === "completed");
  const assignedValue = state.assignments.reduce((sum, item) => sum + item.earnings, 0);

  const recentWork = useMemo(
    () => [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [state.requests],
  );

  if (loading && !state.businesses.length) {
    return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="size-7 animate-spin text-blue-600" /></div>;
  }

  if (!state.businesses.length) {
    return (
      <section className="mx-auto max-w-3xl py-20 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-lg bg-blue-50 text-blue-600"><Building2 size={30} /></div>
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Create your first business workspace</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Business creation and partner enrollment are handled in AMC MEP 24x7 One App. Once a business is created, its workspace appears here automatically.</p>
        <a href="https://app.amcmep.in" className="mt-7 inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white">Open One App <ArrowUpRight size={17} /></a>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">Business workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Good to see you, {profile?.name?.split(" ")[0] || "there"}.</h1>
          <p className="mt-2 text-sm text-slate-600">Live operations for the businesses connected to your One App account.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Active business</span>
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select value={activeBusinessId} onChange={(event) => setActiveBusinessId(event.target.value)} className="h-11 min-w-64 appearance-none rounded-md border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500">
              {state.businesses.map((business) => <option key={business.$id} value={business.$id}>{business.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </label>
          {isManager ? <button className="flex h-11 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><Plus size={17} /> Quick create</button> : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ClipboardList} label="Open work" value={openRequests.length} detail={`${state.requests.length} total requests`} tone="blue" />
        <Metric icon={Users} label="Team" value={state.members.length} detail={`${state.members.filter((item) => item.onDuty !== false).length} available`} tone="violet" />
        <Metric icon={CheckCircle2} label="Completed" value={completed.length} detail="Recorded assignments" tone="green" />
        <Metric icon={IndianRupee} label="Assigned value" value={`₹${assignedValue.toLocaleString("en-IN")}`} detail="From live assignment records" tone="amber" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel title="Work overview" subtitle="Requests currently connected to this business" action="View all">
            {recentWork.length ? (
              <div className="divide-y divide-slate-100">
                {recentWork.map((request) => (
                  <div key={request.$id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_130px_110px] sm:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600"><Wrench size={17} /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{request.title}</p><p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={13} />{request.siteAddress || "Location not added"}</p></div>
                    </div>
                    <Status value={request.status} />
                    <p className="text-xs font-medium text-slate-500">{new Date(request.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : <EmptyLine icon={ClipboardList} title="No business requests yet" text="Accepted and assigned requests will appear here." />}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Team" subtitle={`${state.members.length} active workspace members`} action={isManager ? "Manage" : undefined}>
              {state.members.length ? <div className="space-y-3 pt-2">{state.members.slice(0, 5).map((member) => <div key={member.$id} className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{(member.memberName || "M").slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{member.memberName || `Member ${member.userId.slice(-4)}`}</p><p className="text-xs capitalize text-slate-500">{member.role}</p></div><span className={`size-2 rounded-full ${member.onDuty === false ? "bg-slate-300" : "bg-emerald-500"}`} /></div>)}</div> : <EmptyLine icon={Users} title="No team members" text="Add enrolled partners from One App." />}
            </Panel>
            <Panel title="Documents" subtitle="Business files and field records">
              <EmptyLine icon={FileText} title="No recent documents" text="Uploaded reports and workspace files will appear here." />
            </Panel>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Business profile" subtitle={viewerMembership ? `Your access: ${viewerMembership.role}` : activeRole}>
            <div className="space-y-3 pt-1 text-sm"><Info label="Business" value={activeBusiness?.name || "Business"} /><Info label="Location" value={[activeBusiness?.city, activeBusiness?.state].filter(Boolean).join(", ") || "Not added"} /><Info label="Status" value={activeBusiness?.status || "active"} /><Info label="Capabilities" value={[activeBusiness?.servicesEnabled && "Services", activeBusiness?.vendorEnabled && "Vendor"].filter(Boolean).join(" + ") || "Workspace"} /></div>
          </Panel>
          <Panel title="Activity" subtitle="Updates for your account">
            {state.notifications.length ? <div className="space-y-4 pt-1">{state.notifications.slice(0, 5).map((item) => <div key={item.$id} className="flex gap-3"><div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Bell size={15} /></div><div><p className="text-sm font-semibold text-slate-900">{item.title || "Workspace update"}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body || item.description || "A workspace record changed."}</p></div></div>)}</div> : <EmptyLine icon={Bell} title="No recent activity" text="Business updates will appear here." />}
          </Panel>
          <Panel title="Schedule" subtitle="Upcoming work">
            <EmptyLine icon={CalendarDays} title="Nothing scheduled" text="Visits and task deadlines will appear here." />
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Building2; label: string; value: string | number; detail: string; tone: "blue" | "violet" | "green" | "amber" }) {
  const tones = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" };
  return <article className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div><div className={`grid size-10 place-items-center rounded-md ${tones[tone]}`}><Icon size={19} /></div></div><p className="mt-3 text-xs text-slate-500">{detail}</p></article>;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>{action ? <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">{action}</button> : null}</div><div className="mt-4">{children}</div></section>;
}

function EmptyLine({ icon: Icon, title, text }: { icon: typeof Building2; title: string; text: string }) { return <div className="py-8 text-center"><Icon className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-bold text-slate-800">{title}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><span className="text-right font-semibold capitalize text-slate-900">{value}</span></div>; }
function Status({ value }: { value: string }) { const normalized=value.replaceAll("_", " "); const good=value==="completed"; const active=value==="in_progress"; return <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ${good ? "bg-emerald-50 text-emerald-700" : active ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{normalized}</span>; }
