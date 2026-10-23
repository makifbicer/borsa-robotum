import json, math, sys, time
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf
from curl_cffi import requests

BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]
OUT = Path("data")
OUT.mkdir(exist_ok=True)

session = requests.Session(impersonate="chrome")

def clean(v):
    try:
        f=float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None

def bars_from_hist(df):
    if df is None or df.empty:
        return []
    bars=[]
    for idx,row in df.iterrows():
        o,h,l,c = clean(row.get("Open")),clean(row.get("High")),clean(row.get("Low")),clean(row.get("Close"))
        v = clean(row.get("Volume")) or 0
        if None in (o,h,l,c):
            continue
        bars.append({
            "t": int(pd.Timestamp(idx).timestamp()*1000),
            "o": o, "h": h, "l": l, "c": c, "v": v
        })
    return bars

def fetch_symbol(symbol, period, interval, retries=3):
    ticker = f"{symbol}.IS"
    last_err = None
    for attempt in range(retries):
        try:
            t = yf.Ticker(ticker, session=session)
            df = t.history(period=period, interval=interval, auto_adjust=False, actions=False, timeout=25)
            bars = bars_from_hist(df)
            if bars:
                return bars
        except Exception as e:
            last_err = e
        time.sleep(1.5 * (attempt + 1))
    print(f"WARN {ticker} {interval}: {last_err}", file=sys.stderr)
    return []

def build(period, interval, min_bars):
    data={"updatedAt":datetime.now(timezone.utc).isoformat(),"interval":interval,"symbols":{}}
    ok=0
    for i,sym in enumerate(BIST100,1):
        bars=fetch_symbol(sym, period, interval)
        if len(bars) >= min_bars:
            data["symbols"][sym]={"bars":bars,"meta":{"provider":"Yahoo Finance via yfinance + curl_cffi"}}
            ok += 1
        if i % 10 == 0:
            print(f"{interval}: {i}/{len(BIST100)} checked, {ok} OK")
        time.sleep(0.12)
    return data,ok

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

intraday,n1 = build("5d","15m",10)
daily,n2 = build("6mo","1d",20)

print(f"intraday OK: {n1}/{len(BIST100)}")
print(f"daily OK: {n2}/{len(BIST100)}")

if n1 >= 50:
    save_atomic(OUT/"intraday.json",intraday)
else:
    print("ERROR: intraday coverage too low; file not overwritten", file=sys.stderr)

if n2 >= 50:
    save_atomic(OUT/"daily.json",daily)
else:
    print("ERROR: daily coverage too low; file not overwritten", file=sys.stderr)

if n1 < 50 and n2 < 50:
    sys.exit(2)
