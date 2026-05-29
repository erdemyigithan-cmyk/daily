// Abonelik fiyat katalogu. Canli veri cekmez; kurulumda hizli sabit gider onermek icin kullanilir.
// Tutarlar aylik TL olarak yuvarlanmistir ve kullanici satirda her zaman degistirebilir.
(function (root) {
  'use strict';

  const CHECKED_AT = '2026-05-29';

  const CATALOG = {
    'Netflix': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Temel', amount: 274 },
        { label: 'Standart', amount: 369 },
        { label: 'Premium', amount: 499 }
      ]
    },
    'Spotify': {
      source: 'Spotify Turkiye',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 99 },
        { label: 'Duo', amount: 135 },
        { label: 'Aile', amount: 165 },
        { label: 'Ogrenci', amount: 55 }
      ]
    },
    'YouTube Premium': {
      source: 'Karekod fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 100 },
        { label: 'Aile', amount: 190 },
        { label: 'Ogrenci', amount: 65 }
      ]
    },
    'Amazon Prime': {
      source: 'Teknoblog / Amazon Prime duyuru haberleri',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 70 }
      ]
    },
    'Disney+': {
      source: 'Disney+ Turkiye fiyat haberleri',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 250 },
        { label: 'Yillik / 12', amount: 208 }
      ]
    },
    'BluTV': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 199 }
      ]
    },
    'Max': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 150 }
      ]
    },
    'Exxen': {
      source: 'Exxen fiyat derlemeleri',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Reklamli', amount: 219 },
        { label: 'Reklamsiz', amount: 309 },
        { label: 'ExxenSpor reklamli', amount: 409 },
        { label: 'ExxenSpor reklamsiz', amount: 499 }
      ]
    },
    'iCloud': {
      source: 'Apple iCloud+ Turkiye',
      checkedAt: CHECKED_AT,
      plans: [
        { label: '50 GB', amount: 40 },
        { label: '200 GB', amount: 130 },
        { label: '2 TB', amount: 400 },
        { label: '6 TB', amount: 1300 }
      ]
    },
    'Apple Music': {
      source: 'Apple Music Turkiye kampanya kosullari',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Bireysel', amount: 60 },
        { label: 'Aile', amount: 100 },
        { label: 'Ogrenci', amount: 33 }
      ]
    },
    'Apple Arcade': {
      source: 'Apple Turkiye Newsroom',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 70 }
      ]
    },
    'MUBI': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 99 }
      ]
    },
    'Gain': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 99 }
      ]
    },
    'S Sport Plus': {
      source: 'Turksat kampanya dokumani',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik liste', amount: 169 },
        { label: '12 ay kampanya', amount: 139 }
      ]
    },
    'TOD': {
      source: 'TOD fiyat haberleri',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Eglence', amount: 99 },
        { label: 'Super Lig', amount: 399 },
        { label: 'Super Dolu', amount: 499 }
      ]
    },
    'TV+': {
      source: 'Nereden Izlenir fiyat derlemesi',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Aylik', amount: 170 }
      ]
    },
    'Tivibu': {
      source: 'Turk Telekom Tivibu kampanya dokumani',
      checkedAt: CHECKED_AT,
      plans: [
        { label: 'Ev', amount: 125 },
        { label: 'Sinema / Spor', amount: 145 },
        { label: 'Super', amount: 175 }
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
