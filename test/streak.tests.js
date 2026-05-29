// streak.js icin senaryolar. Tarayicida streak.test.html ile calisir.
(function (root) {
  'use strict';

  // Sabit "now" referansi: 2026-05-29 12:00 (yerel)
  const NOW = new Date(2026, 4, 29, 12, 0, 0);

  // gunler once verilen bir gune, oglen 12:00 ts uretir
  function daysAgoTs(n) {
    const d = new Date(2026, 4, 29 - n, 12, 0, 0);
    return d.toISOString();
  }
  function exp(daysAgo, amount) {
    return { amount: amount == null ? 100 : amount, ts: daysAgoTs(daysAgo) };
  }

  function defineTests(S) {
    return [
      {
        name: 'A) Bugün dahil 3 ardışık gün loglu -> current=3',
        run() {
          const r = S.compute([exp(0), exp(1), exp(2)], { now: NOW, todaySpendable: 10 });
          return [
            ['current=3', r.current === 3],
            ['todayLogged', r.todayLogged === true],
            ['riskToday=false', r.riskToday === false],
            ['best>=3', r.best >= 3]
          ];
        }
      },
      {
        name: 'B) Bugün giriş yok, dün+evvelsi var -> risk, current dünkü değerde',
        run() {
          const r = S.compute([exp(1), exp(2)], { now: NOW, todaySpendable: 10 });
          return [
            ['current=2', r.current === 2],
            ['todayLogged=false', r.todayLogged === false],
            ['riskToday=true', r.riskToday === true],
            ['todayClean=false', r.todayClean === false]
          ];
        }
      },
      {
        name: 'C) Boş gün sıfırlar: bugün ve dün yok (2 gün önce vardı) -> current=0',
        run() {
          const r = S.compute([exp(2), exp(3)], { now: NOW, todaySpendable: 10 });
          return [
            ['current=0', r.current === 0],
            ['riskToday=false', r.riskToday === false],
            ['best=2 (geçmiş seri)', r.best === 2]
          ];
        }
      },
      {
        name: 'D) Aşım zinciri BOZMAZ: bugün loglu, todaySpendable negatif',
        run() {
          const r = S.compute([exp(0), exp(1)], { now: NOW, todaySpendable: -50 });
          return [
            ['current=2 (aşıma rağmen)', r.current === 2],
            ['todayLogged', r.todayLogged === true],
            ['todayClean=false (aşım)', r.todayClean === false]
          ];
        }
      },
      {
        name: 'E) Temiz gün: bugün loglu, todaySpendable>=0 -> todayClean=true',
        run() {
          const r = S.compute([exp(0)], { now: NOW, todaySpendable: 0 });
          return [
            ['current=1', r.current === 1],
            ['todayClean=true', r.todayClean === true]
          ];
        }
      },
      {
        name: 'F) best > current: geçmişte 5 seri, şu an 1',
        run() {
          // 5 ardışık gün (10..6 gün önce), sonra boşluk, sadece bugün
          const exps = [exp(10), exp(9), exp(8), exp(7), exp(6), exp(0)];
          const r = S.compute(exps, { now: NOW, todaySpendable: 5 });
          return [
            ['current=1', r.current === 1],
            ['best=5', r.best === 5]
          ];
        }
      },
      {
        name: 'G) Hiç harcama yok -> hepsi sıfır/false',
        run() {
          const r = S.compute([], { now: NOW });
          return [
            ['current=0', r.current === 0],
            ['best=0', r.best === 0],
            ['todayLogged=false', r.todayLogged === false],
            ['riskToday=false', r.riskToday === false],
            ['todayClean=false', r.todayClean === false]
          ];
        }
      },
      {
        name: 'H) Aynı günde birden çok kayıt tek gün sayılır',
        run() {
          const r = S.compute([exp(0, 50), exp(0, 70), exp(1, 30)], { now: NOW, todaySpendable: 10 });
          return [
            ['current=2', r.current === 2]
          ];
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
  root.StreakTests = api;
})(typeof self !== 'undefined' ? self : this);
