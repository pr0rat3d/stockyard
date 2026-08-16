# StockYard — Deployment Guide
## Vercel + Supabase + USDA AMS API

---

## 1. Create Your React App (one time)

```bash
npx create-react-app stockyard
cd stockyard
npm install recharts
```

Replace `src/App.js` with the contents of `StockYard.jsx`.

---

## 2. Deploy to Vercel

Since you already have Vercel set up from ProRated:

```bash
# Option A — Vercel CLI (fastest)
npm install -g vercel
vercel        # follow prompts, ~60 seconds

# Option B — GitHub
# Push to GitHub → Import project in vercel.com dashboard
```

Your app will be live at `https://stockyard.vercel.app` (or custom domain).

---

## 3. Set Up the USDA AMS API Key (free)

1. Go to **https://mymarketnews.ams.usda.gov**
2. Click **Register** → create a free account
3. Log in → go to **My Profile** → copy your **API Key**

---

## 4. Deploy the Supabase Edge Function

This keeps your API key secret (never exposed in the browser).

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Link to your existing Supabase project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Create the function folder
mkdir -p supabase/functions/cattle-prices

# Copy the edge function file there
cp supabase-edge-function.ts supabase/functions/cattle-prices/index.ts

# Add your USDA API key as a secret (never hardcoded)
supabase secrets set USDA_API_KEY=your_key_here

# Deploy the function
supabase functions deploy cattle-prices
```

Your edge function will be live at:
`https://YOUR_PROJECT.supabase.co/functions/v1/cattle-prices`

---

## 5. Connect the App to Your Edge Function

In `StockYard.jsx`, find this line near the top:

```js
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co/functions/v1/cattle-prices";
```

Replace `YOUR_PROJECT` with your actual Supabase project ref.

Then in the `fetchPrices` function, uncomment the real fetch:

```js
// BEFORE (mock data):
// const res = await fetch(`${SUPABASE_URL}?report=NATIONAL_FEEDER_STOCKER`);
await new Promise(r => setTimeout(r, 800));
const json = getMockUsdaData();

// AFTER (real USDA data):
const res = await fetch(`${SUPABASE_URL}?report=NATIONAL_FEEDER_STOCKER`);
const json = await res.json();
```

---

## 6. Key USDA Report IDs to Know

| Report | ID | Description |
|--------|-----|-------------|
| National Feeder/Stocker Summary | 3231 | Most useful — feeder cattle by weight class |
| 5-Area Direct Slaughter | 3500 | Live cattle cash prices |
| Cow & Boneless Beef Summary | 2875 | Weekly cow/beef cutout prices |
| National Auction Summary | 3148 | Auction results by region |

Find more at: https://marsapi.ams.usda.gov/services/v1.2/reports

---

## 7. Supabase Tables to Add (for Phase 2)

When you're ready to add user listings, saved favorites, and messages:

```sql
-- Listings
create table listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  title text not null,
  head int,
  weight_avg int,
  price_per_cwt decimal,
  category text,  -- Feeder, Stocker, Breeding
  location text,
  state text,
  notes text,
  status text default 'active',  -- active, sold, expired
  created_at timestamptz default now()
);

-- Favorites
create table favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  listing_id uuid references listings,
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  from_user uuid references auth.users,
  to_user uuid references auth.users,
  listing_id uuid references listings,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Auction directory
create table auction_barns (
  id uuid default gen_random_uuid() primary key,
  name text,
  location text,
  state text,
  sale_day text,  -- "Every Tuesday"
  website text,
  phone text,
  verified boolean default false
);

-- Row Level Security (important!)
alter table listings enable row level security;
alter table favorites enable row level security;
alter table messages enable row level security;
```

---

## 8. Environment Variables for Vercel

In Vercel dashboard → Settings → Environment Variables, add:

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

---

## Phase Roadmap

| Phase | Features | Stack |
|-------|----------|-------|
| ✅ 1 — MVP | App + USDA prices + calculators | React + Vercel |
| 🔜 2 — Data | Live USDA API via Edge Function | + Supabase Edge Functions |
| 🔜 3 — Marketplace | User listings, favorites, messages | + Supabase DB + Auth |
| 🔜 4 — Auctions | Auction barn directory, upcoming sales | + Supabase DB |
| 🔜 5 — Bidding | Proxy bidding, licensed agent network | + Stripe + Realtime |
