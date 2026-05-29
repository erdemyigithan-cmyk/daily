// Kurulum yardimcisi verisi: kredi karti ekstresinden sabit gider bulma.
// (1) Yapay zekaya verilecek hazir prompt. (2) Banka banka ekstre indirme rehberi.
// Statik veri; canli baglanti yok. Uygulama menuleri surumle degisebilir.
(function (root) {
  'use strict';

  // Ekstre + bu prompt yapay zekaya verilince sabit giderleri JSON olarak dondurur.
  const STATEMENT_PROMPT = `Sana bir kredi kartı ekstresi (PDF veya ekran görüntüsü) vereceğim. Görevin: bu ekstreden AYLIK TEKRARLAYAN / SABİT giderleri çıkarmak.

Kurallar:
- Sadece her ay düzenli tekrar eden harcamaları al: abonelikler (Netflix, Spotify, YouTube vb.), faturalar (elektrik, su, doğal gaz, internet, telefon), kira, aidat, sigorta, spor/pilates, ulaşım aboneliği, düzenli kredi/taksit ödemeleri.
- Tek seferlik veya değişken harcamaları DAHİL ETME (market, restoran, akaryakıt, giyim, rastgele alışveriş).
- Aynı gideri tek satırda birleştir.
- Tutarları tam sayı TL ver (kuruş yok).
- İsimleri sade ve tanınır tut.

Çıktıyı SADECE aşağıdaki JSON formatında ver, başka hiçbir açıklama yazma:
[
  { "name": "Netflix", "amount": 274 },
  { "name": "Kira", "amount": 20000 }
]`;

  const BANKS = {
    'Garanti BBVA': {
      steps: [
        "Alt menüden 'Kartlar' bölümüne girip ilgili kredi kartını seçin.",
        "Kart detayında 'Hesap Özeti' / 'Ekstre' alanına girin, dönem listesinden geçen ayı seçin.",
        "'Ekstre İşlemleri' (veya 'Dökümanlar') menüsünden ekstreyi PDF olarak açın.",
        "Paylaş ikonuyla PDF'i indirin veya e-posta ile kendinize gönderin."
      ],
      note: "Geçmiş dönem görünmüyorsa 'Ekstre İste' ile talep edip hazır olunca indirin."
    },
    'İş Bankası': {
      steps: [
        "İşCep'te ana ekranda 'Tüm İşlemler' menüsünü açın.",
        "'Belgelerim' bölümüne girin (dijital hesap özetleri burada).",
        "Kredi kartınızı ve geçen döneme ait hesap özetini seçin.",
        "PDF'i görüntüleyip cihaza indirin ya da e-posta ile paylaşın."
      ],
      note: "Alternatif yol: 'Kartlarım' > kart > 'Hesap Özeti' menüsünden de dönem seçilebilir."
    },
    'Yapı Kredi': {
      steps: [
        "'Kartlarım' bölümünden kredi kartınızı seçin.",
        "Kart detayında 'Hesap Özeti' (Ekstre) seçeneğine girin.",
        "Dönem listesinden geçen ayı seçip ekstreyi görüntüleyin.",
        "PDF'i indirip paylaş ikonuyla kaydedin veya gönderin."
      ],
      note: "Doküman üzerindeki doğrulama kodu PDF'in resmî olduğunu gösterir."
    },
    'Akbank': {
      steps: [
        "Ana sayfada 'Hesaplarım' sekmesine girip kredi kartı hesabını seçin.",
        "Sağ üstteki üç nokta menüsünden 'Hesap Özeti / Ekstre'ye gidin.",
        "Dönem (geçen ay) veya tarih aralığını seçin.",
        "Paylaş ikonuna basıp dosya türünü PDF seçerek indirin/gönderin."
      ],
      note: "Geçmiş dönemler de listelenir; indirileni Dosyalar'a kaydedin."
    },
    'Ziraat Bankası': {
      steps: [
        "Ziraat Mobil veya Bankkart Mobil'de 'Kartlar' menüsüne girip kredi kartını seçin.",
        "Kart detayında 'Hesap Özeti' / 'Ekstre' bölümüne girin.",
        "Dönem listesinden geçen ayı seçip ekstreyi görüntüleyin.",
        "Paylaş/indir ikonuyla PDF olarak kaydedin veya e-posta ile gönderin."
      ],
      note: "Menü adı uygulama sürümüne göre 'Hesap Özeti' veya 'Ekstre' olabilir."
    },
    'VakıfBank': {
      steps: [
        "Alt menüden 'Kartlarım' bölümüne girip kredi kartınızı seçin.",
        "Kart detayında 'Hesap Özeti' / 'Ekstre' seçeneğine dokunun.",
        "Dönem listesinden geçen aya ait ekstreyi seçin.",
        "Paylaş/indir simgesiyle PDF olarak kaydedin veya paylaşın."
      ],
      note: "E-ekstre tanımlı değilse 'Kartlı İşlemlerim'den talimat vermek gerekebilir; geçmiş dönemler yine listelenir."
    },
    'QNB': {
      steps: [
        "QNB Mobil'de 'Kartlar' menüsüne girip kredi kartınızı seçin.",
        "Kart detayında 'Hesap Özeti' / 'Ekstre' bölümüne dokunun.",
        "Dönem seçiminden geçen ayın ekstresini açın.",
        "Paylaş/indir butonuyla PDF olarak indirin veya paylaşın."
      ],
      note: "Geçmiş dönem ekstreleri PDF olarak listelenir."
    },
    'DenizBank': {
      steps: [
        "MobilDeniz'de alt menüden 'Kartlarım' bölümüne girip kredi kartınızı seçin.",
        "Kart detayında 'Ekstre' / 'Hesap Özeti' seçeneğine dokunun.",
        "Dönem listesinden geçen aya ait ekstreyi seçin.",
        "Dökümü görüntüleyip PDF olarak indirin veya paylaşın."
      ],
      note: "Aynı işlem DenizKartım uygulamasında da yapılabilir."
    },
    'TEB': {
      steps: [
        "CEPTETEB'de ana sayfada 'Kartlar' menüsündeki kredi kartınıza dokunun.",
        "Açılan ekranda sağ alttaki yeşil 'Menü' ikonuna basın.",
        "'Hesap Ekstresi' adımını seçin.",
        "Geçen ayın dönemini seçip 'PDF Göster' ile görüntüleyip cihaza kaydedin."
      ],
      note: "Dijital Ekstre tanımlıysa kesilen ekstre bildirimle gelir."
    },
    'Enpara': {
      steps: [
        "Ana ekranda kredi kartınızı seçin (Kartlar bölümü).",
        "Kart detay ekranında 'Hesap Özeti' (Ekstre) seçeneğine dokunun.",
        "Dönem listesinden geçen ayın ekstresini seçin.",
        "Paylaş/indir simgesiyle PDF olarak kaydedin veya e-posta ile gönderin."
      ],
      note: "Dijital ekstre talimatı varsa ekstre kesildiğinde bildirimle de ulaşırsınız."
    },
    'ING': {
      steps: [
        "ING Mobil'de alt menüden 'Kartlar' bölümüne girip kredi kartınızı seçin.",
        "Kart ekranında 'Hesap Özeti' / 'Ekstre' seçeneğine dokunun.",
        "Dönem seçiminden geçen dönemi seçin.",
        "Paylaş/indir ile PDF olarak kaydedin veya e-posta ile gönderin."
      ],
      note: "Dijital hesap özeti hizmeti ücretsizdir; PDF indirme ve e-posta paylaşımı destekli."
    },
    'Halkbank': {
      steps: [
        "Halkbank Mobil'de 'Kartlarım' / 'Kredi Kartları' bölümüne girin.",
        "Kredi kartınızı seçip 'Ekstre' (Hesap Özeti) seçeneğine dokunun.",
        "Dönem listesinden geçen ayın ekstresini seçin.",
        "Paylaş/indir simgesiyle PDF olarak kaydedin veya gönderin."
      ],
      note: "Resmî rehberde bu akış 'Kredi Kartı Ekstre Görüntüleme' başlığı altındadır."
    },
    'Kuveyt Türk': {
      steps: [
        "Mobil Şube'de ana ekranda 'Kartlar' bölümünden kredi kartınızı seçin.",
        "Kart detayında 'Hesap Özeti' / 'Ekstre' seçeneğine dokunun.",
        "Dönem seçiminden geçen ayın ekstresini açın.",
        "Paylaş/indir ile PDF olarak kaydedin veya e-posta ile gönderin."
      ],
      note: "E-ekstre talimatı varsa ekstre kesildiğinde e-postanıza da PDF gelir."
    }
  };

  root.BankGuide = { STATEMENT_PROMPT, BANKS };
})(typeof self !== 'undefined' ? self : this);
