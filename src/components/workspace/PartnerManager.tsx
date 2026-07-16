"use client";
import { useEffect, useState } from "react";
import { Building2, Loader2, MapPin, MessageSquare, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can } from "@/lib/workspace/permissions";
import { readString } from "@/lib/services/appwriteServices";
export function PartnerManager({
  business,
  viewer,
  profile,
}: {
  business: Business | null;
  viewer: WorkspaceMembership;
  profile: any;
}) {
  const [partners, setPartners] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [type, setType] = useState("service_partner");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const manage = can(viewer, "team.manage") || can(viewer, "business.manage");
  useEffect(() => {
    if (!business || !profile?.userId) return;
    fetch(`/api/partners?businessId=${business.$id}&userId=${profile.userId}`)
      .then((r) => r.json())
      .then((data) => setPartners(data.partners || []))
      .finally(() => setLoading(false));
  }, [business, profile?.userId]);
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(
      () =>
        fetch(
          `/api/partners?businessId=${business?.$id}&userId=${profile?.userId}&q=${encodeURIComponent(query)}`,
        )
          .then((r) => r.json())
          .then((data) => setResults(data.businesses || [])),
      350,
    );
    return () => clearTimeout(timer);
  }, [open, query, business?.$id, profile?.userId]);
  async function add(row: any) {
    if (!business) return;
    setSaving(row.$id);
    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: business.$id,
          userId: profile.userId,
          partnerBusinessId: row.$id,
          relationshipType: type,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPartners((current) => [
        data.document,
        ...current.filter((item) => item.$id !== data.document.$id),
      ]);
      setOpen(false);
      setQuery("");
      toast.success("Business partner linked.");
    } catch (error: any) {
      toast.error(error?.message || "Partner could not be linked.");
    } finally {
      setSaving("");
    }
  }
  async function message(row: any) {
    if (!business) return;
    const response = await fetch("/api/internal-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        businessId: business.$id,
        userId: profile.userId,
        targetUserId: readString(row, "partnerUserId") || readString(row, "userId"),
        targetBusinessId: readString(row, "partnerBusinessId"),
        targetName: readString(row, "partnerName"),
        conversationType: "partner",
      }),
    });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || "Partner conversation could not be opened."); return; }
    window.location.assign(`/communication?session=${data.session.$id}`);
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">
            {business?.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Business partners</h1>
          <p className="mt-2 text-sm text-slate-600">
            External companies connected for service delivery, supply,
            subcontracting, or referrals.
          </p>
        </div>
        {manage ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Add partner
          </button>
        ) : null}
      </header>
      {loading ? (
        <div className="grid py-20 place-items-center">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {partners.length ? (
            partners.map((row) => (
              <article key={row.$id} className="rounded-lg border bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-600">
                    <Building2 size={19} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">
                      {readString(row, "partnerName")}
                    </h2>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {readString(row, "relationshipType").replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={14} />
                  {readString(row, "partnerCity") || "Location not added"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {readString(row, "partnerPhone") ||
                    readString(row, "partnerEmail") ||
                    "Contact not public"}
                </p>
                <button onClick={() => void message(row)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"><MessageSquare size={15}/>Message partner</button>
              </article>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-sm font-semibold text-slate-500">
              No external business partners linked.
            </div>
          )}
        </section>
      )}
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <header className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">Link a business partner</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search verified AMC MEP business profiles. This does not grant
                  employee access.
                </p>
              </div>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <label className="block text-xs font-bold">
                Relationship
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border px-3 text-sm"
                >
                  <option value="service_partner">Service partner</option>
                  <option value="supplier">Supplier</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="consultant">Consultant</option>
                  <option value="referral_partner">Referral partner</option>
                </select>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search business name, phone, or city"
                  className="h-11 w-full rounded-md border pl-10 pr-3 text-sm"
                />
              </div>
              <div className="max-h-72 divide-y overflow-y-auto">
                {results.map((row) => (
                  <button
                    key={row.$id}
                    disabled={saving === row.$id}
                    onClick={() => add(row)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {readString(row, "name") ||
                          readString(row, "businessName")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[readString(row, "city"), readString(row, "phone")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {saving === row.$id ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Plus size={17} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
