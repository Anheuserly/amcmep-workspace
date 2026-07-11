import { NextRequest, NextResponse } from "next/server";
import { createRequest, fetchRequests, toServiceRequest } from "@/lib/services/appwriteServices";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const phone = searchParams.get("phone") ?? "";

  try {
    if (!userId && !customerId && !phone) {
      return NextResponse.json({ success: true, requests: [], total: 0 });
    }

    const rows = await fetchRequests({ userId, customerId, phone });
    const requests = rows.map(toServiceRequest);
    return NextResponse.json({ success: true, requests, total: requests.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = body.title?.toString().trim() ?? "";
    const serviceType = body.serviceType?.toString().trim() ?? "";
    const siteAddress = body.siteAddress?.toString().trim() ?? "";
    const now = new Date().toISOString();

    if (!title || !serviceType || !siteAddress) {
      return NextResponse.json({ success: false, error: "Missing required request details" }, { status: 400 });
    }

    const created = await createRequest({
      ...body,
      title,
      serviceType,
      siteAddress,
      status: body.status || "open",
      priority: body.priority || "medium",
      description: body.description?.toString().trim() || title,
      createdAt: body.createdAt || now,
      updatedAt: now,
      isActive: true,
    });

    return NextResponse.json({ success: true, request: toServiceRequest(created) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Invalid request" }, { status: 400 });
  }
}
