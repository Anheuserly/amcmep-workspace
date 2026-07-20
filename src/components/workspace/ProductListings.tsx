"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  PackageOpen,
  Plus,
  Search,
  Store,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can } from "@/lib/workspace/permissions";

type Visibility = "published" | "hidden" | "draft";

function visibilityOf(listing: any): Visibility {
  if (listing.isActive === true || listing.status === "active") return "published";
  if (listing.status === "hidden") return "hidden";
  return "draft";
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "Price on request";
}

export function ProductListings({
  business,
  membership,
  profile,
}: {
  business: Business | null;
  membership: WorkspaceMembership;
  profile: any;
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Visibility>("all");
  const manager = can(membership, "business.manage");

  useEffect(() => {
    let active = true;
    if (!business?.$id || !profile?.userId) return;
    setLoading(true);
    const params = new URLSearchParams({
      businessId: business.$id,
      userId: profile.userId,
    });
    fetch(`/api/product-listings?${params}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setRecords(result.documents ?? []);
      })
      .catch((error) => toast.error(error?.message || "Listings could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [business?.$id, profile?.userId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFilter = filter === "all" || visibilityOf(record) === filter;
      const text = `${record.title || record.name || ""} ${record.category || ""} ${record.brand || ""}`.toLowerCase();
      return matchesFilter && (!term || text.includes(term));
    });
  }, [filter, records, search]);

  const totals = useMemo(
    () => ({
      published: records.filter((item) => visibilityOf(item) === "published").length,
      draft: records.filter((item) => visibilityOf(item) === "draft").length,
      hidden: records.filter((item) => visibilityOf(item) === "hidden").length,
    }),
    [records],
  );

  async function setVisibility(listing: any, visibility: Visibility) {
    if (!business || !profile?.userId) return;
    const previous = records;
    setRecords((current) =>
      current.map((item) =>
        item.$id === listing.$id
          ? {
              ...item,
              status: visibility === "published" ? "active" : visibility,
              isActive: visibility === "published",
            }
          : item,
      ),
    );
    try {
      const response = await fetch("/api/product-listings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: business.$id,
          userId: profile.userId,
          listingId: listing.$id,
          visibility,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecords((current) =>
        current.map((item) => (item.$id === listing.$id ? result.document : item)),
      );
      toast.success(
        visibility === "published"
          ? "Product is now visible."
          : visibility === "hidden"
            ? "Product hidden from public listings."
            : "Product returned to drafts.",
      );
    } catch (error: any) {
      setRecords(previous);
      toast.error(error?.message || "Visibility could not be changed.");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">{business?.name}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Product listings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage the products published by this business. Every listing keeps its creator and business ownership.
          </p>
        </div>
        {manager ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus size={17} /> Add product
          </button>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Published" value={totals.published} tone="emerald" icon={Eye} />
        <Metric label="Drafts" value={totals.draft} tone="blue" icon={Store} />
        <Metric label="Hidden" value={totals.hidden} tone="slate" icon={EyeOff} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, categories, or brands"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <div className="inline-flex h-10 rounded-md border border-slate-300 bg-white p-1">
          {(["all", "published", "draft", "hidden"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded px-3 text-xs font-bold capitalize ${filter === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-lg border border-slate-200 bg-white">
          <Loader2 className="size-6 animate-spin text-blue-600" />
        </div>
      ) : visible.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {visible.map((listing) => (
            <ListingCard
              key={listing.$id}
              listing={listing}
              manager={manager}
              onVisibility={setVisibility}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center">
          <PackageOpen className="mx-auto size-7 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-800">No matching products</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a listing or change the current search and visibility filter.
          </p>
        </div>
      )}

      {open ? (
        <CreateProductDialog
          business={business}
          profile={profile}
          onClose={() => setOpen(false)}
          onCreated={(document: any) => {
            setRecords((current) => [document, ...current]);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone, icon: Icon }: any) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <article className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      </div>
      <span className={`grid size-10 place-items-center rounded-md ${tones[tone]}`}>
        <Icon size={18} />
      </span>
    </article>
  );
}

function ListingCard({ listing, manager, onVisibility }: any) {
  const visibility = visibilityOf(listing);
  const image = listing.mediaUrl || listing.imageUrl || listing.thumbnailUrl || "";
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex gap-4 p-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <PackageOpen className="text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950">
                {listing.title || listing.name || "Untitled product"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {[listing.category, listing.brand].filter(Boolean).join(" · ") || "Uncategorised"}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${visibility === "published" ? "bg-emerald-50 text-emerald-700" : visibility === "hidden" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>
              {visibility}
            </span>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-900">{money(listing.price)}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {listing.description || "Product details have not been added."}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="truncate text-[11px] text-slate-500">
          Added by <span className="font-bold text-slate-700">{listing.sellerName || "Business user"}</span>
          {listing.createdAt ? ` · ${new Date(listing.createdAt).toLocaleDateString("en-IN")}` : ""}
        </p>
        {manager ? (
          <select
            aria-label="Listing visibility"
            value={visibility}
            onChange={(event) => onVisibility(listing, event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
          </select>
        ) : null}
      </div>
    </article>
  );
}

function CreateProductDialog({ business, profile, onClose, onCreated }: any) {
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business?.$id || !profile?.userId) return;
    const form = new FormData(event.currentTarget);
    form.set("businessId", business.$id);
    form.set("userId", profile.userId);
    if (image) form.set("image", image);
    setSaving(true);
    try {
      const response = await fetch("/api/product-listings", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onCreated(result.document);
      toast.success(visibilityOf(result.document) === "published" ? "Product published." : "Product saved as draft.");
    } catch (error: any) {
      toast.error(error?.message || "Product could not be added.");
    } finally {
      setSaving(false);
    }
  }
  const input = "mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm";
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">Add product listing</h2>
          <p className="mt-1 text-xs text-slate-500">The creator and active business are recorded automatically.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="text-xs font-bold">Product title</span><input name="title" required className={input} /></label>
          <label><span className="text-xs font-bold">Category</span><input name="category" required placeholder="Business cards" className={input} /></label>
          <label><span className="text-xs font-bold">Brand</span><input name="brand" defaultValue={business?.name || ""} className={input} /></label>
          <label><span className="text-xs font-bold">Price</span><input name="price" type="number" min="0" step="0.01" placeholder="0 for request quote" className={input} /></label>
          <label><span className="text-xs font-bold">Unit</span><input name="unit" defaultValue="Piece" className={input} /></label>
          <label><span className="text-xs font-bold">Minimum order</span><input name="minOrderQty" placeholder="100 pieces" className={input} /></label>
          <label><span className="text-xs font-bold">Location</span><input name="location" defaultValue={(business as any)?.city || "Delhi"} className={input} /></label>
          <label className="sm:col-span-2"><span className="text-xs font-bold">Description</span><textarea name="description" required rows={4} className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm" /></label>
          <label className="sm:col-span-2"><span className="text-xs font-bold">Search tags</span><input name="tags" placeholder="printing, cards, corporate" className={input} /></label>
          <label><span className="text-xs font-bold">Visibility</span><select name="visibility" defaultValue="draft" className={input}><option value="draft">Save as draft</option><option value="published">Publish now</option><option value="hidden">Keep hidden</option></select></label>
          <label><span className="text-xs font-bold">Product image</span><span className="mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600"><ImagePlus size={16} />{image?.name || "Choose JPG, PNG, or WebP"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} /></span></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancel</button>
          <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus size={16} />}Save product</button>
        </div>
      </form>
    </div>
  );
}
