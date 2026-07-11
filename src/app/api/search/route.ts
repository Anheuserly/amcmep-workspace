import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllBusinesses,
  fetchMarketplace,
  toBusiness,
  toMarketplaceItem,
} from "@/lib/services/appwriteServices";

function includesQuery(values: Array<string | undefined>, query: string) {
  const normalized = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const vertical = searchParams.get("vertical") || "all";

  if (!query) {
    return NextResponse.json({ success: true, query, vertical, results: [], total: 0 });
  }

  try {
    const [businessDocs, marketplaceDocs] = await Promise.all([
      vertical === "marketplace" ? Promise.resolve([]) : fetchAllBusinesses({ limit: 100 }),
      vertical === "businesses" ? Promise.resolve([]) : fetchMarketplace({ limit: 100 }),
    ]);

    const businesses = businessDocs
      .map(toBusiness)
      .filter((business) =>
        includesQuery(
          [business.name, business.description, business.city, business.state, business.categories.join(" ")],
          query,
        ),
      )
      .map((business) => ({
        id: business.$id,
        title: business.name,
        url: `/marketplace?business=${business.$id}`,
        snippet: [business.description, business.city, business.state].filter(Boolean).join(" · "),
        vertical: "businesses",
        score: 1,
      }));

    const marketplace = marketplaceDocs
      .map(toMarketplaceItem)
      .filter((item) =>
        includesQuery([item.title, item.description, item.category, item.sellerName, item.location], query),
      )
      .map((item) => ({
        id: item.$id,
        title: item.title,
        url: `/marketplace?item=${item.$id}`,
        snippet: [item.category, item.sellerName, item.location].filter(Boolean).join(" · "),
        vertical: "marketplace",
        score: 1,
      }));

    const results = [...businesses, ...marketplace].slice(0, 25);
    return NextResponse.json({ success: true, query, vertical, results, total: results.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Unable to search" }, { status: 500 });
  }
}
