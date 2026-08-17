# StockYard — Supabase Setup

## 1. Database schema

Run `schema.sql` once in Dashboard → SQL Editor → New query → Run. It creates
every table the app queries (`profiles`, `listings`, `favorites`,
`conversations`, `messages`, `price_alerts`, `usda_price_cache`), a trigger
that auto-creates a `profiles` row on signup, and RLS policies for all of it.
Safe to re-run — every statement is idempotent.

## 2. Edge functions

Three functions, deployed independently:

- `functions/cattle-prices` — on-demand USDA AMS price proxy, called from the app.
- `functions/usda-daily-sync` — cron job that refreshes the price cache daily.
- `functions/check-price-alerts` — triggered by `usda-daily-sync` after each refresh; emails every triggered alert to `st0yardapp@gmail.com` via Gmail SMTP.

### Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy cattle-prices
supabase functions deploy usda-daily-sync
supabase functions deploy check-price-alerts
```

### Secrets

```bash
supabase secrets set USDA_API_KEY=your_usda_key
supabase secrets set GMAIL_USER=st0yardapp@gmail.com          # optional — skip to disable alert emails
supabase secrets set GMAIL_APP_PASSWORD=your_16_char_app_password
```

`GMAIL_APP_PASSWORD` is not your normal Gmail password. On the sending account: turn on
2-Step Verification, then Google Account → Security → App Passwords → generate one for "Mail".
Without these two secrets set, `check-price-alerts` still runs and tracks triggered alerts —
it just skips sending the email.

### ⚠️ Known limitation: USDA has no live national cattle-price API data

`cattle-prices` and `usda-daily-sync` deploy and run fine (auth against the USDA API
works), but the actual report they need — "National Daily Feeder & Stocker Summary"
(slug 3231) and its weekly equivalent (slug 3233) — is published by USDA as a **PDF
bulletin only**. It has no structured JSON data behind it via the MARS API
(confirmed on mymarketnews.ams.usda.gov: the report page shows "Market: Non Mars
Location" and no `[DATA]` tag, unlike reports tied to an actual market). Individual
stockyard/auction reports *do* have real API data, but each only covers one local
market, and most of the ones checked haven't published in years.

Net effect: `usda-daily-sync` will fail every time it runs (500, can't fetch data that
doesn't exist), so **don't schedule its cron** — it'd just be a repeatedly-failing job.
The app already falls back gracefully to polished mock data (`useUsdaPrices` in
`src/App.js`) when the cache table is empty, so this doesn't break anything user-facing.

Revisit only if a real project needs actual live prices — the realistic path then is
aggregating several currently-active individual stockyard reports (which do have
`[DATA]` API access) rather than the national summary.

## 3. Realtime

Supabase Dashboard → Database → Replication → enable for `messages`, `conversations`.

## 4. Storage (listing photos)

Dashboard → Storage → New bucket → name `stockyard-images`, public, 10MB max, MIME types `image/jpeg, image/png, image/webp, image/heic`.

```sql
create policy "Anyone can view listing images"
  on storage.objects for select using (bucket_id = 'stockyard-images');

create policy "Auth users can upload listing images"
  on storage.objects for insert
  with check (bucket_id = 'stockyard-images' and auth.role() = 'authenticated');

create policy "Users can delete own images"
  on storage.objects for delete
  using (bucket_id = 'stockyard-images' and auth.uid()::text = (storage.foldername(name))[2]);
```

Not created yet — the app doesn't upload listing photos today, so skip this until that feature exists.
