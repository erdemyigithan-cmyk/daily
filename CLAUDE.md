# Günlük Harcama — Proje Kuralları

## Ürün
"Bugün ne kadar harcayabilirim?" sorusuna tek sayıyla cevap veren, tek kullanıcılık
(yalnız ben) kişisel finans PWA'sı. Bir Excel prototipinin yerini alır.

## Değişmez İlkeler
- **Offline-only.** Sunucu yok, hesap yok, banka entegrasyonu yok, bulut yok.
- **Tüm veri cihazda** (IndexedDB). Veri cihazdan çıkmaz.
- **Vanilla öncelikli.** Framework yok, build adımı yok, npm bağımlılığı yok.
  Tarayıcı dosyaları doğrudan çalıştırır.
- **En basit çalışan çözüm.** Premature abstraction yok. Üç benzer satır,
  erken soyutlamadan iyidir. Hayali gelecek ihtiyaçlar için tasarım yapma.
- **Türkçe UI, para birimi TL.**
- **PWA standartları:** localhost/HTTPS, geçerli manifest, service worker,
  standalone mod, "Ana Ekrana Ekle" çalışır.

## Çekirdek Hesap (en kritik kısım)
"Bugün harcanabilir" SABİT /30 DEĞİLDİR — dinamiktir. Bkz. js/budget.js.
- Dönem her zaman ayın 1'inde başlar (salaryDay=1 sabit). Türkiye'de harcamalar
  kredi kartıyla yapıldığından maaş günü bağımsız kart dönemine göre anlamsızdır.
- spendable_today = (dönem değişken bütçesi + devreden bakiye − bu dönem şimdiye
  kadarki değişken harcama) ÷ dönemde kalan gün (bugün dahil).
- Az harcanan günün artığı kalan günlere otomatik yayılır (dinamik bölme bunu sağlar).
- **Rollover:** dönem sonu bakiyesi bir sonraki döneme devreder.
- **Kümülatif bakiye:** ilk kullanımdan bugüne toplam (planlanan − gerçek). Tüm zaman.

## Hesaplama mimarisi
- `js/budget.js` SAF fonksiyonlardır: DOM yok, IndexedDB yok. Girdi → çıktı.
  Bu sayede tek başına test edilebilir. Tüm matematik burada.
- `js/db.js` sadece veri okur/yazar. `js/app.js` UI'ı yönetir. Karışmasın.

## V1 Kapsam (sadece bunlar)
Kurulum ekranı · büyük tek sayı + hızlı harcama girişi (numpad/hızlı tutar) ·
kümülatif bakiye göstergesi · harcama listesi + silme · offline + kurulabilir.

## V1'de Bilinçli Olarak YOK
Kategoriler, grafikler, çoklu profil, dışa aktarma, oyunlaştırma, bildirimler,
çoklu para birimi, bulut yedek, ayar geçmişi.

## Bilinen V1 Sınırı
Ayar geçmişi tutulmaz. Gelir/sabit gider/tasarruf değişirse geçmiş dönemler
GÜNCEL ayarlarla yeniden hesaplanır. Prototip için kabul; v2'de ayar geçmişi.

## v2 Fikirleri (sadece not, uygulama)
- Ayar geçmişi: gelir/sabit gider değişince geçmiş dönemleri eski değerle hesapla.
- Aylık özet / basit grafik.
- Harcamaya opsiyonel not/etiket.
- Veri dışa/içe aktarma (JSON yedek) — offline kalır.
- Tasarruf hedefine ulaşma göstergesi.

## Yerel Test
- Sunucu: `python3 -m http.server 8000` → http://localhost:8000
  (SW ve IndexedDB localhost'ta HTTPS'siz çalışır).
- DevTools → Application: manifest, service worker, IndexedDB; Lighthouse PWA denetimi;
  Network → Offline ile offline testi.
- Matematik: test/budget.test.html'i tarayıcıda aç.
- Telefon: localhost LAN'da çalışmaz. adb reverse / ngrok / statik host kullan.
