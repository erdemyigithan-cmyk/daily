// budget.js icin senaryolar. Hem tarayicida (budget.test.html) hem Node'da calisir.
(function (root) {
  'use strict';

  function approx(a, b, eps) {
    return Math.abs(a - b) <= (eps == null ? 0.01 : eps);
  }
  function ymd(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  // Ortak ayar: gelir 30000, sabit 10000, tasarruf 5000 => V = 15000
  const base = { income: 30000, savingsTarget: 5000, salaryDay: 1, startDate: '2024-06-01' };
  const fixed = [{ name: 'Kira', amount: 10000 }];

  function defineTests(B) {
    return [
      {
        name: 'A) Gun 1, harcama yok: gunluk 500, bakiye 500',
        run() {
          const r = B.computeBudget(base, fixed, [], new Date(2024, 5, 1));
          return [
            ['V=15000', r.periodVariableBudget === 15000],
            ['daysInPeriod=30', r.daysInPeriod === 30],
            ['daysRemaining=30', r.daysRemaining === 30],
            ['spendableToday=500', approx(r.spendableToday, 500)],
            ['cumulative=500', approx(r.cumulativeBalance, 500)]
          ];
        }
      },
      {
        name: 'B) Az harcama yayilimi: gun1 300 harcandi -> gun2 ~506.90',
        run() {
          const exp = [{ amount: 300, ts: '2024-06-01T12:00:00' }];
          const r = B.computeBudget(base, fixed, exp, new Date(2024, 5, 2));
          return [
            ['daysRemaining=29', r.daysRemaining === 29],
            ['spentThisPeriod=300', r.spentThisPeriod === 300],
            ['spendableToday=14700/29', approx(r.spendableToday, 14700 / 29)],
            ['spendable>500 (artik yayildi)', r.spendableToday > 500],
            ['cumulative=700', approx(r.cumulativeBalance, 700)]
          ];
        }
      },
      {
        name: 'C) Asim: gun1 20000 harcandi -> negatif spendable',
        run() {
          const exp = [{ amount: 20000, ts: '2024-06-01T12:00:00' }];
          const r = B.computeBudget(base, fixed, exp, new Date(2024, 5, 2));
          return [
            ['availableNow=-5000', approx(r.availableNow, -5000)],
            ['spendableToday<0', r.spendableToday < 0],
            ['spendableToday=-5000/29', approx(r.spendableToday, -5000 / 29)],
            ['cumulative=-19000', approx(r.cumulativeBalance, -19000)]
          ];
        }
      },
      {
        name: 'D) Ay sonu clamp: maas gunu 31, 15 Subat 2024',
        run() {
          const s = Object.assign({}, base, { salaryDay: 31 });
          const r = B.computeBudget(s, fixed, [], new Date(2024, 1, 15));
          return [
            ['periodStart=2024-01-31', ymd(r.periodStart) === '2024-01-31'],
            ['periodEnd=2024-02-29 (artik yil)', ymd(r.periodEnd) === '2024-02-29']
          ];
        }
      },
      {
        name: 'D2) Clamp sonrasi 31 geri kazanilir: 15 Mart 2024',
        run() {
          const s = Object.assign({}, base, { salaryDay: 31 });
          const r = B.computeBudget(s, fixed, [], new Date(2024, 2, 15));
          return [
            ['periodStart=2024-02-29', ymd(r.periodStart) === '2024-02-29'],
            ['periodEnd=2024-03-31', ymd(r.periodEnd) === '2024-03-31']
          ];
        }
      },
      {
        name: 'E) Rollover: Haziran 10000 harcandi -> Temmuz devreden 5000',
        run() {
          const exp = [{ amount: 10000, ts: '2024-06-15T12:00:00' }];
          const r = B.computeBudget(base, fixed, exp, new Date(2024, 6, 1));
          return [
            ['periodStart=2024-07-01', ymd(r.periodStart) === '2024-07-01'],
            ['daysInPeriod=31', r.daysInPeriod === 31],
            ['rolloverIn=5000', approx(r.rolloverIn, 5000)],
            ['spentThisPeriod=0', r.spentThisPeriod === 0],
            ['availableNow=20000', approx(r.availableNow, 20000)],
            ['spendableToday=20000/31', approx(r.spendableToday, 20000 / 31)],
            ['cumulative=5000+15000/31', approx(r.cumulativeBalance, 5000 + 15000 / 31)]
          ];
        }
      },
      {
        name: 'F) Rollover acigi: Haziran 20000 harcandi -> Temmuz devreden -5000',
        run() {
          const exp = [{ amount: 20000, ts: '2024-06-10T12:00:00' }];
          const r = B.computeBudget(base, fixed, exp, new Date(2024, 6, 1));
          return [
            ['rolloverIn=-5000', approx(r.rolloverIn, -5000)],
            ['availableNow=10000', approx(r.availableNow, 10000)],
            ['spendableToday=10000/31', approx(r.spendableToday, 10000 / 31)]
          ];
        }
      },
      {
        name: 'G) Donem ortasi kurulum (20 Haziran): orantili -> gunluk yine ~500',
        run() {
          const s = Object.assign({}, base, { startDate: '2024-06-20' });
          const r = B.computeBudget(s, fixed, [], new Date(2024, 5, 20));
          // 7/1 - 6/20 = 11 gun kaldi; butce V*11/30 = 5500
          return [
            ['daysRemaining=11', r.daysRemaining === 11],
            ['curBudget orantili (availableNow=5500)', approx(r.availableNow, 5500)],
            ['spendableToday=500 (sismez)', approx(r.spendableToday, 500)],
            ['cumulative=500 (sifira yakin baslar)', approx(r.cumulativeBalance, 500)]
          ];
        }
      },
      {
        name: 'H) Brut gelir modu: vergi dilimi arttikca aylik net duser',
        run() {
          const s = {
            incomeMode: 'gross',
            grossIncome: 100000,
            savingsTarget: 0,
            salaryDay: 1,
            startDate: '2026-01-01'
          };
          const jan = B.computeBudget(s, [], [], new Date(2026, 0, 1));
          const mar = B.computeBudget(s, [], [], new Date(2026, 2, 1));
          return [
            ['Ocak net ~= 75.953 TL', approx(jan.periodIncome, 75953.02)],
            ['Mart net ~= 72.703 TL', approx(mar.periodIncome, 72703.02)],
            ['Mart net < Ocak net', mar.periodIncome < jan.periodIncome],
            ['Mart donem butcesi = Mart net', approx(mar.periodVariableBudget, mar.periodIncome)]
          ];
        }
      }
    ];
  }

  function runAll(B) {
    const tests = defineTests(B);
    const results = [];
    let pass = 0, fail = 0;
    for (const t of tests) {
      let checks;
      try {
        checks = t.run();
      } catch (err) {
        checks = [['HATA: ' + err.message, false]];
      }
      const ok = checks.every(c => c[1]);
      ok ? pass++ : fail++;
      results.push({ name: t.name, ok, checks });
    }
    return { pass, fail, results };
  }

  const api = { runAll, defineTests };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BudgetTests = api;
})(typeof self !== 'undefined' ? self : this);
