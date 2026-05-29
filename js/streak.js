// Oyunlastirma: veri girme serisi (streak). Saf fonksiyon: DOM yok, IndexedDB yok.
// "Zincir" = arka arkaya VERI GIRILEN gun sayisi. Bos gun zinciri sifirlar.
// Butceyi asmak zinciri BOZMAZ; yalniz veri girmemek bozar (todayClean ayri/odul).
(function (root) {
  'use strict';

  function key(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // Yerel takvim gun indeksi (DST-guvenli).
  function dayIndex(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  // Tum loglu gunlerin en uzun ardisik serisi.
  function longestRun(daySet) {
    const idx = [...daySet].map(k => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
      return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
    }).sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    for (const i of idx) {
      run = (prev !== null && i === prev + 1) ? run + 1 : 1;
      if (run > best) best = run;
      prev = i;
    }
    return best;
  }

  // expenses: [{ amount, ts }]; opts: { now, todaySpendable }
  function compute(expenses, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const todaySpendable = opts.todaySpendable;

    const days = new Set();
    for (const e of expenses || []) {
      days.add(key(new Date(e.ts)));
    }

    const todayKey = key(now);
    const todayLogged = days.has(todayKey);

    // current: bugunden (loglandiysa) yoksa dunden geriye, ardisik loglu gunler.
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    let current = 0;
    while (days.has(key(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const riskToday = !todayLogged && current > 0;
    const best = Math.max(longestRun(days), current);
    const todayClean = todayLogged && todaySpendable != null && Number(todaySpendable) >= 0;

    return { current, best, todayLogged, todayClean, riskToday };
  }

  const api = { compute, longestRun, dayIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Streak = api;
})(typeof self !== 'undefined' ? self : this);
