// Tasarruf kumbarasi hesabi. Saf fonksiyon: DOM yok, IndexedDB yok. Girdi -> cikti.
// Kumbara = bu ayki tasarruf ilerlemesi. Hedef = aylik tasarruf hedefi (ay basinda sifirlanir).
// biriken = gecenGun * (gelir-sabit)/ayGunu - bu ay yapilan harcama
//         = gecenGun * (V + tasarruf)/ayGunu - bu donem harcama
// budget.js'in computeBudget ciktisini kullanir; ona DOKUNMAZ.
(function (root) {
  'use strict';

  // input: { periodVariableBudget, savingsTarget, daysInPeriod, daysAccrued,
  //          spentThisPeriod, spentToday }
  // donus: tasarruf hedefi yoksa null; aksi halde { target, saved, pct, overflow, todayContrib, dayPlan }
  function compute(input) {
    const target = Number(input.savingsTarget) || 0;
    if (target <= 0) return null; // hedef yoksa kumbara gosterilmez

    const V = Number(input.periodVariableBudget) || 0;
    const N = Number(input.daysInPeriod) || 1;
    const elapsed = Number(input.daysAccrued) || 0;
    const spentPeriod = Number(input.spentThisPeriod) || 0;
    const spentToday = Number(input.spentToday) || 0;

    const dayPlan = (V + target) / N;           // (gelir - sabit) / ay gunu
    const saved = elapsed * dayPlan - spentPeriod;
    const pct = saved / target;                 // gorselde 0..1'e clamp edilir
    const overflow = saved > target;
    const todayContrib = dayPlan - spentToday;  // "bugun +X" basligi

    return { target, saved, pct, overflow, todayContrib, dayPlan };
  }

  const api = { compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Savings = api;
})(typeof self !== 'undefined' ? self : this);
