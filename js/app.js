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
    { cat: 'Abonelikler', items: ['Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'Disney+', 'BluTV', 'Max', 'Exxen', 'MUBI', 'Gain', 'TOD', 'S Sport Plus', 'TV+', 'Tivibu', 'Apple Music', 'Apple Arcade', 'iCloud', 'ChatGPT', 'Google One', 'Apple One', 'Aposto', 'Gazete / Dergi'] },
    { cat: 'Ulaşım', items: ['Ulaşım', 'Yakıt', 'Otopark', 'OGS / HGS', 'Araç kredisi'] },
    { cat: 'Konut', items: ['Kira', 'Konut kredisi', 'Site aidatı', 'Temizlik'] },
    { cat: 'Sağlık & Spor', items: ['Spor salonu', 'Pilates', 'Yoga', 'Sağlık sigortası', 'Diş'] },
    { cat: 'Kişisel', items: ['Kuaför', 'Bakım', 'Giyim'] },
    { cat: 'Diğer', items: ['Yeme-içme', 'Evcil hayvan', 'Çocuk / Okul', 'Bağış', 'Birikim hesabı'] }
  ];

  function buildPresetsHTML() {
    return PRESETS.map(group => `
      <div class="preset-group">
        <button type="button" class="preset-toggle">
          <span>${group.cat}</span><span class="preset-chevron">▸</span>
        </button>
        <div class="preset-chips" hidden>
          ${group.items.map(name =>
            `<button type="button" class="chip" data-name="${escapeAttr(name)}">${presetChipLabel(name)}</button>`
          ).join('')}
        </div>
      </div>`).join('');
  }

  function presetChipLabel(name) {
    const plan = rootCatalogDefault(name);
    const price = plan ? `<small>${formatTL(plan.amount)}</small>` : '';
    return `<span>+ ${escapeHTML(name)}</span>${price}`;
  }

  function renderSetup() {
    const s = state.settings || {};
    const fixed = state.fixed.length ? state.fixed : [];
    const incomeMode = s.incomeMode === 'gross' ? 'gross' : 'net';
    const incomeValue = incomeMode === 'gross' ? s.grossIncome : s.income;

    app.innerHTML = `
      <header class="head"><h1>Kurulum</h1></header>
      <form id="setupForm" class="form setup-form">
        <div class="income-switch" aria-label="Gelir tipi">
          <button type="button" class="income-mode ${incomeMode === 'net' ? 'active' : ''}" data-mode="net">Net</button>
          <button type="button" class="income-mode ${incomeMode === 'gross' ? 'active' : ''}" data-mode="gross">Brüt</button>
        </div>

        <label class="field">
          <span id="incomeLabel">Aylık net gelir (TL)</span>
          <input id="income" type="text" inputmode="numeric"
                 value="${incomeValue > 0 ? tlFmt.format(incomeValue) : ''}" required>
          <small id="incomePreview" class="hint"></small>
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
            <small class="hint">Hazır şablon: kategoriye dokun, açılır.</small>
            <div id="presets">${buildPresetsHTML()}</div>
          </div>
        </div>

      </form>
      <button type="submit" form="setupForm" class="btn-primary setup-save" id="saveBtn">Kaydet</button>
    `;

    const setupForm = document.getElementById('setupForm');
    setupForm.dataset.incomeMode = incomeMode;

    const fixedList = document.getElementById('fixedList');
    if (fixed.length === 0) addFixedRow(fixedList);
    else fixed.forEach(f => addFixedRow(fixedList, f.name, f.amount));

    const incomeInput = document.getElementById('income');
    applyNumFmt(incomeInput);
    applyNumFmt(document.getElementById('savings'));
    setIncomeMode(incomeMode);

    document.querySelector('.income-switch').addEventListener('click', (e) => {
      const btn = e.target.closest('.income-mode');
      if (!btn) return;
      setIncomeMode(btn.dataset.mode);
    });

    incomeInput.addEventListener('input', updateIncomePreview);
    incomeInput.addEventListener('blur', updateIncomePreview);

    document.querySelector('.pct-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.pct-chip');
      if (!chip) return;
      const income = incomeForSavingsPercent();
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
    setupForm.addEventListener('submit', onSaveSetup);

    document.getElementById('presets').addEventListener('click', async (e) => {
      const toggle = e.target.closest('.preset-toggle');
      if (toggle) {
        const chipsEl = toggle.nextElementSibling;
        const chevron = toggle.querySelector('.preset-chevron');
        chipsEl.hidden = !chipsEl.hidden;
        chevron.textContent = chipsEl.hidden ? '▸' : '▾';
        return;
      }
      const chip = e.target.closest('.chip');
      if (!chip) return;
      await addPreset(fixedList, chip.dataset.name);
    });
  }

  function incomeForSavingsPercent() {
    const incomeInput = document.getElementById('income');
    const amount = parseAmount(incomeInput.value);
    if (currentIncomeMode() !== 'gross' || !amount) return amount;
    const now = new Date();
    return Payroll.computeMonthlyNet({
      gross: amount,
      year: now.getFullYear(),
      month: now.getMonth() + 1
    }).net;
  }

  function currentIncomeMode() {
    return document.getElementById('setupForm').dataset.incomeMode || 'net';
  }

  function setIncomeMode(mode) {
    const selected = mode === 'gross' ? 'gross' : 'net';
    const setupForm = document.getElementById('setupForm');
    setupForm.dataset.incomeMode = selected;

    document.querySelectorAll('.income-mode').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === selected);
    });

    document.getElementById('incomeLabel').textContent =
      selected === 'gross' ? 'Aylık brüt gelir (TL)' : 'Aylık net gelir (TL)';
    updateIncomePreview();
  }

  function updateIncomePreview() {
    const preview = document.getElementById('incomePreview');
    const incomeInput = document.getElementById('income');
    if (!preview || !incomeInput) return;

    if (currentIncomeMode() !== 'gross') {
      preview.textContent = 'Bu tutar doğrudan aylık bütçeye gelir olarak kullanılır.';
      return;
    }

    const gross = parseAmount(incomeInput.value);
    if (!gross) {
      preview.textContent = 'Brütte 2026 SGK, işsizlik, gelir vergisi ve damga vergisi tahmini uygulanır.';
      return;
    }

    const now = new Date();
    const p = Payroll.computeMonthlyNet({
      gross,
      year: now.getFullYear(),
      month: now.getMonth() + 1
    });
    preview.textContent = `${now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} tahmini net: ${formatTL(p.net)}. Yıl başından beri aynı brüt varsayılır.`;
  }

  // Sablon ekle: bos bir satir varsa onu doldur, yoksa yeni satir ekle; tutara odaklan.
  async function addPreset(container, name) {
    const choice = await chooseSubscriptionPlan(name);
    if (choice === null) return;
    const rowName = choice ? (choice.label === 'Aylik' ? name : `${name} - ${choice.label}`) : name;
    const rowAmount = choice ? choice.amount : undefined;

    const rows = [...container.querySelectorAll('.fixed-row')];
    let row = rows.find(r =>
      r.querySelector('.fx-name').value.trim() === '' &&
      r.querySelector('.fx-amount').value.trim() === '');
    if (row) {
      row.querySelector('.fx-name').value = rowName;
      if (rowAmount > 0) row.querySelector('.fx-amount').value = tlFmt.format(rowAmount);
    } else {
      row = addFixedRow(container, rowName, rowAmount);
    }
    const amt = row.querySelector('.fx-amount');
    amt.focus();
    row.scrollIntoView({ block: 'nearest' });
  }

  function rootCatalogDefault(name) {
    if (!window.SubscriptionCatalog) return null;
    return window.SubscriptionCatalog.defaultPlan(name);
  }

  function chooseSubscriptionPlan(name) {
    if (!window.SubscriptionCatalog) return Promise.resolve(undefined);
    const entry = window.SubscriptionCatalog.get(name);
    if (!entry || !entry.plans || entry.plans.length === 0) return Promise.resolve(undefined);
    if (entry.plans.length === 1) return Promise.resolve(entry.plans[0]);

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'plan-overlay';
      overlay.innerHTML = `
        <div class="plan-sheet" role="dialog" aria-modal="true" aria-label="${escapeAttr(name)} plan seçimi">
          <div class="plan-head">
            <strong>${escapeHTML(name)}</strong>
            <button type="button" class="plan-close" aria-label="Kapat">×</button>
          </div>
          <p class="plan-hint">Öneri fiyatı seç; tutarı satırda yine değiştirebilirsin.</p>
          <div class="plan-options">
            ${entry.plans.map((plan, idx) => `
              <button type="button" class="plan-option" data-idx="${idx}">
                <span>${escapeHTML(plan.label)}</span>
                <strong>${formatTL(plan.amount)}</strong>
              </button>
            `).join('')}
          </div>
          <small class="plan-source">Kaynak: ${escapeHTML(entry.source)} · ${entry.checkedAt}</small>
        </div>
      `;
      document.body.appendChild(overlay);

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      overlay.addEventListener('click', e => {
        if (e.target === overlay || e.target.closest('.plan-close')) {
          close(null);
          return;
        }
        const option = e.target.closest('.plan-option');
        if (!option) return;
        close(entry.plans[Number(option.dataset.idx)]);
      });
    });
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
    const incomeInput = parseAmount(document.getElementById('income').value);
    const incomeMode = currentIncomeMode();
    const savingsTarget = parseAmount(document.getElementById('savings').value);
    const salaryDay = 1; // Dönem her zaman ayın 1'inde başlar

    if (incomeInput <= 0) { alert('Lütfen geçerli bir gelir girin.'); return; }

    let settingsPatch = { incomeMode, savingsTarget, salaryDay };
    if (incomeMode === 'gross') {
      const now = new Date();
      const payroll = Payroll.computeMonthlyNet({
        gross: incomeInput,
        year: now.getFullYear(),
        month: now.getMonth() + 1
      });
      settingsPatch.grossIncome = incomeInput;
      settingsPatch.income = Math.round(payroll.net); // Eski kayitlarla uyumluluk ve yedek gosterim.
    } else {
      settingsPatch.income = incomeInput;
      settingsPatch.grossIncome = 0;
    }

    await DB.saveSettings(settingsPatch);
    await DB.replaceFixedExpenses(readFixedRows());
    await loadAll();
    renderMain();
  }

  // ---------- Ana ekran ----------
  const QUICK_AMOUNTS = [50, 100, 250, 500];
  let draft = 0; // numpad taslagi (tam sayi TL)
  let selectedDate = todayStr();

  function renderMain(dateStr) {
    draft = 0;
    selectedDate = clampViewDate(dateStr || selectedDate);
    const viewingToday = selectedDate === todayStr();
    const r = Budget.computeBudget(state.settings, state.fixed, state.expenses, new Date());
    const over = r.spendableToday < 0;
    const dayExpenses = expensesForDay(selectedDate)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const dayTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const heroClass = viewingToday ? (over ? 'over' : '') : 'history';

    app.innerHTML = `
      <header class="head">
        <h1>${viewingToday ? 'Bugün' : 'Geçmiş'}</h1>
        <button id="settingsBtn" class="icon-btn" aria-label="Ayarlar">⚙</button>
      </header>

      <section class="day-nav">
        <button type="button" id="prevDay" class="day-step" aria-label="Önceki gün">‹</button>
        <label class="day-picker">
          <span>${dayTitle(selectedDate)}</span>
          <input id="viewDateInput" type="date" value="${selectedDate}" max="${todayStr()}" aria-label="Görüntülenen tarih">
        </label>
        <button type="button" id="nextDay" class="day-step" aria-label="Sonraki gün" ${viewingToday ? 'disabled' : ''}>›</button>
      </section>

      ${viewingToday ? '' : '<button type="button" id="todayBtn" class="today-link">Bugüne dön</button>'}

      <section class="hero ${heroClass}">
        <p class="hero-label">${viewingToday ? 'Bugün harcanabilir' : 'O gün harcandı'}</p>
        <p class="hero-amount">${formatTL(viewingToday ? r.spendableToday : dayTotal)}</p>
        <p class="hero-sub">${viewingToday ? `${r.daysRemaining} gün kaldı · bugün dahil` : `${dayExpenses.length} işlem · ${weekdayName(selectedDate)}`}</p>
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
        <input id="noteInput" type="text" class="note-input" placeholder="Not (opsiyonel)" maxlength="60" autocomplete="off">
        <p class="entry-date">${formatDateLong(selectedDate)} için eklenir</p>
        <div class="numpad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="np" data-d="${n}">${n}</button>`).join('')}
          <button class="np np-back" id="back" aria-label="Sil">⌫</button>
          <button class="np" data-d="0">0</button>
          <button class="np np-add" id="add">Ekle</button>
        </div>
      </section>

      <section class="list">
        <h2 class="list-title">${formatDateLong(selectedDate)} · ${dayExpenses.length} işlem · ${formatTL(dayTotal)}</h2>
        ${dayExpenses.length === 0
          ? '<p class="empty">Bu gün için harcama yok.</p>'
          : dayExpenses.map(e => `
            <div class="exp-row" data-id="${e.id}">
              <span class="exp-amt">${formatTL(e.amount)}</span>
              <span class="exp-meta">${e.note ? `<span class="exp-note">${escapeAttr(e.note)}</span>` : ''}<span class="exp-time">${formatWhen(e.ts)}</span></span>
              <button class="exp-del" data-id="${e.id}" aria-label="Sil">×</button>
            </div>`).join('')}
      </section>
    `;

    document.getElementById('settingsBtn').addEventListener('click', openSettingsSheet);
    document.getElementById('prevDay').addEventListener('click', () => renderMain(addDays(selectedDate, -1)));
    document.getElementById('nextDay').addEventListener('click', () => renderMain(addDays(selectedDate, 1)));
    document.getElementById('viewDateInput').addEventListener('change', (e) => renderMain(e.target.value));
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) todayBtn.addEventListener('click', () => renderMain(todayStr()));

    app.querySelectorAll('.quick-btn').forEach(b =>
      b.addEventListener('click', () => addExpenseAndRefresh(Number(b.dataset.amt), '', dateToTs(selectedDate))));

    app.querySelectorAll('.np[data-d]').forEach(b =>
      b.addEventListener('click', () => { draft = draft * 10 + Number(b.dataset.d); updateDraft(); }));

    document.getElementById('back').addEventListener('click', () => { draft = Math.floor(draft / 10); updateDraft(); });
    document.getElementById('add').addEventListener('click', () => {
      if (draft > 0) {
        const note = document.getElementById('noteInput').value.trim();
        const ts = dateToTs(selectedDate);
        addExpenseAndRefresh(draft, note, ts);
      }
    });

    app.querySelectorAll('.exp-del').forEach(b =>
      b.addEventListener('click', () => deleteExpenseAndRefresh(Number(b.dataset.id))));

    app.querySelectorAll('.exp-row').forEach(row =>
      row.addEventListener('click', ev => {
        if (ev.target.closest('.exp-del')) return;
        const expense = state.expenses.find(x => x.id === Number(row.dataset.id));
        if (expense) renderEditRow(row, expense);
      }));
  }

  function renderEditRow(rowEl, e) {
    const origDateStr = tsToDateStr(e.ts);
    rowEl.classList.add('editing');
    rowEl.innerHTML = `
      <input class="edit-amt" type="text" inputmode="numeric" value="${tlFmt.format(e.amount)}">
      <input class="edit-note" type="text" placeholder="Not (opsiyonel)" maxlength="60" value="${escapeAttr(e.note || '')}">
      <input class="edit-date" type="date" value="${origDateStr}" max="${todayStr()}">
      <div class="edit-btns">
        <button class="edit-save">Kaydet</button>
        <button class="edit-cancel">İptal</button>
      </div>
    `;
    applyNumFmt(rowEl.querySelector('.edit-amt'));
    rowEl.querySelector('.edit-amt').focus();

    rowEl.querySelector('.edit-save').addEventListener('click', async () => {
      const newAmount = parseAmount(rowEl.querySelector('.edit-amt').value);
      const newNote = rowEl.querySelector('.edit-note').value.trim();
      const newDateStr = rowEl.querySelector('.edit-date').value;
      if (newAmount <= 0) { alert('Geçerli bir tutar girin.'); return; }
      const newTs = newDateStr !== origDateStr ? dateToTs(newDateStr) : null;
      await DB.updateExpense(e.id, newAmount, newNote, newTs);
      state.expenses = await DB.getExpenses();
      renderMain(newDateStr || selectedDate);
    });

    rowEl.querySelector('.edit-cancel').addEventListener('click', () => renderMain());
  }

  function updateDraft() {
    if (draft > 999999) draft = 999999; // makul sinir
    const el = document.getElementById('draft');
    if (el) el.textContent = formatTL(draft);
  }

  async function addExpenseAndRefresh(amount, note, ts) {
    await DB.addExpense(amount, note, ts);
    state.expenses = await DB.getExpenses();
    renderMain(selectedDate);
  }

  async function deleteExpenseAndRefresh(id) {
    await DB.deleteExpense(id);
    state.expenses = await DB.getExpenses();
    renderMain(selectedDate);
  }

  function formatWhen(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Yardimci ----------
  function parseDateStr(dateStr) {
    return new Date(dateStr + 'T00:00:00');
  }

  function addDays(dateStr, delta) {
    const d = parseDateStr(dateStr);
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function clampViewDate(dateStr) {
    if (!dateStr) return todayStr();
    return dateStr > todayStr() ? todayStr() : dateStr;
  }

  function expensesForDay(dateStr) {
    const start = parseDateStr(dateStr).getTime();
    const end = parseDateStr(addDays(dateStr, 1)).getTime();
    return state.expenses.filter(e => {
      const t = new Date(e.ts).getTime();
      return t >= start && t < end;
    });
  }

  function dayTitle(dateStr) {
    if (dateStr === todayStr()) return 'Bugün';
    if (dateStr === addDays(todayStr(), -1)) return 'Dün';
    return formatDateLong(dateStr);
  }

  function formatDateLong(dateStr) {
    return parseDateStr(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long'
    });
  }

  function weekdayName(dateStr) {
    return parseDateStr(dateStr).toLocaleDateString('tr-TR', { weekday: 'long' });
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function tsToDateStr(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Bugun -> simdi; gecmis gun -> o gunun oglen 12:00'si (liste gorunumu icin)
  function dateToTs(dateStr) {
    if (!dateStr || dateStr === todayStr()) return new Date().toISOString();
    return new Date(dateStr + 'T12:00:00').toISOString();
  }

  // ---------- Ayarlar sheet ----------
  function openSettingsSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <button class="sheet-item" id="sheetSettings">
          <span class="sheet-icon">⚙</span> Ayarlar
        </button>
        <button class="sheet-item" id="sheetExport">
          <span class="sheet-icon">↓</span> Dışa aktar (JSON yedek)
        </button>
        <label class="sheet-item" for="sheetImportFile">
          <span class="sheet-icon">↑</span> İçe aktar (geri yükle)
        </label>
        <input type="file" id="sheetImportFile" accept=".json" style="display:none">
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#sheetSettings').addEventListener('click', () => { close(); renderSetup(); });
    overlay.querySelector('#sheetExport').addEventListener('click', () => { close(); exportData(); });
    overlay.querySelector('#sheetImportFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      close();
      if (file) await importData(file);
    });
  }

  // ---------- JSON yedek ----------
  async function exportData() {
    const [settings, fixed, expenses] = await Promise.all([
      DB.getSettings(), DB.getFixedExpenses(), DB.getExpenses()
    ]);
    const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings, fixed, expenses }, null, 2);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: 'gunluk-harcama-' + todayStr() + '.json'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function importData(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { alert('Dosya okunamadı.'); return; }
    if (!data.version || !data.settings) { alert('Geçersiz yedek dosyası.'); return; }
    if (!confirm('Mevcut tüm veriler silinip yedekten geri yüklenecek. Devam edilsin mi?')) return;
    await DB.saveSettings(data.settings);
    await DB.replaceFixedExpenses(data.fixed || []);
    await DB.replaceExpenses(data.expenses || []);
    await loadAll();
    isConfigured() ? renderMain() : renderSetup();
  }

  // ---------- Onyukleme ----------
  async function boot() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
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
