// UI orkestrasyonu. Veri db.js'ten, hesap budget.js'ten gelir; burada sadece ekran.
(function () {
  'use strict';

  const app = document.getElementById('app');
  const tlFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

  function formatTL(n) {
    const v = Math.round(n);
    return tlFmt.format(v) + ' TL';
  }

  // Input alanlari icin: tum tirnak/bosluk/noktalama kaldir, tamsayi dondur.
  function parseAmount(s) {
    return parseInt(String(s).replace(/\D/g, ''), 10) || 0;
  }

  // Input'a odak/blur binlik ayrac formatlamasi uygular.
  function applyNumFmt(input) {
    input.addEventListener('focus', () => {
      const v = parseAmount(input.value);
      input.value = v > 0 ? String(v) : '';
    });
    input.addEventListener('blur', () => {
      const v = parseAmount(input.value);
      if (v > 0) input.value = tlFmt.format(v);
    });
  }

  // Uygulama durumu (bellek kopyasi)
  const state = { settings: null, fixed: [], expenses: [] };

  async function loadAll() {
    state.settings = await DB.getSettings();
    state.fixed = await DB.getFixedExpenses();
    state.expenses = await DB.getExpenses();
  }

  function isConfigured() {
    return state.settings && Number(state.settings.income) > 0 && state.settings.salaryDay;
  }

  // ---------- Kurulum ekrani ----------
  // Sabit gider sablonlari. Tek tusla eklenir; isim = islevsel etiket (marka degil).
  // Kategoriler yalnizca buton listesini gruplar, saklanmaz (sema: isim+tutar).
  const PRESETS = [
    { cat: 'Faturalar', items: ['Elektrik', 'Su', 'Doğal gaz', 'Isıtma', 'Aidat'] },
    { cat: 'Telefon & İnternet', items: ['Telefon', 'İnternet', 'TV / Kablo', 'Mobil hat'] },
    { cat: 'Abonelikler', items: ['Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'Disney+', 'BluTV', 'Exxen', 'ChatGPT', 'iCloud', 'Google One', 'Apple One', 'Aposto', 'Gazete / Dergi'] },
    { cat: 'Ulaşım', items: ['Ulaşım', 'Yakıt', 'Otopark', 'OGS / HGS', 'Araç kredisi'] },
    { cat: 'Konut', items: ['Kira', 'Konut kredisi', 'Site aidatı', 'Temizlik'] },
    { cat: 'Sağlık & Spor', items: ['Spor salonu', 'Pilates', 'Yoga', 'Sağlık sigortası', 'Diş'] },
    { cat: 'Kişisel', items: ['Kuaför', 'Bakım', 'Giyim'] },
    { cat: 'Diğer', items: ['Yeme-içme', 'Evcil hayvan', 'Çocuk / Okul', 'Bağış', 'Birikim hesabı'] }
  ];

  function buildPresetsHTML() {
    return PRESETS.map(group => `
      <div class="preset-group">
        <div class="preset-cat">${group.cat}</div>
        <div class="preset-chips">
          ${group.items.map(name =>
            `<button type="button" class="chip" data-name="${escapeAttr(name)}">+ ${name}</button>`
          ).join('')}
        </div>
      </div>`).join('');
  }

  function renderSetup() {
    const s = state.settings || {};
    const fixed = state.fixed.length ? state.fixed : [];

    app.innerHTML = `
      <header class="head"><h1>Kurulum</h1></header>
      <form id="setupForm" class="form">
        <label class="field">
          <span>Aylık net gelir (TL)</span>
          <input id="income" type="text" inputmode="numeric"
                 value="${s.income > 0 ? tlFmt.format(s.income) : ''}" required>
        </label>

        <div class="field">
          <span>Aylık tasarruf hedefi (TL)</span>
          <input id="savings" type="text" inputmode="numeric"
                 value="${s.savingsTarget > 0 ? tlFmt.format(s.savingsTarget) : ''}">
          <div class="pct-chips">
            ${[5,10,15,20,25,30].map(p =>
              `<button type="button" class="pct-chip" data-pct="${p}">%${p}</button>`
            ).join('')}
          </div>
        </div>

        <div class="field">
          <span>Sabit giderler</span>
          <div id="fixedList"></div>
          <button type="button" id="addFixed" class="btn-ghost">+ Boş satır ekle</button>
          <div class="presets-wrap">
            <small class="hint">Hazır şablon: dokun, tutarı gir.</small>
            <div id="presets">${buildPresetsHTML()}</div>
          </div>
        </div>

        <button type="submit" class="btn-primary" id="saveBtn">Kaydet</button>
      </form>
    `;

    const fixedList = document.getElementById('fixedList');
    if (fixed.length === 0) addFixedRow(fixedList);
    else fixed.forEach(f => addFixedRow(fixedList, f.name, f.amount));

    applyNumFmt(document.getElementById('income'));
    applyNumFmt(document.getElementById('savings'));

    document.querySelector('.pct-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.pct-chip');
      if (!chip) return;
      const income = parseAmount(document.getElementById('income').value);
      if (!income) { alert('Önce aylık geliri girin.'); return; }
      const savings = Math.round(income * Number(chip.dataset.pct) / 100);
      const input = document.getElementById('savings');
      input.value = tlFmt.format(savings);
      // Aktif chip'i vurgula
      document.querySelectorAll('.pct-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });

    document.getElementById('addFixed').addEventListener('click', () => {
      const row = addFixedRow(fixedList);
      row.querySelector('.fx-name').focus();
    });
    document.getElementById('setupForm').addEventListener('submit', onSaveSetup);

    document.getElementById('presets').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      addPreset(fixedList, chip.dataset.name);
    });
  }

  // Sablon ekle: bos bir satir varsa onu doldur, yoksa yeni satir ekle; tutara odaklan.
  function addPreset(container, name) {
    const rows = [...container.querySelectorAll('.fixed-row')];
    let row = rows.find(r =>
      r.querySelector('.fx-name').value.trim() === '' &&
      r.querySelector('.fx-amount').value.trim() === '');
    if (row) row.querySelector('.fx-name').value = name;
    else row = addFixedRow(container, name);
    const amt = row.querySelector('.fx-amount');
    amt.focus();
    row.scrollIntoView({ block: 'nearest' });
  }

  function addFixedRow(container, name, amount) {
    const row = document.createElement('div');
    row.className = 'fixed-row';
    row.innerHTML = `
      <input class="fx-name" type="text" placeholder="İsim (ör. Kira)" value="${name != null ? escapeAttr(name) : ''}">
      <input class="fx-amount" type="text" inputmode="numeric" placeholder="0" value="${amount > 0 ? tlFmt.format(amount) : (amount === 0 ? '' : '')}">
      <button type="button" class="fx-del" aria-label="Sil">×</button>
    `;
    row.querySelector('.fx-del').addEventListener('click', () => row.remove());
    applyNumFmt(row.querySelector('.fx-amount'));
    container.appendChild(row);
    return row;
  }

  function readFixedRows() {
    const rows = [...document.querySelectorAll('.fixed-row')];
    return rows
      .map(r => ({
        name: r.querySelector('.fx-name').value.trim(),
        amount: parseAmount(r.querySelector('.fx-amount').value)
      }))
      .filter(f => f.name !== '' || f.amount > 0);
  }

  async function onSaveSetup(e) {
    e.preventDefault();
    const income = parseAmount(document.getElementById('income').value);
    const savingsTarget = parseAmount(document.getElementById('savings').value);
    const salaryDay = 1; // Dönem her zaman ayın 1'inde başlar

    if (income <= 0) { alert('Lütfen geçerli bir gelir girin.'); return; }

    await DB.saveSettings({ income, savingsTarget, salaryDay });
    await DB.replaceFixedExpenses(readFixedRows());
    await loadAll();
    renderMain();
  }

  // ---------- Ana ekran ----------
  const QUICK_AMOUNTS = [50, 100, 250, 500];
  let draft = 0; // numpad taslagi (tam sayi TL)

  function renderMain() {
    draft = 0;
    const r = Budget.computeBudget(state.settings, state.fixed, state.expenses, new Date());
    const over = r.spendableToday < 0;

    const periodExpenses = state.expenses
      .filter(e => new Date(e.ts).getTime() >= r.periodStart.getTime())
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));

    app.innerHTML = `
      <header class="head">
        <h1>Bugün</h1>
        <button id="settingsBtn" class="icon-btn" aria-label="Ayarlar">⚙</button>
      </header>

      <section class="hero ${over ? 'over' : ''}">
        <p class="hero-label">Bugün harcanabilir</p>
        <p class="hero-amount">${formatTL(r.spendableToday)}</p>
        <p class="hero-sub">${r.daysRemaining} gün kaldı · bugün dahil</p>
      </section>

      <section class="balance ${r.cumulativeBalance < 0 ? 'neg' : 'pos'}">
        <span>Kümülatif bakiye</span>
        <strong>${r.cumulativeBalance >= 0 ? '+' : ''}${formatTL(r.cumulativeBalance)}</strong>
      </section>

      <section class="entry">
        <div class="quick">
          ${QUICK_AMOUNTS.map(a => `<button class="quick-btn" data-amt="${a}">+${a}</button>`).join('')}
        </div>
        <div class="draft" id="draft">0 TL</div>
        <div class="numpad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="np" data-d="${n}">${n}</button>`).join('')}
          <button class="np np-back" id="back" aria-label="Sil">⌫</button>
          <button class="np" data-d="0">0</button>
          <button class="np np-add" id="add">Ekle</button>
        </div>
      </section>

      <section class="list">
        <h2 class="list-title">Bu dönem (${periodExpenses.length})</h2>
        ${periodExpenses.length === 0
          ? '<p class="empty">Henüz harcama yok.</p>'
          : periodExpenses.map(e => `
            <div class="exp-row">
              <span class="exp-amt">${formatTL(e.amount)}</span>
              <span class="exp-time">${formatWhen(e.ts)}</span>
              <button class="exp-del" data-id="${e.id}" aria-label="Sil">×</button>
            </div>`).join('')}
      </section>
    `;

    document.getElementById('settingsBtn').addEventListener('click', renderSetup);

    app.querySelectorAll('.quick-btn').forEach(b =>
      b.addEventListener('click', () => addExpenseAndRefresh(Number(b.dataset.amt))));

    app.querySelectorAll('.np[data-d]').forEach(b =>
      b.addEventListener('click', () => { draft = draft * 10 + Number(b.dataset.d); updateDraft(); }));

    document.getElementById('back').addEventListener('click', () => { draft = Math.floor(draft / 10); updateDraft(); });
    document.getElementById('add').addEventListener('click', () => {
      if (draft > 0) addExpenseAndRefresh(draft);
    });

    app.querySelectorAll('.exp-del').forEach(b =>
      b.addEventListener('click', () => deleteExpenseAndRefresh(Number(b.dataset.id))));
  }

  function updateDraft() {
    if (draft > 999999) draft = 999999; // makul sinir
    const el = document.getElementById('draft');
    if (el) el.textContent = formatTL(draft);
  }

  async function addExpenseAndRefresh(amount) {
    await DB.addExpense(amount);
    state.expenses = await DB.getExpenses();
    renderMain();
  }

  async function deleteExpenseAndRefresh(id) {
    await DB.deleteExpense(id);
    state.expenses = await DB.getExpenses();
    renderMain();
  }

  function formatWhen(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Yardimci ----------
  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // ---------- Onyukleme ----------
  async function boot() {
    try {
      await loadAll();
      isConfigured() ? renderMain() : renderSetup();
    } catch (err) {
      app.innerHTML = `<p class="loading">Hata: ${err.message}</p>`;
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
