"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  FileSignature,
  IndianRupee,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { can } from "@/lib/workspace/permissions";
import { readString } from "@/lib/services/appwriteServices";

export type CommercialDocumentType =
  | "quotation"
  | "proforma_invoice"
  | "tax_invoice"
  | "purchase_order"
  | "work_order";

const typeCopy: Record<
  CommercialDocumentType,
  { title: string; action: string; empty: string }
> = {
  quotation: {
    title: "Quotations",
    action: "New quotation",
    empty: "No quotations have been prepared.",
  },
  proforma_invoice: {
    title: "Proforma invoices",
    action: "New proforma",
    empty: "No proforma invoices have been prepared.",
  },
  tax_invoice: {
    title: "Tax invoices",
    action: "New tax invoice",
    empty: "No tax invoices have been issued.",
  },
  purchase_order: {
    title: "Purchase orders",
    action: "New purchase order",
    empty: "No purchase orders have been issued.",
  },
  work_order: {
    title: "Work orders",
    action: "New work order",
    empty: "No work orders have been issued.",
  },
};

type LineItem = {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
};
const newItem = (): LineItem => ({
  description: "",
  hsnSac: "",
  quantity: 1,
  unit: "Nos",
  rate: 0,
  discount: 0,
  gstRate: 18,
});

export function CommercialDocuments({
  type,
  business,
  membership,
  profile,
  records,
  onCreated,
}: {
  type: CommercialDocumentType;
  business: Business | null;
  membership: WorkspaceMembership;
  profile: any;
  records: any[];
  onCreated: (record: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const copy = typeCopy[type];
  const filtered = records.filter(
    (row) => readString(row, "documentType") === type,
  );
  const value = filtered.reduce(
    (sum, row) => sum + Number(row.grandTotal || 0),
    0,
  );
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">
            {business?.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            GST-ready commercial documents with billing, banking, terms, items,
            and authorization details.
          </p>
        </div>
        {can(membership, "finance.manage") ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
          >
            <Plus size={17} />
            {copy.action}
          </button>
        ) : null}
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Documents" value={filtered.length} />
        <Metric
          label="Drafts"
          value={
            filtered.filter(
              (row) => (readString(row, "status") || "draft") === "draft",
            ).length
          }
        />
        <Metric
          label="Total value"
          value={`₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        />
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_150px] border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase text-slate-500">
          <span>Document</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {filtered.length ? (
          filtered.map((record) => (
            <div
              key={record.$id}
              className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center border-b border-slate-100 px-5 py-4 last:border-0"
            >
              <div>
                <p className="text-sm font-bold">
                  {readString(record, "documentNumber")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {readString(record, "billToName") ||
                    "Billing party not added"}{" "}
                  ·{" "}
                  {readString(record, "issueDate")
                    ? new Date(record.issueDate).toLocaleDateString("en-IN")
                    : "No date"}
                </p>
              </div>
              <span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold capitalize text-blue-700">
                {readString(record, "status") || "draft"}
              </span>
              <p className="text-sm font-bold">
                ₹
                {Number(record.grandTotal || 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">
            {copy.empty}
          </div>
        )}
      </section>
      {open ? (
        <DocumentComposer
          type={type}
          business={business}
          profile={profile}
          onClose={() => setOpen(false)}
          onCreated={onCreated}
        />
      ) : null}
    </div>
  );
}

function DocumentComposer({
  type,
  business,
  profile,
  onClose,
  onCreated,
}: {
  type: CommercialDocumentType;
  business: Business | null;
  profile: any;
  onClose: () => void;
  onCreated: (record: any) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<File | null>(null);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [form, setForm] = useState({
    documentNumber: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    placeOfSupply: business?.state || "",
    projectId: "",
    billFromName: business?.name || "",
    billFromGstin: "",
    billFromPan: "",
    billFromAddress: [business?.city, business?.state]
      .filter(Boolean)
      .join(", "),
    billFromState: business?.state || "",
    billFromStateCode: "",
    billToName: "",
    billToGstin: "",
    billToAddress: "",
    billToState: "",
    billToStateCode: "",
    shipToAddress: "",
    bankName: "",
    accountName: business?.name || "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    upiId: "",
    terms:
      "Payment is due as stated in this document. Goods and services are subject to the agreed scope and applicable taxes.",
    notes: "",
    authorizedSignatory: "",
    signatureFileId: "",
  });
  const totals = useMemo(
    () => calculate(items, form.billFromStateCode, form.billToStateCode),
    [items, form.billFromStateCode, form.billToStateCode],
  );
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index: number, key: keyof LineItem, value: string) =>
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === "description" || key === "hsnSac" || key === "unit"
                  ? value
                  : Number(value),
            }
          : item,
      ),
    );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !business ||
      !profile?.userId ||
      !form.documentNumber ||
      !form.billToName ||
      !items.some((item) => item.description)
    )
      return;
    setSaving(true);
    try {
      let signatureFileId = form.signatureFileId;
      if (signature) {
        const upload = new FormData();
        upload.set("businessId", business.$id);
        upload.set("userId", profile.userId);
        upload.set("userName", profile.name || "");
        upload.set("title", `${form.documentNumber} signature`);
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
      const response = await fetch("/api/commercial-documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: business.$id,
          userId: profile.userId,
          userName: profile.name || "",
          documentType: type,
          form: { ...form, signatureFileId },
          items,
          totals,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Document could not be created.");
      onCreated(result.document);
      toast.success(`${typeCopy[type].title.slice(0, -1)} saved as draft.`);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Document could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-3 sm:p-6">
      <form
        onSubmit={submit}
        className="mx-auto max-w-6xl rounded-lg bg-slate-50 shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-blue-600">
              Commercial document
            </p>
            <h2 className="mt-1 text-xl font-bold">{typeCopy[type].action}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <Section title="Document details" icon={FileSignature}>
            <Grid>
              <Input
                label="Document number"
                required
                value={form.documentNumber}
                onChange={(v) => set("documentNumber", v)}
              />
              <Input
                label="Issue date"
                type="date"
                value={form.issueDate}
                onChange={(v) => set("issueDate", v)}
              />
              <Input
                label="Due / validity date"
                type="date"
                value={form.dueDate}
                onChange={(v) => set("dueDate", v)}
              />
              <Input
                label="Project or reference"
                value={form.projectId}
                onChange={(v) => set("projectId", v)}
              />
              <Input
                label="Place of supply"
                value={form.placeOfSupply}
                onChange={(v) => set("placeOfSupply", v)}
              />
            </Grid>
          </Section>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Bill from" icon={Building2}>
              <Grid>
                <Input
                  label="Legal business name"
                  required
                  value={form.billFromName}
                  onChange={(v) => set("billFromName", v)}
                />
                <Input
                  label="GSTIN"
                  value={form.billFromGstin}
                  onChange={(v) => set("billFromGstin", v.toUpperCase())}
                />
                <Input
                  label="PAN"
                  value={form.billFromPan}
                  onChange={(v) => set("billFromPan", v.toUpperCase())}
                />
                <Input
                  label="State"
                  value={form.billFromState}
                  onChange={(v) => set("billFromState", v)}
                />
                <Input
                  label="GST state code"
                  value={form.billFromStateCode}
                  onChange={(v) => set("billFromStateCode", v)}
                />
                <Input
                  label="Registered address"
                  wide
                  value={form.billFromAddress}
                  onChange={(v) => set("billFromAddress", v)}
                />
              </Grid>
            </Section>
            <Section title="Bill to" icon={Building2}>
              <Grid>
                <Input
                  label="Customer / company"
                  required
                  value={form.billToName}
                  onChange={(v) => set("billToName", v)}
                />
                <Input
                  label="GSTIN"
                  value={form.billToGstin}
                  onChange={(v) => set("billToGstin", v.toUpperCase())}
                />
                <Input
                  label="State"
                  value={form.billToState}
                  onChange={(v) => set("billToState", v)}
                />
                <Input
                  label="GST state code"
                  value={form.billToStateCode}
                  onChange={(v) => set("billToStateCode", v)}
                />
                <Input
                  label="Billing address"
                  wide
                  value={form.billToAddress}
                  onChange={(v) => set("billToAddress", v)}
                />
                <Input
                  label="Shipping / site address"
                  wide
                  value={form.shipToAddress}
                  onChange={(v) => set("shipToAddress", v)}
                />
              </Grid>
            </Section>
          </div>
          <Section title="Items" icon={IndianRupee}>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[2fr_110px_90px_90px_120px_100px_90px_40px] gap-2 pb-2 text-[10px] font-bold uppercase text-slate-500">
                  <span>Description</span>
                  <span>HSN/SAC</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Rate</span>
                  <span>Discount %</span>
                  <span>GST %</span>
                  <span />
                </div>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="mb-2 grid grid-cols-[2fr_110px_90px_90px_120px_100px_90px_40px] gap-2"
                  >
                    <Cell
                      value={item.description}
                      onChange={(v) => updateItem(index, "description", v)}
                      required
                    />
                    <Cell
                      value={item.hsnSac}
                      onChange={(v) => updateItem(index, "hsnSac", v)}
                    />
                    <Cell
                      type="number"
                      value={String(item.quantity)}
                      onChange={(v) => updateItem(index, "quantity", v)}
                    />
                    <Cell
                      value={item.unit}
                      onChange={(v) => updateItem(index, "unit", v)}
                    />
                    <Cell
                      type="number"
                      value={String(item.rate)}
                      onChange={(v) => updateItem(index, "rate", v)}
                    />
                    <Cell
                      type="number"
                      value={String(item.discount)}
                      onChange={(v) => updateItem(index, "discount", v)}
                    />
                    <Cell
                      type="number"
                      value={String(item.gstRate)}
                      onChange={(v) => updateItem(index, "gstRate", v)}
                    />
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() =>
                        setItems((rows) => rows.filter((_, i) => i !== index))
                      }
                      className="grid place-items-center text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, newItem()])}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold"
            >
              <Plus size={15} />
              Add item
            </button>
          </Section>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Section title="Payment and authorization" icon={Building2}>
              <Grid>
                <Input
                  label="Bank name"
                  value={form.bankName}
                  onChange={(v) => set("bankName", v)}
                />
                <Input
                  label="Account holder"
                  value={form.accountName}
                  onChange={(v) => set("accountName", v)}
                />
                <Input
                  label="Account number"
                  value={form.accountNumber}
                  onChange={(v) => set("accountNumber", v)}
                />
                <Input
                  label="IFSC"
                  value={form.ifsc}
                  onChange={(v) => set("ifsc", v.toUpperCase())}
                />
                <Input
                  label="Branch"
                  value={form.branch}
                  onChange={(v) => set("branch", v)}
                />
                <Input
                  label="UPI ID"
                  value={form.upiId}
                  onChange={(v) => set("upiId", v)}
                />
                <Input
                  label="Authorized signatory"
                  value={form.authorizedSignatory}
                  onChange={(v) => set("authorizedSignatory", v)}
                />
                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Signature attachment
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={(event) =>
                      setSignature(event.target.files?.[0] || null)
                    }
                    className="mt-1.5 block w-full rounded-md border border-slate-300 p-2 text-xs"
                  />
                </label>
                <TextArea
                  label="Terms and conditions"
                  value={form.terms}
                  onChange={(v) => set("terms", v)}
                />
                <TextArea
                  label="Notes"
                  value={form.notes}
                  onChange={(v) => set("notes", v)}
                />
              </Grid>
            </Section>
            <section className="rounded-lg border bg-white p-5">
              <h3 className="font-bold">Tax summary</h3>
              <Summary label="Subtotal" value={totals.subtotal} />
              <Summary label="Discount" value={-totals.discountTotal} />
              {totals.igstTotal ? (
                <Summary label="IGST" value={totals.igstTotal} />
              ) : (
                <>
                  <Summary label="CGST" value={totals.cgstTotal} />
                  <Summary label="SGST" value={totals.sgstTotal} />
                </>
              )}
              <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
                <span>Grand total</span>
                <span>
                  ₹
                  {totals.grandTotal.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                CGST and SGST apply when seller and buyer state codes match.
                IGST applies for interstate supply.
              </p>
            </section>
          </div>
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}Save
            draft
          </button>
        </footer>
      </form>
    </div>
  );
}

function calculate(items: LineItem[], fromState: string, toState: string) {
  let subtotal = 0,
    discountTotal = 0,
    tax = 0;
  for (const item of items) {
    const base = item.quantity * item.rate;
    const discount = (base * item.discount) / 100;
    const taxable = base - discount;
    subtotal += base;
    discountTotal += discount;
    tax += (taxable * item.gstRate) / 100;
  }
  const interstate = Boolean(fromState && toState && fromState !== toState);
  const taxableTotal = subtotal - discountTotal;
  const grandTotal = taxableTotal + tax;
  return {
    subtotal,
    discountTotal,
    taxableTotal,
    cgstTotal: interstate ? 0 : tax / 2,
    sgstTotal: interstate ? 0 : tax / 2,
    igstTotal: interstate ? tax : 0,
    grandTotal,
  };
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <Icon size={18} className="text-blue-600" />
        {title}
      </h3>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="sm:col-span-2">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1.5 w-full rounded-md border border-slate-300 p-3 text-sm"
      />
    </label>
  );
}
function Cell({
  value,
  onChange,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      required={required}
      type={type}
      min={type === "number" ? 0 : undefined}
      step={type === "number" ? "0.01" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 min-w-0 rounded-md border border-slate-300 px-2 text-sm"
    />
  );
}
function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-3 flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">
        ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
