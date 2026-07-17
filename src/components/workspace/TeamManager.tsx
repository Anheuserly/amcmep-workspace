"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Phone, Plus, UserCheck, UserRoundSearch, X } from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can, roleDefinitions } from "@/lib/workspace/permissions";
import { toWorkspaceMembership } from "@/lib/services/appwriteServices";

export function TeamManager({
  business,
  viewer,
  profile,
  members,
  onChange,
}: {
  business: Business | null;
  viewer: WorkspaceMembership;
  profile: any;
  members: WorkspaceMembership[];
  onChange: (rows: WorkspaceMembership[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phones, setPhones] = useState("");
  const [role, setRole] = useState<WorkspaceMembership["role"]>("technician");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{
    added: number;
    invited: number;
  } | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const manager = can(viewer, "team.manage");
  const parsedPhones = useMemo(() => [...new Set(phones.split(/[\n,;]+/).map((item) => item.replace(/\D/g, "")).filter((item) => item.length >= 10).map((item) => `+91${item.slice(-10)}`))].slice(0, 25), [phones]);
  useEffect(() => {
    if (!manager || !business || !profile?.userId) return;
    fetch(`/api/team?businessId=${business.$id}&userId=${profile.userId}`)
      .then((response) => response.json())
      .then((data) => setInvitations(data.invitations || []))
      .catch(() => undefined);
  }, [business, manager, profile?.userId]);
  useEffect(() => {
    if (!open || !business || !profile?.userId || !parsedPhones.length) { setMatches([]); setChecking(false); return; }
    setChecking(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/team?businessId=${encodeURIComponent(business.$id)}&userId=${encodeURIComponent(profile.userId)}&phones=${encodeURIComponent(parsedPhones.join(","))}`)
        .then((response) => response.json()).then((data) => setMatches(data.matches || [])).catch(() => setMatches([])).finally(() => setChecking(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [business, open, parsedPhones, profile?.userId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!business || !profile?.userId) return;
    const list = parsedPhones.filter((phone) => matches.find((item) => item.phone === phone)?.status !== "already_member");
    if (!list.length) return;
    setSaving(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: business.$id,
          userId: profile.userId,
          userName: profile.name || "",
          role,
          phones: list,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const added = result.results.filter(
        (item: any) => item.status === "added",
      );
      const invited = result.results.filter(
        (item: any) => item.status === "invited",
      );
      const next = [...members];
      for (const item of added) {
        const member = toWorkspaceMembership(item.document);
        const index = next.findIndex(
          (row) => row.$id === member.$id || row.userId === member.userId,
        );
        if (index >= 0) next[index] = member;
        else next.push(member);
      }
      onChange(next);
      setInvitations((current) => [
        ...result.results
          .filter((item: any) => item.status === "invited")
          .map((item: any) => item.invitation),
        ...current.filter(
          (row) =>
            !result.results.some(
              (item: any) => item.invitation?.$id === row.$id,
            ),
        ),
      ]);
      setLastResult({ added: added.length, invited: invited.length });
      setPhones("");
      toast.success(`${added.length} added, ${invited.length} pending.`);
    } catch (error: any) {
      toast.error(error?.message || "Team members could not be added.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">
            {business?.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Team</h1>
          <p className="mt-2 text-sm text-slate-600">
            Internal staff with role-based access to this business account.
          </p>
        </div>
        {manager ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Add team members
          </button>
        ) : null}
      </header>
      {lastResult ? (
        <div className="flex gap-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            {lastResult.added} added
          </span>
          <span className="flex items-center gap-2 font-semibold text-amber-700">
            <Clock3 size={16} />
            {lastResult.invited} pending
          </span>
        </div>
      ) : null}
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_180px_120px] border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase text-slate-500">
          <span>Member</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        {members.map((member) => (
          <div
            key={member.$id}
            className="grid grid-cols-[minmax(0,1fr)_180px_120px] items-center border-b px-5 py-4 last:border-0"
          >
            <div>
              <p className="text-sm font-bold">
                {member.memberName || "Team member"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {member.memberPhone || member.userId}
              </p>
            </div>
            <p className="text-sm font-semibold">
              {roleDefinitions[member.role]?.label || member.role}
            </p>
            <span className="text-xs font-bold capitalize text-emerald-700">
              {member.status || "active"}
            </span>
          </div>
        ))}
      </section>
      {manager && invitations.length ? (
        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="border-b bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-bold">Pending invitations</h2>
            <p className="mt-1 text-xs text-slate-500">
              After a person registers in AMC MEP, add the number again to
              activate their access.
            </p>
          </div>
          {invitations.map((invitation) => (
            <div
              key={invitation.$id}
              className="grid grid-cols-[minmax(0,1fr)_180px_120px] border-b px-5 py-4 last:border-0"
            >
              <span className="text-sm font-semibold">{invitation.phone}</span>
              <span className="text-sm capitalize">
                {String(invitation.role).replaceAll("_", " ")}
              </span>
              <span className="text-xs font-bold text-amber-700">Pending</span>
            </div>
          ))}
        </section>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-xl rounded-lg bg-white shadow-xl"
          >
            <header className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">Add team members</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registered users receive access immediately. Other numbers
                  remain pending until they join AMC MEP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-xs font-bold text-slate-700">
                  Phone numbers
                </span>
                <div className="relative mt-2">
                  <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                  <textarea
                    required
                    rows={5}
                    value={phones}
                    onChange={(e) => setPhones(e.target.value)}
                    placeholder={"8171486963, 9871936847"}
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Paste up to 25 numbers. Commas, spaces, and new lines are supported.
                </p>
              </label>
              {phones.trim() ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-700">People found</p>{checking ? <Loader2 className="size-4 animate-spin text-blue-600"/> : <span className="text-[11px] text-slate-500">{parsedPhones.length} valid number{parsedPhones.length===1?"":"s"}</span>}</div><div className="mt-3 space-y-2">{parsedPhones.map((phone) => { const match=matches.find((item)=>item.phone===phone); const status=match?.status; return <div key={phone} className="flex items-center gap-3 rounded-md bg-white px-3 py-2.5"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${status==="registered"?"bg-emerald-50 text-emerald-600":status==="already_member"?"bg-blue-50 text-blue-600":"bg-amber-50 text-amber-600"}`}>{status==="registered"?<UserCheck size={16}/>:status==="already_member"?<CheckCircle2 size={16}/>:status==="not_registered"?<Clock3 size={16}/>:<UserRoundSearch size={16}/>}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-900">{match?.name || phone}</strong><small className="text-slate-500">{match?.name ? phone : status==="not_registered"?"Not registered; an invitation will remain pending.":"Checking AMC MEP…"}</small></span><span className={`text-[10px] font-bold uppercase ${status==="registered"?"text-emerald-600":status==="already_member"?"text-blue-600":"text-amber-600"}`}>{status==="registered"?"Ready":status==="already_member"?"Already added":status==="not_registered"?"Invite":"Checking"}</span></div>})}{!parsedPhones.length ? <div className="flex items-center gap-2 text-xs text-red-600"><AlertCircle size={15}/>Enter a valid 10-digit mobile number.</div> : null}</div></div> : null}
              <label className="block">
                <span className="text-xs font-bold text-slate-700">
                  Organization role
                </span>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as WorkspaceMembership["role"])
                  }
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                >
                  {Object.entries(roleDefinitions)
                    .filter(([key]) => !["owner", "partner"].includes(key))
                    .map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label} — {value.description}
                      </option>
                    ))}
                </select>
              </label>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-700">
                  Access included
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roleDefinitions[role].permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-md border px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving || checking || !parsedPhones.length || parsedPhones.every((phone) => matches.find((item) => item.phone === phone)?.status === "already_member")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}Add
                members
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
