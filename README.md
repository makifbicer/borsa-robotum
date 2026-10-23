# Akif BIST Robot v3.5 — Batch Veri Motoru

v3.4'teki tüm uygulama özellikleri korunur.

Ana düzeltme:
- BIST100 15 dakikalık veri ile 1 yıllık günlük veri artık aynı Action içinde çekilmez.
- Gün içi veri her 10 dakikada yalnız `intraday.json` günceller.
- Günlük geçmiş veri ayrı `Update BIST daily data` workflow'undadır.
- Yahoo indirme tek tek HTTP isteği yerine yfinance `download()` ile 60'lı batch + threads kullanır.
- Bu yaklaşım açık kaynak BIST Radar projesindeki ölçülmüş veri ingest mimarisiyle aynıdır.
- Yeni timestamp yalnız en az 70/100 BIST100 hissesi taze geldiyse ilerler.

BIST'in ücretsiz Yahoo verisi yaklaşık 15 dakika gecikmeli olabilir; GitHub Actions ayrıca birkaç dakika zamanlama gecikmesi yaşayabilir.
