# Akif BIST Robot v1.1

## Başlangıç model sepet
- TCELL %20
- AKBNK %20
- THYAO %15
- BIMAS %15
- MAVI %10
- ASELS %10
- TUPRS %10

"Sepeti Başlat" düğmesi çalıştırıldığı anda erişilebilen fiyatları maliyet kabul eder, tam lotlarla 10.000 TL'ye mümkün olduğunca yakın dağılım yapar ve kalan tutarı nakit olarak tutar.

## Özellikler
- BIST 30 / BIST 100 teknik tarama
- 15 dk / 1 saat / günlük periyot
- EMA9/21/50, RSI14, MACD, ATR14, Bollinger, göreli hacim
- 0-100 teknik skor
- Portföy, lot ve maliyet girişi
- Dinamik stop ve Hedef 1
- Türkçe sesli alarm (uygulama açıkken)
- Tarayıcı bildirimleri
- Cihazda localStorage ile saklama

## Veri
Yahoo Finance public chart endpoint kullanılır. Resmî Borsa İstanbul API'si değildir; veri gecikmeli/eksik olabilir.

## Yerelde çalıştırma
Windows'ta `start_windows.bat` dosyasına çift tıklayın.
Tarayıcıda http://localhost:8080 açılır.

Telefon/PWA kullanımı için klasörü statik bir web sunucusuna (ör. GitHub Pages) yükleyin ve Safari/Chrome'dan ana ekrana ekleyin.
