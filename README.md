# Akif BIST Robot v3.4 — Hızlı Veri Akışı

v3.3'teki tüm özellikler korunur.

Düzeltme:
- Eski veri çekici 100+ hisseyi gün içi ve günlük veride tek tek çektiği için 15–20+ dakika sürebiliyordu.
- v3.4 BIST100 verisini 10 paralel bağlantıyla çeker.
- GitHub Action 10 dakikada bir çalışır.
- KAP otomatik denemesi veri workflow'undan çıkarıldı; gereksiz bekleme yok.
- updatedAt artık veri işi bittikten sonra yazılır.
- Son veri 20 dakikadan eskiyse sarı, 40 dakikadan eskiyse kırmızı VERİ GECİKMİŞ uyarısı çıkar.
- BIST TÜM ayrı saatlik workflow ile çalışmaya devam eder.

Not: GitHub Actions cron zamanlaması kesin gerçek-zamanlı değildir ve zaman zaman birkaç dakika gecikebilir.
