// Harcama istatistikleri. Saf fonksiyonlar: DOM yok, IndexedDB yok. Girdi -> cikti.
// Bir [from, to) tarih araligi ve harcama listesi alir; ozet + gunluk seri uretir.
(function (root) {
  'use strict';

  function atMidnight(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  function dayKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // [from, to) araligindaki her gun icin {date, total} kovasi (bos gunler 0).
  function dailySeries(expenses, from, to) {
    const buckets = new Map();
    const cur = atMidnight(from);
    const end = atMidnight(to);
    while (cur < end) {
      buckets.set(dayKey(cur), 0);
      cur.setDate(cur.getDate() + 1);
    }
    for (const e of expenses || []) {
      const t = new Date(e.ts);
      if (t >= from && t < to) {
        const k = dayKey(t);
        if (buckets.has(k)) buckets.set(k, buckets.get(k) + (Number(e.amount) || 0));
      }
    }
    return [...buckets.entries()].map(([date, total]) => ({ date, total }));
  }

  // Ozet: toplam, islem sayisi, gun sayisi, gunluk ortalama, en yuksek gun, seri.
  function summarize(expenses, from, to) {
    const series = dailySeries(expenses, from, to);
    let total = 0, count = 0;
    const loggedKeys = new Set(); // kayit girilen gunler (kayit olmayan gun ortalamaya KATILMAZ)
    for (const e of expenses || []) {
      const t = new Date(e.ts);
      if (t >= from && t < to) {
        total += Number(e.amount) || 0;
        count++;
        loggedKeys.add(dayKey(t));
      }
    }
    const days = series.length || 1;        // takvim gunu (grafik/eksen icin)
    const loggedDays = loggedKeys.size;      // takip edilen gun (ortalama paydasi)
    const dailyAvg = loggedDays > 0 ? total / loggedDays : 0;
    const maxDay = series.reduce((m, d) => (d.total > m.total ? d : m), { date: null, total: 0 });
    return { total, count, days, loggedDays, dailyAvg, maxDay, series };
  }

  // Iki donemi karsilastir: { current, previous, diff, pct }
  // pct: onceki doneme gore yuzde degisim (null = onceki donem sifir).
  function compare(expenses, from, to, prevFrom, prevTo) {
    const cur = summarize(expenses, from, to).total;
    const prev = summarize(expenses, prevFrom, prevTo).total;
    const diff = cur - prev;
    const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
    return { current: cur, previous: prev, diff, pct };
  }

  root.Stats = { dailySeries, summarize, compare, dayKey, atMidnight };
})(typeof self !== 'undefined' ? self : this);
