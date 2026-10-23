import argparse, json, math, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from curl_cffi import requests

BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]
PAIRS=[(s,f"{s}.IS") for s in BIST100]+[("XU100","XU100.IS"),("XU030","XU030.IS")]
OUT=Path("data");OUT.mkdir(exist_ok=True)

def number(v):
    try:
        f=float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None

def fetch_chart(alias,ticker,period,interval,retries=2):
    url=f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}?range={period}&interval={interval}&includePrePost=false&events=div%2Csplits"
    last=None
    for attempt in range(retries+1):
        try:
            r=requests.get(url,impersonate="chrome",timeout=15)
            if r.status_code==429:
                time.sleep(1.2*(attempt+1));continue
            if r.status_code!=200:
                raise RuntimeError(f"HTTP {r.status_code}")
            js=r.json()
            result=(js.get("chart") or {}).get("result") or []
            if not result:
                raise RuntimeError((js.get("chart") or {}).get("error") or "no result")
            z=result[0]
            q=((z.get("indicators") or {}).get("quote") or [{}])[0]
            ts=z.get("timestamp") or []
            op=q.get("open") or [];hi=q.get("high") or [];lo=q.get("low") or [];cl=q.get("close") or [];vo=q.get("volume") or []
            bars=[]
            for i,t in enumerate(ts):
                if i>=len(op) or i>=len(hi) or i>=len(lo) or i>=len(cl):continue
                o,h,l,c=number(op[i]),number(hi[i]),number(lo[i]),number(cl[i])
                v=number(vo[i] if i<len(vo) else 0) or 0
                if None in (o,h,l,c):continue
                bars.append({"t":int(t)*1000,"o":o,"h":h,"l":l,"c":c,"v":v})
            if bars:
                return alias,bars,None
            raise RuntimeError("empty bars")
        except Exception as e:
            last=e
            if attempt<retries:time.sleep(.7*(attempt+1))
    return alias,[],str(last)

def load_previous(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"updatedAt":None,"symbols":{}}

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

def build(mode):
    if mode=="intraday":
        period,interval,min_bars,path="5d","15m",10,OUT/"intraday.json"
    else:
        period,interval,min_bars,path="1y","1d",20,OUT/"daily.json"

    previous=load_previous(path)
    symbols={}
    failures=[]
    started=time.time()

    # Parallel, but deliberately moderate to reduce Yahoo 429 responses.
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs=[ex.submit(fetch_chart,a,t,period,interval) for a,t in PAIRS]
        for i,f in enumerate(as_completed(futs),1):
            alias,bars,err=f.result()
            if len(bars)>=min_bars:
                symbols[alias]={"bars":bars,"meta":{"provider":"Yahoo Finance public chart via GitHub Actions"}}
            else:
                old=(previous.get("symbols") or {}).get(alias)
                if old:
                    symbols[alias]=old
                failures.append((alias,err or "insufficient bars"))
            if i%20==0:
                print(f"{mode}: {i}/{len(PAIRS)} complete; fresh {len(symbols)-len(failures)}, fallback {len(failures)}")

    fresh_count=sum(1 for a,_ in PAIRS if a in symbols and a not in {x[0] for x in failures})
    total_valid=sum(1 for a,_ in PAIRS if a in symbols)
    elapsed=time.time()-started
    print(f"{mode}: fresh={fresh_count}, total_valid={total_valid}, failures={len(failures)}, elapsed={elapsed:.1f}s")

    # Need enough live symbols to move the timestamp; otherwise keep prior timestamp.
    if fresh_count>=70:
        updated=datetime.now(timezone.utc).isoformat()
    else:
        updated=previous.get("updatedAt") or datetime.now(timezone.utc).isoformat()
        print("WARNING: fresh coverage under 70; preserving previous updatedAt",file=sys.stderr)

    payload={"updatedAt":updated,"interval":interval,"symbols":symbols}
    if total_valid>=70:
        save_atomic(path,payload)
    else:
        raise RuntimeError(f"{mode}: only {total_valid} valid symbols; refusing overwrite")

    if failures:
        print("Sample failures:", failures[:8], file=sys.stderr)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--mode",choices=["intraday","daily","both"],default="both")
    args=p.parse_args()
    modes=["intraday","daily"] if args.mode=="both" else [args.mode]
    for mode in modes:
        build(mode)

if __name__=="__main__":
    main()
