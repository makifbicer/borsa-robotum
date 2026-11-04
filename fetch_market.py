import json, math, sys, time
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf
from curl_cffi import requests

# STABLE CORE: This is the data-fetch approach used in the last known-good v2.0 line.
BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]

OUT = Path("data")
OUT.mkdir(exist_ok=True)
session = requests.Session(impersonate="chrome")


def clean(v):
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None


def bars_from_hist(df):
    if df is None or df.empty:
        return []
    bars = []
    for idx, row in df.iterrows():
        o = clean(row.get("Open"))
        h = clean(row.get("High"))
        l = clean(row.get("Low"))
        c = clean(row.get("Close"))
        v = clean(row.get("Volume")) or 0
        if None in (o, h, l, c):
            continue
        bars.append({
            "t": int(pd.Timestamp(idx).timestamp() * 1000),
            "o": o, "h": h, "l": l, "c": c, "v": v,
        })
    return bars


def fetch_ticker(alias, ticker, period, interval, retries=3):
    last = None
    for attempt in range(retries):
        try:
            df = yf.Ticker(ticker, session=session).history(
                period=period,
                interval=interval,
                auto_adjust=False,
                actions=False,
                timeout=25,
            )
            bars = bars_from_hist(df)
            if bars:
                return alias, bars
        except Exception as e:
            last = e
        time.sleep(1.2 * (attempt + 1))
    print(f"WARN {ticker} {interval}: {last}", file=sys.stderr)
    return alias, []


def build(period, interval, min_bars):
    data = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "interval": interval,
        "symbols": {},
    }
    pairs = [(s, s + ".IS") for s in BIST100] + [("XU100", "XU100.IS"), ("XU030", "XU030.IS")]
    ok = 0
    for i, (alias, ticker) in enumerate(pairs, 1):
        _, bars = fetch_ticker(alias, ticker, period, interval)
        if len(bars) >= min_bars:
            data["symbols"][alias] = {
                "bars": bars,
                "meta": {"provider": "Yahoo Finance via yfinance + curl_cffi (stable v2 core)"},
            }
            ok += 1
        if i % 10 == 0:
            print(f"{interval}: {i}/{len(pairs)} checked, {ok} OK", flush=True)
        time.sleep(0.1)
    return data, ok


def save_atomic(path, obj):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)


# Keep the tolerant thresholds that were working in v2.0.
intraday, n1 = build("5d", "15m", 10)
daily, n2 = build("6mo", "1d", 20)

print(f"intraday OK: {n1}/{len(BIST100)}")
print(f"daily OK: {n2}/{len(BIST100)}")

if n1 >= 50:
    save_atomic(OUT / "intraday.json", intraday)
else:
    print("ERROR: intraday coverage too low; previous file retained", file=sys.stderr)

if n2 >= 50:
    save_atomic(OUT / "daily.json", daily)
else:
    print("ERROR: daily coverage too low; previous file retained", file=sys.stderr)

# Fail only if both feeds are unusable. This is the same tolerant behavior as the working line.
if n1 < 50 and n2 < 50:
    sys.exit(2)
