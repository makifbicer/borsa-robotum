import json, math, sys, time, re
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
import yfinance as yf
from curl_cffi import requests

BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]
OUT=Path("data");OUT.mkdir(exist_ok=True)
session=requests.Session(impersonate="chrome")

def clean(v):
    try:
        f=float(v);return f if math.isfinite(f) else None
    except Exception:return None

def bars_from_hist(df):
    if df is None or df.empty:return []
    bars=[]
    for idx,row in df.iterrows():
        o,h,l,c=clean(row.get("Open")),clean(row.get("High")),clean(row.get("Low")),clean(row.get("Close"));v=clean(row.get("Volume")) or 0
        if None in (o,h,l,c):continue
        bars.append({"t":int(pd.Timestamp(idx).timestamp()*1000),"o":o,"h":h,"l":l,"c":c,"v":v})
    return bars

def fetch_ticker(alias,ticker,period,interval,retries=3):
    last=None
    for attempt in range(retries):
        try:
            df=yf.Ticker(ticker,session=session).history(period=period,interval=interval,auto_adjust=False,actions=False,timeout=25)
            bars=bars_from_hist(df)
            if bars:return alias,bars
        except Exception as e:last=e
        time.sleep(1.2*(attempt+1))
    print(f"WARN {ticker} {interval}: {last}",file=sys.stderr);return alias,[]

def build(period,interval,min_bars):
    data={"updatedAt":datetime.now(timezone.utc).isoformat(),"interval":interval,"symbols":{}}
    pairs=[(s,s+".IS") for s in BIST100]+[("XU100","XU100.IS"),("XU030","XU030.IS")]
    ok=0
    for i,(alias,ticker) in enumerate(pairs,1):
        _,bars=fetch_ticker(alias,ticker,period,interval)
        if len(bars)>=min_bars:
            data["symbols"][alias]={"bars":bars,"meta":{"provider":"Yahoo Finance via GitHub Actions"}};ok+=1
        if i%10==0:print(f"{interval}: {i}/{len(pairs)} checked, {ok} OK")
        time.sleep(.1)
    return data,ok

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp");tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8");tmp.replace(path)

def deep_find(obj,keys):
    if isinstance(obj,dict):
        for k in keys:
            if k in obj and obj[k] not in (None,"",[]):return obj[k]
        for v in obj.values():
            z=deep_find(v,keys)
            if z not in (None,"",[]):return z
    elif isinstance(obj,list):
        for v in obj:
            z=deep_find(v,keys)
            if z not in (None,"",[]):return z
    return None

def iter_dicts(obj):
    if isinstance(obj,dict):
        yield obj
        for v in obj.values():yield from iter_dicts(v)
    elif isinstance(obj,list):
        for v in obj:yield from iter_dicts(v)

def fetch_kap():
    url="https://www.kap.org.tr/tr/api/disclosures"
    headers={"Accept":"application/json,text/plain,*/*","Referer":"https://www.kap.org.tr/tr","User-Agent":"Mozilla/5.0"}
    try:
        r=session.get(url,headers=headers,timeout=25)
        if r.status_code!=200:raise RuntimeError(f"HTTP {r.status_code}")
        raw=r.json();seen=set();items=[]
        for d in iter_dicts(raw):
            txt=json.dumps(d,ensure_ascii=False)
            syms=[s for s in BIST100 if re.search(rf'(?<![A-Z0-9]){re.escape(s)}(?![A-Z0-9])',txt)]
            if not syms:continue
            ident=deep_find(d,["disclosureIndex","disclosureId","id","notificationId","index"])
            title=deep_find(d,["subject","title","header","summary","disclosureSubject","description"]) or "KAP Bildirimi"
            date=deep_find(d,["publishDate","disclosureDate","date","publishedAt","createdAt"])
            key=str(ident or "")+"|"+str(title)+"|"+",".join(syms)
            if key in seen:continue
            seen.add(key)
            item={"symbols":syms[:5],"title":str(title)[:300],"date":date}
            if ident:item["url"]=f"https://www.kap.org.tr/tr/Bildirim/{ident}"
            items.append(item)
            if len(items)>=300:break
        return {"updatedAt":datetime.now(timezone.utc).isoformat(),"items":items,"source":"KAP public web endpoint"}
    except Exception as e:
        print(f"KAP WARN: {e}",file=sys.stderr);return None

intraday,n1=build("5d","15m",10)
daily,n2=build("6mo","1d",20)
if n1>=50:save_atomic(OUT/"intraday.json",intraday)
else:print("ERROR intraday coverage low; previous retained",file=sys.stderr)
if n2>=50:save_atomic(OUT/"daily.json",daily)
else:print("ERROR daily coverage low; previous retained",file=sys.stderr)
kap=fetch_kap()
if kap is not None:save_atomic(OUT/"kap.json",kap)
elif not (OUT/"kap.json").exists():save_atomic(OUT/"kap.json",{"updatedAt":None,"items":[],"error":"KAP automatic feed unavailable"})
if n1<50 and n2<50:sys.exit(2)
