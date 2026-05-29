// Abonelik fiyat katalogu. Canli veri cekmez; kurulumda hizli sabit gider onermek icin kullanilir.
// Tutarlar aylik TL olarak yuvarlanmistir ("oneri fiyat") ve kullanici satirda her zaman degistirebilir.
// Yillik planlar 12'ye bolunup ay basina cevrilmistir. Dolar bazli servisler ~46 TL/USD ile cevrildi.
(function (root) {
  'use strict';

  const CHECKED_AT = '2026-05-29';

  const CATALOG = {
    // ---- Dizi & Film ----
    'Netflix': {
      source: 'netflix.com/tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Temel', amount: 190 },
        { label: 'Standart', amount: 290 },
        { label: 'Özel (Premium)', amount: 380 }
      ]
    },
    'Disney+': {
      source: 'Disney+ TR resmi + derleme (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Reklamlı', amount: 250 },
        { label: 'Reklamsız', amount: 450 },
        { label: 'Reklamlı Yıllık/12', amount: 208 },
        { label: 'Reklamsız Yıllık/12', amount: 375 }
      ]
    },
    'Amazon Prime': {
      source: 'Amazon Prime TR (Eki 2025 zammı)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 70 }
      ]
    },
    'BluTV': {
      source: 'BluTV fiyat derlemesi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 200 },
        { label: 'Yıllık/12', amount: 70 }
      ]
    },
    'Max': {
      source: 'Max (HBO) fiyat derlemesi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Standart', amount: 230 },
        { label: 'Özel', amount: 300 },
        { label: 'Standart Yıllık/12', amount: 192 },
        { label: 'Özel Yıllık/12', amount: 250 }
      ]
    },
    'Exxen': {
      source: 'Exxen resmi ön bilgilendirme formu (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Reklamlı', amount: 193 },
        { label: 'Reklamsız', amount: 269 }
      ]
    },
    'Gain': {
      source: 'Gain destek/derleme (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 249 }
      ]
    },
    'MUBI': {
      source: 'mubi.com/tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 169 },
        { label: 'Yıllık/12', amount: 125 }
      ]
    },
    'TOD': {
      source: 'todtv.com.tr (2026, 12 taksitli aylık)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Spor Eğlence', amount: 129 },
        { label: 'Sezonluk', amount: 399 },
        { label: 'Tam Paket', amount: 1290 }
      ]
    },
    'S Sport Plus': {
      source: 'ssportplus.com resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 399 },
        { label: 'Yıllık/12', amount: 233 }
      ]
    },
    'TV+': {
      source: 'turkcell.com.tr TV+ kampanya (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Premium', amount: 230 },
        { label: '12 Aylık/ay', amount: 200 }
      ]
    },
    'Tivibu': {
      source: 'Türk Telekom Tivibu kampanya dokümanı',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Ev', amount: 125 },
        { label: 'Sinema / Spor', amount: 145 },
        { label: 'Süper', amount: 175 }
      ]
    },

    // ---- Müzik ----
    'Spotify': {
      source: 'spotify.com/tr-tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 99 },
        { label: 'Duo', amount: 135 },
        { label: 'Aile', amount: 165 },
        { label: 'Öğrenci', amount: 55 }
      ]
    },
    'Apple Music': {
      source: 'Apple Music TR (2026 zammı)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 60 },
        { label: 'Aile', amount: 100 },
        { label: 'Öğrenci', amount: 33 }
      ]
    },
    'YouTube Premium': {
      source: 'YouTube Premium TR derlemesi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 80 },
        { label: 'Aile', amount: 160 },
        { label: 'Öğrenci', amount: 53 },
        { label: 'Yıllık/12', amount: 48 }
      ]
    },
    'YouTube Music': {
      source: 'YouTube Music TR (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 80 }
      ]
    },
    'Deezer': {
      source: 'Deezer TR derlemesi (2026, değişken)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Premium', amount: 45 },
        { label: 'Aile', amount: 60 },
        { label: 'HiFi', amount: 60 }
      ]
    },
    'Fizy': {
      source: 'Turkcell Fizy / Pasaj (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Premium', amount: 65 }
      ]
    },

    // ---- Yapay Zeka ----
    'ChatGPT': {
      source: 'openai.com $20/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Plus', amount: 910 },
        { label: 'Pro ($200)', amount: 9100 }
      ]
    },
    'Claude': {
      source: 'anthropic.com $20/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Pro', amount: 910 },
        { label: 'Max ($100)', amount: 4550 }
      ]
    },
    'Gemini Advanced': {
      source: 'one.google.com/tr AI planları (resmi TL, 2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'AI Plus', amount: 200 },
        { label: 'AI Pro', amount: 720 }
      ]
    },
    'Perplexity Pro': {
      source: 'perplexity.ai $20/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Pro', amount: 910 },
        { label: 'Yıllık/12', amount: 758 }
      ]
    },
    'GitHub Copilot': {
      source: 'github.com $10/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Pro', amount: 455 },
        { label: 'Pro+', amount: 1775 }
      ]
    },

    // ---- Bulut & Depolama ----
    'iCloud': {
      source: 'Apple Destek TR (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: '50 GB', amount: 40 },
        { label: '200 GB', amount: 130 },
        { label: '2 TB', amount: 400 },
        { label: '6 TB', amount: 1300 },
        { label: '12 TB', amount: 2500 }
      ]
    },
    'Google One': {
      source: 'one.google.com/tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: '100 GB', amount: 50 },
        { label: '2 TB', amount: 205 }
      ]
    },
    'Dropbox': {
      source: 'dropbox.com $11,99/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Plus 2TB', amount: 548 },
        { label: 'Plus Yıllık/12', amount: 457 }
      ]
    },
    'OneDrive': {
      source: 'Microsoft TR (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: '100 GB', amount: 14 }
      ]
    },

    // ---- Oyun ----
    'Xbox Game Pass': {
      source: 'Xbox TR fiyat derlemesi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Essential', amount: 269 },
        { label: 'Premium', amount: 409 },
        { label: 'PC', amount: 419 },
        { label: 'Ultimate', amount: 529 }
      ]
    },
    'PlayStation Plus': {
      source: 'PS Store TR (May 2026 zammı)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Essential', amount: 400 },
        { label: 'Extra', amount: 600 },
        { label: 'Deluxe', amount: 710 }
      ]
    },
    'GeForce Now': {
      source: 'GAME+ Türkiye (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Performance', amount: 599 },
        { label: 'Ultimate Yıllık/12', amount: 999 }
      ]
    },
    'EA Play': {
      source: 'EA Play TR (2026 zammı)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 300 },
        { label: 'Yıllık/12', amount: 167 }
      ]
    },
    'Apple Arcade': {
      source: 'Apple TR (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 70 }
      ]
    },

    // ---- Kitap & Haber ----
    'Storytel': {
      source: 'storytel.com/tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Sınırsız', amount: 330 },
        { label: 'Aile (2 hesap)', amount: 380 },
        { label: 'Öğrenci', amount: 125 }
      ]
    },
    'Audible': {
      source: 'App Store TR (düşük güven, doğrulanmadı)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Premium Plus', amount: 142 }
      ]
    },
    'Blinkist': {
      source: 'blinkist.com $15,99/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Premium', amount: 734 },
        { label: 'Yıllık/12', amount: 383 }
      ]
    },
    'Aposto': {
      source: 'aposto.com (güncel olmayabilir)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylık', amount: 60 },
        { label: 'Yıllık/12', amount: 50 }
      ]
    },
    'Gazete / Dergi': {
      source: 'tipik dijital gazete aboneliği (aralık)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Tipik aylık', amount: 75 }
      ]
    },

    // ---- Yazılım & Ofis ----
    'Microsoft 365': {
      source: 'microsoft.com/tr-tr resmi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 330 },
        { label: 'Bireysel Yıllık/12', amount: 275 },
        { label: 'Aile', amount: 410 },
        { label: 'Aile Yıllık/12', amount: 342 }
      ]
    },
    'Adobe Creative Cloud': {
      source: 'adobe.com/tr derlemesi (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Fotoğraf planı', amount: 127 },
        { label: 'Tüm Uygulamalar', amount: 925 }
      ]
    },
    'Canva Pro': {
      source: 'canva.com/tr yıllık 1.920 TL (2026)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Pro Yıllık/12', amount: 160 }
      ]
    },
    'Notion': {
      source: 'notion.com $12/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Plus', amount: 548 },
        { label: 'Plus Yıllık/12', amount: 457 }
      ]
    },
    'LinkedIn Premium': {
      source: 'linkedin.com $29,99/ay (~46 TL/USD)',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Career', amount: 1371 },
        { label: 'Career Yıllık/12', amount: 914 }
      ]
    }
  };

  function get(name) {
    return CATALOG[name] || null;
  }

  function defaultPlan(name) {
    const entry = get(name);
    if (!entry || !entry.plans || entry.plans.length === 0) return null;
    return entry.plans[0];
  }

  const api = { CHECKED_AT, CATALOG, get, defaultPlan };
  root.SubscriptionCatalog = api;
})(typeof self !== 'undefined' ? self : this);
