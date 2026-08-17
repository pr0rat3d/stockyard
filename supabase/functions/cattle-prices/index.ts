// ============================================================
// StockYard — Supabase Edge Function: USDA AMS Price Proxy
// File: supabase/functions/cattle-prices/index.ts
//
// Called directly by the app (useUsdaPrices hook) for a fresh, on-demand
// snapshot. Reads yesterday's cached price as a baseline (to compute
// change/pct) but does not write to the cache — that's usda-daily-sync's
// job on its cron schedule.
//
// SETUP INSTRUCTIONS:
// 1. Go to mymarketnews.ams.usda.gov -> Register -> copy your API key
// 2. In Supabase dashboard -> Edge Functions -> Secrets -> add:
//    USDA_API_KEY = your_key_here
// 3. Deploy: supabase functions deploy cattle-prices
// 4. Call from the app: supabase.functions.invoke("cattle-prices")
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchUsdaPrices, FALLBACK_PRICES } from "../_shared/usda.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("USDA_API_KEY") ?? "";
  // SUPABASE_URL / SUPABASE_ANON_KEY are auto-injected into every edge function.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  try {
    const { data: cached } = await supabase.from("usda_price_cache")
      .select("data").eq("report_type", "feeder_stocker")
      .order("report_date", { ascending: false }).limit(1).maybeSingle();

    const data = await fetchUsdaPrices(apiKey, cached?.data);

    return new Response(JSON.stringify({
      success: true,
      fetchedAt: new Date().toISOString(),
      data,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("USDA fetch error:", err);

    // Return realistic fallback data so the UI never breaks.
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      fetchedAt: new Date().toISOString(),
      data: FALLBACK_PRICES,
      isFallback: true,
    }), {
      status: 200, // 200 with fallback so the app keeps working
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
