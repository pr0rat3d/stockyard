# StockYard — Integration Guide
## Wiring Phase 1 + 2 + 3 Together

---

## Your file structure after integration

```
stockyard/                         ← create-react-app root
├── .env                           ← Supabase keys (never commit)
├── package.json
├── src/
│   └── App.js                     ← ← ← REPLACE with phase3/App.jsx
│
supabase/
├── functions/
│   ├── cattle-prices/
│   │   └── index.ts               ← from phase1/supabase-edge-function.ts
│   ├── usda-daily-sync/
│   │   └── index.ts               ← extract from phase3/edge-functions.ts FILE 1
│   └── check-price-alerts/
│       └── index.ts               ← extract from phase3/edge-functions.ts FILE 2
```

---

## Step 1 — Set up the React app (if not done yet)

```bash
npx create-react-app stockyard
cd stockyard
npm install @supabase/supabase-js recharts
```

Copy `phase3/App.jsx` → `src/App.js`

---

## Step 2 — Environment variables

Create a `.env` file in your project root (NOT in src/):

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

Find these in: Supabase Dashboard → Settings → API

---

## Step 3 — Run the Supabase schema

In Supabase Dashboard → SQL Editor, paste and run the full contents of `phase2/schema.sql`.

This creates all tables, RLS policies, indexes, and seeds 12 auction barns.

---

## Step 4 — Deploy the app to Vercel

Since you already have Vercel set up:

```bash
# Option A: Vercel CLI
npm run build
vercel --prod

# Option B: Push to GitHub → auto-deploys on Vercel
git add .
git commit -m "StockYard v1 - full app"
git push
```

Add environment variables in Vercel:
Dashboard → Your Project → Settings → Environment Variables
Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`

---

## Step 5 — Deploy Supabase Edge Functions

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# The function code already lives in supabase/functions/ in this repo —
# nothing to create or copy, just deploy.

# Add secrets
supabase secrets set USDA_API_KEY=your_usda_key_here
supabase secrets set GMAIL_USER=st0yardapp@gmail.com          # optional — skip to disable alert emails
supabase secrets set GMAIL_APP_PASSWORD=your_16_char_app_password

# Deploy all three
supabase functions deploy cattle-prices
supabase functions deploy usda-daily-sync
supabase functions deploy check-price-alerts
```

---

## Step 6 — Get your USDA API key (5 minutes, free)

1. Go to https://mymarketnews.ams.usda.gov
2. Click Register (top right)
3. Create account → verify email
4. Log in → click your name → My Profile
5. Copy your API Key
6. `supabase secrets set USDA_API_KEY=your_key`

---

## Step 7 — Set up Gmail SMTP for price-alert emails (2 minutes, free, optional)

`check-price-alerts` emails every triggered alert to `st0yardapp@gmail.com` via that
account's own SMTP server — no third-party email service needed.

1. On the `st0yardapp@gmail.com` account: turn on 2-Step Verification
2. Google Account → Security → App Passwords → generate one for "Mail"
3. `supabase secrets set GMAIL_USER=st0yardapp@gmail.com`
4. `supabase secrets set GMAIL_APP_PASSWORD=the_16_char_app_password`

Skip this step entirely if you don't want alert emails yet — the function still runs
and tracks triggered alerts, it just won't send anything without these two secrets.

---

## Step 8 — Don't schedule the daily USDA sync (yet)

USDA's national cattle-price summary reports (slugs 3231, 3233) turn out to be
PDF-only bulletins with no structured JSON data behind them via the MARS API —
confirmed on mymarketnews.ams.usda.gov, where those reports show "Market: Non Mars
Location" and no `[DATA]` tag, unlike reports tied to an actual market. So
`usda-daily-sync` will fail every time it runs — scheduling it just runs a
repeatedly-failing job for no benefit. See `supabase/README.md` for the full
writeup and what a real fix would look like (aggregating individual active
stockyard reports instead of the national summary). The app already falls back
to polished mock data when the cache is empty, so nothing user-facing breaks.

---

## Step 9 — Set up Supabase Storage

1. Supabase Dashboard → Storage → New Bucket
2. Name: `stockyard-images` | Public: ON | Max size: 10MB
3. Run in SQL Editor:

```sql
create policy "Public read listing images"
  on storage.objects for select using (bucket_id = 'stockyard-images');

create policy "Auth users can upload"
  on storage.objects for insert
  with check (bucket_id = 'stockyard-images' and auth.role() = 'authenticated');
```

---

## Step 10 — Enable Supabase Realtime (for messaging)

Supabase Dashboard → Database → Replication → Tables
Toggle ON: `messages`, `conversations`

---

## Step 11 — Wire in live USDA prices

In `App.jsx`, find the `useUsdaPrices` hook.
Uncomment the real fetch line and comment out the fallback:

```js
// BEFORE (mock):
// const res = await fetch(...)
setPrices({ liveCattle: {...}, feederCattle: {...} ... });

// AFTER (real):
const res = await fetch(
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/cattle-prices`
);
const json = await res.json();
if (json.data) setPrices(json.data);
```

---

## You're live. What's next?

| Feature | Effort | Value |
|---------|--------|-------|
| Google Maps integration (MapView) | Medium | High |
| Push notifications (Expo/PWA) | Medium | High |
| Stripe payments for proxy bids | High | Very High |
| Seller verification badges | Low | Medium |
| Social sharing for listings | Low | Medium |
| CSV export for market reports | Low | Medium |
| Barn claim email flow | Medium | High |

---

## Going mobile (iOS/Android)

When you're ready to ship as a native app:

```bash
# Expo is the fastest path — wraps your React app
npx create-expo-app stockyard-mobile
```

Or use **Capacitor** to wrap your existing React web app:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init StockYard com.stockyard.app
npx cap add ios
npx cap add android
```

Your Supabase backend works identically for web and mobile.
