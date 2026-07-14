import { Client, Databases, IndexType } from "node-appwrite";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://fra.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "680b2b830035595d7746";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "680b2cfb002805548743";
const key = process.env.APPWRITE_API_KEY;
if (!key) {
  console.log(
    "APPWRITE_API_KEY is not available; skipping the remote finance schema check.",
  );
  process.exit(0);
}
const db = new Databases(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(key),
);

const schemas = {
  commercial_documents: [
    ["s", "businessId", 80, true],
    ["s", "documentType", 40, true],
    ["s", "documentNumber", 100, true],
    ["s", "status", 30, false, "draft"],
    ["d", "issueDate", false],
    ["d", "dueDate", false],
    ["s", "currency", 8, false, "INR"],
    ["s", "placeOfSupply", 120, false],
    ["s", "projectId", 80, false],
    ["s", "billFromName", 200, true],
    ["s", "billFromGstin", 20, false],
    ["s", "billFromPan", 20, false],
    ["s", "billFromAddress", 2000, false],
    ["s", "billFromState", 100, false],
    ["s", "billFromStateCode", 4, false],
    ["s", "billToName", 200, true],
    ["s", "billToGstin", 20, false],
    ["s", "billToAddress", 2000, false],
    ["s", "billToState", 100, false],
    ["s", "billToStateCode", 4, false],
    ["s", "shipToAddress", 2000, false],
    ["s", "bankName", 160, false],
    ["s", "accountName", 160, false],
    ["s", "accountNumber", 60, false],
    ["s", "ifsc", 20, false],
    ["s", "branch", 160, false],
    ["s", "upiId", 120, false],
    ["s", "terms", 10000, false],
    ["s", "notes", 5000, false],
    ["s", "authorizedSignatory", 160, false],
    ["s", "signatureFileId", 80, false],
    ["s", "templateId", 80, false],
    ...[
      "subtotal",
      "discountTotal",
      "taxableTotal",
      "cgstTotal",
      "sgstTotal",
      "igstTotal",
      "grandTotal",
    ].map((name) => ["f", name, false, 0]),
    ["s", "createdBy", 80, true],
    ["s", "createdByName", 160, false],
    ["d", "createdAt", false],
    ["d", "updatedAt", false],
  ],
  business_billing_profiles: [
    ["s", "businessId", 80, true],
    ["s", "legalName", 200, true],
    ["s", "gstin", 20, false],
    ["s", "pan", 20, false],
    ["s", "address", 2000, false],
    ["s", "city", 100, false],
    ["s", "state", 100, false],
    ["s", "stateCode", 4, false],
    ["s", "pincode", 10, false],
    ["s", "email", 160, false],
    ["s", "phone", 30, false],
    ["s", "bankName", 160, false],
    ["s", "accountName", 160, false],
    ["s", "accountNumber", 60, false],
    ["s", "ifsc", 20, false],
    ["s", "branch", 160, false],
    ["s", "upiId", 120, false],
    ["s", "defaultTerms", 10000, false],
    ["s", "logoFileId", 80, false],
    ["s", "signatureFileId", 80, false],
    ["s", "authorizedSignatory", 160, false],
    ["d", "createdAt", false],
    ["d", "updatedAt", false],
  ],
  billing_parties: [
    ["s", "businessId", 80, true],
    ["s", "partyType", 30, true],
    ["s", "legalName", 200, true],
    ["s", "gstin", 20, false],
    ["s", "pan", 20, false],
    ["s", "billingAddress", 2000, false],
    ["s", "shippingAddress", 2000, false],
    ["s", "city", 100, false],
    ["s", "state", 100, false],
    ["s", "stateCode", 4, false],
    ["s", "pincode", 10, false],
    ["s", "contactName", 160, false],
    ["s", "email", 160, false],
    ["s", "phone", 30, false],
    ["s", "createdBy", 80, true],
    ["d", "createdAt", false],
    ["d", "updatedAt", false],
  ],
  document_templates: [
    ["s", "businessId", 80, true],
    ["s", "name", 160, true],
    ["s", "documentType", 40, true],
    ["s", "prefix", 30, false],
    ["s", "numberPattern", 100, false],
    ["s", "defaultTerms", 10000, false],
    ["s", "defaultNotes", 5000, false],
    ["s", "footerText", 1000, false],
    ["s", "accentColor", 20, false],
    ["s", "logoFileId", 80, false],
    ["s", "signatureFileId", 80, false],
    ["b", "isDefault", false, false],
    ["s", "createdBy", 80, true],
    ["d", "createdAt", false],
    ["d", "updatedAt", false],
  ],
  business_items: [
    ["s", "businessId", 80, true],
    ["s", "parentType", 40, true],
    ["s", "parentId", 80, true],
    ["i", "position", true, 1],
    ["s", "description", 1000, true],
    ["s", "hsnSac", 30, false],
    ["f", "quantity", true, 1],
    ["s", "unit", 30, false, "Nos"],
    ["f", "rate", true, 0],
    ["f", "discountRate", false, 0],
    ["f", "discountAmount", false, 0],
    ["f", "taxableAmount", false, 0],
    ["f", "gstRate", false, 0],
    ["f", "taxAmount", false, 0],
    ["f", "lineTotal", false, 0],
    ["d", "createdAt", false],
    ["d", "updatedAt", false],
  ],
};

async function exists(id) {
  try {
    await db.getCollection(databaseId, id);
    return true;
  } catch (error) {
    if (error?.code === 404) return false;
    throw error;
  }
}
async function columns(id) {
  const result = await db.listAttributes(databaseId, id);
  return new Set(result.attributes.map((item) => item.key));
}
async function wait(id, key) {
  for (let i = 0; i < 60; i++) {
    const attribute = await db.getAttribute(databaseId, id, key);
    if (attribute.status === "available") return;
    if (attribute.status === "failed") throw new Error(`${id}.${key} failed`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
async function add(id, spec) {
  const [type, name, a, b, c] = spec;
  if (type === "s")
    await db.createStringAttribute(databaseId, id, name, a, b, c);
  if (type === "f")
    await db.createFloatAttribute(databaseId, id, name, a, b, c);
  if (type === "i")
    await db.createIntegerAttribute(databaseId, id, name, a, b, c);
  if (type === "b") await db.createBooleanAttribute(databaseId, id, name, a, b);
  if (type === "d") await db.createDatetimeAttribute(databaseId, id, name, a);
  await wait(id, name);
}

for (const [id, specs] of Object.entries(schemas)) {
  if (!(await exists(id)))
    await db.createCollection(
      databaseId,
      id,
      id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      [],
      true,
    );
  const current = await columns(id);
  for (const spec of specs) {
    if (!current.has(spec[1])) {
      process.stdout.write(`Adding ${id}.${spec[1]}\n`);
      await add(id, spec);
    }
  }
  const indexes = (await db.listIndexes(databaseId, id)).indexes;
  if (!indexes.some((index) => index.key === "business_lookup")) {
    await db.createIndex(databaseId, id, "business_lookup", IndexType.Key, [
      "businessId",
    ]);
  }
}
console.log("Finance schema is ready.");
