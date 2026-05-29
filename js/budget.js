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

  function getPayroll() {
    if (root.Payroll) return root.Payroll;
    if (typeof require === 'function') {
      try { return require('./payroll.js'); } catch (err) { return null; }
    }
    return null;
  }

  // Ayarlardaki gelir(ler)i tek bir listeye normalize et (geriye uyumlu).
  // Yeni model: settings.incomes = [{ mode:'net'|'gross', amount }]
  function normalizeIncomes(settings) {
    if (settings && Array.isArray(settings.incomes) && settings.incomes.length) {
      return settings.incomes.map(i => ({
        mode: i.mode === 'gross' ? 'gross' : 'net',
        amount: Number(i.amount) || 0
      }));
    }
    // Eski tekil model
    if (settings && settings.incomeMode === 'gross') {
      return [{ mode: 'gross', amount: Number(settings.grossIncome) || 0 }];
    }
    return [{ mode: 'net', amount: Number(settings && settings.income) || 0 }];
  }

  // Yemek kartlarini tek listeye normalize et (eski tekil mealCard ile geriye uyumlu).
  // Yeni model: settings.mealCards = [{ provider, monthlyLoad, startMonth }]
  function normalizeMealCards(settings) {
    if (settings && Array.isArray(settings.mealCards)) return settings.mealCards;
    if (settings && settings.mealCard && settings.mealCard.enabled) {
      const m = settings.mealCard;
      return [{ provider: m.provider, monthlyLoad: m.monthlyLoad, startMonth: m.startMonth }];
    }
    return [];
  }

  // Bir gelir listesinin verilen ay icin toplam NET'i. Brut gelirler AYRI AYRI
  // bordrodan cevrilir (TR gelir vergisi kisi basi kumulatif; toplayip tek hesap yanlis).
  function incomeNetForList(incomes, date) {
    const payroll = getPayroll();
    let total = 0;
    for (const inc of incomes || []) {
      const amount = Number(inc.amount) || 0;
      if (inc.mode === 'gross' && payroll && amount > 0) {
        total += payroll.computeMonthlyNet({
          gross: amount,
          year: date.getFullYear(),
          month: date.getMonth() + 1
        }).net;
      } else {
        total += amount;
      }
    }
    return total;
  }

  function incomeForDate(settings, date) {
    return incomeNetForList(normalizeIncomes(settings), date);
  }

  // Tarihli ayar gecmisi: bir donemde gecerli olan snapshot'i sec.
  // history = [{ from:'YYYY-MM-01', incomes, savingsTarget, fixed }] (from'a gore artan sirali)
  function configForPeriod(settings, periodStart) {
    const history = settings && settings.history;
    if (!Array.isArray(history) || !history.length) return null;
    const pIdx = monthIndex(periodStart);
    let chosen = history[0]; // donem ilk snapshot'tan onceyse en erken bilineni kullan
    for (const h of history) {
      if (monthIndex(parseLocalDate(h.from)) <= pIdx) chosen = h;
      else break;
    }
    return chosen;
  }

  // Bir donemin degisken butcesi V = net gelir - sabit gider - tasarruf.
  // Once o donemde gecerli snapshot; yoksa (eski kayit) guncel ayar + verilen sabit liste.
  function variableBudgetForPeriod(settings, fixedExpenses, periodStart) {
    const cfg = configForPeriod(settings, periodStart);
    if (cfg) {
      return incomeNetForList(cfg.incomes || [], periodStart)
        - sumFixed(cfg.fixed || [])
        - (Number(cfg.savingsTarget) || 0);
    }
    return incomeForDate(settings, periodStart)
      - sumFixed(fixedExpenses)
      - (Number(settings.savingsTarget) || 0);
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

  // Sabit gider denkleştirme farki: o donem icin (gerceklesen - tahmin).
  // settings.reconcile = { 'YYYY-MM': { diff } }. Pozitif diff = fazla harcandi (bakiye duser).
  function reconcileDiff(settings, periodStart) {
    const rec = settings && settings.reconcile;
    if (!rec) return 0;
    const key = periodStart.getFullYear() + '-' + String(periodStart.getMonth() + 1).padStart(2, '0');
    const e = rec[key];
    return (e && typeof e.diff === 'number') ? e.diff : 0;
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

    const periodStart = periodStartFor(now, salaryDay);
    const periodEnd = nextPeriodStart(periodStart, salaryDay);
    // Mevcut donemde gecerli gelir + degisken butce (tarihli gecmis varsa ondan).
    const curCfg = configForPeriod(settings, periodStart);
    const currentIncome = curCfg ? incomeNetForList(curCfg.incomes || [], periodStart) : incomeForDate(settings, periodStart);
    const V = variableBudgetForPeriod(settings, fixedExpenses, periodStart);

    const startDate = settings.startDate ? parseLocalDate(settings.startDate) : now;

    // Tamamlanmis donemleri yur: rollover = toplam(tahakkuk eden butce - harcanan).
    // Her donem, o donemde gecerli ayarla hesaplanir (gelir/gider degisikligi
    // yalniz degisiklikten sonraki donemleri etkiler).
    let rolloverIn = 0;
    let p = periodStartFor(startDate, salaryDay);
    while (monthIndex(p) < monthIndex(periodStart)) {
      const pEnd = nextPeriodStart(p, salaryDay);
      const aStart = maxDate(p, startDate);
      const periodV = variableBudgetForPeriod(settings, fixedExpenses, p);
      rolloverIn += periodBudget(periodV, p, pEnd, aStart)
        - sumExpensesInRange(expenses, aStart, pEnd)
        - reconcileDiff(settings, p); // sabit gider gerceklesen-tahmin farki
      p = pEnd;
    }

    // Mevcut donem (gerekirse orantili)
    const accrualStart = maxDate(periodStart, startDate);
    const fullDays = dayIndex(periodEnd) - dayIndex(periodStart);
    const curBudget = periodBudget(V, periodStart, periodEnd, accrualStart);

    // Bugunun harcamalari 1:1 duser; onceki gunler kalan gunlere yayilir.
    const todayMidnight = atMidnight(now.getFullYear(), now.getMonth(), now.getDate());
    const spentBeforeToday = sumExpensesInRange(expenses, accrualStart, todayMidnight);
    const spentToday = sumExpensesInRange(expenses, todayMidnight, periodEnd);
    const spentThisPeriod = spentBeforeToday + spentToday;

    const today = dayIndex(now);
    const daysRemaining = dayIndex(periodEnd) - today;             // bugun dahil, >= 1
    const daysAccrued = today - dayIndex(accrualStart) + 1;        // bugun dahil

    const availableNow = curBudget + rolloverIn - spentThisPeriod;
    const baseAllowance = (curBudget + rolloverIn - spentBeforeToday) / daysRemaining;
    const spendableToday = baseAllowance - spentToday;

    const accruedSoFar = V * (daysAccrued / fullDays);
    const cumulativeBalance = rolloverIn + accruedSoFar - spentThisPeriod;

    return {
      spendableToday,        // bugun harcanabilir (negatif olabilir = asim)
      cumulativeBalance,     // tum zaman: + tampon, - asim
      periodIncome: currentIncome,
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
    incomeForDate,
    incomeNetForList,
    normalizeIncomes,
    normalizeMealCards,
    configForPeriod,
    variableBudgetForPeriod,
    sumFixed,
    sumExpensesInRange
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Budget = api;
})(typeof self !== 'undefined' ? self : this);
