import json, math, re, sys, time
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote

from curl_cffi import requests

OUT=Path("data");OUT.mkdir(exist_ok=True)
FORCED={"PKGYO"}

def get_universe():
    symbols=set(FORCED)
    names={}
    try:
        import pykap
        symbols.update(pykap.bist_company_list())
        try:
            companies=pykap.get_bist_companies(output_format="dict")
            for c in companies:
                t=str(c.get("ticker") or c.get("stockCode") or "").upper().strip()
                n=str(c.get("name") or c.get("companyName") or "").strip()
                if t and n:names[t]=n
        except Exception as e:
            print("Company names warning:",e,file=sys.stderr)
    except Exception as e:
        print("pykap universe warning:",e,file=sys.stderr)
    clean=sorted({s.upper().strip() for s in symbols if re.fullmatch(r"[A-Z0-9]{3,12}",str(s).upper().strip())})
    return clean,names

def num(v):
    try:
        f=float(v);return f if math.isfinite(f) else None
    except Exception:return None

def fetch_chart(symbol,period,interval,retries=3):
    ticker=f"{symbol}.IS"
    url=f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}?range={period}&interval={interval}&includePrePost=false&events=div%2Csplits"
    last=None
    for attempt in range(retries):
        try:
            r=requests.get(url,impersonate="chrome",timeout=20)
            if r.status_code==429:
                time.sleep(2.0*(attempt+1));continue
            if r.status_code!=200:raise RuntimeError(f"HTTP {r.status_code}")
            js=r.json();res=(js.get("chart") or {}).get("result") or []
            if not res:return symbol,[]
            z=res[0];q=((z.get("indicators") or {}).get("quote") or [{}])[0];ts=z.get("timestamp") or []
            bars=[]
            for i,t in enumerate(ts):
                o=num((q.get("open") or [None]*len(ts))[i]);h=num((q.get("high") or [None]*len(ts))[i]);l=num((q.get("low") or [None]*len(ts))[i]);c=num((q.get("close") or [None]*len(ts))[i])
                vv=(q.get("volume") or [0]*len(ts))[i] or 0;v=num(vv) or 0
                if None in (o,h,l,c):continue
                bars.append({"t":int(t)*1000,"o":o,"h":h,"l":l,"c":c,"v":v})
            return symbol,bars
        except Exception as e:
            last=e;time.sleep(1.0*(attempt+1))
    print(f"WARN {ticker} {interval}: {last}",file=sys.stderr)
    return symbol,[]

def build(symbols,period,interval,min_bars,workers=10):
    data={"updatedAt":datetime.now(timezone.utc).isoformat(),"interval":interval,"symbols":{}}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs=[ex.submit(fetch_chart,s,period,interval) for s in symbols]
        for i,f in enumerate(as_completed(futs),1):
            s,bars=f.result()
            if len(bars)>=min_bars:data["symbols"][s]={"bars":bars,"meta":{"provider":"Yahoo Finance public chart via GitHub Actions"}}
            if i%50==0:print(f"{interval}: {i}/{len(symbols)} complete; {len(data['symbols'])} valid")
    return data

def save(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

symbols,names=get_universe()
print("Universe symbols:",len(symbols))
intraday=build(symbols,"5d","15m",10,workers=8)
valid_intraday=set(intraday["symbols"])
daily=build(symbols,"1y","1d",20,workers=8)
valid_daily=set(daily["symbols"])
valid=sorted(valid_intraday & valid_daily)
print("Valid in both:",len(valid))

if len(valid)>=150:
    intraday["symbols"]={s:intraday["symbols"][s] for s in valid}
    daily["symbols"]={s:daily["symbols"][s] for s in valid}
    save(OUT/"all_intraday.json",intraday)
    save(OUT/"all_daily.json",daily)
    save(OUT/"symbols.json",{
        "updatedAt":datetime.now(timezone.utc).isoformat(),
        "symbols":valid,
        "names":{s:names.get(s,"") for s in valid if names.get(s)},
        "source":"pykap bundled/live company list + Yahoo Finance symbol validation"
    })
else:
    print("ERROR: too few valid symbols; previous broad-universe files retained",file=sys.stderr)
    sys.exit(2)
