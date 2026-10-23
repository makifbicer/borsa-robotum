
"use strict";
const BIST30=["AEFES","AKBNK","ASELS","ASTOR","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN","GUBRF","ISCTR","KCHOL","KRDMD","MGROS","PETKM","PGSUS","SAHOL","SASA","SISE","TAVHL","TCELL","THYAO","TOASO","TRALT","TRMET","TTKOM","TUPRS","VAKBN","YKBNK"];
const BIST100=["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"];
const MODEL_TARGETS=[
  {symbol:"TCELL",weight:.20},{symbol:"AKBNK",weight:.20},{symbol:"THYAO",weight:.15},
  {symbol:"BIMAS",weight:.15},{symbol:"MAVI",weight:.10},{symbol:"ASELS",weight:.10},{symbol:"TUPRS",weight:.10}
];

const SECTOR_MAP={
"AEFES":"Tüketim","AGHOL":"Holding","AHGAZ":"Enerji","AKBNK":"Bankacılık","AKCNS":"Çimento","AKFYE":"Enerji","AKSA":"Sanayi","AKSEN":"Enerji","ALARK":"Holding","ALBRK":"Bankacılık","ALTNY":"Savunma/Teknoloji","ANHYT":"Finans","ANSGR":"Finans","ARCLK":"Sanayi","ASELS":"Savunma/Teknoloji","ASTOR":"Sanayi","AYGAZ":"Enerji","BERA":"Holding","BIMAS":"Perakende","BINHO":"Holding","BRSAN":"Metal/Sanayi","BRYAT":"Holding","BTCIM":"Çimento","CANTE":"Enerji","CCOLA":"Tüketim","CIMSA":"Çimento","CVKMD":"Madencilik","CWENE":"Enerji","DOAS":"Otomotiv","DOHOL":"Holding","ECILC":"Sağlık","ECZYT":"Holding","EGEEN":"Otomotiv","EGGUB":"Kimya","EKGYO":"Gayrimenkul","ENERY":"Enerji","ENJSA":"Enerji","ENKAI":"İnşaat","ENTRA":"Enerji","EREGL":"Metal/Sanayi","EUREN":"Sanayi","FENER":"Diğer","FROTO":"Otomotiv","GARAN":"Bankacılık","GLRMK":"İnşaat","GLYHO":"Holding","GRSEL":"Ulaştırma","GUBRF":"Kimya","GWIND":"Enerji","HALKB":"Bankacılık","HEKTS":"Kimya","ISCTR":"Bankacılık","ISDMR":"Metal/Sanayi","ISMEN":"Finans","KARSN":"Otomotiv","KATMR":"Sanayi","KCAER":"Metal/Sanayi","KCHOL":"Holding","KORDS":"Sanayi","KRDMD":"Metal/Sanayi","LMKDC":"Çimento","MAVI":"Perakende","MGROS":"Perakende","MPARK":"Sağlık","OBAMS":"Tüketim","ODAS":"Enerji","OTKAR":"Otomotiv","OYAKC":"Çimento","PAHOL":"Holding","PETKM":"Kimya","PGSUS":"Ulaştırma","RGYAS":"Gayrimenkul","RYSAS":"Ulaştırma","SAHOL":"Holding","SASA":"Kimya","SISE":"Sanayi","SNGYO":"Gayrimenkul","SOKM":"Perakende","TABGD":"Tüketim","TAVHL":"Ulaştırma","TCELL":"Telekom","TCKRC":"Sanayi","THYAO":"Ulaştırma","TKFEN":"İnşaat","TOASO":"Otomotiv","TRALT":"Madencilik","TRENJ":"Enerji","TRGYO":"Gayrimenkul","TRMET":"Madencilik","TSKB":"Bankacılık","TTKOM":"Telekom","TTRAK":"Otomotiv","TUKAS":"Tüketim","TUPRS":"Enerji","TURSG":"Finans","ULKER":"Tüketim","VAKBN":"Bankacılık","VESTL":"Sanayi","YKBNK":"Bankacılık","ZOREN":"Enerji"
};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2});
const money=v=>`${fmt.format(Number(v||0))} TL`, pct=v=>`${v>=0?"+":""}${fmt.format(v)}%`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), sleep=ms=>new Promise(r=>setTimeout(r,ms));

const state={
  scanResults:[],scanCache:new Map(),scanAbort:false,scanning:false,detail:null,lastFetch:null,timer:null,clockTimer:null,dataTimestamp:null,
  portfolio:JSON.parse(localStorage.getItem("abr_portfolio")||"[]"),
  watchlist:JSON.parse(localStorage.getItem("abr_watchlist")||"[]"),
  candidateBasket:JSON.parse(localStorage.getItem("abr_candidate_basket")||"[]"),
  allSymbols:[...BIST100,"PKGYO"],
  companyNames:{},
  model:JSON.parse(localStorage.getItem("abr_model")||"null"),
  targetAlerts:JSON.parse(localStorage.getItem("abr_target_alerts")||'{"model":null,"portfolio":null}'),
  settings:Object.assign({capital:10000,riskPct:1.5,atrMult:1.8,voiceEnabled:true,notifEnabled:true,autoRefresh:true,refreshSec:120,modelTargetValue:0,portfolioTargetValue:0},JSON.parse(localStorage.getItem("abr_settings")||"{}"))
};
// v3.2'deki 15.000 TL yalnız örnekti. v3.3'te hedef sadece kullanıcı kaydedince aktif olur.
if(localStorage.getItem("abr_target_user_set_v33")!=="1"){
  state.settings.modelTargetValue=0;
  state.targetAlerts.model=null;
}
const savePortfolio=()=>localStorage.setItem("abr_portfolio",JSON.stringify(state.portfolio));
const saveWatch=()=>localStorage.setItem("abr_watchlist",JSON.stringify(state.watchlist));
const saveCandidateBasket=()=>localStorage.setItem("abr_candidate_basket",JSON.stringify(state.candidateBasket));
const saveModel=()=>localStorage.setItem("abr_model",JSON.stringify(state.model));
const saveSettings=()=>localStorage.setItem("abr_settings",JSON.stringify(state.settings));
const saveTargetAlerts=()=>localStorage.setItem("abr_target_alerts",JSON.stringify(state.targetAlerts));

function isBist100(symbol){return BIST100.includes(symbol)||symbol==="XU100"||symbol==="XU030"}
function isKnownSymbol(symbol){return state.allSymbols.includes(symbol)||isBist100(symbol)}
function providerParams(tf,symbol){
  const broad=!isBist100(symbol);
  if(tf==="15m"||tf==="1h")return{file:broad?"data/all_intraday.json":"data/intraday.json"};
  return{file:broad?"data/all_daily.json":"data/daily.json"};
}
async function loadUniverse(){
  try{
    const res=await fetch(`data/symbols.json?v=${Date.now()}`,{cache:"no-store"});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const j=await res.json();
    const syms=(j.symbols||[]).map(s=>String(s).toUpperCase().trim()).filter(s=>/^[A-Z0-9]{3,12}$/.test(s));
    state.allSymbols=[...new Set([...BIST100,...syms,"PKGYO"])].sort();
    state.companyNames=j.names||{};
  }catch(_){state.allSymbols=[...new Set([...BIST100,"PKGYO"])].sort()}
  if($("#universeCount"))$("#universeCount").textContent=`${state.allSymbols.length} hisse`;
  return state.allSymbols;
}
function noteDataTimestamp(value){
  const t=typeof value==="number"?value:Date.parse(value||"");
  if(Number.isFinite(t)&&(!state.dataTimestamp||t>state.dataTimestamp))state.dataTimestamp=t;
  renderTimeStatus();
}
let quoteCache={data:null,loadedAt:0};
async function loadQuotes(force=false){
  if(!force&&quoteCache.data&&Date.now()-quoteCache.loadedAt<60000)return quoteCache.data;
  try{
    const r=await fetch(`data/quotes.json?v=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const j=await r.json();
    quoteCache={data:j,loadedAt:Date.now()};
    noteDataTimestamp(j.updatedAt);
    return j;
  }catch(e){
    console.warn("quotes unavailable",e);
    return quoteCache.data||{updatedAt:null,quotes:{}};
  }
}
function quoteFor(symbol){return quoteCache.data?.quotes?.[symbol]||null}

let marketDataCache={};
async function loadMarketFile(file){
  const cached=marketDataCache[file];
  if(cached && Date.now()-cached.loadedAt<60000){noteDataTimestamp(cached.data?.updatedAt);return cached.data}
  const res=await fetch(`${file}?v=${Date.now()}`,{cache:"no-store"});
  if(!res.ok) throw new Error(`Piyasa veri dosyası alınamadı (HTTP ${res.status})`);
  const data=await res.json();
  marketDataCache[file]={data,loadedAt:Date.now()};
  noteDataTimestamp(data?.updatedAt);
  return data;
}
function aggregate1h(bars){
  const groups=new Map();
  for(const b of bars){
    const d=new Date(b.t);
    const key=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    if(!groups.has(key)) groups.set(key,{t:b.t,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v||0});
    else{
      const g=groups.get(key);
      g.h=Math.max(g.h,b.h); g.l=Math.min(g.l,b.l); g.c=b.c; g.v+=(b.v||0);
    }
  }
  return [...groups.values()].sort((a,b)=>a.t-b.t);
}
async function fetchChart(symbol,tf="15m"){
  const cfg=providerParams(tf,symbol);
  const data=await loadMarketFile(cfg.file);
  const rec=data?.symbols?.[symbol];
  if(!rec || !Array.isArray(rec.bars) || rec.bars.length<10){
    throw new Error(`${symbol} için sunucu verisi henüz hazır değil`);
  }
  let bars=rec.bars;
  if(tf==="1h") bars=aggregate1h(bars);
  return {
    symbol,
    bars,
    meta:rec.meta||{},
    fetchedAt:Date.parse(data.updatedAt)||Date.now(),
    tf
  };
}
function ema(values,p){if(!values.length)return[];const k=2/(p+1),o=[values[0]];for(let i=1;i<values.length;i++)o.push(values[i]*k+o[i-1]*(1-k));return o}
function sma(values,p){const o=[];let s=0;for(let i=0;i<values.length;i++){s+=values[i];if(i>=p)s-=values[i-p];o.push(i>=p-1?s/p:null)}return o}
function std(values,p,i){if(i<p-1)return null;const x=values.slice(i-p+1,i+1),m=x.reduce((a,b)=>a+b,0)/p;return Math.sqrt(x.reduce((a,b)=>a+(b-m)**2,0)/p)}
function rsi(v,p=14){if(v.length<=p)return 50;let g=0,l=0;for(let i=1;i<=p;i++){const d=v[i]-v[i-1];d>=0?g+=d:l-=d}let ag=g/p,al=l/p;for(let i=p+1;i<v.length;i++){const d=v[i]-v[i-1];ag=(ag*(p-1)+Math.max(d,0))/p;al=(al*(p-1)+Math.max(-d,0))/p}if(!al)return 100;const rs=ag/al;return 100-100/(1+rs)}
function atr(b,p=14){if(b.length<2)return 0;const t=[];for(let i=1;i<b.length;i++){const x=b[i],pc=b[i-1].c;t.push(Math.max(x.h-x.l,Math.abs(x.h-pc),Math.abs(x.l-pc)))}const r=t.slice(-p);return r.reduce((a,b)=>a+b,0)/Math.max(1,r.length)}
function macd(v){const e12=ema(v,12),e26=ema(v,26),line=v.map((_,i)=>e12[i]-e26[i]),sig=ema(line,9),i=v.length-1;return{line:line[i],signal:sig[i],hist:line[i]-sig[i]}}
function boll(v,p=20){const m=sma(v,p),i=v.length-1,mid=m[i]??v[i],sd=std(v,p,i)??0;return{mid,upper:mid+2*sd,lower:mid-2*sd}}
function relativeVolume(b,n=20){if(b.length<3)return 1;const c=b.at(-1).v||0,prev=b.slice(-n-1,-1).map(x=>x.v||0).filter(Boolean);if(!prev.length)return 1;const av=prev.reduce((a,b)=>a+b,0)/prev.length;return av?c/av:1}
function changePct(b){if(b.length<2)return 0;return(b.at(-1).c/b.at(-2).c-1)*100}
function momentumPct(v,n=5){return v.length<=n?0:(v.at(-1)/v.at(-1-n)-1)*100}
function analyze(data){
  const {bars,symbol}=data,cl=bars.map(b=>b.c),last=cl.at(-1),e9=ema(cl,9).at(-1),e21=ema(cl,21).at(-1),e50=ema(cl,50).at(-1);
  const rv=rsi(cl),m=macd(cl),av=atr(bars),bb=boll(cl),rvol=relativeVolume(bars),mom=momentumPct(cl),chg=changePct(bars),atrPct=last?av/last*100:0;
  let score=38;const reasons=[];
  if(last>e9){score+=8;reasons.push("Fiyat EMA9 üzerinde")}else{score-=7;reasons.push("Fiyat EMA9 altında")}
  if(e9>e21){score+=9;reasons.push("EMA9 > EMA21")}else{score-=6;reasons.push("EMA9 < EMA21")}
  if(e21>e50){score+=9;reasons.push("EMA21 > EMA50")}else{score-=5;reasons.push("EMA21 < EMA50")}
  if(rv>=52&&rv<=68){score+=10;reasons.push(`RSI ${rv.toFixed(1)} sağlıklı momentum`)}else if(rv>=45&&rv<52){score+=4;reasons.push(`RSI ${rv.toFixed(1)} nötr`)}else if(rv>72){score-=8;reasons.push(`RSI ${rv.toFixed(1)} aşırı ısınmış`)}else if(rv<38){score-=9;reasons.push(`RSI ${rv.toFixed(1)} zayıf`)}
  if(m.hist>0){score+=8;reasons.push("MACD histogram pozitif")}else{score-=6;reasons.push("MACD histogram negatif")}
  if(mom>2){score+=8;reasons.push(`5 bar momentum +${mom.toFixed(1)}%`)}else if(mom>0){score+=4;reasons.push("Kısa momentum pozitif")}else if(mom<-2){score-=8;reasons.push(`5 bar momentum ${mom.toFixed(1)}%`)}
  if(rvol>=1.7){score+=10;reasons.push(`Hacim ${rvol.toFixed(2)}x`)}else if(rvol>=1.15){score+=5;reasons.push(`Hacim ${rvol.toFixed(2)}x`)}else if(rvol<.65){score-=3;reasons.push("Hacim zayıf")}
  if(last>bb.mid){score+=4;reasons.push("Bollinger orta bant üstü")}if(last>bb.upper){score-=5;reasons.push("Bollinger üst bant üzeri: taşma riski")}
  if(atrPct<4)score+=4;else if(atrPct>8){score-=8;reasons.push(`Yüksek volatilite ATR ${atrPct.toFixed(1)}%`)}
  score=Math.round(clamp(score,0,100));let signal="UZAK DUR",signalClass="sell";
  if(score>=80){signal="GÜÇLÜ AL ADAYI";signalClass="buy"}else if(score>=70){signal="AL ADAYI";signalClass="buy"}else if(score>=58){signal="İZLE";signalClass="watch"}else if(score>=45){signal="NÖTR";signalClass="neutral"}
  return{symbol,price:last,change:chg,score,signal,signalClass,rsi:rv,rvol,atr:av,atrPct,ema9:e9,ema21:e21,ema50:e50,macd:m,boll:bb,momentum:mom,bars,reasons,fetchedAt:data.fetchedAt,tf:data.tf}
}
function setStatus(t,type="muted"){const e=$("#marketStatus");e.textContent=t;e.className=`pill ${type}`}
function dataAgeText(ts){
  if(!ts)return"";
  const m=Math.max(0,Math.floor((Date.now()-ts)/60000));
  if(m<1)return"az önce";if(m<60)return`${m} dk önce`;
  const h=Math.floor(m/60),r=m%60;return r?`${h} sa ${r} dk önce`:`${h} sa önce`;
}
function renderTimeStatus(){
  const now=new Date();
  if($("#liveClock"))$("#liveClock").textContent=`🕒 ${now.toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}`;
  const e=$("#sourceDataTime");
  if(e){
    if(!state.dataTimestamp){e.textContent="Son veri: bekleniyor";e.className="pill muted"}
    else{
      const d=new Date(state.dataTimestamp);
      const age=(Date.now()-state.dataTimestamp)/60000;
      const label=d.toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false});
      e.textContent=age>40?`⚠ VERİ GECİKMİŞ: ${label} • ${dataAgeText(state.dataTimestamp)} • Actions kontrol`:`Son veri: ${label} • ${dataAgeText(state.dataTimestamp)}`;
      e.className=`pill ${age>40?"bad":age>20?"warn":"good"}`;
    }
  }
}
function startClock(){clearInterval(state.clockTimer);renderTimeStatus();state.clockTimer=setInterval(renderTimeStatus,1000)}
function setFresh(ts){const e=$("#freshness");const use=state.dataTimestamp||ts;if(!use){e.textContent="Veri bekleniyor";e.className="pill muted";return}e.textContent=`Veri ${new Date(use).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false})}`;e.className="pill good"}
async function getAnalysis(symbol,tf=$("#timeframe").value){
  const k=`${symbol}|${tf}`,c=state.scanCache.get(k);
  if(c&&Date.now()-c.fetchedAt<90000){
    const q=quoteFor(symbol);
    if(q?.price!=null)c.price=Number(q.price);
    return c;
  }
  await loadQuotes();
  const a=analyze(await fetchChart(symbol,tf));
  const q=quoteFor(symbol);
  if(q?.price!=null){
    a.barPrice=a.price;
    a.price=Number(q.price);
    a.quoteChange=q.change;
    a.quoteSource="TradingView scanner";
  }
  state.scanCache.set(k,a);
  return a;
}


function resetTargetAlert(kind,target){
  state.targetAlerts[kind]={target:Number(target||0),alerted:false};saveTargetAlerts();
}
function checkTargetAlert(kind,current,target,statusEl){
  target=Number(target||0);current=Number(current||0);const e=$(statusEl);
  if(!target){if(e){e.textContent="Hedef tanımlanmadı.";e.className="targetStatus"}return}
  const remain=target-current;
  if(current>=target){
    if(e){e.textContent=`🎯 HEDEFE ULAŞILDI — SAT / KÂR AL • ${money(current)} / ${money(target)}`;e.className="targetStatus targetReached"}
    const rec=state.targetAlerts[kind]||{};
    if(rec.target!==target||!rec.alerted){
      const name=kind==="model"?"Model Sepet":"Portföy";
      notify(`${name}: HEDEFE ULAŞILDI — SAT / KÂR AL`,`${name} toplam değeri ${money(current)} oldu. Belirlediğiniz hedef ${money(target)}.`);
      state.targetAlerts[kind]={target,alerted:true};saveTargetAlerts();
    }
  }else{
    if(e){e.textContent=`Hedef ${money(target)} • Kalan ${money(remain)}`;e.className="targetStatus"}
    if(!state.targetAlerts[kind]||state.targetAlerts[kind].target!==target){state.targetAlerts[kind]={target,alerted:false};saveTargetAlerts()}
  }
}
function saveModelTarget(){
  const v=Math.max(0,Number($("#modelTargetValue")?.value||0));
  state.settings.modelTargetValue=v;
  localStorage.setItem("abr_target_user_set_v33","1");
  saveSettings();resetTargetAlert("model",v);renderModel()
}
function savePortfolioTarget(){
  const v=Math.max(0,Number($("#portfolioTargetValue")?.value||0));
  state.settings.portfolioTargetValue=v;
  localStorage.setItem("abr_target_user_set_v33","1");
  saveSettings();resetTargetAlert("portfolio",v);renderPortfolio()
}

async function startModel(){
  if(state.model?.startedAt&&!confirm("Model sepet daha önce başlatılmış. Başlangıç fiyatları sıfırlanıp yeniden başlatılsın mı?"))return;
  setStatus("Model sepet fiyatları alınıyor","warn");
  const analyses=[];
  for(const x of MODEL_TARGETS){try{analyses.push(await getAnalysis(x.symbol,"15m"))}catch(e){alert(`${x.symbol} fiyatı alınamadı: ${e.message}`);setStatus("Model başlatılamadı","bad");return}}
  const capital=10000,prices=Object.fromEntries(analyses.map(a=>[a.symbol,a.price]));
  const positions=MODEL_TARGETS.map(x=>({symbol:x.symbol,weight:x.weight,buyPrice:prices[x.symbol],lots:Math.floor(capital*x.weight/prices[x.symbol])}));
  let spent=positions.reduce((s,p)=>s+p.lots*p.buyPrice,0),cash=capital-spent;
  for(let guard=0;guard<1000;guard++){
    const eligible=positions.filter(p=>p.buyPrice<=cash+1e-9).sort((a,b)=>((b.weight-capital?0:0),((b.weight*capital-b.lots*b.buyPrice)-(a.weight*capital-a.lots*a.buyPrice))));
    if(!eligible.length)break;
    let best=eligible[0];
    let bestGap=-Infinity;
    for(const p of eligible){const gap=p.weight*capital-p.lots*p.buyPrice;if(gap>bestGap){bestGap=gap;best=p}}
    best.lots++;cash-=best.buyPrice;
  }
  spent=positions.reduce((s,p)=>s+p.lots*p.buyPrice,0);cash=capital-spent;
  state.model={capital,startedAt:Date.now(),cash,positions:positions.map(p=>({...p,last:p.buyPrice,score:null,robot:"MODELDE TUT",robotClass:"buy"}))};
  saveModel();await refreshModel(true);setStatus("Model sepet başlatıldı","good");
}
async function refreshModel(silent=false){
  if(!state.model){renderModel();return}
  await loadQuotes(true);
  if(!silent)setStatus("Model sepet yenileniyor","warn");
  for(const p of state.model.positions){try{
    const a=await getAnalysis(p.symbol,"15m");
    p.last=a.price;
    p.score=a.score; // teknik skor arka planda tutulur, model tabloda gösterilmez
    p.robot="MODELDE TUT";
    p.robotClass="buy";
    p.pnl=(a.price-p.buyPrice)*p.lots;
  }catch(e){p.error=e.message}}
  saveModel();renderModel();state.lastFetch=Date.now();setFresh(state.lastFetch);if(!silent)setStatus("Model sepet güncel","good");
}
function renderModel(){
  const body=$("#modelBody");
  if(!state.model){
    body.innerHTML=MODEL_TARGETS.map(x=>`<tr><td><span class="symbol">${x.symbol}</span></td><td>${Math.round(x.weight*100)}%</td><td>—</td><td>—</td><td>—</td><td>—</td><td><span class="sig neutral">BAŞLATILMADI</span></td></tr>`).join("");
    $("#modelStatus").textContent="Henüz başlatılmadı. Başlatıldığında o anki fiyatlar maliyet kabul edilir.";
    $("#modelStart").textContent="—";$("#modelValue").textContent="—";$("#modelPnL").textContent="—";$("#modelCash").textContent=money(10000);
    if($("#modelTargetValue"))$("#modelTargetValue").value=state.settings.modelTargetValue||"";
    checkTargetAlert("model",0,state.settings.modelTargetValue,"#modelTargetStatus");return;
  }
  let value=state.model.cash,pnl=0,start=state.model.cash;
  body.innerHTML=state.model.positions.map(p=>{const c=p.buyPrice*p.lots,v=(p.last||p.buyPrice)*p.lots,k=v-c;start+=c;value+=v;pnl+=k;return`<tr><td><span class="symbol">${p.symbol}</span></td><td>${Math.round(p.weight*100)}%</td><td>${p.lots}</td><td>${fmt.format(p.buyPrice)}</td><td>${fmt.format(p.last||p.buyPrice)}</td><td class="${k>=0?"positive":"negative"}">${money(k)} (${pct(c?k/c*100:0)})</td><td><span class="sig buy">MODELDE TUT</span></td></tr>`}).join("");
  const pPct=start?(value/start-1)*100:0;
  $("#modelStatus").textContent=`Başlangıç: ${new Date(state.model.startedAt).toLocaleString("tr-TR")} • Performans başlangıç fiyatlarına göre hesaplanıyor.`;
  $("#modelStart").textContent=money(start);$("#modelValue").textContent=money(value);$("#modelPnL").textContent=`${money(pnl)} (${pct(pPct)})`;$("#modelPnL").className=pnl>=0?"positive":"negative";$("#modelCash").textContent=money(state.model.cash);
  if($("#modelTargetValue"))$("#modelTargetValue").value=state.settings.modelTargetValue||"";
  checkTargetAlert("model",value,state.settings.modelTargetValue,"#modelTargetStatus");
}
async function scanUniverse(name){
  if(state.scanning)return;state.scanning=true;state.scanAbort=false;state.scanResults=[];const symbols=name==="BISTTUM"?state.allSymbols:(name==="BIST100"?BIST100:BIST30),tf=$("#timeframe").value;$("#stopScanBtn").disabled=false;setStatus(`${name} taranıyor`,"warn");let index=0,ok=0,failed=0;
  async function worker(){while(index<symbols.length&&!state.scanAbort){const s=symbols[index++];try{const a=analyze(await fetchChart(s,tf));state.scanCache.set(`${s}|${tf}`,a);state.scanResults.push(a);ok++}catch(e){failed++}state.scanResults.sort((a,b)=>b.score-a.score);renderScanner();$("#scanInfo").textContent=`${symbols.length} hisseden ${ok+failed} işlendi • ${ok} başarılı • ${failed} veri hatası`;if(name==="BIST100"||name==="BISTTUM")await sleep(80)}}
  await Promise.all(Array.from({length:name==="BISTTUM"?6:(name==="BIST100"?5:4)},worker));state.scanning=false;$("#stopScanBtn").disabled=true;state.lastFetch=Date.now();setFresh(state.lastFetch);setStatus(state.scanAbort?"Tarama durduruldu":`${name} taraması tamam`,state.scanAbort?"bad":"good");
}
function filteredResults(){const min=Number($("#minScore").value||0),q=$("#stockSearch").value.trim().toUpperCase();return state.scanResults.filter(x=>x.score>=min&&(!q||x.symbol.includes(q)))}
function renderScanner(){const rows=filteredResults(),b=$("#scannerBody");b.innerHTML=rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td><span class="symbol">${x.symbol}</span></td><td>${fmt.format(x.price)}</td><td class="${x.change>0?"positive":x.change<0?"negative":"neutral"}">${pct(x.change)}</td><td><span class="score">${x.score}</span></td><td><span class="sig ${x.signalClass}">${x.signal}</span></td><td>${x.rsi.toFixed(1)}</td><td>${x.rvol.toFixed(2)}x</td><td>${x.atrPct.toFixed(2)}%</td><td><button class="miniBtn detailBtn" data-symbol="${x.symbol}">Detay</button></td></tr>`).join(""):`<tr><td colspan="10" class="empty">${state.scanResults.length?"Filtreye uyan hisse yok.":"Tarama sürüyor…"}</td></tr>`;updateStats();$$(".detailBtn").forEach(x=>x.onclick=()=>openDetail(x.dataset.symbol))}
function updateStats(){const a=state.scanResults;$("#statScanned").textContent=a.length;$("#statBuy").textContent=a.filter(x=>x.score>=70).length;$("#statWatch").textContent=a.filter(x=>x.score>=58&&x.score<70).length;$("#statAvg").textContent=a.length?Math.round(a.reduce((s,x)=>s+x.score,0)/a.length):"—"}
function openDetail(symbol){getAnalysis(symbol,$("#timeframe").value).then(a=>{
  state.detail=a;
  const plan=positionPlan(a,a.price);
  const target2=a.price+plan.riskPerShare*3;
  $("#detailTitle").textContent=`${a.symbol} • ${money(a.price)} • ${a.score}/100`;
  $("#detailMetrics").innerHTML=[
    ["Sinyal",a.signal],
    ["RSI",a.rsi.toFixed(1)],
    ["RVOL",`${a.rvol.toFixed(2)}x`],
    ["ATR%",`${a.atrPct.toFixed(2)}%`],
    ["EMA9",fmt.format(a.ema9)],
    ["EMA21",fmt.format(a.ema21)],
    ["Teknik stop",fmt.format(plan.initial)],
    ["Hedef 1",fmt.format(plan.target1)],
    ["Hedef 2",fmt.format(target2)],
    ["Maks. lot",plan.maxLots]
  ].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  $("#detailReasons").innerHTML=a.reasons.map(r=>`<div class="reason">• ${r}</div>`).join("");
  drawChart(a);
  $("#detailModal").classList.remove("hidden")
}).catch(e=>alert(`Veri alınamadı: ${e.message}`))}
function drawChart(a){const c=$("#detailChart"),ctx=c.getContext("2d"),dpr=window.devicePixelRatio||1,W=c.clientWidth||1000,H=360;c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);const bars=a.bars.slice(-90),vals=bars.map(b=>b.c),e9=ema(vals,9),e21=ema(vals,21),all=[...vals,...e9,...e21],min=Math.min(...all),max=Math.max(...all),pad=(max-min)*.08||1,lo=min-pad,hi=max+pad,x=i=>20+i*(W-40)/Math.max(1,vals.length-1),y=v=>18+(hi-v)*(H-36)/(hi-lo);ctx.strokeStyle="#22304a";ctx.lineWidth=1;for(let i=0;i<5;i++){const yy=18+i*(H-36)/4;ctx.beginPath();ctx.moveTo(18,yy);ctx.lineTo(W-18,yy);ctx.stroke()}function line(s,col,w=2){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();s.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke()}line(vals,"#e9f1ff",2.4);line(e9,"#63e6be",1.5);line(e21,"#74c0fc",1.5)}
function positionPlan(a,entry){const mult=Number(state.settings.atrMult||1.8),initial=Math.max(.01,entry-a.atr*mult),riskPerShare=Math.max(.01,entry-initial),riskTL=state.settings.capital*(state.settings.riskPct/100);return{initial,riskPerShare,riskTL,maxLots:Math.max(0,Math.floor(riskTL/riskPerShare)),target1:entry+riskPerShare*2}}
async function refreshPortfolio(silent=false){if(!state.portfolio.length){renderPortfolio();return}await loadQuotes(true);if(!silent)setStatus("Portföy yenileniyor","warn");for(const p of state.portfolio){try{const a=await getAnalysis(p.symbol,"15m");p.last=a.price;p.score=a.score;p.maxSeen=Math.max(Number(p.maxSeen||p.buyPrice),a.price);const plan=positionPlan(a,p.buyPrice),trail=Math.max(plan.initial,p.maxSeen-a.atr*2);p.dynamicStop=Math.max(Number(p.manualStop||0),trail);p.target1=plan.target1;p.pnl=(a.price-p.buyPrice)*p.lots;p.pnlPct=(a.price/p.buyPrice-1)*100;let robot="TUT",cls="buy";if(a.price<=p.dynamicStop){robot="STOP / SAT";cls="sell"}else if(a.score<45||(a.price<a.ema9&&a.macd.hist<0&&a.rsi<45)){robot="SAT / AZALT";cls="sell"}else if(a.price>=p.target1){robot="KÂR AL / STOP YÜKSELT";cls="watch"}else if(a.score<58){robot="DİKKAT / İZLE";cls="watch"}p.robot=robot;p.robotClass=cls;if(p.lastAlert!==robot&&(robot.includes("SAT")||robot.includes("STOP")||robot.includes("KÂR AL"))){notify(`${p.symbol}: ${robot}`,`${p.symbol} ${money(a.price)} • maliyet ${money(p.buyPrice)} • K/Z ${pct(p.pnlPct)}`);p.lastAlert=robot}}catch(e){p.error=e.message}}savePortfolio();renderPortfolio();state.lastFetch=Date.now();setFresh(state.lastFetch);if(!silent)setStatus("Portföy güncel","good")}
function renderPortfolio(){
  let cost=0,value=0,b=$("#portfolioBody");
  if(!state.portfolio.length)b.innerHTML=`<tr><td colspan="10" class="empty">Henüz pozisyon eklemediniz.</td></tr>`;
  else b.innerHTML=state.portfolio.map((p,i)=>{
    const c=p.buyPrice*p.lots,v=(p.last??p.buyPrice)*p.lots;cost+=c;value+=v;
    return`<tr><td><span class="symbol">${p.symbol}</span></td><td>${p.lots}</td><td>${fmt.format(p.buyPrice)}</td><td>${p.last?fmt.format(p.last):"—"}</td><td class="${(p.pnl||0)>=0?"positive":"negative"}">${p.last?`${money(p.pnl)} (${pct(p.pnlPct)})`:"—"}</td><td>${Number.isFinite(p.score)?`<span class="score">${p.score}</span>`:"—"}</td><td>${p.dynamicStop?fmt.format(p.dynamicStop):"—"}</td><td>${p.target1?fmt.format(p.target1):"—"}</td><td><span class="sig ${p.robotClass||"neutral"}">${p.robot||"VERİ BEKLİYOR"}</span></td><td><button class="miniBtn removePf" data-i="${i}">Sil</button></td></tr>`;
  }).join("");
  $("#pfCost").textContent=money(cost);$("#pfValue").textContent=money(value);
  const pnl=value-cost,pp=cost?(value/cost-1)*100:0;
  $("#pfPnL").textContent=money(pnl);$("#pfPnL").className=pnl>=0?"positive":"negative";
  $("#pfPnLPct").textContent=pct(pp);$("#pfPnLPct").className=pp>=0?"positive":"negative";
  if($("#portfolioTargetValue"))$("#portfolioTargetValue").value=state.settings.portfolioTargetValue||"";
  checkTargetAlert("portfolio",value,state.settings.portfolioTargetValue,"#portfolioTargetStatus");
  $$(".removePf").forEach(x=>x.onclick=()=>{if(confirm("Pozisyon silinsin mi?")){state.portfolio.splice(Number(x.dataset.i),1);savePortfolio();renderPortfolio()}});
}


function renderVoiceToggle(){
  const b=$("#voiceToggleBtn");
  if(!b)return;
  const on=!!state.settings.voiceEnabled;
  b.textContent=on?"🔊 Sesli Uyarı: AÇIK":"🔇 Sesli Uyarı: KAPALI";
  b.classList.toggle("off",!on);
  if($("#voiceEnabled"))$("#voiceEnabled").checked=on;
}
function toggleVoice(){
  state.settings.voiceEnabled=!state.settings.voiceEnabled;
  saveSettings();
  renderVoiceToggle();
  if(state.settings.voiceEnabled&&"speechSynthesis"in window){
    const u=new SpeechSynthesisUtterance("Sesli uyarılar açıldı");
    u.lang="tr-TR";u.rate=.95;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }else if(!state.settings.voiceEnabled&&"speechSynthesis"in window){
    speechSynthesis.cancel();
  }
}
function bind(){
  $("#voiceToggleBtn").onclick=toggleVoice;
  $("#directAnalyzeBtn").onclick=analyzeDirectSymbol;
  $("#directSymbol").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();analyzeDirectSymbol();}});
  $("#startModelBtn").onclick=startModel;$("#refreshModelBtn").onclick=()=>refreshModel();$("#scan30Btn").onclick=()=>scanUniverse("BIST30");$("#scan100Btn").onclick=()=>scanUniverse("BIST100");if($("#scanAllBtn"))$("#scanAllBtn").onclick=()=>scanUniverse("BISTTUM");$("#stopScanBtn").onclick=()=>{state.scanAbort=true;$("#stopScanBtn").disabled=true};
  if($("#saveModelTargetBtn"))$("#saveModelTargetBtn").onclick=saveModelTarget;
  if($("#savePortfolioTargetBtn"))$("#savePortfolioTargetBtn").onclick=savePortfolioTarget;
  $("#minScore").onchange=renderScanner;$("#stockSearch").oninput=renderScanner;$("#timeframe").onchange=()=>{state.scanResults=[];renderScanner();$("#scanInfo").textContent="Zaman dilimi değişti. Yeniden tarayın."};
  $$(".tab").forEach(t=>t.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".tabPane").forEach(x=>x.classList.remove("active"));t.classList.add("active");$("#"+t.dataset.tab).classList.add("active");if(t.dataset.tab==="portfolio")renderPortfolio();if(t.dataset.tab==="watchlist")renderWatch()});
  $("#portfolioForm").onsubmit=e=>{e.preventDefault();const symbol=$("#pfSymbol").value.trim().toUpperCase().replace(".IS",""),lots=Number($("#pfLots").value),buyPrice=Number($("#pfPrice").value),manualStop=Number($("#pfStop").value||0);if(!symbol||!lots||!buyPrice)return;state.portfolio.push({id:String(Date.now()),symbol,lots,buyPrice,manualStop,maxSeen:buyPrice,addedAt:Date.now()});savePortfolio();e.target.reset();renderPortfolio();refreshPortfolio()};
  $("#enableNotificationsBtn").onclick=async()=>{if(!("Notification"in window))return alert("Bu tarayıcı bildirim API'sini desteklemiyor.");const p=await Notification.requestPermission();alert(p==="granted"?"Bildirim izni verildi.":"Bildirim izni verilmedi.")};
  $("#saveSettingsBtn").onclick=()=>{readSettingsUI();alert("Ayarlar kaydedildi.")};["voiceEnabled","notifEnabled","autoRefresh","refreshSec"].forEach(id=>$("#"+id).onchange=readSettingsUI);
  $("#closeModalBtn").onclick=()=>$("#detailModal").classList.add("hidden");$("#detailModal").onclick=e=>{if(e.target.id==="detailModal")$("#detailModal").classList.add("hidden")};$("#addWatchBtn").onclick=()=>{if(!state.detail)return;if(!state.watchlist.includes(state.detail.symbol))state.watchlist.push(state.detail.symbol);saveWatch();renderWatch();$("#addWatchBtn").textContent="İzleme listesine eklendi"};
}
function init(){bind();loadSettingsUI();startClock();loadUniverse();loadQuotes(true);renderVoiceToggle();renderModel();renderPortfolio();renderWatch();renderCandidateBasket();scheduleAutoRefresh();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});const d=new Date(),day=d.getDay(),mins=d.getHours()*60+d.getMinutes(),open=day>=1&&day<=5&&mins>=600&&mins<=1110;setStatus(open?"Piyasa saatleri":"Piyasa kapalı / seans dışı",open?"good":"muted")}

// ---------------- Robot+ v2.0 ----------------
function v2Defaults(){
  if(state.settings.minRR==null)state.settings.minRR=2;
  if(state.settings.maxSectorPct==null)state.settings.maxSectorPct=35;
  if(state.settings.backtestHoldDays==null)state.settings.backtestHoldDays=5;
  if(state.settings.paperCapital==null)state.settings.paperCapital=100000;
  if(state.settings.killDrawdownPct==null)state.settings.killDrawdownPct=7;
  if(state.settings.commissionPct==null)state.settings.commissionPct=.10;
  if(state.settings.slippagePct==null)state.settings.slippagePct=.10;
  if(!state.v2)state.v2={radar:[],kap:null,backtest:null,radarTimer:null,regime:null,breadth:null,optimal:null};
  state.paper=JSON.parse(localStorage.getItem("abr_paper")||"null")||{startCapital:Number(state.settings.paperCapital||100000),cash:Number(state.settings.paperCapital||100000),positions:[],trades:[],peakEquity:Number(state.settings.paperCapital||100000),startedAt:null,kill:false};
  state.signalHistory=JSON.parse(localStorage.getItem("abr_signal_history")||"[]");
  state.radarAlerts=JSON.parse(localStorage.getItem("abr_radar_alerts")||"{}");
}
function saveSignalHistory(){localStorage.setItem("abr_signal_history",JSON.stringify(state.signalHistory.slice(-500)))}
function saveRadarAlerts(){localStorage.setItem("abr_radar_alerts",JSON.stringify(state.radarAlerts))}
function sectorOf(s){if(SECTOR_MAP[s])return SECTOR_MAP[s];if(s.endsWith("GYO"))return"Gayrimenkul";if(s.endsWith("BNK"))return"Bankacılık";return"Diğer"}
function retPct(bars,n=5){if(!bars||bars.length<=n)return 0;return(bars.at(-1).c/bars.at(-1-n).c-1)*100}

function savePaper(){localStorage.setItem("abr_paper",JSON.stringify(state.paper))}
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:0}
function stdev(a){if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)))}
function percentile(a,p){if(!a.length)return 0;const x=[...a].sort((m,n)=>m-n),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?x[l]:x[l]+(x[h]-x[l])*(i-l)}
function closeReturns(bars,n=30){const x=bars.slice(-(n+1)),r=[];for(let i=1;i<x.length;i++)r.push(x[i].c/x[i-1].c-1);return r}
function emaLastFromBars(bars,p){const c=bars.map(b=>b.c);return ema(c,p).at(-1)}
function breadthFromDaily(data){
  const rows=[];let above20=0,above50=0,rsi50=0,adv=0,dec=0,newHigh=0,newLow=0,total=0;const r20=[];
  for(const s of BIST100){
    const b=data?.symbols?.[s]?.bars;if(!b||b.length<55)continue;total++;
    const c=b.map(x=>x.c),last=c.at(-1),prev=c.at(-2),e20=ema(c,20).at(-1),e50=ema(c,50).at(-1),rv=rsi(c);
    if(last>e20)above20++;if(last>e50)above50++;if(rv>50)rsi50++;if(last>prev)adv++;else if(last<prev)dec++;
    const before=b.slice(-21,-1).map(x=>x.h),beforeL=b.slice(-21,-1).map(x=>x.l);
    if(before.length&&last>=Math.max(...before))newHigh++;
    if(beforeL.length&&last<=Math.min(...beforeL))newLow++;
    r20.push(retPct(b,20));rows.push({symbol:s,last,e20,e50,rsi:rv,r20:retPct(b,20)});
  }
  return{total,above20,above50,rsi50,adv,dec,newHigh,newLow,pct20:total?above20/total*100:0,pct50:total?above50/total*100:0,pctRsi:total?rsi50/total*100:0,advPct:total?adv/total*100:0,avg20:mean(r20),rows}
}
function classifyRegime(breadth,indexDaily){
  let indexRet20=0,indexVol=0,indexTrend=0;
  if(indexDaily?.bars?.length>55){
    const b=indexDaily.bars,c=b.map(x=>x.c),last=c.at(-1),e20=ema(c,20).at(-1),e50=ema(c,50).at(-1);
    indexRet20=retPct(b,20);indexVol=stdev(closeReturns(b,20))*Math.sqrt(252)*100;
    indexTrend=last>e20&&e20>e50?1:last<e20&&e20<e50?-1:0;
  }else{
    indexRet20=breadth.avg20;indexVol=0;indexTrend=breadth.pct20>55&&breadth.pct50>50?1:breadth.pct20<35&&breadth.pct50<40?-1:0;
  }
  let key="SIDE",label="YATAY / SEÇİCİ",icon="🟡",adj=0,confidence=55;
  const highVol=indexVol>35;
  if(highVol){key="VOL";label="YÜKSEK VOLATİLİTE";icon="⚠️";adj=-6;confidence=70}
  else if(indexTrend>0&&breadth.pct20>=55&&breadth.pct50>=48&&indexRet20>0){key="BULL";label="YÜKSELİŞ";icon="🟢";adj=6;confidence=clamp(55+(breadth.pct20-50)*.8,55,92)}
  else if(indexTrend<0&&breadth.pct20<=40&&breadth.pct50<=42&&indexRet20<0){key="BEAR";label="DÜŞÜŞ";icon="🔴";adj=-12;confidence=clamp(58+(50-breadth.pct20)*.7,58,94)}
  return{key,label,icon,adj,confidence,indexRet20,indexVol,indexTrend}
}
function volumeProfile(bars,bins=24){
  const x=bars.slice(-120);if(x.length<5)return{poc:null,val:null,vah:null};
  const lo=Math.min(...x.map(b=>b.l)),hi=Math.max(...x.map(b=>b.h));if(!(hi>lo))return{poc:lo,val:lo,vah:hi};
  const step=(hi-lo)/bins,vols=Array(bins).fill(0);
  for(const b of x){const tp=(b.h+b.l+b.c)/3,idx=clamp(Math.floor((tp-lo)/step),0,bins-1);vols[idx]+=Number(b.v||0)}
  const total=vols.reduce((s,v)=>s+v,0),maxI=vols.indexOf(Math.max(...vols));const ranked=vols.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);
  let acc=0,sel=[];for(const z of ranked){sel.push(z.i);acc+=z.v;if(total&&acc/total>=.70)break}
  const minI=Math.min(...sel),maxSel=Math.max(...sel);
  return{poc:lo+(maxI+.5)*step,val:lo+minI*step,vah:lo+(maxSel+1)*step}
}
function anchoredVWAP(bars){
  const x=bars.slice(-160);if(!x.length)return null;
  const lastDate=new Date(x.at(-1).t),day=(lastDate.getDay()+6)%7;
  const monday=new Date(lastDate);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-day);
  let pv=0,v=0;for(const b of x){if(b.t<monday.getTime())continue;const vol=Number(b.v||0);pv+=((b.h+b.l+b.c)/3)*vol;v+=vol}
  if(!v){for(const b of x.slice(-40)){const vol=Number(b.v||0);pv+=((b.h+b.l+b.c)/3)*vol;v+=vol}}
  return v?pv/v:null
}
function anomalyFromAnalysis(a){
  const b=a.bars;if(b.length<25)return{score:0,retZ:0,volZ:0};
  const rets=closeReturns(b,31),cur=rets.at(-1),hist=rets.slice(0,-1),rm=mean(hist),rs=stdev(hist)||.0001,retZ=(cur-rm)/rs;
  const vols=b.slice(-31).map(x=>Math.log1p(Number(x.v||0))),curV=vols.at(-1),vh=vols.slice(0,-1),volZ=(curV-mean(vh))/(stdev(vh)||1);
  return{score:Math.sqrt(retZ*retZ+volZ*volZ),retZ,volZ}
}
function regimeClass(k){return k==="BULL"?"regimeBull":k==="BEAR"?"regimeBear":k==="VOL"?"regimeVol":"regimeSide"}
function renderRegimeBreadth(){
  const r=state.v2.regime,b=state.v2.breadth;if(!r||!b)return;
  $("#regimeBox").innerHTML=`<span class="regimeBadge ${regimeClass(r.key)}">${r.icon} ${r.label}</span>
    <div class="regimeFacts"><div class="regimeFact"><span>Güven</span><strong>%${r.confidence.toFixed(0)}</strong></div><div class="regimeFact"><span>20g endeks/ortalama</span><strong class="${r.indexRet20>=0?"positive":"negative"}">${pct(r.indexRet20)}</strong></div><div class="regimeFact"><span>Yıllıklaştırılmış vol.</span><strong>${r.indexVol?r.indexVol.toFixed(1)+"%":"—"}</strong></div></div>
    <div class="${r.key==="BEAR"||r.key==="VOL"?"riskWarn riskBad":"riskWarn riskGood"}">${r.key==="BULL"?"AL sinyallerine rejim desteği veriliyor.":r.key==="BEAR"?"Yeni AL sinyallerinin skoru ve işleme uygunluğu daha sıkı filtreleniyor.":r.key==="VOL"?"Volatilite yüksek: pozisyon boyutu ve yeni girişler daha temkinli olmalı.":"Yatay piyasa: seçici davran, R/R ve destek/direnç öncelikli."}</div>`;
  $("#breadthDetail").innerHTML=[
    ["EMA20 üstü",`${b.above20}/${b.total} • %${b.pct20.toFixed(0)}`],["EMA50 üstü",`${b.above50}/${b.total} • %${b.pct50.toFixed(0)}`],["RSI>50",`${b.rsi50}/${b.total} • %${b.pctRsi.toFixed(0)}`],
    ["Yükselen",`${b.adv}/${b.total} • %${b.advPct.toFixed(0)}`],["20g yeni zirve",`${b.newHigh}`],["20g yeni dip",`${b.newLow}`]
  ].map(x=>`<div class="breadthItem"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}
function buildOptimalPortfolio(){
  const radar=(state.v2.radar||[]).filter(e=>e.score>=60&&e.a1d.score>=45&&e.plan.rr>=1.2).slice(0,15);
  if(!radar.length){state.v2.optimal=[];renderOptimal();return[]}
  const regime=state.v2.regime?.key||"SIDE",cashPct=regime==="BEAR"?.35:regime==="VOL"?.25:regime==="SIDE"?.15:.05;
  const selected=radar.slice(0,Math.min(8,radar.length));
  const rets=Object.fromEntries(selected.map(e=>[e.symbol,returnsFromBars(e.a1d.bars,60)]));
  let rows=selected.map(e=>{
    const vol=Math.max(stdev(rets[e.symbol]||[]),.003),avgCorr=mean(selected.filter(x=>x.symbol!==e.symbol).map(x=>Math.max(0,corr(rets[e.symbol]||[],rets[x.symbol]||[])||0)));
    const quality=(e.score/100)*Math.max(.5,Math.min(1.6,e.plan.rr/2));
    return{e,raw:quality/(vol*(1+avgCorr))};
  });
  let sum=rows.reduce((s,x)=>s+x.raw,0)||1;rows.forEach(x=>x.w=x.raw/sum*(1-cashPct));
  const maxW=.28,maxSector=Number(state.settings.maxSectorPct||35)/100;
  for(let loop=0;loop<8;loop++){
    rows.forEach(x=>x.w=Math.min(x.w,maxW));
    const sectors={};rows.forEach(x=>sectors[x.e.sector]=(sectors[x.e.sector]||0)+x.w);
    for(const [sec,w] of Object.entries(sectors)){if(w>maxSector){const f=maxSector/w;rows.filter(x=>x.e.sector===sec).forEach(x=>x.w*=f)}}
    const target=1-cashPct,cur=rows.reduce((s,x)=>s+x.w,0);if(cur>0){const room=rows.filter(x=>x.w<maxW-.001);if(room.length){const add=(target-cur)/room.length;room.forEach(x=>x.w=Math.min(maxW,x.w+Math.max(0,add)))}}
  }
  const capital=Number(state.settings.capital||10000);
  const out=rows.filter(x=>x.w>.015).map(x=>({symbol:x.e.symbol,weight:x.w,amount:capital*x.w,lots:Math.floor(capital*x.w/x.e.price),score:x.e.score,price:x.e.price,stop:x.e.plan.stop,target:x.e.plan.target1,sector:x.e.sector}));
  state.v2.optimal={rows:out,cashPct,capital,regime};renderOptimal();return out
}
function renderOptimal(){
  const o=state.v2.optimal;if(!o||!o.rows?.length){$("#optimalBody").innerHTML='<tr><td colspan="5" class="empty">Uygun aday bulunamadı veya tarama bekleniyor.</td></tr>';$("#optimalSummary").textContent="Robot+ taraması sonrası hesaplanır.";return}
  $("#optimalSummary").innerHTML=`Rejim: <b>${o.regime}</b> • Hedef nakit: <b>%${(o.cashPct*100).toFixed(0)}</b> • Sermaye: <b>${money(o.capital)}</b>`;
  $("#optimalBody").innerHTML=o.rows.map(x=>`<tr><td><span class="symbol">${x.symbol}</span></td><td>%${(x.weight*100).toFixed(1)}</td><td>${money(x.amount)}</td><td>${x.lots}</td><td>${x.score}</td></tr>`).join("");
}
function paperEquity(){
  const map=Object.fromEntries((state.v2.radar||[]).map(e=>[e.symbol,e.price]));let value=state.paper.cash;
  for(const p of state.paper.positions)value+=(map[p.symbol]||p.last||p.entry)*p.lots;
  return value
}
function resetPaper(){
  const c=Number(state.settings.paperCapital||100000);state.paper={startCapital:c,cash:c,positions:[],trades:[],peakEquity:c,startedAt:null,kill:false};savePaper();renderPaper()
}
function startPaper(){
  const eq=paperEquity();if(state.paper.positions.length&&!confirm("Mevcut sanal pozisyonlar kapatılıp yeni optimum sepet başlatılsın mı?"))return;
  resetPaper();const optimal=buildOptimalPortfolio();if(!optimal.length)return alert("Sanal sepet için uygun aday yok.");
  if(state.v2.regime?.key==="BEAR"&&Number(state.settings.killDrawdownPct||7)<=7){/* bear still allowed with high cash */}
  const c=state.paper.startCapital;
  for(const x of optimal){const budget=c*x.weight,entry=x.price,lots=Math.floor(budget/entry);if(lots<1)continue;const cost=lots*entry;state.paper.cash-=cost;state.paper.positions.push({symbol:x.symbol,lots,entry,last:entry,stop:x.stop,target:x.target,openedAt:Date.now(),status:"AÇIK"})}
  state.paper.startedAt=Date.now();state.paper.peakEquity=paperEquity();savePaper();renderPaper()
}
function markPaper(){
  if(!state.paper)return;const map=Object.fromEntries((state.v2.radar||[]).map(e=>[e.symbol,e]));
  const keep=[];
  for(const p of state.paper.positions){const e=map[p.symbol],price=e?.price||p.last||p.entry;p.last=price;let exitReason=null;if(price<=p.stop)exitReason="STOP";else if(price>=p.target)exitReason="HEDEF";
    if(exitReason){const proceeds=p.lots*price;state.paper.cash+=proceeds;state.paper.trades.push({symbol:p.symbol,lots:p.lots,entry:p.entry,exit:price,ret:(price/p.entry-1)*100,reason:exitReason,closedAt:Date.now()})}else keep.push(p)}
  state.paper.positions=keep;const eq=paperEquity();state.paper.peakEquity=Math.max(state.paper.peakEquity||eq,eq);const dd=state.paper.peakEquity?100*(eq/state.paper.peakEquity-1):0;state.paper.kill=dd<=-Number(state.settings.killDrawdownPct||7);savePaper();renderPaper()
}
function renderPaper(){
  if(!state.paper)return;const eq=paperEquity(),pnl=eq-state.paper.startCapital,pctPn=state.paper.startCapital?pnl/state.paper.startCapital*100:0;state.paper.peakEquity=Math.max(state.paper.peakEquity||eq,eq);const dd=state.paper.peakEquity?(eq/state.paper.peakEquity-1)*100:0;
  $("#paperSummary").innerHTML=`<div><span>Başlangıç</span><strong>${money(state.paper.startCapital)}</strong></div><div><span>Anlık değer</span><strong>${money(eq)}</strong></div><div><span>K/Z</span><strong class="${pnl>=0?"positive":"negative"}">${money(pnl)} (${pct(pctPn)})</strong></div><div><span>Drawdown</span><strong class="${dd<0?"negative":"neutral"}">${pct(dd)}</strong></div><div><span>Risk koruması</span><strong class="${state.paper.kill?"killOn":"killOff"}">${state.paper.kill?"KILL-SWITCH AKTİF":"NORMAL"}</strong></div>`;
  $("#paperBody").innerHTML=state.paper.positions.length?state.paper.positions.map(p=>{const k=(p.last-p.entry)*p.lots,pp=(p.last/p.entry-1)*100;return`<tr><td>${p.symbol}</td><td>${p.lots}</td><td>${fmt2(p.entry)}</td><td>${fmt2(p.last)}</td><td class="${k>=0?"positive":"negative"}">${money(k)} (${pct(pp)})</td><td>${fmt2(p.stop)}</td><td>${fmt2(p.target)}</td><td>${state.paper.kill?"RİSK KORUMA":"AÇIK"}</td></tr>`}).join(""):'<tr><td colspan="8" class="empty">Açık sanal pozisyon yok.</td></tr>';
  const t=state.paper.trades.slice(-8).reverse();$("#paperTrades").innerHTML=t.length?`<b>Son kapanan sanal işlemler:</b> ${t.map(x=>`${x.symbol} ${x.reason} ${pct(x.ret)}`).join(" • ")}`:"Henüz kapanan sanal işlem yok.";
}

function supportResistanceFromBars(bars,price){
  const x=bars.slice(-70);let lows=[],highs=[];
  for(let i=2;i<x.length-2;i++){
    if(x[i].l<=x[i-1].l&&x[i].l<=x[i-2].l&&x[i].l<=x[i+1].l&&x[i].l<=x[i+2].l)lows.push(x[i].l);
    if(x[i].h>=x[i-1].h&&x[i].h>=x[i-2].h&&x[i].h>=x[i+1].h&&x[i].h>=x[i+2].h)highs.push(x[i].h);
  }
  const below=lows.filter(v=>v<price).sort((a,b)=>b-a);
  const above=highs.filter(v=>v>price).sort((a,b)=>a-b);
  const fallbackLow=Math.min(...x.slice(-20).map(b=>b.l));
  const fallbackHigh=Math.max(...x.slice(-20).map(b=>b.h));
  return{support:below[0]||fallbackLow,resistance:above[0]||fallbackHigh}
}
function buildTradePlan(e){
  const price=e.price, atrv=e.a1h.atr||e.a15.atr||price*.02, sr=e.sr;
  let stop=Math.max(price-atrv*Number(state.settings.atrMult||1.8),sr.support-atrv*.2);
  if(!Number.isFinite(stop)||stop>=price)stop=price-atrv*1.8;
  const risk=Math.max(price-stop,price*.003);
  let target1=sr.resistance>price*1.002?sr.resistance:price+risk*2;
  const rr=(target1-price)/risk;
  const target2=price+risk*3;
  const riskTL=Number(state.settings.capital||10000)*Number(state.settings.riskPct||1.5)/100;
  return{stop,risk,target1,target2,rr,maxLots:Math.max(0,Math.floor(riskTL/risk))}
}
async function loadKapData(){
  // KAP'ın resmi otomatik REST veri servisi lisans/API key gerektirir.
  // Ücretsiz sürümde otomatik KAP sonucu varmış gibi davranmayız.
  state.v2.kap={
    updatedAt:null,
    items:[],
    manual:true,
    error:"Otomatik KAP veri servisi bu ücretsiz sürümde bağlı değil.",
    _loadedAt:Date.now()
  };
  return state.v2.kap;
}
function kapManualUrl(symbol){
  return "https://www.kap.org.tr/tr/bildirim-sorgu";
}
function kapFor(symbol){
  const items=state.v2.kap?.items||[];
  return items.filter(x=>(x.symbols||[]).includes(symbol)).slice(0,5);
}
function recentKap(symbol,hours=24){
  if(state.v2.kap?.manual)return null;
  const n=kapFor(symbol);if(!n.length)return false;
  const t=Date.parse(n[0].date||n[0].publishedAt||0);return Number.isFinite(t)&&(Date.now()-t)<=hours*3600000;
}
async function mtfAnalyze(symbol,index1h=null,regime=null){
  const [a15,a1h,a1d]=await Promise.all([getAnalysis(symbol,"15m"),getAnalysis(symbol,"1h"),getAnalysis(symbol,"1d")]);
  let score=.35*a15.score+.40*a1h.score+.25*a1d.score;
  const aligned=[a15.score,a1h.score,a1d.score].filter(x=>x>=58).length;
  if(aligned===3)score+=5;if(a1d.score<45)score-=8;
  let rs=0;
  if(index1h){rs=retPct(a1h.bars,20)-retPct(index1h.bars,20);score+=clamp(rs*1.5,-8,8)}
  if(regime)score+=regime.adj;
  score=Math.round(clamp(score,0,100));
  const sr=supportResistanceFromBars(a1h.bars,a1h.price);
  const vp=volumeProfile(a1h.bars),vwap=anchoredVWAP(a15.bars),anomaly=anomalyFromAnalysis(a15);
  if(vwap&&a1h.price>vwap)score=Math.min(100,score+2);
  if(vp.poc&&Math.abs(a1h.price/vp.poc-1)<.01)score=Math.min(100,score+1);
  const e={symbol,price:a1h.price,a15,a1h,a1d,score,aligned,rs,sr,vp,vwap,anomaly,sector:sectorOf(symbol),regime:regime?.key||"SIDE"};
  e.plan=buildTradePlan(e);
  e.kap=kapFor(symbol);
  e.kapRecent=recentKap(symbol,24);
  e.kapManual=!!state.v2.kap?.manual;
  const breakoutDist=sr.resistance>e.price?(sr.resistance/e.price-1)*100:0;
  e.breakoutDist=breakoutDist;
  e.early=(score>=64&&score<74)||(breakoutDist>=0&&breakoutDist<=1.5&&a15.rvol>=1.1&&a1h.score>=58);
  const minRR=Number(state.settings.minRR||2);
  const threshold=regime?.key==="BEAR"?82:regime?.key==="VOL"?78:72;
  e.tradeable=score>=threshold&&e.plan.rr>=minRR&&a1d.score>=52&&e.kapRecent!==true;
  if(e.kapRecent===true)e.verdict="KAP KONTROL";
  else if(score>=82&&e.plan.rr>=minRR&&a1d.score>=58)e.verdict="GÜÇLÜ AL";
  else if(e.tradeable)e.verdict="AL ADAYI";
  else if(e.early)e.verdict="ERKEN UYARI";
  else if(score>=58)e.verdict="İZLE";
  else e.verdict="BEKLE";
  return e;
}
function scoreClass(v){return v>=72?"buy":v>=58?"watch":v<45?"sell":"neutral"}
function fmt2(v){return Number.isFinite(v)?fmt.format(v):"—"}
function mtfDots(e){return`<span class="mtfDots"><span class="mtfDot ${e.a15.score>=58?"on":"bad"}"></span><span class="mtfDot ${e.a1h.score>=58?"on":"bad"}"></span><span class="mtfDot ${e.a1d.score>=58?"on":"bad"}"></span></span>`}
async function refreshRadar(silent=false){
  if(!state.v2)return;
  const btn=$("#refreshRadarBtn"),run=$("#robotRunStatus");
  const universeMode=$("#radarUniverse")?.value||"bist100";
  await loadUniverse();
  const radarSymbols=universeMode==="all"?state.allSymbols:BIST100;
  const uLabel=universeMode==="all"?"BIST TÜM":"BIST100";

  if(btn){btn.disabled=true;btn.textContent="⏳ TARANIYOR…"}
  if(run){run.className="robotRunStatus running";run.textContent=`${uLabel} veri dosyaları kontrol ediliyor…`}
  if(!silent)setStatus(`Robot+ ${uLabel} taranıyor`,"warn");

  try{
    await loadQuotes(true);
    await loadKapData();

    const dailyData=await loadMarketFile("data/daily.json");
    const intradayData=await loadMarketFile("data/intraday.json");
    const dailyCount=Object.keys(dailyData?.symbols||{}).filter(s=>BIST100.includes(s)).length;
    const intraCount=Object.keys(intradayData?.symbols||{}).filter(s=>BIST100.includes(s)).length;
    if(dailyCount<50||intraCount<50){
      throw new Error(`BIST100 veri dosyası eksik: günlük ${dailyCount}, gün içi ${intraCount}. Actions > Update BIST market data çalıştırın.`);
    }

    if(universeMode==="all"){
      const allDaily=await loadMarketFile("data/all_daily.json");
      const allIntra=await loadMarketFile("data/all_intraday.json");
      const ad=Object.keys(allDaily?.symbols||{}).length, ai=Object.keys(allIntra?.symbols||{}).length;
      if(ad<100||ai<100){
        throw new Error(`BIST TÜM verisi hazır değil: günlük ${ad}, gün içi ${ai}. Actions > Update BIST TUM market data çalıştırın.`);
      }
    }

    state.v2.breadth=breadthFromDaily(dailyData);
    let indexDaily=null,index1h=null;
    try{indexDaily=await getAnalysis("XU100","1d")}catch(_){}
    try{index1h=await getAnalysis("XU100","1h")}catch(_){}
    state.v2.regime=classifyRegime(state.v2.breadth,indexDaily);
    renderRegimeBreadth();

    const results=[],failures=[];
    const batchSize=universeMode==="all"?20:25;
    for(let i=0;i<radarSymbols.length;i+=batchSize){
      const batch=radarSymbols.slice(i,i+batchSize);
      const settled=await Promise.allSettled(batch.map(s=>mtfAnalyze(s,index1h,state.v2.regime)));
      settled.forEach((x,j)=>{
        if(x.status==="fulfilled")results.push(x.value);
        else failures.push({symbol:batch[j],error:x.reason?.message||String(x.reason||"hata")});
      });
      if(run){
        const done=Math.min(i+batch.length,radarSymbols.length);
        run.textContent=`${uLabel}: ${done}/${radarSymbols.length} analiz edildi • başarılı ${results.length}`;
      }
      await sleep(10);
    }

    state.v2.radar=results.sort((a,b)=>b.score-a.score);
    if(!state.v2.radar.length)throw new Error(failures[0]?.error||"Hiçbir hisse analiz edilemedi.");

    renderRadar();
    logDailySignals();
    await evaluateSignalHistory();
    await renderPortfolioRisk();
    buildOptimalPortfolio();
    markPaper();
    maybeRadarAlerts();

    if(run){
      run.className="robotRunStatus ok";
      run.textContent=`✓ ${uLabel}: ${results.length} hisse analiz edildi${failures.length?` • ${failures.length} veri dışı/eksik`:""} • Top 10 hazır.`;
    }
    if(!silent)setStatus("Robot+ taraması tamam","good");
  }catch(err){
    console.error("Robot+ scan error",err);
    if(run){run.className="robotRunStatus error";run.textContent=`Robot+ çalışmadı: ${err.message}`}
    if($("#radarInfo"))$("#radarInfo").textContent=`Hata: ${err.message}`;
    if(!silent)setStatus("Robot+ veri hatası","warn");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="🔎 BUGÜN NE ALABİLİRİM? — TARA"}
  }
}

function addCandidate(symbol){
  const e=(state.v2?.radar||[]).find(x=>x.symbol===symbol)||[...state.scanCache.values()].find(x=>x.symbol===symbol);
  if(!state.candidateBasket.some(x=>x.symbol===symbol)){
    state.candidateBasket.push({symbol,addedAt:Date.now(),addedPrice:e?.price||null,addedScore:e?.score||null});
    saveCandidateBasket();
  }
  renderCandidateBasket();
}
function removeCandidate(symbol){state.candidateBasket=state.candidateBasket.filter(x=>x.symbol!==symbol);saveCandidateBasket();renderCandidateBasket()}
function preparePortfolioFromCandidate(symbol){
  const e=(state.v2?.radar||[]).find(x=>x.symbol===symbol);
  $$(".tab").forEach(x=>x.classList.remove("active"));$$(".tabPane").forEach(x=>x.classList.remove("active"));
  $('.tab[data-tab="portfolio"]')?.classList.add("active");$("#portfolio")?.classList.add("active");
  $("#pfSymbol").value=symbol;if(e?.price)$("#pfPrice").value=e.price.toFixed(2);$("#pfLots").focus();window.scrollTo({top:0,behavior:"smooth"});
}
function renderCandidateBasket(){
  const b=$("#candidateBody");if(!b)return;
  $("#candidateCount").textContent=`${state.candidateBasket.length} hisse`;
  if(!state.candidateBasket.length){b.innerHTML='<tr><td colspan="8" class="empty">Henüz aday sepete hisse eklenmedi.</td></tr>';return}
  b.innerHTML=state.candidateBasket.map(x=>{
    const e=(state.v2?.radar||[]).find(r=>r.symbol===x.symbol);const price=e?.price??x.addedPrice,score=e?.score??x.addedScore,ret=(price&&x.addedPrice)?(price/x.addedPrice-1)*100:null;
    return `<tr><td><span class="symbol">${x.symbol}</span></td><td>${new Date(x.addedAt).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td>${x.addedPrice?fmt2(x.addedPrice):"—"}</td><td>${price?fmt2(price):"—"}</td><td class="${ret==null?"neutral":ret>=0?"positive":"negative"}">${ret==null?"—":pct(ret)}</td><td>${score??"—"}</td><td><button class="miniBtn candPortfolio" data-s="${x.symbol}">Portföye Aktar</button></td><td><button class="miniBtn candRemove" data-s="${x.symbol}">Çıkar</button></td></tr>`;
  }).join("");
  $$(".candRemove").forEach(x=>x.onclick=()=>removeCandidate(x.dataset.s));$$(".candPortfolio").forEach(x=>x.onclick=()=>preparePortfolioFromCandidate(x.dataset.s));
}

function renderRadar(){
  const r=state.v2.radar||[],top=r.slice(0,10);
  const uLabel=($("#radarUniverse")?.value||"bist100")==="all"?"BIST TÜM":"BIST100";
  $("#radarInfo").textContent=r.length?`${uLabel} • ${r.length} hisse analiz edildi • Çoklu zaman dilimi + R/R + relatif güç • ${new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`:"Veri alınamadı.";
  $("#top10Body").innerHTML=top.length?top.map((e,i)=>`<tr>
    <td>${i+1}</td><td><button class="miniBtn v2Detail" data-s="${e.symbol}"><span class="symbol">${e.symbol}</span></button></td>
    <td><span class="score">${e.score}</span> ${mtfDots(e)}</td>
    <td>${e.a15.score}</td><td>${e.a1h.score}</td><td>${e.a1d.score}</td>
    <td class="${e.rs>=0?"positive":"negative"}">${pct(e.rs)}</td><td>${e.a15.rvol.toFixed(2)}x</td>
    <td>${fmt2(e.sr.support)}</td><td>${fmt2(e.sr.resistance)}</td>
    <td class="${e.plan.rr>=Number(state.settings.minRR||2)?"rrGood":"rrBad"}">1:${e.plan.rr.toFixed(2)}</td>
    <td>${e.kapManual?`<a class="buttonLink miniBtn" target="_blank" rel="noopener" href="${kapManualUrl(e.symbol)}">KAP'ta Kontrol</a>`:(e.kapRecent===true?'<span class="kapWarn">⚠ Yeni</span>':(e.kap.length?"KAP":"—"))}</td>
    <td><span class="sig ${e.verdict.includes("AL")?"buy":e.verdict.includes("UYARI")||e.verdict.includes("KAP")?"watch":"neutral"}">${e.verdict}</span></td>
    <td><button class="miniBtn candidateAdd" data-s="${e.symbol}">➕ Sepete Ekle</button></td>
  </tr>`).join(""):`<tr><td colspan="14" class="empty">Veri yok.</td></tr>`;
  $$(".v2Detail").forEach(b=>b.onclick=()=>openDetail(b.dataset.s));
  $$(".candidateAdd").forEach(b=>b.onclick=()=>addCandidate(b.dataset.s));
  renderCandidateBasket();
  const early=r.filter(e=>e.early&&!e.tradeable).slice(0,10);
  $("#earlyBody").innerHTML=early.length?early.map(e=>`<tr><td><span class="symbol">${e.symbol}</span></td><td>${e.score}</td><td>${e.breakoutDist.toFixed(2)}%</td><td>${e.a15.rvol.toFixed(2)}x</td><td><span class="sig watch">${e.verdict}</span></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Erken uyarı yok.</td></tr>`;
  const breadth=state.v2.breadth?.pct20 ?? (r.length?r.filter(e=>e.score>=58).length/r.length*100:0);
  $("#breadthStat").textContent=`%${Math.round(breadth)}`;
  $("#tradeableStat").textContent=r.filter(e=>e.tradeable).length;
  $("#earlyStat").textContent=early.length;
  $("#kapStat").textContent=state.v2.kap?.manual?"MANUEL":r.filter(e=>e.kapRecent===true).length;
  const anomalies=r.filter(e=>e.anomaly?.score>=2.2).sort((a,b)=>b.anomaly.score-a.anomaly.score).slice(0,12);
  $("#anomalyBody").innerHTML=anomalies.length?anomalies.map(e=>`<tr><td>${e.symbol}</td><td class="${e.a15.change>=0?"anomalyPos":"anomalyHot"}">${e.anomaly.score.toFixed(2)}</td><td class="${e.a15.change>=0?"positive":"negative"}">${pct(e.a15.change)}</td><td>${e.a15.rvol.toFixed(2)}x</td><td>${e.score}</td><td>${Math.abs(e.anomaly.volZ)>2?"Hacim anomalisi":Math.abs(e.anomaly.retZ)>2?"Fiyat anomalisi":"Karma anomali"}</td></tr>`).join(""):`<tr><td colspan="6" class="empty">Belirgin anomali yok.</td></tr>`;
  renderSectorRadar();
  renderKapNews();
}
function renderSectorRadar(){
  const groups={};
  for(const e of state.v2.radar){if(!groups[e.sector])groups[e.sector]=[];groups[e.sector].push(e)}
  const rows=Object.entries(groups).map(([sector,a])=>({sector,score:a.reduce((s,x)=>s+x.score,0)/a.length,count:a.length,best:[...a].sort((x,y)=>y.score-x.score)[0]})).sort((a,b)=>b.score-a.score);
  $("#sectorRadar").innerHTML=rows.slice(0,12).map(x=>`<div class="sectorCard"><div class="sectorTop"><strong>${x.sector}</strong><span>${x.score.toFixed(0)}/100</span></div><div class="sectorBar"><span style="width:${clamp(x.score,0,100)}%"></span></div><small>${x.count} hisse • lider ${x.best.symbol} (${x.best.score})</small></div>`).join("");
}
function renderKapNews(){
  const data=state.v2.kap;
  if(data?.manual){
    $("#kapNewsBody").innerHTML=`<tr><td colspan="4" class="empty">
      Otomatik KAP kontrolü bu ücretsiz sürümde devre dışı. Resmî KAP REST servisi lisans/API key gerektiriyor.
      <br><br><a class="buttonLink" target="_blank" rel="noopener" href="https://www.kap.org.tr/tr/bildirim-sorgu">Resmî KAP Bildirim Sorgusu</a>
    </td></tr>`;
    return;
  }
  if(!data||data.error){$("#kapNewsBody").innerHTML=`<tr><td colspan="4" class="empty">KAP veri servisi kullanılamıyor.</td></tr>`;return}
  const interest=new Set([...state.portfolio.map(p=>p.symbol),...state.watchlist,...state.v2.radar.slice(0,10).map(e=>e.symbol)]);
  const rows=(data.items||[]).filter(x=>(x.symbols||[]).some(s=>interest.has(s))).slice(0,30);
  $("#kapNewsBody").innerHTML=rows.length?rows.map(x=>`<tr><td>${x.date?new Date(x.date).toLocaleString("tr-TR"):"—"}</td><td>${(x.symbols||[]).join(", ")}</td><td>${x.title||x.subject||"Bildirim"}</td><td>${x.url?`<a class="buttonLink miniBtn" target="_blank" rel="noopener" href="${x.url}">KAP</a>`:"—"}</td></tr>`).join(""):`<tr><td colspan="4" class="empty">İlgili yakın tarihli KAP bildirimi bulunamadı.</td></tr>`;
}
function returnsFromBars(bars,n=60){const x=bars.slice(-(n+1)),r=[];for(let i=1;i<x.length;i++)r.push(x[i].c/x[i-1].c-1);return r}
function corr(a,b){const n=Math.min(a.length,b.length);if(n<10)return null;const x=a.slice(-n),y=b.slice(-n),mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n;let num=0,dx=0,dy=0;for(let i=0;i<n;i++){const ax=x[i]-mx,by=y[i]-my;num+=ax*by;dx+=ax*ax;dy+=by*by}return dx&&dy?num/Math.sqrt(dx*dy):null}
async function renderPortfolioRisk(){
  const box=$("#portfolioRiskBox"),cb=$("#correlationBox");
  if(!state.portfolio.length){box.innerHTML='<div class="empty">Gerçek portföyünüze pozisyon eklediğinizde sektör ve risk analizi burada görünür.</div>';cb.innerHTML='<div class="empty">En az iki pozisyon gerekli.</div>';return}
  let total=0,sectorVals={};for(const p of state.portfolio){const v=(p.last||p.buyPrice)*p.lots;total+=v;sectorVals[sectorOf(p.symbol)]=(sectorVals[sectorOf(p.symbol)]||0)+v}
  const maxSector=Number(state.settings.maxSectorPct||35);
  const realPnlPct=state.portfolio.reduce((s,p)=>s+((p.last||p.buyPrice)-p.buyPrice)*p.lots,0)/Math.max(1,state.portfolio.reduce((s,p)=>s+p.buyPrice*p.lots,0))*100;
  const realKill=realPnlPct<=-Number(state.settings.killDrawdownPct||7);
  const sectorRows=Object.entries(sectorVals).sort((a,b)=>b[1]-a[1]);
  const warns=sectorRows.filter(([_,v])=>v/total*100>maxSector);
  box.innerHTML=(realKill?`<div class="riskWarn riskBad">⛔ KILL-SWITCH: Gerçek portföy K/Z ${pct(realPnlPct)}. Yeni AL sinyallerini uygulamadan önce riski gözden geçirin.</div>`:"")+`<div class="${warns.length?"riskWarn riskBad":"riskWarn riskGood"}">${warns.length?`⚠ Sektör yoğunlaşması: ${warns.map(([s,v])=>`${s} %${(v/total*100).toFixed(0)}`).join(", ")}`:"✓ Sektör yoğunlaşması belirlenen sınırlar içinde."}</div>`+
    sectorRows.map(([s,v])=>`<div class="sectorCard"><div class="sectorTop"><span>${s}</span><strong>%${(v/total*100).toFixed(1)}</strong></div><div class="sectorBar"><span style="width:${v/total*100}%"></span></div></div>`).join("");
  if(state.portfolio.length<2){cb.innerHTML='<div class="empty">En az iki pozisyon gerekli.</div>';return}
  const syms=[...new Set(state.portfolio.map(p=>p.symbol))];
  const arr={};for(const s of syms){try{arr[s]=returnsFromBars((await getAnalysis(s,"1d")).bars,60)}catch(_){}}
  let html='<div class="tableWrap"><table class="corrTable"><thead><tr><th></th>'+syms.map(s=>`<th>${s}</th>`).join("")+'</tr></thead><tbody>';
  for(const s1 of syms){html+=`<tr><th>${s1}</th>`;for(const s2 of syms){const c=s1===s2?1:corr(arr[s1]||[],arr[s2]||[]);const cls=c!=null&&c>=.75?"corrHot":c!=null&&c<.3?"corrCool":"";html+=`<td class="${cls}">${c==null?"—":c.toFixed(2)}</td>`}html+='</tr>'}html+='</tbody></table></div>';
  const hot=[];for(let i=0;i<syms.length;i++)for(let j=i+1;j<syms.length;j++){const c=corr(arr[syms[i]]||[],arr[syms[j]]||[]);if(c!=null&&c>=.75)hot.push(`${syms[i]}–${syms[j]} ${c.toFixed(2)}`)}
  cb.innerHTML=(hot.length?`<div class="riskWarn riskBad">⚠ Yüksek korelasyon: ${hot.join(", ")}</div>`:`<div class="riskWarn riskGood">✓ Çok yüksek korelasyon çifti görülmedi.</div>`)+html;
}
function dailySupportResistance(bars,idx,price){
  const x=bars.slice(Math.max(0,idx-40),idx+1);return supportResistanceFromBars(x,price)
}
function backtestSymbol(symbol,bars){
  const hold=Number(state.settings.backtestHoldDays||5),trades=[];let prevScore=0;
  for(let i=55;i<bars.length-hold-1;i++){
    const prefix=bars.slice(0,i+1),a=analyze({symbol,bars:prefix,fetchedAt:Date.now(),tf:"1d"});
    if(a.score>=70&&prevScore<70){
      const price=a.price,sr=dailySupportResistance(bars,i,price),atrv=a.atr||price*.02;
      let stop=Math.max(price-atrv*1.8,sr.support-atrv*.2);if(stop>=price)stop=price-atrv*1.8;
      const risk=price-stop,target=price+risk*2;let exit=bars[i+hold].c,reason="Süre";
      for(let j=i+1;j<=i+hold;j++){if(bars[j].l<=stop){exit=stop;reason="Stop";break}if(bars[j].h>=target){exit=target;reason="Hedef";break}}
      const gross=(exit/price-1)*100,cost=2*(Number(state.settings.commissionPct||0)+Number(state.settings.slippagePct||0));
      trades.push({symbol,date:bars[i].t,entry:price,exit,ret:gross-cost,reason});
      i+=Math.max(1,Math.floor(hold/2));
    }
    prevScore=a.score;
  }
  return trades
}
async function runBacktest(){
  setStatus("Backtest çalışıyor","warn");$("#backtestDetails").textContent="BIST100 son 6 aylık günlük veride test ediliyor…";
  const data=await loadMarketFile("data/daily.json");let trades=[];
  for(const s of BIST100){const bars=data?.symbols?.[s]?.bars;if(bars?.length>65)trades.push(...backtestSymbol(s,bars))}
  const wins=trades.filter(t=>t.ret>0),loss=trades.filter(t=>t.ret<=0),sumPos=wins.reduce((s,t)=>s+t.ret,0),sumNeg=Math.abs(loss.reduce((s,t)=>s+t.ret,0));
  const hit=trades.length?wins.length/trades.length*100:0,avg=trades.length?trades.reduce((s,t)=>s+t.ret,0)/trades.length:0,pf=sumNeg?sumPos/sumNeg:(sumPos?99:0);
  let equity=100,peak=100,maxDD=0;for(const t of [...trades].sort((a,b)=>a.date-b.date)){equity*=1+t.ret/100;peak=Math.max(peak,equity);maxDD=Math.min(maxDD,(equity/peak-1)*100)}
  const expectancy=avg;
  state.v2.backtest={trades,hit,avg,pf,maxDD,expectancy};$("#backtestSummary").innerHTML=`<div><span>İşlem</span><strong>${trades.length}</strong></div><div><span>Başarı</span><strong>%${hit.toFixed(1)}</strong></div><div><span>Ort. sonuç</span><strong class="${avg>=0?"positive":"negative"}">${pct(avg)}</strong></div><div><span>Profit factor</span><strong>${pf.toFixed(2)}</strong></div><div><span>Max drawdown</span><strong class="negative">${pct(maxDD)}</strong></div><div><span>Expectancy</span><strong class="${expectancy>=0?"positive":"negative"}">${pct(expectancy)}</strong></div>`;
  const bySector={};for(const t of trades){const s=sectorOf(t.symbol);if(!bySector[s])bySector[s]=[];bySector[s].push(t)}
  const sect=Object.entries(bySector).map(([s,a])=>({s,avg:a.reduce((z,t)=>z+t.ret,0)/a.length,hit:a.filter(t=>t.ret>0).length/a.length*100,n:a.length})).sort((a,b)=>b.avg-a.avg);
  $("#backtestDetails").innerHTML=`<b>En iyi sektörler:</b> ${sect.slice(0,3).map(x=>`${x.s} ${pct(x.avg)} / %${x.hit.toFixed(0)} başarı`).join(" • ")}<br><small>Test komisyon + slipaj ayarlarını içerir. Tarihsel sonuç gelecekteki performans garantisi değildir.</small>`;
  setStatus("Backtest tamam","good");
}
function logDailySignals(){
  const day=new Date().toISOString().slice(0,10);
  for(const e of state.v2.radar.filter(x=>x.score>=72&&x.plan.rr>=Number(state.settings.minRR||2)).slice(0,15)){
    const key=`${day}|${e.symbol}`;if(state.signalHistory.some(x=>x.key===key))continue;
    state.signalHistory.push({key,date:day,ts:Date.now(),symbol:e.symbol,score:e.score,entry:e.price,result:null});
  }saveSignalHistory();renderJournal();
}
async function evaluateSignalHistory(){
  if(!state.signalHistory.length){renderJournal();return}
  const data=await loadMarketFile("data/daily.json"),hold=Number(state.settings.backtestHoldDays||5);
  for(const x of state.signalHistory){if(x.result!=null)continue;const bars=data?.symbols?.[x.symbol]?.bars||[];const targetDate=new Date(x.ts);let idx=bars.findIndex(b=>b.t>=targetDate.getTime());if(idx<0)continue;if(idx+hold<bars.length){const exit=bars[idx+hold].c;x.result=(exit/x.entry-1)*100;x.exit=exit;x.evaluatedAt=bars[idx+hold].t}}
  saveSignalHistory();renderJournal();
}
function renderJournal(){
  const h=state.signalHistory||[],done=h.filter(x=>x.result!=null),wins=done.filter(x=>x.result>0),avg=done.length?done.reduce((s,x)=>s+x.result,0)/done.length:0;
  $("#journalSummary").innerHTML=`<div><span>Kayıt</span><strong>${h.length}</strong></div><div><span>Sonuçlanan</span><strong>${done.length}</strong></div><div><span>Başarı</span><strong>${done.length?`%${(wins.length/done.length*100).toFixed(1)}`:"—"}</strong></div><div><span>Ort. sonuç</span><strong class="${avg>=0?"positive":"negative"}">${done.length?pct(avg):"—"}</strong></div>`;
  $("#journalBody").innerHTML=h.length?[...h].slice(-30).reverse().map(x=>`<tr><td>${x.date}</td><td>${x.symbol}</td><td>${x.score}</td><td>${fmt2(x.entry)}</td><td class="${x.result==null?"neutral":x.result>=0?"positive":"negative"}">${x.result==null?"Bekliyor":pct(x.result)}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">Henüz kayıt yok.</td></tr>`;
}
function maybeRadarAlerts(){
  const day=new Date().toISOString().slice(0,10);let sent=0;
  for(const e of state.v2.radar){
    if(sent>=3)break;const level=e.score>=85&&e.tradeable?"GÜÇLÜ AL":e.early?"ERKEN UYARI":null;if(!level)continue;
    const key=`${day}|${e.symbol}|${level}`;if(state.radarAlerts[key])continue;
    const kapMsg=e.kapManual?"KAP manuel kontrol gerekli.":(e.kapRecent===true?"Yeni KAP bildirimi var.":"KAP kritik uyarısı yok.");
    notify(`${level}: ${e.symbol}`,`${e.symbol} Robot+ ${e.score}/100. Risk getiri 1:${e.plan.rr.toFixed(1)}. ${kapMsg}`);
    state.radarAlerts[key]=Date.now();sent++;
  }saveRadarAlerts();
}
async function analyzeDirectSymbol(){
  const input=$("#directSymbol"),box=$("#directResult"),symbol=input.value.trim().toUpperCase().replace(".IS","");
  if(!symbol){box.innerHTML='<span class="negative">Bir hisse kodu girin.</span>';return}
  if(!isKnownSymbol(symbol)){box.innerHTML=`<span class="negative">${symbol} güncel BIST TÜM veri setinde bulunamadı.</span>`;return}
  box.innerHTML=`<span>${symbol} çoklu zaman diliminde analiz ediliyor…</span>`;
  try{
    await loadKapData();let ix=null;try{ix=await getAnalysis("XU100","1h")}catch(_){}
    const e=await mtfAnalyze(symbol,ix,state.v2.regime);
    box.innerHTML=`<div style="display:flex;gap:13px;flex-wrap:wrap;align-items:center"><b>${e.symbol}</b><span>${money(e.price)}</span><span><b>Robot+ ${e.score}/100</b></span><span class="sig ${scoreClass(e.score)}">${e.verdict}</span><span>15dk ${e.a15.score}</span><span>1s ${e.a1h.score}</span><span>Günlük ${e.a1d.score}</span><span>Relatif ${pct(e.rs)}</span><span>Destek ${fmt2(e.sr.support)}</span><span>Direnç ${fmt2(e.sr.resistance)}</span><span>Stop ${fmt2(e.plan.stop)}</span><span>H1 ${fmt2(e.plan.target1)}</span><span>H2 ${fmt2(e.plan.target2)}</span><span>POC ${fmt2(e.vp.poc)}</span><span>VWAP ${fmt2(e.vwap)}</span><span class="${e.plan.rr>=Number(state.settings.minRR||2)?"rrGood":"rrBad"}">R/R 1:${e.plan.rr.toFixed(2)}</span>${e.kapManual?'<span class="kapWarn">KAP: MANUEL KONTROL</span>':(e.kapRecent===true?'<span class="kapWarn">⚠ Yeni KAP</span>':'')}<button id="directDetailBtn" class="miniBtn">Detay / Grafik</button><button id="directCandidateBtn" class="miniBtn">➕ Aday Sepete Ekle</button></div>`;
    $("#directDetailBtn").onclick=()=>openDetail(symbol);if($("#directCandidateBtn"))$("#directCandidateBtn").onclick=()=>addCandidate(symbol);
  }catch(err){box.innerHTML=`<span class="negative">${symbol} analiz edilemedi: ${err.message}</span>`}
}
async function openDetail(symbol){
  try{
    await loadKapData();let ix=null;try{ix=await getAnalysis("XU100","1h")}catch(_){}
    const e=await mtfAnalyze(symbol,ix,state.v2.regime);state.detail=e.a15;
    $("#detailTitle").textContent=`${symbol} • ${money(e.price)} • Robot+ ${e.score}/100`;
    $("#detailMetrics").innerHTML=[
      ["Karar",e.verdict],["Rejim",e.regime],["15 dk",e.a15.score],["1 saat",e.a1h.score],["Günlük",e.a1d.score],["RS",pct(e.rs)],["RVOL",`${e.a15.rvol.toFixed(2)}x`],
      ["Destek",fmt2(e.sr.support)],["Direnç",fmt2(e.sr.resistance)],["POC",fmt2(e.vp.poc)],["Value Area",`${fmt2(e.vp.val)}–${fmt2(e.vp.vah)}`],["Haftalık VWAP",fmt2(e.vwap)],["Anomali",e.anomaly.score.toFixed(2)],
      ["Stop",fmt2(e.plan.stop)],["Hedef 1",fmt2(e.plan.target1)],["Hedef 2",fmt2(e.plan.target2)],["R/R",`1:${e.plan.rr.toFixed(2)}`]
    ].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
    const kapText=e.kapManual
      ? `<div class="reason kapWarn">KAP otomatik kontrolü bağlı değil. İşlem öncesi resmî KAP sayfasından manuel kontrol edin.</div>`
      : (e.kap.length?`<div class="reason kapWarn">⚠ ${e.kap.length} yakın tarihli KAP bildirimi bulundu; işlem öncesi kontrol edin.</div>`:"");
    $("#detailReasons").innerHTML=kapText+e.a15.reasons.map(r=>`<div class="reason">• ${r}</div>`).join("");
    drawChart(e.a15);$("#detailModal").classList.remove("hidden");
  }catch(err){alert(`Analiz alınamadı: ${err.message}`)}
}
function loadV2Settings(){
  if($("#minRR"))$("#minRR").value=state.settings.minRR;
  if($("#maxSectorPct"))$("#maxSectorPct").value=state.settings.maxSectorPct;
  if($("#backtestHoldDays"))$("#backtestHoldDays").value=state.settings.backtestHoldDays;
  if($("#paperCapital"))$("#paperCapital").value=state.settings.paperCapital;
  if($("#killDrawdownPct"))$("#killDrawdownPct").value=state.settings.killDrawdownPct;
  if($("#commissionPct"))$("#commissionPct").value=state.settings.commissionPct;
  if($("#slippagePct"))$("#slippagePct").value=state.settings.slippagePct;
}
function saveV2Settings(){
  state.settings.minRR=Number($("#minRR")?.value||2);state.settings.maxSectorPct=Number($("#maxSectorPct")?.value||35);state.settings.backtestHoldDays=Number($("#backtestHoldDays")?.value||5);
  state.settings.paperCapital=Number($("#paperCapital")?.value||100000);state.settings.killDrawdownPct=Number($("#killDrawdownPct")?.value||7);state.settings.commissionPct=Number($("#commissionPct")?.value||.10);state.settings.slippagePct=Number($("#slippagePct")?.value||.10);saveSettings();
}
function initV2(){
  v2Defaults();loadV2Settings();renderJournal();
  $("#refreshRadarBtn")?.addEventListener("click",()=>refreshRadar(false));
  $("#radarUniverse")?.addEventListener("change",()=>{$("#top10Body").innerHTML='<tr><td colspan="14" class="empty">Yeni evren seçildi. Robot+ Tara düğmesine basın.</td></tr>';});
  $("#runBacktestBtn")?.addEventListener("click",runBacktest);
  $("#clearJournalBtn")?.addEventListener("click",()=>{if(confirm("Robot başarı günlüğü silinsin mi?")){state.signalHistory=[];saveSignalHistory();renderJournal()}});
  $("#buildOptimalBtn")?.addEventListener("click",buildOptimalPortfolio);
  $("#paperStartBtn")?.addEventListener("click",startPaper);
  $("#paperResetBtn")?.addEventListener("click",()=>{if(confirm("Sanal hesap tamamen sıfırlansın mı?"))resetPaper()});
  $("#saveSettingsBtn")?.addEventListener("click",saveV2Settings);
  ["minRR","maxSectorPct","backtestHoldDays","paperCapital","killDrawdownPct","commissionPct","slippagePct"].forEach(id=>$("#"+id)?.addEventListener("change",saveV2Settings));
  renderPaper();renderCandidateBasket();
  const run=$("#robotRunStatus");if(run)run.textContent="Hazır. “BUGÜN NE ALABİLİRİM? — TARA” düğmesine basın.";
  state.v2.radarTimer=setInterval(()=>{if(state.v2.radar?.length)refreshRadar(true).catch(()=>{})},15*60*1000);
  setInterval(()=>loadQuotes(true).then(()=>{if(state.model)refreshModel(true);if(state.portfolio.length)refreshPortfolio(true)}).catch(()=>{}),60000);
}

init();
initV2();
