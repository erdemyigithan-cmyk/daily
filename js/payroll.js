// Turkiye bordro hesaplari. DOM yok, IndexedDB yok. Girdi -> cikti.
// V1 varsayimi: 4/a beyaz yaka, sabit aylik brut ucret, ek odeme/yardim yok.
(function (root) {
  'use strict';

  const RULES_BY_YEAR = {
    2026: {
      minimumWageGross: 33030,
      sgkCeiling: 297270,
      employeeSgkRate: 0.14,
      employeeUnemploymentRate: 0.01,
      stampTaxRate: 0.00759,
      brackets: [
        { upTo: 190000, rate: 0.15, baseTax: 0, baseAmount: 0 },
        { upTo: 400000, rate: 0.20, baseTax: 28500, baseAmount: 190000 },
        { upTo: 1500000, rate: 0.27, baseTax: 70500, baseAmount: 400000 },
        { upTo: 5300000, rate: 0.35, baseTax: 367500, baseAmount: 1500000 },
        { upTo: Infinity, rate: 0.40, baseTax: 1697500, baseAmount: 5300000 }
      ]
    }
  };

  function rulesForYear(year) {
    return RULES_BY_YEAR[year] || RULES_BY_YEAR[2026];
  }

  function clampMonth(month) {
    const m = Number(month) || 1;
    return Math.min(12, Math.max(1, m));
  }

  function taxableWageBase(gross, rules) {
    const primeBase = Math.min(Number(gross) || 0, rules.sgkCeiling);
    return Math.max(0, (Number(gross) || 0) -
      (primeBase * rules.employeeSgkRate) -
      (primeBase * rules.employeeUnemploymentRate));
  }

  function progressiveIncomeTax(taxBase, rules) {
    const amount = Math.max(0, Number(taxBase) || 0);
    const bracket = rules.brackets.find(b => amount <= b.upTo) || rules.brackets[rules.brackets.length - 1];
    return bracket.baseTax + ((amount - bracket.baseAmount) * bracket.rate);
  }

  function monthlyIncomeTax(taxBaseForMonth, cumulativeBeforeMonth, rules) {
    const before = Math.max(0, Number(cumulativeBeforeMonth) || 0);
    const current = Math.max(0, Number(taxBaseForMonth) || 0);
    return progressiveIncomeTax(before + current, rules) - progressiveIncomeTax(before, rules);
  }

  function minimumWageIncomeTaxExemption(month, rules) {
    const m = clampMonth(month);
    const minBase = taxableWageBase(rules.minimumWageGross, rules);
    return monthlyIncomeTax(minBase, minBase * (m - 1), rules);
  }

  function stampTaxExemption(rules) {
    return rules.minimumWageGross * rules.stampTaxRate;
  }

  function computeMonthlyNet(input) {
    const gross = Number(input.gross) || 0;
    const year = Number(input.year) || 2026;
    const month = clampMonth(input.month);
    const rules = rulesForYear(year);

    const primeBase = Math.min(gross, rules.sgkCeiling);
    const sgkEmployee = primeBase * rules.employeeSgkRate;
    const unemploymentEmployee = primeBase * rules.employeeUnemploymentRate;
    const taxBase = taxableWageBase(gross, rules);
    const cumulativeBeforeMonth = taxBase * (month - 1);

    const grossIncomeTax = monthlyIncomeTax(taxBase, cumulativeBeforeMonth, rules);
    const incomeTaxExemption = minimumWageIncomeTaxExemption(month, rules);
    const incomeTax = Math.max(0, grossIncomeTax - incomeTaxExemption);

    const grossStampTax = gross * rules.stampTaxRate;
    const stampTax = Math.max(0, grossStampTax - stampTaxExemption(rules));

    const net = gross - sgkEmployee - unemploymentEmployee - incomeTax - stampTax;

    return {
      year,
      month,
      gross,
      net,
      taxBase,
      cumulativeTaxBase: cumulativeBeforeMonth + taxBase,
      sgkEmployee,
      unemploymentEmployee,
      incomeTax,
      incomeTaxExemption,
      stampTax
    };
  }

  function computeYear(gross, year) {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      months.push(computeMonthlyNet({ gross, year, month }));
    }
    return months;
  }

  const api = {
    RULES_BY_YEAR,
    rulesForYear,
    taxableWageBase,
    progressiveIncomeTax,
    computeMonthlyNet,
    computeYear
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Payroll = api;
})(typeof self !== 'undefined' ? self : this);
