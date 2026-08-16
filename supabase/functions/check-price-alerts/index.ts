// ================================================================
// StockYard — check-price-alerts/index.ts
//
// → Called after usda-daily-sync completes
// → Checks all active alerts against new prices
// → Sends email notifications via Resend (free tier = 100/day)
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { report_type, prices } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

  // Get all active alerts that match this report type
  const categoryMap: Record<string, string> = {
    feeder_stocker: "Feeder",
    live_cattle: "Live Cattle",
  };
  const category = categoryMap[report_type];

  const { data: alerts } = await supabase.from("price_alerts")
    .select("*, profiles:user_id(id, full_name)")
    .eq("active", true)
    .or(`category.eq.${category},category.eq.All`);

  if (!alerts?.length) return new Response("No alerts", { status: 200 });

  const currentPrice = report_type === "feeder_stocker"
    ? prices.feederCattle?.price ?? 264.80
    : prices.liveSteerAvg ?? 192.45;

  const triggered = [];

  for (const alert of alerts) {
    const shouldAlert =
      (alert.price_below && currentPrice <= alert.price_below) ||
      (alert.price_above && currentPrice >= alert.price_above);

    if (!shouldAlert) continue;

    // Get user email
    const { data: { user } } = await supabase.auth.admin.getUserById(alert.user_id);
    if (!user?.email) continue;

    const direction = alert.price_below && currentPrice <= alert.price_below ? "dropped below" : "risen above";
    const threshold = alert.price_below && currentPrice <= alert.price_below
      ? alert.price_below : alert.price_above;

    // Send email via Resend (free, 100/day)
    // Sign up at resend.com — takes 2 minutes, add RESEND_API_KEY to Supabase secrets
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "alerts@stockyard.app",
          to: user.email,
          subject: `🔔 StockYard Price Alert: ${category} ${direction} $${threshold}/cwt`,
          html: `
            <div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#1a3328;padding:16px 20px;border-radius:12px 12px 0 0">
                <span style="color:#c8831a;font-weight:900;font-size:20px">StockYard</span>
                <span style="color:rgba(255,255,255,0.6);font-size:14px;margin-left:8px">Price Alert</span>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e2ddd5;border-radius:0 0 12px 12px">
                <h2 style="color:#1a3328;margin:0 0 12px">Your price alert triggered</h2>
                <p style="color:#6b7067;font-size:15px;margin:0 0 20px">
                  <strong>${category}</strong> prices have ${direction} your threshold of
                  <strong>$${threshold}/cwt</strong>.
                </p>
                <div style="background:#f2ede3;border-radius:10px;padding:16px;margin-bottom:20px">
                  <div style="font-size:13px;color:#6b7067;margin-bottom:4px">CURRENT PRICE</div>
                  <div style="font-size:32px;font-weight:900;color:#1a3328">$${currentPrice.toFixed(2)}<span style="font-size:16px;font-weight:500">/cwt</span></div>
                  <div style="font-size:12px;color:#6b7067;margin-top:4px">USDA AMS · ${prices.reportDate}</div>
                </div>
                <a href="https://stockyard.app" style="background:#1a3328;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block">
                  View Live Prices →
                </a>
                <p style="color:#6b7067;font-size:12px;margin-top:20px">
                  Manage your alerts in the StockYard app under My Account → Price Alerts.
                </p>
              </div>
            </div>
          `,
        }),
      });
    }

    triggered.push({ alert_id: alert.id, user: user.email, price: currentPrice });
  }

  return new Response(JSON.stringify({ triggered: triggered.length, details: triggered }), {
    headers: { "Content-Type": "application/json" },
  });
});
