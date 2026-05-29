// savings.js icin senaryolar. Tarayicida savings.test.html ile calisir.
(function (root) {
  'use strict';

  function approx(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 0.01 : eps); }

  // Ortak: V=15000, tasarruf=6000, N=30 -> dayPlan=(15000+6000)/30=700
  function defineTests(S) {
    return [
      {
        name: 'A) Gün1, 0 harcama -> biriken 700',
        run() {
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 1, spentThisPeriod: 0, spentToday: 0 });
          return [
            ['dayPlan=700', approx(r.dayPlan, 700)],
            ['saved=700', approx(r.saved, 700)],
            ['target=6000', r.target === 6000],
            ['overflow=false', r.overflow === false],
            ['todayContrib=700', approx(r.todayContrib, 700)]
          ];
        }
      },
      {
        name: 'B) Gün2, toplam 500 harcandı -> biriken 900',
        run() {
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 2, spentThisPeriod: 500, spentToday: 500 });
          return [
            ['saved=900', approx(r.saved, 900)],
            ['todayContrib=200 (700-500)', approx(r.todayContrib, 200)]
          ];
        }
      },
      {
        name: 'C) Gün3, toplam 1200 harcandı (aşım) -> biriken 900 (artmaz)',
        run() {
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 3, spentThisPeriod: 1200, spentToday: 700 });
          return [
            ['saved=900', approx(r.saved, 900)],
            ['todayContrib=0 (700-700)', approx(r.todayContrib, 0)]
          ];
        }
      },
      {
        name: 'D) Ay sonu tam bütçe harcandı -> kumbara tam dolu (saved=target)',
        run() {
          // 30 gün, toplam V=15000 değişken harcama -> saved = 30*700 - 15000 = 6000
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 30, spentThisPeriod: 15000, spentToday: 0 });
          return [
            ['saved=6000', approx(r.saved, 6000)],
            ['pct=1', approx(r.pct, 1)],
            ['overflow=false', r.overflow === false]
          ];
        }
      },
      {
        name: 'E) Az harcama -> hedef aşılır (overflow)',
        run() {
          // 30 gün, sadece 5000 harcandı -> saved = 21000 - 5000 = 16000 > 6000
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 30, spentThisPeriod: 5000, spentToday: 0 });
          return [
            ['saved=16000', approx(r.saved, 16000)],
            ['overflow=true', r.overflow === true],
            ['pct>1', r.pct > 1]
          ];
        }
      },
      {
        name: 'F) Ağır aşım -> biriken negatif (geride)',
        run() {
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 5, spentThisPeriod: 8000, spentToday: 0 });
          // saved = 5*700 - 8000 = 3500 - 8000 = -4500
          return [
            ['saved=-4500', approx(r.saved, -4500)],
            ['pct<0', r.pct < 0]
          ];
        }
      },
      {
        name: 'G) Tasarruf hedefi 0 -> null (kumbara yok)',
        run() {
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 0, daysInPeriod: 30, daysAccrued: 10, spentThisPeriod: 1000, spentToday: 0 });
          return [['null döner', r === null]];
        }
      },
      {
        name: 'H) Dönem ortası başlangıç: daysAccrued küçük olur',
        run() {
          // Ay 30 gün ama 11 gündür takip (daysAccrued=11), 1400 harcandı
          const r = S.compute({ periodVariableBudget: 15000, savingsTarget: 6000, daysInPeriod: 30, daysAccrued: 11, spentThisPeriod: 1400, spentToday: 0 });
          // saved = 11*700 - 1400 = 7700 - 1400 = 6300
          return [['saved=6300', approx(r.saved, 6300)]];
        }
      }
    ];
  }

  function runAll(S) {
    const tests = defineTests(S);
    const results = [];
    let pass = 0, fail = 0;
    for (const t of tests) {
      let checks;
      try { checks = t.run(); }
      catch (err) { checks = [['HATA: ' + err.message, false]]; }
      const ok = checks.every(c => c[1]);
      ok ? pass++ : fail++;
      results.push({ name: t.name, ok, checks });
    }
    return { pass, fail, results };
  }

  const api = { runAll, defineTests };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SavingsTests = api;
})(typeof self !== 'undefined' ? self : this);
