// ============================================================
// StockYard — Supabase Edge Function: USDA AMS Price Proxy
// File: supabase/functions/cattle-prices/index.ts
//
// SETUP INSTRUCTIONS:
// 1. Go to mymarketnews.ams.usda.gov → Register → copy your API key
// 2. In Supabase dashboard → Edge Functions → Secrets → add:
//    USDA_API_KEY = your_key_here
// 3. Deploy: supabase functions deploy cattle-prices
// 4. Call from your app: GET /functions/v1/cattle-prices
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const USDA_BASE = "https://marsapi.ams.usda.gov/services/v1.2/reports";

// Key USDA AMS report IDs for cattle
// Find more at: marsapi.ams.usda.gov/services/v1.2/reports
const REPORT_IDS = {
  // National Daily Feeder & Stocker Summary (PM) — most important for your users
  NATIONAL_FEEDER_STOCKER: "3231",
  // 5-Area Weekly Weighted Average Direct Slaughter Cattle
  FIVE_AREA_SLAUGHTER: "3500",
  // National Weekly Cow & Boneless Beef Summary
  COW_BEEF_SUMMARY: "2875",
  // AMS Daily Cattle Auction report — regional auction results
  DAILY_AUCTION: "3148",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("USDA_API_KEY") ?? "";
  const url = new URL(req.url);
  const reportType = url.searchParams.get("report") ?? "NATIONAL_FEEDER_STOCKER";
  const reportId = REPORT_IDS[reportType as keyof typeof REPORT_IDS] ?? REPORT_IDS.NATIONAL_FEEDER_STOCKER;

  try {
    // Fetch latest report data from USDA MARS API
    const usdaUrl = `${USDA_BASE}/${reportId}?allSections=true`;

    const response = await fetch(usdaUrl, {
      headers: {
        // USDA uses HTTP Basic auth with API key as username, empty password
        "Authorization": `Basic ${btoa(apiKey + ":")}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const rawData = await response.json();

    // Parse and normalize the USDA data into clean StockYard format
    const normalized = normalizeUsdaReport(rawData, reportType);

    return new Response(JSON.stringify({
      success: true,
      reportType,
      reportId,
      fetchedAt: new Date().toISOString(),
      data: normalized,
      raw: rawData, // include raw for debugging; remove in production
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("USDA fetch error:", err);

    // Return realistic fallback data so UI never breaks
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      fetchedAt: new Date().toISOString(),
      data: getFallbackData(reportType),
      isFallback: true,
    }), {
      status: 200, // return 200 with fallback so app keeps working
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Normalize USDA report into StockYard data shape ──────────────────────────
function normalizeUsdaReport(raw: any, reportType: string) {
  // USDA reports come back as arrays of records with varying field names
  // This parser handles the most common cattle report format
  const results = raw?.results ?? raw?.data ?? raw ?? [];

  if (reportType === "NATIONAL_FEEDER_STOCKER") {
    // Extract price ranges by weight class from feeder/stocker summary
    const pricesByClass: Record<string, any> = {};

    for (const row of results) {
      const cls = row.class ?? row.commodity ?? "";
      const weightGroup = row.weight_range ?? row.weight_group ?? "";
      const avgPrice = parseFloat(row.wtd_avg ?? row.price ?? "0");
      const headCount = parseInt(row.head_count ?? row.quantity ?? "0");

      if (cls && avgPrice > 0) {
        const key = `${cls} ${weightGroup}`.trim();
        pricesByClass[key] = {
          class: cls,
          weightRange: weightGroup,
          avgPrice,
          headCount,
          priceRange: {
            low: parseFloat(row.price_range_low ?? row.low ?? avgPrice.toString()),
            high: parseFloat(row.price_range_high ?? row.high ?? avgPrice.toString()),
          },
        };
      }
    }

    return {
      type: "feeder_stocker",
      pricesByClass,
      totalHead: results.reduce((sum: number, r: any) => sum + parseInt(r.head_count ?? "0"), 0),
      reportDate: results[0]?.report_date ?? new Date().toISOString().slice(0, 10),
    };
  }

  if (reportType === "FIVE_AREA_SLAUGHTER") {
    // 5-area direct slaughter — live cattle cash prices
    const steers = results.filter((r: any) =>
      (r.class ?? "").toLowerCase().includes("steer")
    );
    return {
      type: "slaughter",
      liveSteerAvg: steers.length
        ? steers.reduce((s: number, r: any) => s + parseFloat(r.wtd_avg ?? "0"), 0) / steers.length
        : null,
      records: steers.slice(0, 10),
      reportDate: results[0]?.report_date ?? new Date().toISOString().slice(0, 10),
    };
  }

  // Generic fallback normalization
  return { type: "generic", records: results.slice(0, 50) };
}

// ── Fallback data when API is unavailable ────────────────────────────────────
function getFallbackData(reportType: string) {
  const today = new Date().toISOString().slice(0, 10);

  if (reportType === "NATIONAL_FEEDER_STOCKER") {
    return {
      type: "feeder_stocker",
      isFallback: true,
      reportDate: today,
      totalHead: 42800,
      pricesByClass: {
        "Steers 300-400 lbs": { class: "Steers", weightRange: "300-400", avgPrice: 312.50, headCount: 3200, priceRange: { low: 298, high: 328 } },
        "Steers 400-500 lbs": { class: "Steers", weightRange: "400-500", avgPrice: 291.75, headCount: 5100, priceRange: { low: 278, high: 305 } },
        "Steers 500-600 lbs": { class: "Steers", weightRange: "500-600", avgPrice: 275.00, headCount: 6800, priceRange: { low: 265, high: 285 } },
        "Steers 600-700 lbs": { class: "Steers", weightRange: "600-700", avgPrice: 264.80, headCount: 7200, priceRange: { low: 255, high: 272 } },
        "Steers 700-800 lbs": { class: "Steers", weightRange: "700-800", avgPrice: 250.25, headCount: 5400, priceRange: { low: 242, high: 258 } },
        "Heifers 400-500 lbs": { class: "Heifers", weightRange: "400-500", avgPrice: 275.50, headCount: 3900, priceRange: { low: 265, high: 285 } },
        "Heifers 500-600 lbs": { class: "Heifers", weightRange: "500-600", avgPrice: 261.00, headCount: 4200, priceRange: { low: 252, high: 270 } },
        "Heifers 600-700 lbs": { class: "Heifers", weightRange: "600-700", avgPrice: 249.75, headCount: 3800, priceRange: { low: 241, high: 258 } },
      },
    };
  }

  return {
    type: "generic",
    isFallback: true,
    reportDate: today,
    liveSteerAvg: 192.45,
    feederSteerAvg: 264.80,
  };
}
