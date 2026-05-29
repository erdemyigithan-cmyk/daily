// Saf hesaplama. DOM yok, IndexedDB yok. Girdi -> cikti. Tek basina test edilebilir.
//
// Cekirdek mantik:
//   V (donem degisken butcesi) = gelir - toplam sabit gider - tasarruf hedefi
//   spendableToday = (V + devreden bakiye - bu donem harcanan) / kalan gun (bugun dahil)
//   Az harcanan gunun artigi kalan gunlere otomatik yayilir (dinamik bolme).
//   Rollover: gecmis donemlerin bakiyesi mevcut doneme devreder.
//   cumulativeBalance (tum zaman) = devreden + V*(gecen gun / donem gunu) - bu donem harcanan
//
// Donem capasi = maas gunu. Maas gunu ayda yoksa (31 -> Subat) ayin son gunune kayar.

(function (root) {
  'use strict';

  function lastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Maas gununu o ayda gecerli bir gune kis (ay sonuna clamp).
  function clampDay(year, month, salaryDay) {
    return Math.min(salaryDay, lastDayOfMonth(year, month));
  }

  function atMidnight(year, month, day) {
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // 'YYYY-MM-DD' -> yerel gece yarisi (new Date('YYYY-MM-DD') UTC kabul eder, kaymayi onler).
  function parseLocalDate(str) {
    if (str instanceof Date) return str;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str));
    if (m) return atMidnight(+m[1], +m[2] - 1, +m[3]);
    return new Date(str);
  }

  function maxDate(a, b) {
    return a.getTime() >= b.getTime() ? a : b;
  }

  // Yerel takvim gun indeksi (DST-guvenli tamsayi).
  function dayIndex(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  }

  function monthIndex(date) {
    return date.getFullYear() * 12 + date.getMonth();
  }

  // now'i iceren donemin baslangici (en yakin gecmis/bugunku maas-gunu occurrence'i).
  function periodStartFor(now, salaryDay) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const thisAnchor = clampDay(y, m, salaryDay);
    if (d >= thisAnchor) {
      return atMidnight(y, m, thisAnchor);
    }
    // Onceki ayin capasi
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    return atMidnight(py, pm, clampDay(py, pm, salaryDay));
  }

  // Bir donem baslangicindan bir sonraki donem baslangici.
  function nextPeriodStart(start, salaryDay) {
    const y = start.getFullYear();
    const m = start.getMonth();
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    return atMidnight(ny, nm, clampDay(ny, nm, salaryDay));
  }

  function sumFixed(fixedExpenses) {
    return (fixedExpenses || []).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  }

  // [from, to) araliginda yapilan degisken harcamalarin toplami.
  // from null ise alt sinir yok.
  function sumExpensesInRange(expenses, from, to) {
    const lo = from ? from.getTime() : -Infinity;
    const hi = to ? to.getTime() : Infinity;
    let total = 0;
    for (const e of expenses || []) {
      const t = new Date(e.ts).getTime();
      if (t >= lo && t < hi) total += Number(e.amount) || 0;
    }
    return total;
  }

  // Bir donemin tahakkuk eden tam butcesi. Donem ortasinda baslandiysa (accrualStart
  // > periodStart) butce orantili (prorated) olur; aksi halde tam V'dir.
  function periodBudget(V, periodStart, periodEnd, accrualStart) {
    const fullDays = dayIndex(periodEnd) - dayIndex(periodStart);
    const accrualDays = dayIndex(periodEnd) - dayIndex(accrualStart);
    return V * (accrualDays / fullDays);
  }

  // Ana hesap.
  // settings: { income, savingsTarget, salaryDay, startDate }
  // fixedExpenses: [{ name, amount }]
  // expenses: [{ amount, ts }]  (yalniz degisken harcamalar)
  // now: Date
  function computeBudget(settings, fixedExpenses, expenses, now) {
    now = now || new Date();
    const salaryDay = Number(settings.salaryDay);
    const income = Number(settings.income) || 0;
    const savings = Number(settings.savingsTarget) || 0;

    const V = income - sumFixed(fixedExpenses) - savings; // donem degisken butcesi

    const periodStart = periodStartFor(now, salaryDay);
    const periodEnd = nextPeriodStart(periodStart, salaryDay);

    const startDate = settings.startDate ? parseLocalDate(settings.startDate) : now;

    // Tamamlanmis donemleri yur: rollover = toplam(tahakkuk eden butce - harcanan).
    // Ilk donem, startDate donem ortasindaysa orantilidir.
    let rolloverIn = 0;
    let p = periodStartFor(startDate, salaryDay);
    while (monthIndex(p) < monthIndex(periodStart)) {
      const pEnd = nextPeriodStart(p, salaryDay);
      const aStart = maxDate(p, startDate);
      rolloverIn += periodBudget(V, p, pEnd, aStart) - sumExpensesInRange(expenses, aStart, pEnd);
      p = pEnd;
    }

    // Mevcut donem (gerekirse orantili)
    const accrualStart = maxDate(periodStart, startDate);
    const fullDays = dayIndex(periodEnd) - dayIndex(periodStart);
    const curBudget = periodBudget(V, periodStart, periodEnd, accrualStart);
    const spentThisPeriod = sumExpensesInRange(expenses, accrualStart, periodEnd);

    const today = dayIndex(now);
    const daysRemaining = dayIndex(periodEnd) - today;             // bugun dahil, >= 1
    const daysAccrued = today - dayIndex(accrualStart) + 1;        // bugun dahil

    const availableNow = curBudget + rolloverIn - spentThisPeriod;
    const spendableToday = availableNow / daysRemaining;

    const accruedSoFar = V * (daysAccrued / fullDays);
    const cumulativeBalance = rolloverIn + accruedSoFar - spentThisPeriod;

    return {
      spendableToday,        // bugun harcanabilir (negatif olabilir = asim)
      cumulativeBalance,     // tum zaman: + tampon, - asim
      periodVariableBudget: V,
      rolloverIn,
      spentThisPeriod,
      availableNow,          // donemin geri kalani icin kalan toplam
      periodStart,
      periodEnd,
      daysInPeriod: fullDays,
      daysAccrued,
      daysRemaining
    };
  }

  const api = {
    computeBudget,
    periodStartFor,
    nextPeriodStart,
    clampDay,
    lastDayOfMonth,
    sumFixed,
    sumExpensesInRange
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Budget = api;
})(typeof self !== 'undefined' ? self : this);
