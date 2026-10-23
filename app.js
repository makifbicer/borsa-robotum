
"use strict";
const BIST30=["AEFES","AKBNK","ASELS","ASTOR","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN","GUBRF","ISCTR","KCHOL","KRDMD","MGROS","PETKM","PGSUS","SAHOL","SASA","SISE","TAVHL","TCELL","THYAO","TOASO","TRALT","TRMET","TTKOM","TUPRS","VAKBN","YKBNK"];
const BIST100=["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"];
const MODEL_TARGETS=[
  {symbol:"TCELL",weight:.20},{symbol:"AKBNK",weight:.20},{symbol:"THYAO",weight:.15},
  {symbol:"BIMAS",weight:.15},{symbol:"MAVI",weight:.10},{symbol:"ASELS",weight:.10},{symbol:"TUPRS",weight:.10}
];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2});
const money=v=>`${fmt.format(Number(v||0))} TL`, pct=v=>`${v>=0?"+":""}${fmt.format(v)}%`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), sleep=ms=>new Promise(r=>setTimeout(r,ms));

const state={
  scanResults:[],scanCache:new Map(),scanAbort:false,scanning:false,detail:null,lastFetch:null,timer:null,
  portfolio:JSON.parse(localStorage.getItem("abr_portfolio")||"[]"),
  watchlist:JSON.parse(localStorage.getItem("abr_watchlist")||"[]"),
  model:JSON.parse(localStorage.getItem("abr_model")||"null"),
  settings:Object.assign({capital:10000,riskPct:1.5,atrMult:1.8,voiceEnabled:true,notifEnabled:true,autoRefresh:true,refreshSec:120},JSON.parse(localStorage.getItem("abr_settings")||"{}"))
};
const savePortfolio=()=>localStorage.setItem("abr_portfolio",JSON.stringify(state.portfolio));
const saveWatch=()=>localStorage.setItem("abr_watchlist",JSON.stringify(state.watchlist));
const saveModel=()=>localStorage.setItem("abr_model",JSON.stringify(state.model));
const saveSettings=()=>localStorage.setItem("abr_settings",JSON.stringify(state.settings));

function providerParams(tf){return tf==="15m"?{file:"data/intraday.json"}:tf==="1h"?{file:"data/intraday.json"}:{file:"data/daily.json"}}

let marketDataCache={};
async function loadMarketFile(file){
  const cached=marketDataCache[file];
  if(cached && Date.now()-cached.loadedAt<60000) return cached.data;
  const res=await fetch(`${file}?v=${Date.now()}`,{cache:"no-store"});
  if(!res.ok) throw new Error(`Piyasa veri dosyası alınamadı (HTTP ${res.status})`);
  const data=await res.json();
  marketDataCache[file]={data,loadedAt:Date.now()};
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
  const cfg=providerParams(tf);
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
function setFresh(ts){const e=$("#freshness");if(!ts){e.textContent="Veri bekleniyor";e.className="pill muted";return}e.textContent=`Güncellendi ${new Date(ts).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`;e.className="pill good"}
async function getAnalysis(symbol,tf=$("#timeframe").value){const k=`${symbol}|${tf}`,c=state.scanCache.get(k);if(c&&Date.now()-c.fetchedAt<90000)return c;const a=analyze(await fetchChart(symbol,tf));state.scanCache.set(k,a);return a}

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
    $("#modelStart").textContent="—";$("#modelValue").textContent="—";$("#modelPnL").textContent="—";$("#modelCash").textContent=money(10000);return;
  }
  let value=state.model.cash,pnl=0,start=state.model.cash;
  body.innerHTML=state.model.positions.map(p=>{const c=p.buyPrice*p.lots,v=(p.last||p.buyPrice)*p.lots,k=v-c;start+=c;value+=v;pnl+=k;return`<tr><td><span class="symbol">${p.symbol}</span></td><td>${Math.round(p.weight*100)}%</td><td>${p.lots}</td><td>${fmt.format(p.buyPrice)}</td><td>${fmt.format(p.last||p.buyPrice)}</td><td class="${k>=0?"positive":"negative"}">${money(k)} (${pct(c?k/c*100:0)})</td><td><span class="sig buy">MODELDE TUT</span></td></tr>`}).join("");
  const pPct=start?(value/start-1)*100:0;
  $("#modelStatus").textContent=`Başlangıç: ${new Date(state.model.startedAt).toLocaleString("tr-TR")} • Performans başlangıç fiyatlarına göre hesaplanıyor.`;
  $("#modelStart").textContent=money(start);$("#modelValue").textContent=money(value);$("#modelPnL").textContent=`${money(pnl)} (${pct(pPct)})`;$("#modelPnL").className=pnl>=0?"positive":"negative";$("#modelCash").textContent=money(state.model.cash);
}
async function scanUniverse(name){
  if(state.scanning)return;state.scanning=true;state.scanAbort=false;state.scanResults=[];const symbols=name==="BIST100"?BIST100:BIST30,tf=$("#timeframe").value;$("#stopScanBtn").disabled=false;setStatus(`${name} taranıyor`,"warn");let index=0,ok=0,failed=0;
  async function worker(){while(index<symbols.length&&!state.scanAbort){const s=symbols[index++];try{const a=analyze(await fetchChart(s,tf));state.scanCache.set(`${s}|${tf}`,a);state.scanResults.push(a);ok++}catch(e){failed++}state.scanResults.sort((a,b)=>b.score-a.score);renderScanner();$("#scanInfo").textContent=`${symbols.length} hisseden ${ok+failed} işlendi • ${ok} başarılı • ${failed} veri hatası`;if(name==="BIST100")await sleep(80)}}
  await Promise.all(Array.from({length:name==="BIST100"?5:4},worker));state.scanning=false;$("#stopScanBtn").disabled=true;state.lastFetch=Date.now();setFresh(state.lastFetch);setStatus(state.scanAbort?"Tarama durduruldu":`${name} taraması tamam`,state.scanAbort?"bad":"good");
}
function filteredResults(){const min=Number($("#minScore").value||0),q=$("#stockSearch").value.trim().toUpperCase();return state.scanResults.filter(x=>x.score>=min&&(!q||x.symbol.includes(q)))}
function renderScanner(){const rows=filteredResults(),b=$("#scannerBody");b.innerHTML=rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td><span class="symbol">${x.symbol}</span></td><td>${fmt.format(x.price)}</td><td class="${x.change>0?"positive":x.change<0?"negative":"neutral"}">${pct(x.change)}</td><td><span class="score">${x.score}</span></td><td><span class="sig ${x.signalClass}">${x.signal}</span></td><td>${x.rsi.toFixed(1)}</td><td>${x.rvol.toFixed(2)}x</td><td>${x.atrPct.toFixed(2)}%</td><td><button class="miniBtn detailBtn" data-symbol="${x.symbol}">Detay</button></td></tr>`).join(""):`<tr><td colspan="10" class="empty">${state.scanResults.length?"Filtreye uyan hisse yok.":"Tarama sürüyor…"}</td></tr>`;updateStats();$$(".detailBtn").forEach(x=>x.onclick=()=>openDetail(x.dataset.symbol))}
function updateStats(){const a=state.scanResults;$("#statScanned").textContent=a.length;$("#statBuy").textContent=a.filter(x=>x.score>=70).length;$("#statWatch").textContent=a.filter(x=>x.score>=58&&x.score<70).length;$("#statAvg").textContent=a.length?Math.round(a.reduce((s,x)=>s+x.score,0)/a.length):"—"}
function openDetail(symbol){getAnalysis(symbol,$("#timeframe").value).then(a=>{state.detail=a;$("#detailTitle").textContent=`${a.symbol} • ${money(a.price)} • ${a.score}/100`;$("#detailMetrics").innerHTML=[["Sinyal",a.signal],["RSI",a.rsi.toFixed(1)],["RVOL",`${a.rvol.toFixed(2)}x`],["ATR%",`${a.atrPct.toFixed(2)}%`],["EMA9",fmt.format(a.ema9)],["EMA21",fmt.format(a.ema21)]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");$("#detailReasons").innerHTML=a.reasons.map(r=>`<div class="reason">• ${r}</div>`).join("");drawChart(a);$("#detailModal").classList.remove("hidden")}).catch(e=>alert(`Veri alınamadı: ${e.message}`))}
function drawChart(a){const c=$("#detailChart"),ctx=c.getContext("2d"),dpr=window.devicePixelRatio||1,W=c.clientWidth||1000,H=360;c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);const bars=a.bars.slice(-90),vals=bars.map(b=>b.c),e9=ema(vals,9),e21=ema(vals,21),all=[...vals,...e9,...e21],min=Math.min(...all),max=Math.max(...all),pad=(max-min)*.08||1,lo=min-pad,hi=max+pad,x=i=>20+i*(W-40)/Math.max(1,vals.length-1),y=v=>18+(hi-v)*(H-36)/(hi-lo);ctx.strokeStyle="#22304a";ctx.lineWidth=1;for(let i=0;i<5;i++){const yy=18+i*(H-36)/4;ctx.beginPath();ctx.moveTo(18,yy);ctx.lineTo(W-18,yy);ctx.stroke()}function line(s,col,w=2){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();s.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke()}line(vals,"#e9f1ff",2.4);line(e9,"#63e6be",1.5);line(e21,"#74c0fc",1.5)}
function positionPlan(a,entry){const mult=Number(state.settings.atrMult||1.8),initial=Math.max(.01,entry-a.atr*mult),riskPerShare=Math.max(.01,entry-initial),riskTL=state.settings.capital*(state.settings.riskPct/100);return{initial,riskPerShare,riskTL,maxLots:Math.max(0,Math.floor(riskTL/riskPerShare)),target1:entry+riskPerShare*2}}
async function refreshPortfolio(silent=false){if(!state.portfolio.length){renderPortfolio();return}if(!silent)setStatus("Portföy yenileniyor","warn");for(const p of state.portfolio){try{const a=await getAnalysis(p.symbol,"15m");p.last=a.price;p.score=a.score;p.maxSeen=Math.max(Number(p.maxSeen||p.buyPrice),a.price);const plan=positionPlan(a,p.buyPrice),trail=Math.max(plan.initial,p.maxSeen-a.atr*2);p.dynamicStop=Math.max(Number(p.manualStop||0),trail);p.target1=plan.target1;p.pnl=(a.price-p.buyPrice)*p.lots;p.pnlPct=(a.price/p.buyPrice-1)*100;let robot="TUT",cls="buy";if(a.price<=p.dynamicStop){robot="STOP / SAT";cls="sell"}else if(a.score<45||(a.price<a.ema9&&a.macd.hist<0&&a.rsi<45)){robot="SAT / AZALT";cls="sell"}else if(a.price>=p.target1){robot="KÂR AL / STOP YÜKSELT";cls="watch"}else if(a.score<58){robot="DİKKAT / İZLE";cls="watch"}p.robot=robot;p.robotClass=cls;if(p.lastAlert!==robot&&(robot.includes("SAT")||robot.includes("STOP")||robot.includes("KÂR AL"))){notify(`${p.symbol}: ${robot}`,`${p.symbol} ${money(a.price)} • maliyet ${money(p.buyPrice)} • K/Z ${pct(p.pnlPct)}`);p.lastAlert=robot}}catch(e){p.error=e.message}}savePortfolio();renderPortfolio();state.lastFetch=Date.now();setFresh(state.lastFetch);if(!silent)setStatus("Portföy güncel","good")}
function renderPortfolio(){let cost=0,value=0,b=$("#portfolioBody");if(!state.portfolio.length)b.innerHTML=`<tr><td colspan="10" class="empty">Henüz pozisyon eklemediniz.</td></tr>`;else b.innerHTML=state.portfolio.map((p,i)=>{const c=p.buyPrice*p.lots,v=(p.last??p.buyPrice)*p.lots;cost+=c;value+=v;return`<tr><td><span class="symbol">${p.symbol}</span></td><td>${p.lots}</td><td>${fmt.format(p.buyPrice)}</td><td>${p.last?fmt.format(p.last):"—"}</td><td class="${(p.pnl||0)>=0?"positive":"negative"}">${p.last?`${money(p.pnl)} (${pct(p.pnlPct)})`:"—"}</td><td>${Number.isFinite(p.score)?`<span class="score">${p.score}</span>`:"—"}</td><td>${p.dynamicStop?fmt.format(p.dynamicStop):"—"}</td><td>${p.target1?fmt.format(p.target1):"—"}</td><td><span class="sig ${p.robotClass||"neutral"}">${p.robot||"VERİ BEKLİYOR"}</span></td><td><button class="miniBtn removePf" data-i="${i}">Sil</button></td></tr>`}).join("");$("#pfCost").textContent=money(cost);$("#pfValue").textContent=money(value);const pnl=value-cost,pp=cost?(value/cost-1)*100:0;$("#pfPnL").textContent=money(pnl);$("#pfPnL").className=pnl>=0?"positive":"negative";$("#pfPnLPct").textContent=pct(pp);$("#pfPnLPct").className=pp>=0?"positive":"negative";$$(".removePf").forEach(x=>x.onclick=()=>{if(confirm("Pozisyon silinsin mi?")){state.portfolio.splice(Number(x.dataset.i),1);savePortfolio();renderPortfolio()}})}
function renderWatch(){const box=$("#watchCards");if(!state.watchlist.length){box.innerHTML=`<div class="empty">İzleme listeniz boş.</div>`;return}box.innerHTML=state.watchlist.map(s=>{const a=[...state.scanCache.values()].find(x=>x.symbol===s);return`<div class="watchCard"><div class="top"><strong>${s}</strong><button class="miniBtn watchRemove" data-s="${s}">✕</button></div><div style="margin-top:10px">${a?`${money(a.price)} • <span class="sig ${a.signalClass}">${a.signal}</span> • ${a.score}/100`:"Henüz veri yok"}</div><button class="miniBtn watchDetail" data-s="${s}" style="margin-top:10px">Detay</button></div>`}).join("");$$(".watchRemove").forEach(x=>x.onclick=()=>{state.watchlist=state.watchlist.filter(s=>s!==x.dataset.s);saveWatch();renderWatch()});$$(".watchDetail").forEach(x=>x.onclick=()=>openDetail(x.dataset.s))}
function notify(title,body){if(state.settings.voiceEnabled&&"speechSynthesis"in window){const u=new SpeechSynthesisUtterance(`${title}. ${body.replaceAll("TL","Türk lirası")}`);u.lang="tr-TR";u.rate=.92;speechSynthesis.cancel();speechSynthesis.speak(u)}if(state.settings.notifEnabled&&"Notification"in window&&Notification.permission==="granted"){try{new Notification(title,{body,icon:"icon.svg"})}catch(_){}}}
function loadSettingsUI(){$("#capital").value=state.settings.capital;$("#riskPct").value=state.settings.riskPct;$("#atrMult").value=state.settings.atrMult;$("#voiceEnabled").checked=!!state.settings.voiceEnabled;$("#notifEnabled").checked=!!state.settings.notifEnabled;$("#autoRefresh").checked=!!state.settings.autoRefresh;$("#refreshSec").value=state.settings.refreshSec}
function readSettingsUI(){state.settings.capital=Number($("#capital").value||10000);state.settings.riskPct=Number($("#riskPct").value||1.5);state.settings.atrMult=Number($("#atrMult").value||1.8);state.settings.voiceEnabled=$("#voiceEnabled").checked;state.settings.notifEnabled=$("#notifEnabled").checked;state.settings.autoRefresh=$("#autoRefresh").checked;state.settings.refreshSec=Math.max(60,Number($("#refreshSec").value||120));saveSettings();scheduleAutoRefresh()}
function scheduleAutoRefresh(){clearInterval(state.timer);state.timer=null;if(state.settings.autoRefresh)state.timer=setInterval(()=>{refreshPortfolio(true);refreshModel(true)},state.settings.refreshSec*1000)}
function bind(){
  $("#startModelBtn").onclick=startModel;$("#refreshModelBtn").onclick=()=>refreshModel();$("#scan30Btn").onclick=()=>scanUniverse("BIST30");$("#scan100Btn").onclick=()=>scanUniverse("BIST100");$("#stopScanBtn").onclick=()=>{state.scanAbort=true;$("#stopScanBtn").disabled=true};
  $("#minScore").onchange=renderScanner;$("#stockSearch").oninput=renderScanner;$("#timeframe").onchange=()=>{state.scanResults=[];renderScanner();$("#scanInfo").textContent="Zaman dilimi değişti. Yeniden tarayın."};
  $$(".tab").forEach(t=>t.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".tabPane").forEach(x=>x.classList.remove("active"));t.classList.add("active");$("#"+t.dataset.tab).classList.add("active");if(t.dataset.tab==="portfolio")renderPortfolio();if(t.dataset.tab==="watchlist")renderWatch()});
  $("#portfolioForm").onsubmit=e=>{e.preventDefault();const symbol=$("#pfSymbol").value.trim().toUpperCase().replace(".IS",""),lots=Number($("#pfLots").value),buyPrice=Number($("#pfPrice").value),manualStop=Number($("#pfStop").value||0);if(!symbol||!lots||!buyPrice)return;state.portfolio.push({id:String(Date.now()),symbol,lots,buyPrice,manualStop,maxSeen:buyPrice,addedAt:Date.now()});savePortfolio();e.target.reset();renderPortfolio();refreshPortfolio()};
  $("#enableNotificationsBtn").onclick=async()=>{if(!("Notification"in window))return alert("Bu tarayıcı bildirim API'sini desteklemiyor.");const p=await Notification.requestPermission();alert(p==="granted"?"Bildirim izni verildi.":"Bildirim izni verilmedi.")};
  $("#saveSettingsBtn").onclick=()=>{readSettingsUI();alert("Ayarlar kaydedildi.")};["voiceEnabled","notifEnabled","autoRefresh","refreshSec"].forEach(id=>$("#"+id).onchange=readSettingsUI);
  $("#closeModalBtn").onclick=()=>$("#detailModal").classList.add("hidden");$("#detailModal").onclick=e=>{if(e.target.id==="detailModal")$("#detailModal").classList.add("hidden")};$("#addWatchBtn").onclick=()=>{if(!state.detail)return;if(!state.watchlist.includes(state.detail.symbol))state.watchlist.push(state.detail.symbol);saveWatch();renderWatch();$("#addWatchBtn").textContent="İzleme listesine eklendi"};
}
function init(){bind();loadSettingsUI();renderModel();renderPortfolio();renderWatch();scheduleAutoRefresh();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});const d=new Date(),day=d.getDay(),mins=d.getHours()*60+d.getMinutes(),open=day>=1&&day<=5&&mins>=600&&mins<=1110;setStatus(open?"Piyasa saatleri":"Piyasa kapalı / seans dışı",open?"good":"muted")}
init();
