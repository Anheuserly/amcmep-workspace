import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "680b2cfb002805548743";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "680b2b830035595d7746";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const allowedTypes = new Set([
  "quotation",
  "proforma_invoice",
  "tax_invoice",
  "purchase_order",
  "work_order",
]);

function database() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured.");
  return new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
  );
}

async function requireFinanceAccess(
  databases: Databases,
  businessId: string,
  userId: string,
) {
  const response = await databases.listDocuments(
    databaseId,
    "business_memberships",
    [
      Query.equal("businessId", businessId),
      Query.equal("userId", userId),
      Query.equal("status", "active"),
      Query.limit(1),
    ],
  );
  const membership = response.documents[0];
  const permissions = Array.isArray(membership?.permissions)
    ? membership.permissions
    : [];
  if (
    !membership ||
    (!permissions.includes("finance.manage") &&
      membership.role !== "owner" &&
      membership.role !== "administrator" &&
      membership.role !== "accounts")
  )
    throw new Error("Finance management access is required.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = String(body.businessId ?? "");
    const userId = String(body.userId ?? "");
    const documentType = String(body.documentType ?? "");
    const form = body.form ?? {};
    const items = Array.isArray(body.items) ? body.items : [];
    const totals = body.totals ?? {};
    if (
      !businessId ||
      !userId ||
      !allowedTypes.has(documentType) ||
      !String(form.documentNumber ?? "").trim() ||
      !String(form.billToName ?? "").trim() ||
      !items.length
    )
      return NextResponse.json(
        { error: "Required document details are incomplete." },
        { status: 400 },
      );
    const databases = database();
    await requireFinanceAccess(databases, businessId, userId);
    const now = new Date().toISOString();
    const header = {
      businessId,
      documentType,
      documentNumber: String(form.documentNumber).trim(),
      status: "draft",
      issueDate: form.issueDate
        ? new Date(`${form.issueDate}T00:00:00`).toISOString()
        : now,
      dueDate: form.dueDate
        ? new Date(`${form.dueDate}T00:00:00`).toISOString()
        : null,
      currency: "INR",
      placeOfSupply: String(form.placeOfSupply ?? ""),
      projectId: String(form.projectId ?? ""),
      billFromName: String(form.billFromName ?? ""),
      billFromGstin: String(form.billFromGstin ?? ""),
      billFromPan: String(form.billFromPan ?? ""),
      billFromAddress: String(form.billFromAddress ?? ""),
      billFromState: String(form.billFromState ?? ""),
      billFromStateCode: String(form.billFromStateCode ?? ""),
      billToName: String(form.billToName ?? ""),
      billToGstin: String(form.billToGstin ?? ""),
      billToAddress: String(form.billToAddress ?? ""),
      billToState: String(form.billToState ?? ""),
      billToStateCode: String(form.billToStateCode ?? ""),
      shipToAddress: String(form.shipToAddress ?? ""),
      bankName: String(form.bankName ?? ""),
      accountName: String(form.accountName ?? ""),
      accountNumber: String(form.accountNumber ?? ""),
      ifsc: String(form.ifsc ?? ""),
      branch: String(form.branch ?? ""),
      upiId: String(form.upiId ?? ""),
      terms: String(form.terms ?? ""),
      notes: String(form.notes ?? ""),
      authorizedSignatory: String(form.authorizedSignatory ?? ""),
      signatureFileId: String(form.signatureFileId ?? ""),
      templateId: String(form.templateId ?? ""),
      subtotal: Number(totals.subtotal || 0),
      discountTotal: Number(totals.discountTotal || 0),
      taxableTotal: Number(totals.taxableTotal || 0),
      cgstTotal: Number(totals.cgstTotal || 0),
      sgstTotal: Number(totals.sgstTotal || 0),
      igstTotal: Number(totals.igstTotal || 0),
      grandTotal: Number(totals.grandTotal || 0),
      createdBy: userId,
      createdByName: String(body.userName ?? ""),
      createdAt: now,
      updatedAt: now,
    };
    const document = await databases.createDocument(
      databaseId,
      "commercial_documents",
      ID.unique(),
      header,
    );
    try {
      await Promise.all(
        items
          .filter((item: any) => String(item.description ?? "").trim())
          .map((item: any, index: number) => {
            const quantity = Number(item.quantity || 0);
            const rate = Number(item.rate || 0);
            const discountRate = Number(item.discount || 0);
            const gstRate = Number(item.gstRate || 0);
            const base = quantity * rate;
            const discountAmount = (base * discountRate) / 100;
            const taxableAmount = base - discountAmount;
            const taxAmount = (taxableAmount * gstRate) / 100;
            return databases.createDocument(
              databaseId,
              "business_items",
              ID.unique(),
              {
                businessId,
                parentType: documentType,
                parentId: document.$id,
                position: index + 1,
                description: String(item.description),
                hsnSac: String(item.hsnSac ?? ""),
                quantity,
                unit: String(item.unit ?? "Nos"),
                rate,
                discountRate,
                discountAmount,
                taxableAmount,
                gstRate,
                taxAmount,
                lineTotal: taxableAmount + taxAmount,
                createdAt: now,
                updatedAt: now,
              },
            );
          }),
      );
    } catch (error) {
      await databases
        .deleteDocument(databaseId, "commercial_documents", document.$id)
        .catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Commercial document could not be saved." },
      { status: 500 },
    );
  }
}
