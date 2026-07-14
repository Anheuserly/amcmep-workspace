"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can } from "@/lib/workspace/permissions";

const empty = {
  legalName: "",
  tradeName: "",
  gstin: "",
  pan: "",
  address: "",
  city: "",
  state: "",
  stateCode: "",
  pincode: "",
  email: "",
  phone: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
  upiId: "",
  defaultTerms: "",
  authorizedSignatory: "",
  signatureFileId: "",
};

function billingValues(source: any, business?: Business | null) {
  const fallback: Partial<typeof empty> = {
    legalName: business?.name || "",
    city: business?.city || "",
    state: business?.state || "",
    pincode: business?.pincode || "",
    email: business?.email || "",
    phone: business?.phone || "",
  };
  return Object.fromEntries(
    Object.keys(empty).map((key) => [
      key,
      source?.[key] ?? fallback[key as keyof typeof empty] ?? "",
    ]),
  ) as typeof empty;
}

export function BillingSettings({
  business,
  membership,
  profile,
}: {
  business: Business | null;
  membership: WorkspaceMembership;
  profile: any;
}) {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<File | null>(null);
  useEffect(() => {
    if (!business || !profile?.userId) return;
    fetch(
      `/api/billing-data?businessId=${encodeURIComponent(business.$id)}&userId=${encodeURIComponent(profile.userId)}`,
    )
      .then((response) => response.json())
      .then((result) => setForm(billingValues(result.profile, business)))
      .catch(() => toast.error("Billing profile could not be loaded."))
      .finally(() => setLoading(false));
  }, [business, profile?.userId]);
  const set = (key: keyof typeof empty, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!business || !profile?.userId || !form.legalName) return;
    setSaving(true);
    try {
      let signatureFileId = form.signatureFileId;
      if (signature) {
        const upload = new FormData();
        upload.set("businessId", business.$id);
        upload.set("userId", profile.userId);
        upload.set("userName", profile.name || "");
        upload.set("title", "Authorized billing signature");
        upload.set("category", "signature");
        upload.set("file", signature);
        const uploadResponse = await fetch("/api/business-records", {
          method: "POST",
          body: upload,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok)
          throw new Error(
            uploadResult.error || "Signature could not be uploaded.",
          );
        signatureFileId = String(uploadResult.document?.fileId || "");
      }
      const response = await fetch("/api/billing-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "profile",
          businessId: business.$id,
          userId: profile.userId,
          data: { ...form, signatureFileId },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setForm(billingValues(result.document, business));
      toast.success("Billing defaults saved.");
    } catch (error: any) {
      toast.error(error?.message || "Billing defaults could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="size-6 animate-spin text-blue-600" />
      </div>
    );
  return (
    <form onSubmit={save} className="space-y-5">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase text-blue-600">
          {business?.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Billing profile
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Saved GST, banking, and authorization details used in every new
          commercial document.
        </p>
      </header>
      <Panel title="Registered business" icon={Building2}>
        <Fields
          form={form}
          set={set}
          keys={[
            ["legalName", "Legal business name"],
            ["tradeName", "Trade name"],
            ["gstin", "GSTIN"],
            ["pan", "PAN"],
            ["address", "Registered address"],
            ["city", "City"],
            ["state", "State"],
            ["stateCode", "GST state code"],
            ["pincode", "PIN code"],
            ["email", "Billing email"],
            ["phone", "Billing phone"],
          ]}
        />
      </Panel>
      <Panel title="Payment and authorization" icon={Building2}>
        <Fields
          form={form}
          set={set}
          keys={[
            ["bankName", "Bank name"],
            ["accountName", "Account holder"],
            ["accountNumber", "Account number"],
            ["ifsc", "IFSC"],
            ["branch", "Branch"],
            ["upiId", "UPI ID"],
            ["authorizedSignatory", "Authorized signatory"],
            ["defaultTerms", "Default terms and conditions"],
          ]}
        />
        <label className="sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Reusable authorized signature
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(event) => setSignature(event.target.files?.[0] || null)}
            className="mt-1.5 block w-full rounded-md border border-slate-300 p-2 text-xs"
          />
          <span className="mt-1 block text-xs text-slate-500">
            {form.signatureFileId
              ? "A saved signature is already available. Choose a file only to replace it."
              : "PNG, JPG, or PDF."}
          </span>
        </label>
      </Panel>
      {can(membership, "settings.manage") ||
      can(membership, "finance.manage") ? (
        <div className="flex justify-end">
          <button
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save billing profile
          </button>
        </div>
      ) : null}
    </form>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 font-bold text-slate-950">
        <Icon size={18} className="text-blue-600" />
        {title}
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Fields({
  form,
  set,
  keys,
}: {
  form: typeof empty;
  set: (key: keyof typeof empty, value: string) => void;
  keys: string[][];
}) {
  return (
    <>
      {keys.map(([key, label]) => (
        <label
          key={key}
          className={
            key === "address" || key === "defaultTerms" ? "sm:col-span-2" : ""
          }
        >
          <span className="text-xs font-bold text-slate-700">{label}</span>
          {key === "address" || key === "defaultTerms" ? (
            <textarea
              rows={3}
              value={form[key as keyof typeof empty]}
              onChange={(event) =>
                set(key as keyof typeof empty, event.target.value)
              }
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          ) : (
            <input
              value={form[key as keyof typeof empty]}
              onChange={(event) =>
                set(key as keyof typeof empty, event.target.value)
              }
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          )}
        </label>
      ))}
    </>
  );
}
