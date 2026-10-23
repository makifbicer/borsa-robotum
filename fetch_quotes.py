import json, sys, time
from datetime import datetime, timezone
from pathlib import Path
import requests

OUT=Path("data"); OUT.mkdir(exist_ok=True)
URL="https://scanner.tradingview.com/turkey/scan"
COLUMNS=["name","description","close","change","volume","relative_volume_10d_calc","RSI|15","RSI","Recommend.All|15","Recommend.All","update_mode","type","typespecs"]
PAYLOAD={
    "columns":COLUMNS,
    "filter":[
        {"left":"is_primary","operation":"equal","right":True},
        {"left":"type","operation":"equal","right":"stock"},
        {"left":"name","operation":"nempty"}
    ],
    "filterOR":[],
    "ignore_unknown_fields":False,
    "options":{"active_symbols_only":True,"lang":"tr"},
    "price_conversion":{},
    "range":[0,1000],
    "sort":{"sortBy":"name","sortOrder":"asc"},
    "symbols":{"query":{"types":[]},"tickers":[]},
    "markets":["turkey"]
}
HEADERS={
    "Accept":"application/json",
    "Content-Type":"application/json",
    "Origin":"https://www.tradingview.com",
    "Referer":"https://www.tradingview.com/",
    "User-Agent":"Mozilla/5.0"
}

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

last=None
for attempt in range(3):
    try:
        r=requests.post(URL,headers=HEADERS,json=PAYLOAD,timeout=30)
        if r.status_code!=200:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:160]}")
        raw=r.json()
        rows=raw.get("data") or []
        quotes={}
        for row in rows:
            source_symbol=row.get("s") or ""
            vals=row.get("d") or []
            if ":" in source_symbol:
                exchange,symbol=source_symbol.split(":",1)
            else:
                exchange,symbol="BIST",source_symbol
            if exchange not in ("BIST","BIST_DLY"):
                continue
            if len(vals)<len(COLUMNS):
                vals=vals+[None]*(len(COLUMNS)-len(vals))
            rec=dict(zip(COLUMNS,vals))
            price=rec.get("close")
            if price is None:
                continue
            quotes[symbol]={
                "price":price,
                "change":rec.get("change"),
                "volume":rec.get("volume"),
                "rvol":rec.get("relative_volume_10d_calc"),
                "rsi15":rec.get("RSI|15"),
                "rsiD":rec.get("RSI"),
                "recommend15":rec.get("Recommend.All|15"),
                "recommendD":rec.get("Recommend.All"),
                "description":rec.get("description"),
                "source_symbol":source_symbol
            }
        if len(quotes)<150:
            raise RuntimeError(f"Too few quotes: {len(quotes)}")
        save_atomic(OUT/"quotes.json",{
            "updatedAt":datetime.now(timezone.utc).isoformat(),
            "source":"TradingView public scanner",
            "delayed":True,
            "count":len(quotes),
            "quotes":quotes
        })
        print(f"Saved {len(quotes)} quotes")
        sys.exit(0)
    except Exception as e:
        last=e
        print(f"attempt {attempt+1} failed: {e}",file=sys.stderr)
        time.sleep(2**attempt)

raise SystemExit(f"quote fetch failed: {last}")
