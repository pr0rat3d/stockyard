// ================================================================
// StockYard — usda-daily-sync/index.ts
//
// -> Run on a cron schedule to refresh the price cache daily
// -> Deploy: supabase functions deploy usda-daily-sync
// -> Schedule in Supabase Dashboard -> Edge Functions -> Schedule
//    Cron: "0 15 * * 1-5"  (3pm UTC = ~10am CT weekdays)
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchUsdaPrices } from "../_shared/usda.ts";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const apiKey = Deno.env.get("USDA_API_KEY") ?? "";

  try {
    // Yesterday's cached snapshot, used as the baseline for change/pct.
    const { data: previousRow } = await supabase.from("usda_price_cache")
      .select("data").eq("report_type", "feeder_stocker")
      .order("report_date", { ascending: false }).limit(1).maybeSingle();

    const normalized = await fetchUsdaPrices(apiKey, previousRow?.data);
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("usda_price_cache").upsert({
      report_type: "feeder_stocker",
      report_date: today,
      data: normalized,
      fetched_at: new Date().toISOString(),
    }, { onConflict: "report_type,report_date" });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    // Fire alert checks against the fresh prices.
    await supabase.functions.invoke("check-price-alerts", { body: { prices: normalized } });

    return new Response(JSON.stringify({ success: true, data: normalized }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
