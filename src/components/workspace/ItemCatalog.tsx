"use client";

import { useMemo, useState } from "react";
import { Boxes, Loader2, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can } from "@/lib/workspace/permissions";

export function ItemCatalog({
  business,
  membership,
  profile,
  records,
  onChange,
}: {
  business: Business | null;
  membership: WorkspaceMembership;
  profile: any;
  records: any[];
  onChange: (rows: any[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState("");
  const visible = useMemo(
    () =>
      records.filter((item) =>
        `${item.name} ${item.hsnSac} ${item.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [records, search],
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!business || !profile?.userId) return;
    const rows = bulk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [
          name,
          hsnSac = "",
          unit = "Nos",
          rate = "0",
          gstRate = "0",
          category = "",
        ] = line.split("|").map((part) => part.trim());
        return {
          name,
          description: name,
          hsnSac,
          unit: unit || "Nos",
          rate: Number(rate || 0),
          gstRate: Number(gstRate || 0),
          category,
          sku: "",
          isActive: true,
          createdBy: profile.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
      .filter((row) => row.name);
    if (!rows.length) return;
    setSaving(true);
    try {
      const created = [];
      for (const data of rows) {
        const response = await fetch("/api/business-records", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            table: "item_catalog",
            businessId: business.$id,
            userId: profile.userId,
            data,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        created.push(result.document);
      }
      onChange([...created, ...records]);
      setBulk("");
      setOpen(false);
      toast.success(
        `${created.length} item${created.length === 1 ? "" : "s"} added.`,
      );
    } catch (error: any) {
      toast.error(error?.message || "Items could not be added.");
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
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Items & services
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Reusable products, materials, and service rates for quotations and
            billing.
          </p>
        </div>
        {can(membership, "finance.manage") ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Add items
          </button>
        ) : null}
      </header>
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, HSN/SAC, or category"
          className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm"
        />
      </div>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_120px_90px] border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase text-slate-500">
          <span>Item or service</span>
          <span>HSN/SAC</span>
          <span>Unit</span>
          <span>Rate</span>
          <span>GST</span>
        </div>
        {visible.length ? (
          visible.map((item) => (
            <div
              key={item.$id}
              className="grid grid-cols-[minmax(0,1fr)_110px_90px_120px_90px] items-center border-b px-5 py-4 text-sm last:border-0"
            >
              <div>
                <p className="font-bold text-slate-950">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.category || "Uncategorised"}
                </p>
              </div>
              <span>{item.hsnSac || "—"}</span>
              <span>{item.unit || "Nos"}</span>
              <span>₹{Number(item.rate || 0).toLocaleString("en-IN")}</span>
              <span>{Number(item.gstRate || 0)}%</span>
            </div>
          ))
        ) : (
          <div className="py-16 text-center">
            <Boxes className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No reusable items added yet.
            </p>
          </div>
        )}
      </section>
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl"
          >
            <h2 className="text-xl font-bold">Add catalogue items</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter one item per line: Description | HSN/SAC | Unit | Rate |
              GST% | Category
            </p>
            <textarea
              autoFocus
              rows={12}
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              placeholder={
                "Fire alarm panel service | 998719 | Job | 2500 | 18 | Fire safety\nSmoke detector | 853110 | Nos | 850 | 18 | Detection"
              }
              className="mt-4 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-md border px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save items
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
