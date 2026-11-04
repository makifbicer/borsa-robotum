# Akif BIST Robot v3.7 STABLE

Bu sürümde karar motorunun ve sonradan eklenen özelliklerin arayüzü korunur; **BIST100 veri katmanı çalışan v2.0 çekirdeğine geri alınmıştır**.

Korunan özellikler:
- Robot+ / Bugün ne alabilirim?
- BIST30 / BIST100 tarama
- BIST TÜM ve PKGYO desteği (isteğe bağlı manuel veri güncellemesi)
- Aday Sepet
- Model Sepet = MODELDE TUT
- Canlı saat ve son veri saati
- Kullanıcının yazdığı toplam TL hedef alarmı
- Sesli uyarı Aç/Kapa
- Piyasa rejimi, breadth, Volume Profile, VWAP, paper trading, backtest

Stabilite değişiklikleri:
- `fetch_market.py` tekrar v2.0'da çalışan `yf.Ticker(...).history()` + `curl_cffi Session` yaklaşımına döndü.
- BIST100 için intraday + günlük veri tek yetkili workflow tarafından güncellenir.
- Sonradan eklenen daily/live-quotes deneysel workflow'ları devre dışıdır.
- BIST TÜM workflow'u otomatik değil, yalnız elle çalıştırılır; böylece ana veri commit'i ile yarışmaz.
- Çalışan sürümdeki tolerans korunur: 50+ hisse geldiğinde veri dosyası güncellenir; tek bir eksik hisse tüm sistemi durdurmaz.

Bu veri ücretsiz/gecikmeli olabilir; lisanslı gerçek zamanlı BIST verisi değildir.
