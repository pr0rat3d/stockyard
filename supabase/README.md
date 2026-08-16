# StockYard — Supabase Edge Functions

Three functions, deployed independently:

- `functions/cattle-prices` — on-demand USDA AMS price proxy, called from the app.
- `functions/usda-daily-sync` — cron job that refreshes the price cache daily.
- `functions/check-price-alerts` — triggered by `usda-daily-sync` after each refresh; emails users whose alerts fire.

See `../DEPLOYMENT.md` for the full walkthrough. Quick reference:

## Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy cattle-prices
supabase functions deploy usda-daily-sync
supabase functions deploy check-price-alerts
```

## Secrets

```bash
supabase secrets set USDA_API_KEY=your_usda_key
supabase secrets set RESEND_API_KEY=your_resend_key   # optional, for price-alert emails — resend.com
```

## Schedule the daily sync

Supabase Dashboard → Edge Functions → `usda-daily-sync` → Schedule
Cron: `0 15 * * 1-5` (3pm UTC = 10am CT, Mon–Fri, after USDA publishes daily reports)

## Realtime

Supabase Dashboard → Database → Replication → enable for `messages`, `conversations`.

## Storage (listing photos)

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

## RPC used by listing detail views

```sql
create or replace function increment_views(listing_id uuid)
returns void language sql as $$
  update listings set views = views + 1 where id = listing_id;
$$;
```
