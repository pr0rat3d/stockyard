// ================================================================
// StockYard — src/App.jsx  (FULLY INTEGRATED — Phase 1 + 2 + 3)
//
// DROP THIS FILE into your create-react-app src/ folder as App.js
//
// npm install @supabase/supabase-js recharts
//
// .env file needs:
//   REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
//   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
// ================================================================

import { useState, useEffect, useCallback, useRef, createContext, useContext, Component } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Supabase client ───────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.REACT_APP_SUPABASE_ANON_KEY || "placeholder"
);

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  forest:"#1a3328", forestMid:"#254d3a", forestLight:"#2e6347",
  gold:"#c8831a", goldLight:"#e89c2a",
  mint:"#3da86e", mintLight:"#5ecb8a",
  cream:"#faf7f2", parchment:"#f2ede3",
  text:"#161412", muted:"#6b7067", border:"#e2ddd5", card:"#ffffff",
  red:"#dc2626", green:"#16a34a", amber:"#f59e0b",
};

// ── Auth Context ──────────────────────────────────────────────────
const AuthCtx = createContext(null);
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setAuthLoading(false);
    }).catch(() => setAuthLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      setProfile(data);
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <AuthCtx.Provider value={{ session, user: session?.user ?? null, profile, authLoading,
      isAuth: !!session, refresh: () => session && loadProfile(session.user.id) }}>
      {children}
    </AuthCtx.Provider>
  );
}
const useAuth = () => useContext(AuthCtx);

// ── Static / mock data ────────────────────────────────────────────
const priceHistory = [
  {m:"Jan",live:172,feeder:242},{m:"Feb",live:175,feeder:248},{m:"Mar",live:178,feeder:253},
  {m:"Apr",live:180,feeder:258},{m:"May",live:183,feeder:261},{m:"Jun",live:185,feeder:255},
  {m:"Jul",live:187,feeder:258},{m:"Aug",live:186,feeder:260},{m:"Sep",live:188,feeder:263},
  {m:"Oct",live:190,feeder:262},{m:"Nov",live:191,feeder:264},{m:"Dec",live:192.45,feeder:264.8},
];

const MOCK_LISTINGS = [
  {id:"m1",title:"300 Angus Steers",head:300,weight_avg:750,price_per_cwt:198,location_city:"Amarillo",location_state:"TX",category:"Feeder",sex:"Steers",created_at:new Date(Date.now()-7200000).toISOString(),profiles:{full_name:"Triple R Ranch",rating:4.8},bvd_vaccinated:true,weaned:true},
  {id:"m2",title:"150 Black Baldie Heifers",head:150,weight_avg:620,price_per_cwt:185,location_city:"Dodge City",location_state:"KS",category:"Feeder",sex:"Heifers",created_at:new Date(Date.now()-18000000).toISOString(),profiles:{full_name:"Sunflower Cattle Co.",rating:4.5},bvd_vaccinated:true,brd_vaccinated:true,weaned:true,preconditioned:true},
  {id:"m3",title:"80 Simmental Bulls",head:80,weight_avg:1800,price_per_cwt:null,price_per_head:3200,location_city:"Billings",location_state:"MT",category:"Breeding",sex:"Bulls",created_at:new Date(Date.now()-86400000).toISOString(),profiles:{full_name:"Big Sky Genetics",rating:4.9}},
  {id:"m4",title:"500 Mixed Stockers",head:500,weight_avg:550,price_per_cwt:175,location_city:"Woodward",location_state:"OK",category:"Stocker",sex:"Mixed",created_at:new Date(Date.now()-86400000).toISOString(),profiles:{full_name:"Cimarron Cattle",rating:4.2}},
  {id:"m5",title:"220 Charolais Cows",head:220,weight_avg:1350,price_per_cwt:null,price_per_head:1850,location_city:"San Angelo",location_state:"TX",category:"Breeding",sex:"Cows",created_at:new Date(Date.now()-172800000).toISOString(),profiles:{full_name:"Lone Star Ranch",rating:4.7},bvd_vaccinated:true},
  {id:"m6",title:"400 Angus/Hereford Cross Steers",head:400,weight_avg:680,price_per_cwt:192,location_city:"Liberal",location_state:"KS",category:"Feeder",sex:"Steers",created_at:new Date(Date.now()-259200000).toISOString(),profiles:{full_name:"High Plains Cattle",rating:4.6},weaned:true,preconditioned:true},
];

const MOCK_AUCTIONS = [
  {id:"a1",name:"Amarillo Livestock Auction",sale_date:"2026-06-04",sale_time:"9:00 AM",estimated_head:3200,barn:{city:"Amarillo",state:"TX",phone:"806-373-7464"},sale_type:"Weekly Sale",status:"upcoming"},
  {id:"a2",name:"Kansas City Stockyards Special",sale_date:"2026-06-06",sale_time:"8:00 AM",estimated_head:1800,barn:{city:"Kansas City",state:"MO",phone:"816-842-6800"},sale_type:"Special Sale",status:"upcoming"},
  {id:"a3",name:"Billings Livestock Commission",sale_date:"2026-06-08",sale_time:"10:00 AM",estimated_head:2500,barn:{city:"Billings",state:"MT",phone:"406-245-5161"},sale_type:"Regular Sale",status:"upcoming"},
  {id:"a4",name:"OKC West Livestock",sale_date:"2026-05-28",actual_head:4100,barn:{city:"El Reno",state:"OK"},sale_type:"Weekly Sale",status:"completed",avg_price_cwt:187},
  {id:"a5",name:"Joplin Regional Stockyards",sale_date:"2026-05-27",actual_head:2200,barn:{city:"Carthage",state:"MO"},sale_type:"Feeder Sale",status:"completed",avg_price_cwt:193},
];

const MOCK_BARNS = [
  {id:"b1",name:"Amarillo Livestock Auction",city:"Amarillo",state:"TX",phone:"806-373-7464",sale_schedule:"Every Tuesday at 9:00 AM CT",verified:true},
  {id:"b2",name:"OKC West Livestock",city:"El Reno",state:"OK",phone:"405-262-0104",sale_schedule:"Every Wednesday at 9:00 AM CT",verified:true},
  {id:"b3",name:"Joplin Regional Stockyards",city:"Carthage",state:"MO",phone:"417-548-2060",sale_schedule:"Every Monday at 9:00 AM CT",verified:true},
  {id:"b4",name:"Billings Livestock Commission",city:"Billings",state:"MT",phone:"406-245-5161",sale_schedule:"Every Saturday at 9:00 AM MT",verified:true},
  {id:"b5",name:"Kansas City Stockyards",city:"Kansas City",state:"MO",phone:"816-842-6800",sale_schedule:"Special sales — see calendar",verified:true},
  {id:"b6",name:"Superior Livestock Auction",city:"Fort Collins",state:"CO",phone:"800-422-2117",sale_schedule:"Video sales — see schedule",verified:true},
  {id:"b7",name:"Producers Livestock Auction",city:"San Angelo",state:"TX",phone:"325-653-3371",sale_schedule:"Every Thursday at 9:00 AM CT",verified:false},
  {id:"b8",name:"Sioux Falls Regional Livestock",city:"Sioux Falls",state:"SD",phone:"605-336-0411",sale_schedule:"Every Thursday at 10:00 AM CT",verified:false},
];

const US_STATES = ["All Regions","Alabama","Alaska","Arizona","Arkansas","California","Colorado",
  "Florida","Georgia","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Mexico","New York",
  "North Carolina","North Dakota","Ohio","Oklahoma","Oregon","South Dakota","Tennessee",
  "Texas","Utah","Virginia","Washington","Wisconsin","Wyoming"];

const BREEDS_GESTATION = {Angus:283,Hereford:285,Simmental:289,Charolais:291,Brahman:292,Holstein:279,Limousin:289};

// ── Responsive helpers ──────────────────────────────────────────────
function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

// ── Shared UI helpers ─────────────────────────────────────────────
function Page({ children, noPad, wide }) {
  const isDesktop = useIsDesktop();
  const maxWidth = isDesktop ? (wide ? 1120 : 640) : 520;
  return <div style={{padding: noPad ? 0 : (isDesktop ? "36px 40px 60px" : "20px 16px 100px"), maxWidth, margin:"0 auto"}}>{children}</div>;
}
function PageTitle({ title, sub, action }) {
  return (
    <div style={{marginBottom:22, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
      <div>
        <h2 style={{fontSize:26,fontWeight:900,color:C.text,margin:0,fontFamily:"'Georgia',serif",letterSpacing:-0.5}}>{title}</h2>
        {sub && <p style={{color:C.muted,marginTop:4,fontSize:14,margin:"4px 0 0"}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function SectionHead({ children }) {
  return <div style={{fontSize:11,fontWeight:900,color:C.mint,letterSpacing:2,textTransform:"uppercase",marginBottom:10,marginTop:4}}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{background:C.card,borderRadius:18,padding:"18px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",...style}}>{children}</div>;
}
function Badge({ label, color=C.mint }) {
  return <span style={{fontSize:11,fontWeight:800,background:color+"22",color,padding:"4px 11px",borderRadius:999,letterSpacing:0.5,whiteSpace:"nowrap"}}>{label}</span>;
}
function FieldInput({ label, value, onChange, type="number", placeholder, hint, required }) {
  return (
    <div style={{marginBottom:18}}>
      <label style={{fontSize:13,fontWeight:800,color:C.text,display:"block",marginBottom:5}}>
        {label}{required && <span style={{color:C.gold}}> *</span>}
      </label>
      {hint && <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{hint}</div>}
      <input type={type} inputMode={type==="number"?"decimal":"text"} value={value}
        onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",padding:"15px 14px",borderRadius:13,border:`2px solid ${C.border}`,
          fontSize:17,fontWeight:700,color:C.text,background:C.cream,boxSizing:"border-box",outline:"none",WebkitAppearance:"none"}}/>
    </div>
  );
}
function FieldSelect({ label, value, onChange, options, required }) {
  return (
    <div style={{marginBottom:18}}>
      <label style={{fontSize:13,fontWeight:800,color:C.text,display:"block",marginBottom:5}}>
        {label}{required && <span style={{color:C.gold}}> *</span>}
      </label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",padding:"15px 14px",borderRadius:13,border:`2px solid ${C.border}`,
          fontSize:17,fontWeight:700,color:C.text,background:C.cream,boxSizing:"border-box",WebkitAppearance:"none",appearance:"none"}}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
}
function ResultBanner({ rows }) {
  return (
    <div style={{background:C.forest,borderRadius:18,padding:"22px 20px",marginTop:8}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {rows.map(([label,value])=>(
          <div key={label}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{label}</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'Georgia',serif"}}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Avatar({ name, size=40 }) {
  const initials = name ? name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : "?";
  const colors = [C.forest,C.gold,C.mint,"#6366f1","#ec4899"];
  const color = colors[(name?.charCodeAt(0)??0) % colors.length];
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",
      alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*0.35,color:"#fff",flexShrink:0}}>
      {initials}
    </div>
  );
}
function PriceTile({ label, price, change, pct, up, loading }) {
  return (
    <div style={{background:C.forest,borderRadius:18,padding:"18px 16px",flex:1,minWidth:0,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:1.4,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      {loading
        ? <div style={{height:36,background:"rgba(255,255,255,0.1)",borderRadius:8,width:"70%"}}/>
        : <>
            <div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:-0.5,fontFamily:"'Georgia',serif"}}>{price}</div>
            <div style={{fontSize:13,fontWeight:700,color:up?C.mintLight:"#f87171",marginTop:4}}>
              {up?"▲":"▼"} {Math.abs(change).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:5}}>$/cwt · USDA AMS</div>
          </>
      }
    </div>
  );
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ── USDA price hook ───────────────────────────────────────────────
const SUPABASE_CONFIGURED = Boolean(
  process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY
);
const FALLBACK_PRICES = {
  liveCattle:{price:192.45,change:+1.25,pct:+0.65},
  feederCattle:{price:264.80,change:-0.55,pct:-0.21},
  reportDate:"May 30, 2026", source:"USDA AMS (cached)",
  weightClasses:[
    {label:"300-400",steer:312.50,heifer:298.00},
    {label:"400-500",steer:291.75,heifer:275.50},
    {label:"500-600",steer:275.00,heifer:261.00},
    {label:"600-700",steer:264.80,heifer:249.75},
    {label:"700-800",steer:250.25,heifer:238.50},
    {label:"800-900",steer:236.00,heifer:224.75},
  ],
};

function useUsdaPrices() {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No Supabase project configured (no .env) — nothing to fetch, skip straight to mock data.
    if (!SUPABASE_CONFIGURED) {
      setPrices(FALLBACK_PRICES);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // cattle-prices proxies the live USDA API, so give it more room than a
        // plain DB read before falling back — but still cap it so a slow or
        // undeployed function can't stall the UI.
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000));
        const { data, error } = await Promise.race([
          supabase.functions.invoke("cattle-prices"),
          timeout,
        ]);
        if (cancelled) return;
        if (error) throw error;
        setPrices(data?.data ?? FALLBACK_PRICES);
      } catch {
        // Edge function not deployed yet, unreachable, or timed out — fall back
        // to the cached table (works even without the function), then mock data.
        try {
          const { data } = await supabase.from("usda_price_cache")
            .select("data").eq("report_type","feeder_stocker")
            .order("report_date",{ascending:false}).limit(1).maybeSingle();
          if (!cancelled) setPrices(data?.data ?? FALLBACK_PRICES);
        } catch {
          if (!cancelled) setPrices(FALLBACK_PRICES);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { prices, loading };
}

// ── AUTH SCREENS ──────────────────────────────────────────────────
function AuthScreen({ onSkip }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");

  async function handleSubmit() {
    if (!email || !pw) { setErr("Please fill in all fields"); return; }
    setLoading(true); setErr("");
    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name } } });
    setLoading(false);
    if (error) setErr(error.message);
  }

  return (
    <div style={{minHeight:"100vh",background:C.parchment,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:36}}>
        <div style={{width:50,height:50,background:C.forest,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:34,height:34,background:C.gold,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div>
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:22,color:C.text,fontFamily:"'Georgia',serif"}}>StockYard</div>
          <div style={{fontSize:12,color:C.muted}}>Cattle market intelligence</div>
        </div>
      </div>
      <div style={{width:"100%",maxWidth:400,background:C.card,borderRadius:24,padding:"26px 22px",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{display:"flex",background:C.parchment,borderRadius:14,padding:4,marginBottom:24}}>
          {[["signin","Sign In"],["signup","Create Account"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"10px 0",border:"none",borderRadius:11,fontWeight:800,fontSize:14,cursor:"pointer",background:mode===m?C.forest:"transparent",color:mode===m?"#fff":C.muted,transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>
        {mode==="signup" && <FieldInput label="Full Name" value={name} onChange={setName} type="text" placeholder="Canaan Smith" />}
        <FieldInput label="Email" value={email} onChange={setEmail} type="email" placeholder="you@ranch.com" />
        <FieldInput label="Password" value={pw} onChange={setPw} type="password" placeholder="8+ characters" />
        {err && <div style={{background:"#fee2e2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14,fontWeight:600}}>{err}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"15px",background:loading?C.muted:C.forest,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:16,cursor:loading?"not-allowed":"pointer"}}>
          {loading ? "Please wait…" : mode==="signin" ? "Sign In" : "Create Account"}
        </button>
      </div>
      <button onClick={onSkip} style={{marginTop:20,background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer",textDecoration:"underline"}}>Browse as guest</button>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ onNav }) {
  const { profile } = useAuth();
  const { prices, loading } = useUsdaPrices();
  const isDesktop = useIsDesktop();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const gridCols = isDesktop ? "repeat(auto-fit,minmax(200px,1fr))" : "1fr 1fr";

  return (
    <Page wide>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:isDesktop?30:24,fontWeight:900,color:C.text,margin:0,fontFamily:"'Georgia',serif"}}>Good morning, {firstName}</h1>
          <p style={{color:C.muted,marginTop:3,fontSize:13,margin:"3px 0 0"}}>Live cattle market data & your activity</p>
        </div>
        {!isDesktop && <button onClick={()=>onNav("profile")} aria-label="My Account" style={{background:"none",border:`2px solid ${C.border}`,borderRadius:12,padding:"7px 12px",fontSize:14,cursor:"pointer",color:C.muted}}>👤</button>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:10,marginBottom:14}}>
        <PriceTile label="Live Cattle" price={prices?.liveCattle.price.toFixed(2)??"—"} change={prices?.liveCattle.change??0} pct={prices?.liveCattle.pct??0} up={(prices?.liveCattle.change??0)>=0} loading={loading}/>
        <PriceTile label="Feeder Cattle" price={prices?.feederCattle.price.toFixed(2)??"—"} change={prices?.feederCattle.change??0} pct={prices?.feederCattle.pct??0} up={(prices?.feederCattle.change??0)>=0} loading={loading}/>
      </div>
      {prices?.source && <div style={{fontSize:11,color:C.muted,textAlign:"right",marginBottom:18}}>Source: {prices.source} · {prices.reportDate}</div>}

      <div style={{display:"grid",gridTemplateColumns:isDesktop?"3fr 2fr":"1fr",gap:isDesktop?32:0,alignItems:"start"}}>
      <div>
      <SectionHead>Quick Tools</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:gridCols,gap:10,marginBottom:22}}>
        {[{icon:"💰",label:"Price My Cow",key:"price-my-cow"},{icon:"🧮",label:"Valuation",key:"valuation"},{icon:"🌾",label:"Hay Calc",key:"hay"},{icon:"🚛",label:"Trucking",key:"trucking"}].map(q=>(
          <button key={q.key} onClick={()=>onNav(q.key)} style={{background:C.card,border:`2px solid ${C.border}`,borderRadius:16,padding:"18px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:26}}>{q.icon}</span>
            <span style={{fontWeight:800,fontSize:14,color:C.text}}>{q.label}</span>
          </button>
        ))}
      </div>

      <SectionHead>My Activity</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:gridCols,gap:10,marginBottom:22}}>
        {[{icon:"🛒",count:0,label:"Active Listings"},{icon:"❤️",count:0,label:"Saved"},{icon:"💬",count:0,label:"Messages"},{icon:"🔔",count:0,label:"Alerts"}].map(s=>(
          <div key={s.label} style={{background:C.card,borderRadius:16,padding:"16px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:24}}>{s.icon}</div>
            <div style={{fontSize:26,fontWeight:900,color:C.text,fontFamily:"'Georgia',serif"}}>{s.count}</div>
            <div style={{fontSize:12,color:C.muted,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      <SectionHead>Recent Listings</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:isDesktop?"repeat(auto-fit,minmax(240px,1fr))":"1fr",gap:10}}>
        {MOCK_LISTINGS.slice(0,3).map(l=>(
          <Card key={l.id}>
            <div style={{fontWeight:800,fontSize:15,color:C.text}}>{l.title}</div>
            <div style={{fontSize:12,color:C.muted}}>{l.location_city}, {l.location_state} · {timeAgo(l.created_at)}</div>
            <div style={{fontSize:15,fontWeight:800,color:C.gold,marginTop:4}}>{l.price_per_cwt?`$${l.price_per_cwt}/cwt`:`$${l.price_per_head}/head`}</div>
          </Card>
        ))}
      </div>
      </div>

      <div>
      <SectionHead>12-Month Price Trend</SectionHead>
      <Card style={{padding:"18px 12px 10px",marginBottom:16}}>
        <div style={{display:"flex",gap:16,marginBottom:10}}>
          <span style={{fontSize:12,color:C.mint,fontWeight:800}}>● Live Cattle</span>
          <span style={{fontSize:12,color:C.gold,fontWeight:800}}>● Feeder Cattle</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={priceHistory} margin={{left:-20,right:4}}>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.mint} stopOpacity={0.25}/><stop offset="100%" stopColor={C.mint} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity={0.25}/><stop offset="100%" stopColor={C.gold} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="m" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false} domain={[150,290]}/>
            <Tooltip contentStyle={{borderRadius:12,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",fontSize:13}}/>
            <Area type="monotone" dataKey="live" stroke={C.mint} strokeWidth={2.5} fill="url(#lg)" name="Live Cattle" dot={false}/>
            <Area type="monotone" dataKey="feeder" stroke={C.gold} strokeWidth={2.5} fill="url(#fg)" name="Feeder Cattle" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      </div>
      </div>
    </Page>
  );
}

// ── LIVE PRICES ───────────────────────────────────────────────────
function LivePrices() {
  const { prices, loading } = useUsdaPrices();
  return (
    <Page>
      <PageTitle title="Live Prices" sub={`USDA AMS · ${prices?.reportDate??"Loading..."} · $/cwt`}/>
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <PriceTile label="Live Cattle" price={prices?.liveCattle.price.toFixed(2)??"—"} change={prices?.liveCattle.change??0} pct={prices?.liveCattle.pct??0} up={(prices?.liveCattle.change??0)>=0} loading={loading}/>
        <PriceTile label="Feeder Cattle" price={prices?.feederCattle.price.toFixed(2)??"—"} change={prices?.feederCattle.change??0} pct={prices?.feederCattle.pct??0} up={(prices?.feederCattle.change??0)>=0} loading={loading}/>
      </div>
      <SectionHead>Feeder Cattle by Weight Class</SectionHead>
      <Card style={{overflow:"hidden",padding:0,marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:C.forest,padding:"12px 16px"}}>
          {["Weight (lbs)","Steer $/cwt","Heifer $/cwt"].map(h=>(
            <div key={h} style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.7)",letterSpacing:0.5}}>{h}</div>
          ))}
        </div>
        {(prices?.weightClasses??[]).map((wc,i)=>(
          <div key={wc.label} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"14px 16px",background:i%2===0?C.card:C.cream,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:15,color:C.text}}>{wc.label}</div>
            <div style={{fontWeight:800,fontSize:15,color:C.gold}}>{wc.steer.toFixed(2)}</div>
            <div style={{fontWeight:800,fontSize:15,color:C.mint}}>{wc.heifer.toFixed(2)}</div>
          </div>
        ))}
      </Card>
      <SectionHead>Steer Price by Weight Class</SectionHead>
      <Card style={{padding:"16px 10px 8px"}}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={prices?.weightClasses??[]} margin={{left:-20,right:4}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false} domain={[200,340]}/>
            <Tooltip contentStyle={{borderRadius:10,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.1)",fontSize:13}}/>
            <Bar dataKey="steer" fill={C.gold} name="Steer $/cwt" radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Page>
  );
}

// ── LISTINGS ──────────────────────────────────────────────────────
function Listings({ onNav }) {
  const { isAuth } = useAuth();
  const isDesktop = useIsDesktop();
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [cat, setCat] = useState("All");
  const state = "All"; // no UI control to change this filter yet
  const [search, setSearch] = useState("");

  const cats = ["All","Feeder","Stocker","Breeding","Slaughter"];
  const filtered = listings.filter(l=>{
    const catOk = cat==="All" || l.category===cat;
    const stateOk = state==="All" || l.location_state===state;
    const searchOk = !search || l.title.toLowerCase().includes(search.toLowerCase());
    return catOk && stateOk && searchOk;
  });

  // Load from Supabase if available
  useEffect(()=>{
    supabase.from("listings").select("*,profiles:user_id(full_name,rating)").eq("status","active").order("created_at",{ascending:false}).limit(50)
      .then(({data})=>{ if(data?.length) setListings(data); });
  },[]);

  return (
    <Page wide>
      <PageTitle title="Buy & Sell" sub={`${filtered.length} listings`}
        action={isAuth && <button onClick={()=>onNav("post-listing")} style={{background:C.forest,color:"#fff",border:"none",borderRadius:12,padding:"10px 16px",fontWeight:800,fontSize:14,cursor:"pointer"}}>+ Post</button>}
      />
      {!isAuth && (
        <div style={{background:C.gold+"18",border:`1.5px solid ${C.gold}`,borderRadius:14,padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:C.text,fontWeight:600}}>Sign in to post listings & contact sellers</span>
          <button onClick={()=>onNav("auth")} style={{background:C.gold,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontWeight:800,fontSize:13,cursor:"pointer"}}>Sign In</button>
        </div>
      )}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search listings…"
        style={{width:"100%",padding:"13px 16px",borderRadius:13,border:`2px solid ${C.border}`,fontSize:15,background:C.cream,boxSizing:"border-box",marginBottom:14,outline:"none"}}/>
      <div style={{display:"flex",gap:8,marginBottom:18,overflowX:"auto",paddingBottom:4}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{padding:"9px 18px",borderRadius:999,border:"none",cursor:"pointer",fontWeight:800,fontSize:13,whiteSpace:"nowrap",background:cat===c?C.forest:C.card,color:cat===c?"#fff":C.muted,boxShadow:cat===c?"none":"0 1px 3px rgba(0,0,0,0.08)"}}>
            {c}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isDesktop?"repeat(auto-fill,minmax(320px,1fr))":"1fr",gap:14}}>
        {filtered.map(l=>(
          <Card key={l.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:17,color:C.text,fontFamily:"'Georgia',serif"}}>{l.title}</div>
                <div style={{fontSize:13,color:C.muted,marginTop:2}}>{l.profiles?.full_name}</div>
              </div>
              <Badge label={l.category} color={l.category==="Breeding"?C.mint:C.gold}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["PRICE",l.price_per_cwt?`$${l.price_per_cwt}/cwt`:`$${l.price_per_head}/hd`,C.gold],["AVG WT",l.weight_avg?`${l.weight_avg} lbs`:"—",C.text],["HEAD",l.head,C.text]].map(([lbl,val,col])=>(
                <div key={lbl} style={{background:C.parchment,borderRadius:11,padding:"10px 10px"}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:800}}>{lbl}</div>
                  <div style={{fontSize:16,fontWeight:900,color:col,marginTop:2}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {l.bvd_vaccinated && <Badge label="BVD Vacc" color={C.mint}/>}
              {l.brd_vaccinated && <Badge label="BRD Vacc" color={C.mint}/>}
              {l.weaned && <Badge label="Weaned" color={C.mint}/>}
              {l.preconditioned && <Badge label="Preconditioned" color={C.mint}/>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:C.muted}}>📍 {l.location_city}, {l.location_state} · {timeAgo(l.created_at)}</div>
              <button onClick={()=>isAuth?onNav("messages"):onNav("auth")} style={{background:C.forest,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Contact</button>
            </div>
          </Card>
        ))}
        {filtered.length===0 && <div style={{textAlign:"center",padding:40,color:C.muted}}>No listings match your filters</div>}
      </div>
    </Page>
  );
}

// ── POST LISTING ──────────────────────────────────────────────────
function PostListing({ onBack, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({title:"",head:"",weight_avg:"",price_per_cwt:"",category:"Feeder",sex:"Steers",breed:"",location_city:"",location_state:"TX",bvd_vaccinated:false,brd_vaccinated:false,weaned:false,preconditioned:false,delivery_available:false});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const Checkbox = ({label,checked,onChange}) => (
    <button type="button" role="checkbox" aria-checked={checked} onClick={()=>onChange(!checked)} style={{width:"100%",font:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:checked?C.forest+"12":C.parchment,borderRadius:12,border:`2px solid ${checked?C.forest:C.border}`,cursor:"pointer",marginBottom:10}}>
      <div style={{width:24,height:24,borderRadius:7,border:`2px solid ${checked?C.forest:C.border}`,background:checked?C.forest:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {checked && <span style={{color:"#fff",fontSize:14,fontWeight:900}}>✓</span>}
      </div>
      <span style={{fontWeight:700,fontSize:15,color:C.text}}>{label}</span>
    </button>
  );

  async function submit() {
    if (!form.title || !form.head) { setErr("Title and head count required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("listings").insert({
      ...form, head:parseInt(form.head)||0,
      weight_avg:form.weight_avg?parseInt(form.weight_avg):null,
      price_per_cwt:form.price_per_cwt?parseFloat(form.price_per_cwt):null,
      user_id:user.id, status:"active",
    }).select().single();
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    onSuccess?.();
  }

  return (
    <div style={{background:C.parchment,minHeight:"100vh"}}>
      <div style={{background:C.forest,padding:"13px 16px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
        <button onClick={onBack} aria-label="Back" style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:17}}>Post a Listing</div>
        <div style={{flex:1,display:"flex",justifyContent:"flex-end",gap:6}}>
          {[1,2,3].map(s=>(
            <div key={s} style={{width:28,height:28,borderRadius:"50%",background:step===s?C.gold:step>s?C.mint:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:"#fff"}}>{s}</div>
          ))}
        </div>
      </div>
      <div style={{padding:"20px 16px 120px",maxWidth:520,margin:"0 auto"}}>
        {step===1 && <>
          <SectionHead>What are you selling?</SectionHead>
          <Card>
            <FieldInput label="Listing Title" value={form.title} onChange={set("title")} type="text" placeholder="e.g. 300 Angus Steers" required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FieldSelect label="Category" value={form.category} onChange={set("category")} options={["Feeder","Stocker","Breeding","Slaughter"]}/>
              <FieldSelect label="Sex" value={form.sex} onChange={set("sex")} options={["Steers","Heifers","Bulls","Cows","Mixed"]}/>
            </div>
            <FieldInput label="Number of Head" value={form.head} onChange={set("head")} placeholder="e.g. 300" required/>
            <FieldSelect label="Breed" value={form.breed||""} onChange={set("breed")} options={[{value:"",label:"Select breed"},"Angus","Hereford","Simmental","Charolais","Brahman","Brangus","Mixed","Other"]}/>
          </Card>
        </>}
        {step===2 && <>
          <SectionHead>Weight & Price</SectionHead>
          <Card style={{marginBottom:14}}>
            <FieldInput label="Avg Weight (lbs/head)" value={form.weight_avg} onChange={set("weight_avg")} placeholder="e.g. 750"/>
            <FieldInput label="Price ($/cwt)" value={form.price_per_cwt} onChange={set("price_per_cwt")} placeholder="e.g. 198.50"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FieldInput label="City" value={form.location_city} onChange={set("location_city")} type="text" placeholder="Amarillo"/>
              <FieldSelect label="State" value={form.location_state} onChange={set("location_state")} options={["TX","KS","OK","NE","MT","SD","MO","CO","IA","MN","ND","WY","ID","OR","WA","CA","AZ","NM","FL","GA","AL","MS","TN","KY","IN","OH","VA","NC","WV","AR","LA"]}/>
            </div>
          </Card>
          <SectionHead>Health & Condition</SectionHead>
          <Card>
            <Checkbox label="BVD Vaccinated" checked={form.bvd_vaccinated} onChange={set("bvd_vaccinated")}/>
            <Checkbox label="BRD Vaccinated" checked={form.brd_vaccinated} onChange={set("brd_vaccinated")}/>
            <Checkbox label="Weaned" checked={form.weaned} onChange={set("weaned")}/>
            <Checkbox label="Preconditioned" checked={form.preconditioned} onChange={set("preconditioned")}/>
            <Checkbox label="Delivery Available" checked={form.delivery_available} onChange={set("delivery_available")}/>
          </Card>
        </>}
        {step===3 && <>
          <SectionHead>Review & Post</SectionHead>
          <Card style={{marginBottom:14}}>
            <div style={{fontWeight:900,fontSize:20,color:C.text,fontFamily:"'Georgia',serif",marginBottom:4}}>{form.title||"Untitled listing"}</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:16}}>{form.location_city}, {form.location_state}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
              {[["HEAD",form.head||"—"],["AVG WT",form.weight_avg?`${form.weight_avg} lbs`:"—"],["PRICE",form.price_per_cwt?`$${form.price_per_cwt}/cwt`:"—"]].map(([l,v])=>(
                <div key={l} style={{background:C.parchment,borderRadius:10,padding:"10px 10px"}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:800}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:900,color:C.text}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {form.bvd_vaccinated&&<Badge label="BVD Vacc" color={C.mint}/>}
              {form.brd_vaccinated&&<Badge label="BRD Vacc" color={C.mint}/>}
              {form.weaned&&<Badge label="Weaned" color={C.mint}/>}
              {form.preconditioned&&<Badge label="Preconditioned" color={C.mint}/>}
            </div>
          </Card>
          {err && <div style={{background:"#fee2e2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14,fontWeight:600}}>{err}</div>}
        </>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:C.parchment,padding:"14px 16px",boxSizing:"border-box",borderTop:`1px solid ${C.border}`,display:"flex",gap:12}}>
        {step>1 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"14px",background:C.card,color:C.text,border:`2px solid ${C.border}`,borderRadius:14,fontWeight:800,fontSize:15,cursor:"pointer"}}>← Back</button>}
        {step<3
          ? <button onClick={()=>setStep(s=>s+1)} style={{flex:2,padding:"14px",background:C.forest,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:15,cursor:"pointer"}}>Continue →</button>
          : <button onClick={submit} disabled={submitting} style={{flex:2,padding:"14px",background:submitting?C.muted:C.gold,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:15,cursor:submitting?"not-allowed":"pointer"}}>{submitting?"Publishing…":"🐄 Post Listing"}</button>
        }
      </div>
    </div>
  );
}

// ── AUCTIONS ──────────────────────────────────────────────────────
function Auctions() {
  const isDesktop = useIsDesktop();
  const gridCols = isDesktop ? "repeat(auto-fill,minmax(340px,1fr))" : "1fr";
  const [view, setView] = useState("upcoming");
  const barns = MOCK_BARNS; // not wired to Supabase yet — see supabase/README.md
  const [selectedBarn, setSelectedBarn] = useState(null);

  const upcoming = MOCK_AUCTIONS.filter(a=>a.status==="upcoming");
  const completed = MOCK_AUCTIONS.filter(a=>a.status==="completed");

  if (selectedBarn) {
    return (
      <div style={{background:C.parchment,minHeight:"100vh"}}>
        <div style={{background:C.forest,padding:"13px 16px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100}}>
          <button onClick={()=>setSelectedBarn(null)} aria-label="Back" style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{color:"#fff",fontWeight:900,fontSize:16}}>{selectedBarn.name}</div>
          {selectedBarn.verified && <span style={{fontSize:18}}>✓</span>}
        </div>
        <Page>
          <Card style={{marginBottom:20}}>
            <div style={{fontWeight:900,fontSize:20,color:C.text,fontFamily:"'Georgia',serif",marginBottom:4}}>{selectedBarn.name}</div>
            <div style={{fontSize:14,color:C.muted,marginBottom:14}}>📍 {selectedBarn.city}, {selectedBarn.state}</div>
            {selectedBarn.phone && (
              <a href={`tel:${selectedBarn.phone}`} style={{textDecoration:"none"}}>
                <div style={{background:C.forest,color:"#fff",borderRadius:12,padding:"12px 18px",fontWeight:800,fontSize:14,display:"inline-block"}}>📞 {selectedBarn.phone}</div>
              </a>
            )}
            {selectedBarn.sale_schedule && (
              <div style={{marginTop:14,fontSize:14,color:C.forestMid,fontWeight:700,background:C.forest+"0e",borderRadius:10,padding:"10px 14px"}}>🗓 {selectedBarn.sale_schedule}</div>
            )}
          </Card>
          <div style={{background:C.gold+"18",border:`1.5px solid ${C.gold}`,borderRadius:16,padding:"18px 16px"}}>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:6}}>Own this auction barn?</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Claim your free listing and post upcoming sales to StockYard's network of buyers and sellers.</div>
            <button style={{background:C.gold,color:"#fff",border:"none",borderRadius:12,padding:"12px 20px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Claim This Barn</button>
          </div>
        </Page>
      </div>
    );
  }

  return (
    <Page wide>
      <PageTitle title="Auctions" sub="Upcoming sales & barn directory"/>
      <div style={{display:"flex",background:C.card,borderRadius:14,padding:4,marginBottom:18,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        {[["upcoming","Upcoming"],["results","Results"],["directory","Directory"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"10px 0",border:"none",borderRadius:11,fontWeight:800,fontSize:13,cursor:"pointer",background:view===v?C.forest:"transparent",color:view===v?"#fff":C.muted,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>

      {view==="upcoming" && (
        <div style={{display:"grid",gridTemplateColumns:gridCols,gap:12}}>
          {upcoming.map(a=>(
            <Card key={a.id} style={{borderLeft:`5px solid ${C.mint}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:16,color:C.text,fontFamily:"'Georgia',serif"}}>{a.name}</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:3}}>📍 {a.barn.city}, {a.barn.state}</div>
                </div>
                <div style={{textAlign:"right",marginLeft:10}}>
                  <div style={{fontWeight:900,fontSize:15,color:C.forest}}>{new Date(a.sale_date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                  <div style={{fontSize:12,color:C.muted}}>{a.sale_time}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {a.estimated_head && <div style={{background:C.parchment,borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:10,color:C.muted,fontWeight:800}}>EST. HEAD</div><div style={{fontSize:15,fontWeight:900,color:C.text}}>{a.estimated_head.toLocaleString()}</div></div>}
                <div style={{background:C.parchment,borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:10,color:C.muted,fontWeight:800}}>TYPE</div><div style={{fontSize:13,fontWeight:800,color:C.text}}>{a.sale_type}</div></div>
                <div style={{flex:1}}/>
                <button onClick={()=>setSelectedBarn(a.barn)} style={{background:C.forest,color:"#fff",border:"none",borderRadius:11,padding:"10px 16px",fontWeight:800,fontSize:13,cursor:"pointer"}}>Details</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {view==="results" && (
        <div style={{display:"grid",gridTemplateColumns:gridCols,gap:10}}>
          {completed.map(a=>(
            <Card key={a.id} style={{borderLeft:`5px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:C.text}}>{a.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{a.sale_date} · {a.barn.city}, {a.barn.state}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:6}}>{a.actual_head?.toLocaleString()} head sold</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:20,color:C.gold}}>${a.avg_price_cwt}</div>
                  <div style={{fontSize:11,color:C.muted}}>avg/cwt</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {view==="directory" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,color:C.muted,marginBottom:4}}>{barns.length} auction barns</div>
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:10}}>
          {barns.map(barn=>(
            <button type="button" key={barn.id} onClick={()=>setSelectedBarn(barn)} style={{width:"100%",font:"inherit",textAlign:"left",background:C.card,borderRadius:18,padding:"16px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",cursor:"pointer",border:"none",borderLeft:`5px solid ${barn.verified?C.mint:C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:15,color:C.text,fontFamily:"'Georgia',serif"}}>{barn.name}</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:2}}>📍 {barn.city}, {barn.state}</div>
                </div>
                {barn.verified && <Badge label="✓ Verified" color={C.mint}/>}
              </div>
              {barn.sale_schedule && <div style={{marginTop:10,fontSize:13,color:C.forestMid,fontWeight:600,background:C.forest+"0e",borderRadius:8,padding:"7px 12px"}}>🗓 {barn.sale_schedule}</div>}
            </button>
          ))}
          </div>
          <div style={{background:C.gold+"18",border:`1.5px solid ${C.gold}22`,borderRadius:18,padding:"20px 18px",marginTop:8}}>
            <div style={{fontWeight:900,fontSize:15,color:C.text,marginBottom:6}}>Don't see your barn?</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>List your barn for free and reach thousands of buyers in your region.</div>
            <button style={{background:C.gold,color:"#fff",border:"none",borderRadius:12,padding:"12px 20px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Add Your Barn</button>
          </div>
        </div>
      )}
    </Page>
  );
}

// ── PRICE MY COW ──────────────────────────────────────────────────
function PriceMyCow() {
  const { prices } = useUsdaPrices();
  const [breed, setBreed] = useState("Angus"); const [weight, setWeight] = useState(""); const [grade, setGrade] = useState("Choice"); const [sex, setSex] = useState("Steer");
  const gradeAdj = {Prime:12,Choice:0,Select:-8,Standard:-18};
  const sexAdj   = {Steer:0,Heifer:-5,Bull:-15,Cow:-30};
  const base = prices?.liveCattle.price ?? 192.45;
  const adjRate = base + gradeAdj[grade] + sexAdj[sex];
  const total = weight ? adjRate * weight / 100 : null;
  return (
    <Page>
      <PageTitle title="Price My Cow" sub="Estimated value using live USDA prices"/>
      <Card style={{marginBottom:16}}>
        <FieldSelect label="Sex" value={sex} onChange={setSex} options={["Steer","Heifer","Bull","Cow"]}/>
        <FieldSelect label="Grade" value={grade} onChange={setGrade} options={["Prime","Choice","Select","Standard"]}/>
        <FieldSelect label="Breed" value={breed} onChange={setBreed} options={["Angus","Hereford","Simmental","Charolais","Brahman","Mixed"]}/>
        <FieldInput label="Live Weight (lbs)" value={weight} onChange={setWeight} placeholder="e.g. 1200"/>
        <div style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:-8}}>Rate: ${adjRate.toFixed(2)}/cwt (base ${base.toFixed(2)} ± adjustments)</div>
      </Card>
      {total && <ResultBanner rows={[["Estimated Value",`$${Number(total.toFixed(0)).toLocaleString()}`],["Rate Used",`$${adjRate.toFixed(2)}/cwt`],["Live Wt",`${weight} lbs`],["Adj Factor",`${gradeAdj[grade]+sexAdj[sex]>=0?"+":""}${gradeAdj[grade]+sexAdj[sex]}`]]}/>}
    </Page>
  );
}

// ── VALUATION TOOLS ───────────────────────────────────────────────
function ValuationTools() {
  const { prices } = useUsdaPrices();
  const [head,setHead]=useState(""); const [weight,setWeight]=useState(""); const [rate,setRate]=useState("");
  const total = head&&weight&&rate ? head*weight/100*rate : null;
  return (
    <Page>
      <PageTitle title="Valuation Tools" sub="Calculate herd value at current market prices"/>
      <Card style={{marginBottom:16}}>
        <FieldInput label="Number of Head" value={head} onChange={setHead} placeholder="e.g. 250"/>
        <FieldInput label="Avg Weight per Head (lbs)" value={weight} onChange={setWeight} placeholder="e.g. 750"/>
        <FieldInput label="Price ($/cwt)" value={rate} onChange={setRate} placeholder="e.g. 264.80"/>
        <div style={{display:"flex",gap:8,marginTop:-8}}>
          <button onClick={()=>setRate((prices?.liveCattle.price??192.45).toFixed(2))} style={{flex:1,padding:"11px 8px",background:C.mint+"22",color:C.forestMid,border:`1.5px solid ${C.mint}`,borderRadius:11,fontWeight:800,fontSize:12,cursor:"pointer"}}>↑ Live ${(prices?.liveCattle.price??192.45).toFixed(2)}</button>
          <button onClick={()=>setRate((prices?.feederCattle.price??264.80).toFixed(2))} style={{flex:1,padding:"11px 8px",background:C.gold+"22",color:C.gold,border:`1.5px solid ${C.gold}`,borderRadius:11,fontWeight:800,fontSize:12,cursor:"pointer"}}>↑ Feeder ${(prices?.feederCattle.price??264.80).toFixed(2)}</button>
        </div>
      </Card>
      {total && <ResultBanner rows={[["Total Value",`$${Number(total.toFixed(0)).toLocaleString()}`],["Per Head",`$${Number((total/head).toFixed(0)).toLocaleString()}`],["Total Lbs",`${Number(head*weight).toLocaleString()}`],["Rate",`$${Number(rate).toFixed(2)}/cwt`]]}/>}
    </Page>
  );
}

// ── GESTATION CALC ────────────────────────────────────────────────
function GestationCalc() {
  const [date,setDate]=useState(""); const [breed,setBreed]=useState("Angus");
  let due=null,daysLeft=null;
  if(date){const d=new Date(date);d.setDate(d.getDate()+BREEDS_GESTATION[breed]);due=d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});daysLeft=Math.round((d-new Date())/86400000);}
  return (
    <Page>
      <PageTitle title="Gestation Calc" sub="Estimate calving date by breed"/>
      <Card style={{marginBottom:16}}>
        <FieldSelect label="Breed" value={breed} onChange={setBreed} options={Object.keys(BREEDS_GESTATION).map(b=>({value:b,label:`${b} (${BREEDS_GESTATION[b]} days)`}))}/>
        <FieldInput label="Breeding Date" value={date} onChange={setDate} type="date" placeholder=""/>
      </Card>
      {due && (
        <div style={{background:C.forest,borderRadius:20,padding:24,color:"#fff",textAlign:"center"}}>
          <div style={{fontSize:12,opacity:0.6,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Estimated Calving Date</div>
          <div style={{fontSize:30,fontWeight:900,marginTop:8,fontFamily:"'Georgia',serif"}}>{due}</div>
          <div style={{fontSize:16,marginTop:10,color:C.mintLight,fontWeight:700}}>
            {daysLeft>0?`${daysLeft} days from today`:daysLeft===0?"Due today!":`${Math.abs(daysLeft)} days overdue`}
          </div>
          <div style={{fontSize:12,opacity:0.5,marginTop:8}}>Gestation: {BREEDS_GESTATION[breed]} days · {breed}</div>
        </div>
      )}
    </Page>
  );
}

// ── WEIGHT TRACKER ────────────────────────────────────────────────
function WeightTracker() {
  const [animals,setAnimals]=useState([
    {id:1,tag:"A-101",breed:"Angus",start:550,current:720,startDate:"2026-02-01"},
    {id:2,tag:"B-204",breed:"Hereford",start:480,current:630,startDate:"2026-02-15"},
  ]);
  const [tag,setTag]=useState(""); const [startW,setStartW]=useState(""); const [brd,setBrd]=useState("");
  const add=()=>{if(!tag||!startW)return;setAnimals([...animals,{id:Date.now(),tag,breed:brd||"Mixed",start:+startW,current:+startW,startDate:new Date().toISOString().slice(0,10)}]);setTag("");setStartW("");setBrd("");};
  return (
    <Page>
      <PageTitle title="Weight Tracker" sub="Track ADG & gain per animal"/>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:22}}>
        {animals.map(a=>{const gain=a.current-a.start;const days=Math.max(1,Math.round((new Date()-new Date(a.startDate))/86400000));return(
          <Card key={a.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div><div style={{fontWeight:900,fontSize:18,color:C.text,fontFamily:"'Georgia',serif"}}>Tag #{a.tag}</div><div style={{fontSize:13,color:C.muted}}>{a.breed}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:24,color:C.forest}}>{a.current} lbs</div><div style={{fontSize:13,color:C.mint,fontWeight:700}}>+{gain} lbs total</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[["ADG",`${(gain/days).toFixed(2)} lb/d`],["Start Wt",`${a.start} lbs`],["Days",days]].map(([l,v])=>(
                <div key={l} style={{background:C.parchment,borderRadius:10,padding:"10px 10px"}}><div style={{fontSize:10,color:C.muted,fontWeight:800}}>{l}</div><div style={{fontSize:15,fontWeight:900,color:C.text}}>{v}</div></div>
              ))}
            </div>
          </Card>
        );})}
      </div>
      <SectionHead>Add Animal</SectionHead>
      <Card>
        <FieldInput label="Ear Tag #" value={tag} onChange={setTag} type="text" placeholder="e.g. C-305"/>
        <FieldInput label="Breed (optional)" value={brd} onChange={setBrd} type="text" placeholder="e.g. Angus"/>
        <FieldInput label="Starting Weight (lbs)" value={startW} onChange={setStartW} placeholder="e.g. 520"/>
        <button onClick={add} style={{width:"100%",padding:"15px",background:C.forest,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:16,cursor:"pointer"}}>Add Animal</button>
      </Card>
    </Page>
  );
}

// ── HAY CALCULATOR ────────────────────────────────────────────────
function HayCalculator() {
  const [bales,setBales]=useState(""); const [wt,setWt]=useState(""); const [price,setPrice]=useState(""); const [cattle,setCattle]=useState(""); const [lbs,setLbs]=useState("25");
  const tons=bales&&wt?(bales*wt/2000):null;const cost=tons&&price?(tons*price):null;const days=tons&&cattle&&lbs?Math.floor(tons*2000/(cattle*lbs)):null;
  return (
    <Page>
      <PageTitle title="Hay Calculator" sub="Inventory, cost & days of feed"/>
      <SectionHead>Inventory</SectionHead>
      <Card style={{marginBottom:14}}><FieldInput label="Number of Bales" value={bales} onChange={setBales} placeholder="e.g. 180"/><FieldInput label="Bale Weight (lbs)" value={wt} onChange={setWt} placeholder="e.g. 1200"/><FieldInput label="Price per Ton ($)" value={price} onChange={setPrice} placeholder="e.g. 185"/></Card>
      <SectionHead>Feeding</SectionHead>
      <Card style={{marginBottom:14}}><FieldInput label="Number of Cattle" value={cattle} onChange={setCattle} placeholder="e.g. 120"/><FieldInput label="Hay per Head/Day (lbs)" value={lbs} onChange={setLbs} placeholder="e.g. 25"/></Card>
      {tons && <ResultBanner rows={[["Total Tons",`${tons.toFixed(1)} tons`],["Total Value",cost?`$${Number(cost.toFixed(0)).toLocaleString()}`:"—"],["Days of Feed",days?`${days} days`:"—"],["Cost/Head/Day",(cost&&cattle&&days)?`$${(cost/cattle/days).toFixed(2)}`:"—"]]}/>}
    </Page>
  );
}

// ── TRUCKING CALC ─────────────────────────────────────────────────
function TruckingCalc() {
  const [head,setHead]=useState(""); const [wt,setWt]=useState(""); const [miles,setMiles]=useState(""); const [rate,setRate]=useState("3.50");
  const loads=head&&wt?Math.ceil((head*wt)/48000):null;const cost=loads&&miles?(loads*miles*rate):null;const perHead=cost&&head?(cost/head):null;
  return (
    <Page>
      <PageTitle title="Trucking Estimator" sub="Estimate shipping cost per load & head"/>
      <Card style={{marginBottom:16}}>
        <FieldInput label="Number of Head" value={head} onChange={setHead} placeholder="e.g. 200"/>
        <FieldInput label="Avg Weight per Head (lbs)" value={wt} onChange={setWt} placeholder="e.g. 700"/>
        <FieldInput label="One-Way Miles" value={miles} onChange={setMiles} placeholder="e.g. 350"/>
        <FieldInput label="Rate per Mile per Load ($)" value={rate} onChange={setRate} placeholder="e.g. 3.50" hint="Typical range: $3.00–$4.50/mile"/>
      </Card>
      {loads && <ResultBanner rows={[["Loads Required",`${loads} loads`],["Total Cost",cost?`$${Number(cost.toFixed(0)).toLocaleString()}`:"—"],["Cost Per Head",perHead?`$${perHead.toFixed(2)}`:"—"],["Capacity","48,000 lbs/load"]]}/>}
    </Page>
  );
}

// ── MARKET REPORTS ────────────────────────────────────────────────
function MarketReports() {
  const reports=[
    {id:1,title:"National Weekly Feeder & Stocker Cattle Summary",date:"May 30, 2026",agency:"USDA AMS",type:"Weekly"},
    {id:2,title:"5-Area Daily Weighted Avg Slaughter Cattle",date:"May 30, 2026",agency:"USDA AMS",type:"Daily"},
    {id:3,title:"National Auction Summary",date:"May 29, 2026",agency:"USDA AMS",type:"Daily"},
    {id:4,title:"Monthly Cattle on Feed Report",date:"May 23, 2026",agency:"USDA NASS",type:"Monthly"},
    {id:5,title:"Cattle Inventory Report",date:"May 1, 2026",agency:"USDA NASS",type:"Monthly"},
  ];
  return (
    <Page>
      <PageTitle title="Market Reports" sub="Official USDA AMS cattle reports"/>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {reports.map(r=>(
          <Card key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:4}}>{r.title}</div><div style={{fontSize:12,color:C.muted}}>{r.agency} · {r.date}</div></div>
            <div style={{marginLeft:12,flexShrink:0}}><Badge label={r.type} color={r.type==="Daily"?C.mint:r.type==="Weekly"?C.gold:C.muted}/></div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

// ── PRICE ALERTS ──────────────────────────────────────────────────
function PriceAlerts() {
  const { user, isAuth } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({category:"Feeder",price_below:"",price_above:"",state:"",});
  const set = k => v => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if (!isAuth) return;
    supabase.from("price_alerts").select("*").eq("user_id",user.id).then(({data})=>{ if(data) setAlerts(data); });
  },[isAuth, user?.id]);

  async function addAlert() {
    if (!form.price_below && !form.price_above) return;
    const { data } = await supabase.from("price_alerts").insert({...form, user_id:user.id, price_below:form.price_below?parseFloat(form.price_below):null, price_above:form.price_above?parseFloat(form.price_above):null}).select().single();
    if (data) { setAlerts(a=>[...a,data]); setShowNew(false); setForm({category:"Feeder",price_below:"",price_above:"",state:""}); }
  }

  async function removeAlert(id) {
    await supabase.from("price_alerts").delete().eq("id",id);
    setAlerts(a=>a.filter(x=>x.id!==id));
  }

  if (!isAuth) return (
    <Page>
      <PageTitle title="Price Alerts"/>
      <div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}>
        <div style={{fontSize:48,marginBottom:12}}>🔔</div>
        <div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>Sign in required</div>
        <div style={{fontSize:14}}>Create an account to set price alerts for cattle markets</div>
      </div>
    </Page>
  );

  return (
    <Page>
      <PageTitle title="Price Alerts" sub="Get notified when prices hit your targets"
        action={<button onClick={()=>setShowNew(s=>!s)} style={{background:C.forest,color:"#fff",border:"none",borderRadius:12,padding:"10px 16px",fontWeight:800,fontSize:14,cursor:"pointer"}}>+ New</button>}
      />
      {showNew && (
        <Card style={{marginBottom:20,border:`2px solid ${C.gold}`}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>New Price Alert</div>
          <FieldSelect label="Category" value={form.category} onChange={set("category")} options={["Feeder","Stocker","Live Cattle","All"]}/>
          <FieldSelect label="State (optional)" value={form.state||""} onChange={set("state")} options={[{value:"",label:"National (all states)"},"TX","KS","OK","NE","MT","SD","MO","CO"]}/>
          <FieldInput label="Alert when below ($/cwt)" value={form.price_below} onChange={set("price_below")} placeholder="e.g. 180.00" hint="Leave blank to skip"/>
          <FieldInput label="Alert when above ($/cwt)" value={form.price_above} onChange={set("price_above")} placeholder="e.g. 280.00" hint="Leave blank to skip"/>
          <button onClick={addAlert} style={{width:"100%",padding:"14px",background:C.forest,color:"#fff",border:"none",borderRadius:13,fontWeight:900,fontSize:15,cursor:"pointer"}}>Set Alert</button>
        </Card>
      )}
      {alerts.length === 0 ? (
        <div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}>
          <div style={{fontSize:48,marginBottom:12}}>🔔</div>
          <div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>No alerts yet</div>
          <div style={{fontSize:14}}>Tap + New to create your first price alert</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {alerts.map(a=>(
            <Card key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:C.text}}>{a.category} {a.state?`· ${a.state}`:"· National"}</div>
                {a.price_below && <div style={{fontSize:13,color:C.red,fontWeight:700,marginTop:3}}>⬇ Alert below ${a.price_below}/cwt</div>}
                {a.price_above && <div style={{fontSize:13,color:C.green,fontWeight:700,marginTop:3}}>⬆ Alert above ${a.price_above}/cwt</div>}
              </div>
              <button onClick={()=>removeAlert(a.id)} style={{background:"#fee2e2",border:"none",borderRadius:10,padding:"8px 12px",color:C.red,fontWeight:800,fontSize:13,cursor:"pointer"}}>Remove</button>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

// ── MESSAGES ─────────────────────────────────────────────────────
function Messages() {
  const { user, isAuth } = useAuth();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const loadConvs = useCallback(async () => {
    const {data}=await supabase.from("conversations").select("*,listing:listing_id(id,title),buyer:buyer_id(id,full_name),seller:seller_id(id,full_name)").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("last_message_at",{ascending:false});
    if(data) setConvs(data);
  }, [user?.id]);
  useEffect(()=>{ if(isAuth) loadConvs(); },[isAuth, loadConvs]);
  async function openConv(conv){
    setActive(conv);
    const {data}=await supabase.from("messages").select("*,sender:sender_id(id,full_name)").eq("conversation_id",conv.id).order("created_at",{ascending:true});
    if(data) setMsgs(data);
    setTimeout(()=>bottomRef.current?.scrollIntoView(),100);
  }
  async function send(){
    if(!text.trim()) return;
    const body=text.trim(); setText("");
    await supabase.from("messages").insert({conversation_id:active.id,sender_id:user.id,body});
    await supabase.from("conversations").update({last_message:body,last_message_at:new Date().toISOString()}).eq("id",active.id);
    const {data}=await supabase.from("messages").select("*,sender:sender_id(id,full_name)").eq("conversation_id",active.id).order("created_at",{ascending:true});
    if(data){setMsgs(data);setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),50);}
  }

  if (!isAuth) return (
    <Page><PageTitle title="Messages"/>
      <div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}>
        <div style={{fontSize:48,marginBottom:12}}>💬</div>
        <div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>Sign in required</div>
        <div style={{fontSize:14}}>Create an account to message buyers and sellers</div>
      </div>
    </Page>
  );

  if (active) {
    const other = active.buyer_id===user.id ? active.seller : active.buyer;
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.parchment}}>
        <div style={{background:C.forest,padding:"13px 16px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <button onClick={()=>setActive(null)} aria-label="Back" style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <Avatar name={other?.full_name} size={34}/>
          <div>
            <div style={{fontWeight:900,fontSize:15,color:"#fff"}}>{other?.full_name??"User"}</div>
            {active.listing&&<div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Re: {active.listing.title}</div>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map(m=>{
            const isMe=m.sender_id===user.id;
            return(
              <div key={m.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
                {!isMe&&<Avatar name={other?.full_name} size={26}/>}
                <div style={{maxWidth:"75%"}}>
                  <div style={{background:isMe?C.forest:C.card,color:isMe?"#fff":C.text,padding:"12px 15px",borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",fontSize:15,lineHeight:1.4,fontWeight:500,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>{m.body}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:3,textAlign:isMe?"right":"left"}}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"12px 16px 28px",background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-end",flexShrink:0}}>
          <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type a message…" rows={1} style={{flex:1,padding:"12px 14px",borderRadius:20,border:`2px solid ${C.border}`,fontSize:15,color:C.text,background:C.cream,resize:"none",fontFamily:"inherit",outline:"none",lineHeight:1.4}}/>
          <button onClick={send} disabled={!text.trim()} style={{width:46,height:46,borderRadius:"50%",background:text.trim()?C.forest:C.border,border:"none",color:"#fff",fontSize:20,cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:C.parchment,minHeight:"100vh"}}>
      <div style={{padding:"20px 16px 12px"}}>
        <h2 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,fontFamily:"'Georgia',serif"}}>Messages</h2>
        <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>{convs.length} conversation{convs.length!==1?"s":""}</p>
      </div>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",minHeight:"80vh"}}>
        {convs.length===0
          ? <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}><div style={{fontSize:48,marginBottom:12}}>💬</div><div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>No messages yet</div><div style={{fontSize:14}}>Contact a seller on any listing to start a conversation</div></div>
          : convs.map(conv=>{
              const other=conv.buyer_id===user.id?conv.seller:conv.buyer;
              return(
                <button type="button" key={conv.id} onClick={()=>openConv(conv)} style={{width:"100%",font:"inherit",textAlign:"left",background:"none",border:"none",padding:"16px",display:"flex",gap:14,alignItems:"flex-start",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                  <Avatar name={other?.full_name}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:800,fontSize:15,color:C.text}}>{other?.full_name??"Unknown"}</div>
                      {conv.last_message_at && <div style={{fontSize:11,color:C.muted}}>{new Date(conv.last_message_at).toLocaleDateString()}</div>}
                    </div>
                    {conv.listing&&<div style={{fontSize:11,color:C.gold,fontWeight:700,marginTop:2}}>Re: {conv.listing.title}</div>}
                    <div style={{fontSize:13,color:C.muted,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{conv.last_message??"No messages yet"}</div>
                  </div>
                </button>
              );
            })
        }
      </div>
    </div>
  );
}

// ── FAVORITES ─────────────────────────────────────────────────────
function Favorites() {
  const { user, isAuth } = useAuth();
  const [favs, setFavs] = useState([]);
  useEffect(()=>{
    if(!isAuth) return;
    supabase.from("favorites").select("*,listings(id,title,head,weight_avg,price_per_cwt,price_per_head,category,location_city,location_state,created_at,profiles:user_id(full_name))").eq("user_id",user.id).order("created_at",{ascending:false}).then(({data})=>{ if(data) setFavs(data); });
  },[isAuth, user?.id]);
  if(!isAuth) return <Page><PageTitle title="Favorites"/><div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}><div style={{fontSize:48,marginBottom:12}}>❤️</div><div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>Sign in required</div></div></Page>;
  return (
    <Page>
      <PageTitle title="Favorites" sub={`${favs.length} saved listings`}/>
      {favs.length===0
        ? <div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}><div style={{fontSize:48,marginBottom:12}}>❤️</div><div style={{fontWeight:800,fontSize:17,color:C.text,marginBottom:6}}>No favorites yet</div><div style={{fontSize:14}}>Tap ❤️ on any listing to save it here</div></div>
        : <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {favs.map(f=>f.listings&&(
              <Card key={f.id}>
                <div style={{fontWeight:800,fontSize:16,color:C.text}}>{f.listings.title}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{f.listings.profiles?.full_name} · {f.listings.location_city}, {f.listings.location_state}</div>
                <div style={{fontSize:15,fontWeight:800,color:C.gold,marginTop:6}}>{f.listings.price_per_cwt?`$${f.listings.price_per_cwt}/cwt`:`$${f.listings.price_per_head}/hd`}</div>
              </Card>
            ))}
          </div>
      }
    </Page>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────
function Profile({ onNav }) {
  const { user, profile, isAuth } = useAuth();
  async function handleSignOut() { await supabase.auth.signOut(); }
  if(!isAuth) return (
    <Page>
      <PageTitle title="Account"/>
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:48,marginBottom:16}}>👤</div>
        <div style={{fontWeight:800,fontSize:18,color:C.text,marginBottom:8}}>Not signed in</div>
        <button onClick={()=>onNav("auth")} style={{background:C.forest,color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:900,fontSize:16,cursor:"pointer"}}>Sign In</button>
      </div>
    </Page>
  );
  return (
    <Page>
      <PageTitle title="My Account"/>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <Avatar name={profile?.full_name??user.email} size={56}/>
          <div>
            <div style={{fontWeight:900,fontSize:18,color:C.text,fontFamily:"'Georgia',serif"}}>{profile?.full_name??"StockYard User"}</div>
            <div style={{fontSize:13,color:C.muted,marginTop:2}}>{user.email}</div>
            {profile?.state && <div style={{fontSize:13,color:C.muted}}>📍 {profile.state}</div>}
          </div>
        </div>
        {[{icon:"🛒",label:"My Listings",key:"listings"},{icon:"❤️",label:"Favorites",key:"favorites"},{icon:"💬",label:"Messages",key:"messages"},{icon:"🔔",label:"Price Alerts",key:"alerts"},{icon:"🔨",label:"My Bids",key:"auctions"}].map(item=>(
          <button type="button" key={item.key} onClick={()=>onNav(item.key)} style={{width:"100%",font:"inherit",textAlign:"left",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14,padding:"14px 0",cursor:"pointer"}}>
            <span style={{fontSize:20}}>{item.icon}</span>
            <span style={{fontWeight:700,fontSize:15,color:C.text,flex:1}}>{item.label}</span>
            <span style={{color:C.muted}}>›</span>
          </button>
        ))}
      </Card>
      <button onClick={handleSignOut} style={{width:"100%",padding:"15px",background:"#fee2e2",color:C.red,border:`2px solid ${C.red}22`,borderRadius:14,fontWeight:800,fontSize:15,cursor:"pointer"}}>Sign Out</button>
    </Page>
  );
}

// ── MAP VIEW ──────────────────────────────────────────────────────
function MapView() {
  return (
    <Page>
      <PageTitle title="Map View" sub="Livestock markets & auction locations"/>
      <Card style={{overflow:"hidden",padding:0,marginBottom:16}}>
        <div style={{background:"linear-gradient(145deg,#d4e8d8,#b8d4bc)",height:200,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,rgba(30,58,44,0.08) 1px,transparent 1px)",backgroundSize:"24px 24px"}}/>
          <div style={{color:C.forest,fontWeight:700,fontSize:14,opacity:0.5,zIndex:1}}>🗺️ Full map integration coming soon</div>
          {[{l:"35%",t:"60%"},{l:"55%",t:"55%"},{l:"65%",t:"35%"},{l:"78%",t:"38%"},{l:"58%",t:"58%"}].map((pos,i)=>(
            <div key={i} style={{position:"absolute",width:16,height:16,background:C.gold,borderRadius:"50%",border:"2.5px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,0.25)",left:pos.l,top:pos.t,zIndex:2}}/>
          ))}
        </div>
      </Card>
      {MOCK_BARNS.slice(0,6).map((m,i)=>(
        <Card key={i} style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:800,fontSize:15,color:C.text}}>{m.name}</div><div style={{fontSize:12,color:C.muted}}>{m.city}, {m.state}</div></div>
          {m.verified && <Badge label="✓" color={C.mint}/>}
        </Card>
      ))}
    </Page>
  );
}

// ── NAV CONFIG ────────────────────────────────────────────────────
const NAV_ITEMS = [
  {key:"dashboard",    label:"Dashboard",     icon:"⊞",  section:"MARKET"},
  {key:"live-prices",  label:"Live Prices",   icon:"📈",  section:"MARKET"},
  {key:"reports",      label:"Market Reports",icon:"📋",  section:"MARKET"},
  {key:"map",          label:"Map View",      icon:"🗺️",  section:"MARKET"},
  {key:"listings",     label:"Buy & Sell",    icon:"🛒",  section:"MARKETPLACE"},
  {key:"auctions",     label:"Auctions",      icon:"🔨",  section:"MARKETPLACE"},
  {key:"valuation",    label:"Valuation",     icon:"🧮",  section:"TOOLS"},
  {key:"price-my-cow", label:"Price My Cow",  icon:"💰",  section:"TOOLS"},
  {key:"gestation",    label:"Gestation Calc",icon:"🐄",  section:"TOOLS"},
  {key:"weight",       label:"Weight Tracker",icon:"⚖️",  section:"TOOLS"},
  {key:"hay",          label:"Hay Calculator",icon:"🌾",  section:"TOOLS"},
  {key:"trucking",     label:"Trucking Est.", icon:"🚛",  section:"TOOLS"},
  {key:"favorites",    label:"Favorites",     icon:"❤️",  section:"MY ACCOUNT"},
  {key:"messages",     label:"Messages",      icon:"💬",  section:"MY ACCOUNT"},
  {key:"alerts",       label:"Price Alerts",  icon:"🔔",  section:"MY ACCOUNT"},
  {key:"profile",      label:"My Account",    icon:"👤",  section:"MY ACCOUNT"},
];
const SECTIONS = ["MARKET","MARKETPLACE","TOOLS","MY ACCOUNT"];

// ── ROOT APP ──────────────────────────────────────────────────────
function AppShell() {
  const { isAuth, authLoading } = useAuth();
  const isDesktop = useIsDesktop();
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [region, setRegion] = useState("All Regions");
  const [regionOpen, setRegionOpen] = useState(false);
  const [expanded, setExpanded] = useState({MARKET:true,MARKETPLACE:false,TOOLS:false,"MY ACCOUNT":false});
  const [guestMode, setGuestMode] = useState(false);

  if (authLoading) {
    return <div style={{minHeight:"100vh",background:C.parchment,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><div style={{width:48,height:48,background:C.forest,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><div style={{width:32,height:32,background:C.gold,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div></div><div style={{color:C.muted,fontSize:14}}>Loading…</div></div>
    </div>;
  }

  if (!isAuth && !guestMode && page==="dashboard") {
    const authPages = ["post-listing","messages","favorites","alerts","profile"];
    if (!authPages.includes(page)) {
      // Show auth screen only on first load — allow guest browsing after skip
    }
  }

  const go = (key) => {
    const needsAuth = ["post-listing","messages","favorites","alerts","profile"].includes(key);
    if (needsAuth && !isAuth) { setPage("auth"); setMenuOpen(false); return; }
    setPage(key); setMenuOpen(false);
  };

  const renderPage = () => {
    if (page==="auth") return <AuthScreen onSkip={()=>{setGuestMode(true);setPage("dashboard");}}/>;
    switch(page) {
      case "dashboard":    return <Dashboard onNav={go}/>;
      case "live-prices":  return <LivePrices/>;
      case "reports":      return <MarketReports/>;
      case "map":          return <MapView/>;
      case "listings":     return <Listings onNav={go}/>;
      case "auctions":     return <Auctions/>;
      case "post-listing": return <PostListing onBack={()=>setPage("listings")} onSuccess={()=>setPage("listings")}/>;
      case "valuation":    return <ValuationTools/>;
      case "price-my-cow": return <PriceMyCow/>;
      case "gestation":    return <GestationCalc/>;
      case "weight":       return <WeightTracker/>;
      case "hay":          return <HayCalculator/>;
      case "trucking":     return <TruckingCalc/>;
      case "favorites":    return <Favorites/>;
      case "messages":     return <Messages/>;
      case "alerts":       return <PriceAlerts/>;
      case "profile":      return <Profile onNav={go}/>;
      default:             return <Dashboard onNav={go}/>;
    }
  };

  const isFullscreen = ["auth","post-listing","messages"].includes(page);

  // Shared nav-section list, reused by the mobile drawer and the desktop sidebar
  const navSections = (
    <>
      {SECTIONS.map(section=>(
        <div key={section}>
          <button type="button" onClick={()=>setExpanded(p=>({...p,[section]:!p[section]}))} aria-expanded={!!expanded[section]} style={{width:"100%",font:"inherit",textAlign:"left",background:"none",border:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:11,fontWeight:900,color:C.mintLight,letterSpacing:2,textTransform:"uppercase"}}>{section}</span>
            <span style={{color:C.mintLight,fontSize:11}}>{expanded[section]?"▲":"▼"}</span>
          </button>
          {expanded[section] && NAV_ITEMS.filter(n=>n.section===section).map(n=>(
            <button type="button" key={n.key} onClick={()=>go(n.key)} aria-current={page===n.key?"page":undefined} style={{width:"100%",font:"inherit",textAlign:"left",background:page===n.key?"rgba(255,255,255,0.1)":"transparent",border:"none",borderLeft:page===n.key?`3px solid ${C.gold}`:"3px solid transparent",padding:"13px 18px 13px 28px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",minHeight:50}}>
              <span style={{fontSize:18,width:24,textAlign:"center"}}>{n.icon}</span>
              <span style={{color:page===n.key?C.goldLight:"rgba(255,255,255,0.82)",fontWeight:page===n.key?800:500,fontSize:15}}>{n.label}</span>
            </button>
          ))}
        </div>
      ))}
    </>
  );

  // ── DESKTOP: persistent sidebar + wide content column ──────────────
  if (isDesktop) {
    return (
      <div style={{fontFamily:"'Georgia','Palatino Linotype',serif",background:C.parchment,minHeight:"100vh",display:"flex"}}>
        <div style={{width:260,flexShrink:0,background:C.forest,minHeight:"100vh",position:"sticky",top:0,alignSelf:"flex-start",display:"flex",flexDirection:"column",boxShadow:"2px 0 14px rgba(0,0,0,0.15)"}}>
          <button type="button" style={{width:"100%",font:"inherit",textAlign:"left",background:"none",border:"none",display:"flex",alignItems:"center",gap:10,padding:"22px 20px 18px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.08)"}} onClick={()=>setPage("dashboard")}>
            <div style={{width:36,height:36,background:C.gold,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div>
            <span style={{color:"#fff",fontWeight:900,fontSize:19,letterSpacing:0.3,fontFamily:"'Georgia',serif"}}>StockYard</span>
          </button>
          <div style={{flex:1,overflowY:"auto",paddingTop:6}}>{navSections}</div>
          <div style={{padding:"16px 18px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
            {!isAuth ? (
              <button onClick={()=>go("auth")} style={{width:"100%",padding:"14px",background:C.gold,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:15,cursor:"pointer"}}>Sign In / Create Account</button>
            ) : (
              <button type="button" onClick={()=>go("profile")} style={{width:"100%",font:"inherit",textAlign:"left",background:"none",border:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 6px",borderRadius:10}}>
                <span style={{fontSize:20}}>👤</span>
                <span style={{color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:14}}>My Account</span>
              </button>
            )}
          </div>
        </div>

        <div style={{flex:1,minWidth:0}}>
          {!isFullscreen && (
            <div style={{background:"#fff",padding:"16px 40px",display:"flex",alignItems:"center",justifyContent:"flex-end",position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.border}`}}>
              <div style={{position:"relative"}}>
                <button onClick={()=>setRegionOpen(o=>!o)} style={{background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:13,fontWeight:700,padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span>📍</span><span>{region}</span><span style={{fontSize:9}}>▼</span>
                </button>
                {regionOpen && (
                  <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"#fff",borderRadius:14,boxShadow:"0 8px 30px rgba(0,0,0,0.18)",zIndex:200,minWidth:200,maxHeight:320,overflowY:"auto"}}>
                    {US_STATES.map(s=>(
                      <button type="button" key={s} onClick={()=>{setRegion(s);setRegionOpen(false);}} aria-pressed={s===region} style={{width:"100%",font:"inherit",textAlign:"left",border:"none",padding:"12px 16px",fontSize:14,cursor:"pointer",fontWeight:s===region?800:500,color:s===region?C.forest:C.text,background:s===region?C.mint+"18":"transparent",borderBottom:`1px solid ${C.border}`}}>
                        {s} {s===region&&"✓"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {renderPage()}
        </div>
      </div>
    );
  }

  // ── MOBILE: sticky header + slide-out drawer + bottom tab bar ──────
  return (
    <div style={{fontFamily:"'Georgia','Palatino Linotype',serif",background:C.parchment,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative"}}>
      {/* Header — hidden on fullscreen pages */}
      {!isFullscreen && (
        <div style={{background:C.forest,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
          <button onClick={()=>setMenuOpen(true)} aria-label="Open menu" style={{background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
          <button type="button" style={{font:"inherit",background:"none",border:"none",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setPage("dashboard")}>
            <div style={{width:34,height:34,background:C.gold,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div>
            <span style={{color:"#fff",fontWeight:900,fontSize:18,letterSpacing:0.3,fontFamily:"'Georgia',serif"}}>StockYard</span>
          </button>
          <div style={{position:"relative"}}>
            <button onClick={()=>setRegionOpen(o=>!o)} style={{background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.25)",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,padding:"7px 11px",cursor:"pointer",minHeight:44,display:"flex",alignItems:"center",gap:4,maxWidth:110}}>
              <span>📍</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{region==="All Regions"?"All":region.slice(0,8)}</span>
              <span style={{fontSize:9}}>▼</span>
            </button>
            {regionOpen && (
              <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"#fff",borderRadius:14,boxShadow:"0 8px 30px rgba(0,0,0,0.18)",zIndex:200,minWidth:180,maxHeight:280,overflowY:"auto"}}>
                {US_STATES.map(s=>(
                  <button type="button" key={s} onClick={()=>{setRegion(s);setRegionOpen(false);}} aria-pressed={s===region} style={{width:"100%",font:"inherit",textAlign:"left",border:"none",padding:"12px 16px",fontSize:14,cursor:"pointer",fontWeight:s===region?800:500,color:s===region?C.forest:C.text,background:s===region?C.mint+"18":"transparent",borderBottom:`1px solid ${C.border}`}}>
                    {s} {s===region&&"✓"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div onClick={()=>setMenuOpen(false)} aria-hidden="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:150,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:0,left:0,bottom:0,width:"80%",maxWidth:300,background:C.forest,zIndex:200,overflowY:"auto",paddingBottom:50,boxShadow:"4px 0 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 18px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,background:C.gold,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div>
                <span style={{color:"#fff",fontWeight:900,fontSize:18,fontFamily:"'Georgia',serif"}}>StockYard</span>
              </div>
              <button onClick={()=>setMenuOpen(false)} aria-label="Close menu" style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",fontSize:24,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            {navSections}
            {!isAuth && (
              <div style={{margin:"20px 14px 0"}}>
                <button onClick={()=>go("auth")} style={{width:"100%",padding:"14px",background:C.gold,color:"#fff",border:"none",borderRadius:14,fontWeight:900,fontSize:15,cursor:"pointer"}}>Sign In / Create Account</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Page content */}
      <div>{renderPage()}</div>

      {/* Bottom tab bar — hidden on fullscreen pages */}
      {!isFullscreen && (
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:90,boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
          {[{key:"dashboard",icon:"⊞",label:"Home"},{key:"listings",icon:"🛒",label:"Market"},{key:"auctions",icon:"🔨",label:"Auctions"},{key:"price-my-cow",icon:"💰",label:"Price"},{key:"profile",icon:"👤",label:"Account"}].map(t=>(
            <button key={t.key} onClick={()=>go(t.key)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 12px",minWidth:56,minHeight:48}}>
              <span style={{fontSize:22}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:page===t.key?900:500,color:page===t.key?C.forest:C.muted}}>{t.label}</span>
              {page===t.key && <div style={{width:4,height:4,borderRadius:"50%",background:C.gold,marginTop:1}}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Error boundary ───────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("StockYard crashed:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{minHeight:"100vh",background:C.parchment,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{textAlign:"center",maxWidth:340}}>
          <div style={{width:48,height:48,background:C.forest,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <div style={{width:32,height:32,background:C.gold,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",fontFamily:"'Georgia',serif"}}>SY</div>
          </div>
          <div style={{fontWeight:900,fontSize:18,color:C.text,marginBottom:8,fontFamily:"'Georgia',serif"}}>Something went wrong</div>
          <div style={{color:C.muted,fontSize:14,marginBottom:20}}>StockYard hit an unexpected error. Reloading usually fixes it.</div>
          <button onClick={()=>window.location.reload()} style={{background:C.forest,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Reload</button>
        </div>
      </div>
    );
  }
}

export default function App() {
  return <ErrorBoundary><AuthProvider><AppShell/></AuthProvider></ErrorBoundary>;
}
