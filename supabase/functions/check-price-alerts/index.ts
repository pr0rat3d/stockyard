// ================================================================
// StockYard — check-price-alerts/index.ts
//
// -> Called by usda-daily-sync after each refresh
// -> Checks all active alerts against the new Feeder and Live Cattle prices
// -> Emails every triggered alert to a single inbox via Gmail SMTP
//
// SETUP:
// 1. On the Gmail account that will send (e.g. st0yardapp@gmail.com):
//    turn on 2-Step Verification, then Google Account -> Security ->
//    App Passwords -> generate one for "Mail".
// 2. supabase secrets set GMAIL_USER=st0yardapp@gmail.com
// 3. supabase secrets set GMAIL_APP_PASSWORD=the_16_char_app_password
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Every triggered alert emails here, regardless of which user set it.
const ALERT_RECIPIENT = "st0yardapp@gmail.com";

serve(async (req) => {
  const { prices } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const gmailUser = Deno.env.get("GMAIL_USER") ?? "";
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";

  // `prices` carries both categories in one snapshot — check alerts against each.
  const checks = [
    { category: "Feeder", currentPrice: prices?.feederCattle?.price },
    { category: "Live Cattle", currentPrice: prices?.liveCattle?.price },
  ].filter((c) => typeof c.currentPrice === "number");

  const client = gmailUser && gmailPassword
    ? new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: { username: gmailUser, password: gmailPassword },
        },
      })
    : null;

  const triggered = [];

  for (const { category, currentPrice } of checks) {
    const { data: alerts } = await supabase.from("price_alerts")
      .select("*, profiles:user_id(id, full_name)")
      .eq("active", true)
      .or(`category.eq.${category},category.eq.All`);

    if (!alerts?.length) continue;

    for (const alert of alerts) {
      const shouldAlert =
        (alert.price_below && currentPrice <= alert.price_below) ||
        (alert.price_above && currentPrice >= alert.price_above);

      if (!shouldAlert) continue;

      const direction = alert.price_below && currentPrice <= alert.price_below ? "dropped below" : "risen above";
      const threshold = alert.price_below && currentPrice <= alert.price_below
        ? alert.price_below : alert.price_above;
      const ownerName = alert.profiles?.full_name ?? "Unknown user";

      if (client) {
        await client.send({
          from: gmailUser,
          to: ALERT_RECIPIENT,
          subject: `🔔 StockYard Price Alert: ${category} ${direction} $${threshold}/cwt`,
          html: `
            <div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#1a3328;padding:16px 20px;border-radius:12px 12px 0 0">
                <span style="color:#c8831a;font-weight:900;font-size:20px">StockYard</span>
                <span style="color:rgba(255,255,255,0.6);font-size:14px;margin-left:8px">Price Alert</span>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e2ddd5;border-radius:0 0 12px 12px">
                <h2 style="color:#1a3328;margin:0 0 12px">A price alert triggered</h2>
                <p style="color:#6b7067;font-size:15px;margin:0 0 8px">
                  Set by: <strong>${ownerName}</strong> (user_id: ${alert.user_id})
                </p>
                <p style="color:#6b7067;font-size:15px;margin:0 0 20px">
                  <strong>${category}</strong> prices have ${direction} the threshold of
                  <strong>$${threshold}/cwt</strong>.
                </p>
                <div style="background:#f2ede3;border-radius:10px;padding:16px;margin-bottom:20px">
                  <div style="font-size:13px;color:#6b7067;margin-bottom:4px">CURRENT PRICE</div>
                  <div style="font-size:32px;font-weight:900;color:#1a3328">$${currentPrice.toFixed(2)}<span style="font-size:16px;font-weight:500">/cwt</span></div>
                  <div style="font-size:12px;color:#6b7067;margin-top:4px">USDA AMS · ${prices.reportDate}</div>
                </div>
                <a href="https://stockyard-lovat.vercel.app" style="background:#1a3328;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block">
                  View Live Prices →
                </a>
              </div>
            </div>
          `,
        });
      }

      triggered.push({ alert_id: alert.id, category, user: ownerName, price: currentPrice });
    }
  }

  if (client) await client.close();

  return new Response(JSON.stringify({ triggered: triggered.length, details: triggered }), {
    headers: { "Content-Type": "application/json" },
  });
});
