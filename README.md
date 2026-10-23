# Akif BIST Robot v3.6 — Güncel fiyat katmanı

- Model Sepet ANLIK/K-Z, Portföy ANLIK/K-Z ve hedef alarmı `data/quotes.json` kullanır.
- `quotes.json`, TradingView public Turkey scanner'dan tüm Türkiye hisselerini tek istekte çeker.
- `Update live quotes` workflow'u her 5 dakikada bir çalışır.
- Yahoo/yfinance tarihsel barlar yalnız grafik, EMA/RSI/ATR ve backtest için kalır.
- Böylece tarihsel bar güncellemesi gecikse bile sepetin güncel fiyat takibi bağımsız devam eder.

Ücretsiz veri gecikmeli olabilir; lisanslı gerçek zamanlı BIST verisi değildir.
