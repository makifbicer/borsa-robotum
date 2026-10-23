import json, math, sys
from pathlib import Path
from datetime import datetime, timezone
import yfinance as yf
import pandas as pd

BIST100 = ["AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK","ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO","BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL","ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL","EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB","HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD","LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM","PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL","TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"]
TICKERS=[s+".IS" for s in BIST100]
OUT=Path("data"); OUT.mkdir(exist_ok=True)

def clean_num(v):
    try:
        f=float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None

def extract_for_symbol(df, ticker):
    sub=None
    if isinstance(df.columns, pd.MultiIndex):
        lv0=list(df.columns.get_level_values(0))
        lv1=list(df.columns.get_level_values(1))
        if ticker in lv0:
            sub=df[ticker]
        elif ticker in lv1:
            sub=df.xs(ticker, axis=1, level=1)
    else:
        sub=df
    if sub is None or sub.empty:
        return []
    bars=[]
    for idx,row in sub.iterrows():
        o=clean_num(row.get("Open")); h=clean_num(row.get("High")); l=clean_num(row.get("Low")); c=clean_num(row.get("Close")); v=clean_num(row.get("Volume")) or 0
        if None in (o,h,l,c):
            continue
        bars.append({"t":int(pd.Timestamp(idx).timestamp()*1000),"o":o,"h":h,"l":l,"c":c,"v":v})
    return bars

def download(period, interval):
    return yf.download(
        TICKERS, period=period, interval=interval,
        group_by="ticker", auto_adjust=False, progress=False,
        threads=True, timeout=25
    )

def build(period, interval, min_bars):
    df=download(period, interval)
    result={"updatedAt":datetime.now(timezone.utc).isoformat(),"interval":interval,"symbols":{}}
    ok=0
    for sym,ticker in zip(BIST100,TICKERS):
        bars=extract_for_symbol(df,ticker)
        if len(bars)>=min_bars:
            result["symbols"][sym]={"bars":bars,"meta":{"provider":"Yahoo Finance via GitHub Actions"}}
            ok+=1
    print(f"{interval}: {ok}/{len(BIST100)} symbols")
    return result,ok

def save_atomic(path,obj):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(path)

intraday,n1=build("5d","15m",10)
daily,n2=build("6mo","1d",20)

if n1>=70:
    save_atomic(OUT/"intraday.json",intraday)
else:
    print("Intraday batch too incomplete; previous file retained.",file=sys.stderr)
if n2>=70:
    save_atomic(OUT/"daily.json",daily)
else:
    print("Daily batch too incomplete; previous file retained.",file=sys.stderr)
if n1<70 and n2<70:
    sys.exit(2)
