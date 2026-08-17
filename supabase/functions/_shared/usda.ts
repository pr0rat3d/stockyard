// ================================================================
// Shared USDA AMS fetch + normalize logic.
//
// Used by both `cattle-prices` (on-demand, called directly by the app) and
// `usda-daily-sync` (scheduled cache refresh) so their output can never
// drift into two different shapes — which it previously did.
//
// Supabase CLI ignores folders prefixed with "_" when deploying, so this
// isn't treated as its own function.
// ================================================================

export const USDA_BASE = "https://marsapi.ams.usda.gov/services/v1.2/reports";

// 3231 = National Daily Feeder & Stocker Summary (PM) — weight class prices
// 3500 = 5-Area Weekly Direct Slaughter — live cattle cash price
const FEEDER_STOCKER_REPORT_ID = "3231";
const LIVE_CATTLE_REPORT_ID = "3500";

export const FALLBACK_PRICES = {
  liveCattle: { price: 192.45, change: 1.25, pct: 0.65 },
  feederCattle: { price: 264.80, change: -0.55, pct: -0.21 },
  reportDate: "May 30, 2026",
  source: "USDA AMS (cached)",
  weightClasses: [
    { label: "300-400", steer: 312.50, heifer: 298.00 },
    { label: "400-500", steer: 291.75, heifer: 275.50 },
    { label: "500-600", steer: 275.00, heifer: 261.00 },
    { label: "600-700", steer: 264.80, heifer: 249.75 },
    { label: "700-800", steer: 250.25, heifer: 238.50 },
    { label: "800-900", steer: 236.00, heifer: 224.75 },
  ],
};

async function fetchReport(reportId: string, apiKey: string) {
  const res = await fetch(`${USDA_BASE}/${reportId}?allSections=true`, {
    headers: { "Authorization": `Basic ${btoa(apiKey + ":")}`, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`USDA API error: ${res.status}`);
  return res.json();
}

function normalizeFeederStocker(raw: any) {
  const results = raw?.results ?? raw?.data ?? [];
  const weightClasses: Record<string, any> = {};

  for (const row of results) {
    const cls = (row.class ?? "").toLowerCase();
    const wg = row.weight_range ?? row.weight_group ?? "";
    const avg = parseFloat(row.wtd_avg ?? row.price ?? "0");
    if (!avg) continue;
    if (!weightClasses[wg]) weightClasses[wg] = { label: wg };
    if (cls.includes("steer")) weightClasses[wg].steer = avg;
    if (cls.includes("heifer")) weightClasses[wg].heifer = avg;
  }

  const sorted = Object.values(weightClasses).sort(
    (a: any, b: any) => parseInt(a.label) - parseInt(b.label)
  );
  // 600-700lb steers are the benchmark weight class used as "feeder cattle" headline price.
  const benchmark: any = weightClasses["600-700"] ?? sorted[2];

  return {
    reportDate: results[0]?.report_date ?? new Date().toISOString().slice(0, 10),
    feederPrice: benchmark?.steer ?? FALLBACK_PRICES.feederCattle.price,
    weightClasses: sorted,
  };
}

function normalizeLiveCattle(raw: any) {
  const results = raw?.results ?? raw?.data ?? [];
  const steers = results.filter((r: any) => (r.class ?? "").toLowerCase().includes("steer"));
  const avg = steers.length
    ? steers.reduce((s: number, r: any) => s + parseFloat(r.wtd_avg ?? "0"), 0) / steers.length
    : FALLBACK_PRICES.liveCattle.price;
  return { liveSteerAvg: avg };
}

function pctChange(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : 0;
}

// Fetches both USDA reports and returns the shape the StockYard frontend expects.
// `previous` — last known snapshot (e.g. yesterday's cache row) — is optional;
// change/pct are 0 when there's nothing to diff against.
export async function fetchUsdaPrices(apiKey: string, previous?: any) {
  const [feederRaw, liveRaw] = await Promise.all([
    fetchReport(FEEDER_STOCKER_REPORT_ID, apiKey),
    fetchReport(LIVE_CATTLE_REPORT_ID, apiKey),
  ]);

  const feeder = normalizeFeederStocker(feederRaw);
  const live = normalizeLiveCattle(liveRaw);

  const prevFeeder = previous?.feederCattle?.price;
  const prevLive = previous?.liveCattle?.price;

  return {
    reportDate: feeder.reportDate,
    source: "USDA AMS",
    liveCattle: {
      price: live.liveSteerAvg,
      change: prevLive ? live.liveSteerAvg - prevLive : 0,
      pct: prevLive ? pctChange(live.liveSteerAvg, prevLive) : 0,
    },
    feederCattle: {
      price: feeder.feederPrice,
      change: prevFeeder ? feeder.feederPrice - prevFeeder : 0,
      pct: prevFeeder ? pctChange(feeder.feederPrice, prevFeeder) : 0,
    },
    weightClasses: feeder.weightClasses,
  };
}
