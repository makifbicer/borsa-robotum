import argparse, json, math, sys, time
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]
ALIASES = BIST100 + ["XU100","XU030"]
TICKER_OF = {s: (s+".IS" if not s.startswith("XU") else s+".IS") for s in ALIASES}
OUT=Path("data");OUT.mkdir(exist_ok=True)

BATCH_SIZE=60
RETRIES=3

def n(v):
    try:
        f=float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None

def previous(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"updatedAt":None,"symbols":{}}

def extract_symbol(df,ticker):
    if df is None or df.empty:
        return []
    sub=None
    if isinstance(df.columns,pd.MultiIndex):
        lv0=list(df.columns.get_level_values(0))
        lv1=list(df.columns.get_level_values(1))
        if ticker in lv0:
            sub=df[ticker]
        elif ticker in lv1:
            sub=df.xs(ticker,axis=1,level=1)
    else:
        sub=df
    if sub is None or sub.empty:
        return []
    bars=[]
    for ts,row in sub.iterrows():
        o,h,l,c=n(row.get("Open")),n(row.get("High")),n(row.get("Low")),n(row.get("Close"))
        v=n(row.get("Volume")) or 0
        if None in (o,h,l,c):
            continue
        bars.append({
            "t":int(pd.Timestamp(ts).timestamp()*1000),
            "o":round(o,6),"h":round(h,6),"l":round(l,6),"c":round(c,6),"v":v
        })
    return bars

def fetch_batch(aliases,period,interval):
    tickers=[TICKER_OF[s] for s in aliases]
    last=None
    for attempt in range(RETRIES):
        try:
            df=yf.download(
                tickers,
                period=period,
                interval=interval,
                group_by="ticker",
                auto_adjust=False,
                progress=False,
                threads=True,
                timeout=25,
            )
            return {s:extract_symbol(df,TICKER_OF[s]) for s in aliases}
        except Exception as e:
            last=e
            print(f"batch retry {attempt+1}: {e}",file=sys.stderr)
            time.sleep(2**attempt)
    raise RuntimeError(f"batch failed: {last}")

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

def run(mode):
    if mode=="intraday":
        period,interval,min_bars,path="5d","15m",10,OUT/"intraday.json"
    elif mode=="daily":
        period,interval,min_bars,path="1y","1d",20,OUT/"daily.json"
    else:
        raise ValueError(mode)

    old=previous(path)
    result={}
    fresh=set()
    t0=time.time()

    for i in range(0,len(ALIASES),BATCH_SIZE):
        chunk=ALIASES[i:i+BATCH_SIZE]
        got=fetch_batch(chunk,period,interval)
        for s in chunk:
            bars=got.get(s) or []
            if len(bars)>=min_bars:
                result[s]={"bars":bars,"meta":{"provider":f"Yahoo Finance via yfinance {yf.__version__}"}}
                fresh.add(s)
            elif s in (old.get("symbols") or {}):
                result[s]=old["symbols"][s]
        print(f"{mode}: {min(i+BATCH_SIZE,len(ALIASES))}/{len(ALIASES)} • fresh {len(fresh)}",flush=True)

    # Do not lie about freshness. Only advance updatedAt when live coverage is adequate.
    core_fresh=sum(1 for s in BIST100 if s in fresh)
    total_valid=sum(1 for s in BIST100 if s in result)
    if total_valid<70:
        raise RuntimeError(f"{mode}: only {total_valid} valid BIST100 symbols")

    updated=(datetime.now(timezone.utc).isoformat()
             if core_fresh>=70
             else old.get("updatedAt"))
    if not updated:
        updated=datetime.now(timezone.utc).isoformat()

    save_atomic(path,{
        "updatedAt":updated,
        "interval":interval,
        "freshSymbols":core_fresh,
        "symbols":result
    })
    print(f"{mode}: fresh={core_fresh}/100 valid={total_valid}/100 elapsed={time.time()-t0:.1f}s")
    if core_fresh<70:
        print("WARNING: fresh coverage <70; timestamp was NOT advanced.",file=sys.stderr)
        sys.exit(3)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--mode",choices=["intraday","daily"],required=True)
    args=ap.parse_args()
    run(args.mode)

if __name__=="__main__":
    main()
