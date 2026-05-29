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
  // Baslangic taslagi: modern Turk hanesi — fatura + abonelik + kisisel, tutarlar bos.
  const STARTER_TEMPLATE = [
    'Kira', 'Elektrik', 'Su', 'Doğal gaz', 'Aidat',
    'Telefon', 'İnternet',
    'Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'ChatGPT',
    'iCloud', 'Ulaşım', 'Spor / Pilates'
  ];

  // Sabit gider sablonlari. Tek tusla eklenir; isim = islevsel etiket (marka degil).
  // Kategoriler yalnizca buton listesini gruplar, saklanmaz (sema: isim+tutar).
  const PRESETS = [
    { cat: 'Faturalar', items: ['Elektrik', 'Su', 'Doğal gaz', 'Isıtma', 'Aidat'] },
    { cat: 'Telefon & İnternet', items: ['Telefon', 'İnternet', 'TV / Kablo', 'Mobil hat'] },
    { cat: 'Dizi & Film', items: ['Netflix', 'Disney+', 'Amazon Prime', 'BluTV', 'Max', 'Exxen', 'Gain', 'MUBI', 'TOD', 'S Sport Plus', 'TV+', 'Tivibu'] },
    { cat: 'Müzik', items: ['Spotify', 'Apple Music', 'YouTube Premium', 'YouTube Music', 'Deezer', 'Fizy'] },
    { cat: 'Yapay Zeka', items: ['ChatGPT', 'Claude', 'Gemini Advanced', 'Perplexity Pro', 'GitHub Copilot'] },
    { cat: 'Bulut & Depolama', items: ['iCloud', 'Google One', 'Dropbox', 'OneDrive'] },
    { cat: 'Oyun', items: ['Xbox Game Pass', 'PlayStation Plus', 'GeForce Now', 'EA Play', 'Apple Arcade'] },
    { cat: 'Kitap & Haber', items: ['Storytel', 'Audible', 'Blinkist', 'Aposto', 'Gazete / Dergi'] },
    { cat: 'Yazılım & Ofis', items: ['Microsoft 365', 'Adobe Creative Cloud', 'Canva Pro', 'Notion', 'LinkedIn Premium'] },
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

  function buildBankChips() {
    if (!window.BankGuide) return '';
    return Object.keys(BankGuide.BANKS).map(name =>
      `<button type="button" class="bank-chip" data-bank="${escapeAttr(name)}">${escapeHTML(name)}</button>`
    ).join('');
  }

  function presetChipLabel(name) {
    const plan = rootCatalogDefault(name);
    const price = plan ? `<small>${formatTL(plan.amount)}</small>` : '';
    return `<span>+ ${escapeHTML(name)}</span>${price}`;
  }

  const MEAL_PROVIDERS = ['Pluxee', 'Edenred', 'Multinet', 'Metropol', 'Setcard', 'Sodexo', 'Diğer'];

  function renderSetup() {
    document.body.classList.remove('has-tabbar'); // kurulum tam ekran, alt bar yok
    const s = state.settings || {};
    const fixed = state.fixed.length ? state.fixed : [];
    const incomes = Budget.normalizeIncomes(s);
    const mc = s.mealCard || {};

    app.innerHTML = `
      <header class="head"><h1>${isConfigured() ? 'Kurulumu Düzenle' : 'Kurulum'}</h1></header>
      <form id="setupForm" class="form setup-form">
        <div class="field">
          <span>Gelirler</span>
          <div id="incomeList"></div>
          <button type="button" id="addIncome" class="btn-ghost">+ Gelir ekle</button>
          <small id="incomeTotal" class="hint"></small>
        </div>

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
          <span>Yemek kartı</span>
          <label class="meal-toggle">
            <input type="checkbox" id="mealEnabled" ${mc.enabled ? 'checked' : ''}>
            <span>Yemek kartım var (ayrı cüzdan)</span>
          </label>
          <div id="mealFields" class="meal-fields" ${mc.enabled ? '' : 'hidden'}>
            <select id="mealProvider">
              ${MEAL_PROVIDERS.map(p => `<option ${mc.provider === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <input id="mealLoad" type="text" inputmode="numeric" placeholder="Aylık yükleme (TL)"
                   value="${mc.monthlyLoad > 0 ? tlFmt.format(mc.monthlyLoad) : ''}">
            <small class="hint">Bu para günlük nakit bütçeni etkilemez; yalnız yemek kartı bakiyesinde tutulur.</small>
          </div>
        </div>

        <div class="field">
          <span>Sabit giderler</span>
          <div id="fixedList"></div>
          <div class="fixed-actions">
            <button type="button" id="addFixed" class="btn-ghost">+ Boş satır ekle</button>
            <button type="button" id="applyTemplate" class="btn-ghost btn-ghost-accent">Taslak şablon dene</button>
          </div>
          <div class="presets-wrap">
            <small class="hint">Hazır şablon: kategoriye dokun, açılır.</small>
            <div id="presets">${buildPresetsHTML()}</div>
          </div>

          <div class="ekstre-helper">
            <button type="button" id="ekstreToggle" class="ekstre-toggle">
              <span>🧾 Sabit giderini bilmiyor musun? Kart ekstrenden bul</span>
              <span class="ekstre-chevron">▸</span>
            </button>
            <div id="ekstreBody" class="ekstre-body" hidden>
              <p class="ekstre-step">1. Geçen ayın kredi kartı ekstresini indir</p>
              <small class="hint">Bankanı seç, uygulamada nasıl indireceğini göster:</small>
              <div id="bankChips" class="bank-chips">${buildBankChips()}</div>
              <ol id="bankSteps" class="bank-steps"></ol>

              <p class="ekstre-step">2. Bu promptu kopyala, ekstreyle birlikte yapay zekaya ver</p>
              <small class="hint">ChatGPT, Claude veya Gemini'ye ekstre dosyasını + bu metni yapıştır. Sana sabit giderleri liste verir.</small>
              <pre id="promptText" class="prompt-text">${escapeHTML(window.BankGuide ? BankGuide.STATEMENT_PROMPT : '')}</pre>
              <button type="button" id="copyPrompt" class="btn-ghost btn-ghost-accent">Promptu kopyala</button>
            </div>
          </div>
        </div>

      </form>
      <button type="submit" form="setupForm" class="btn-primary setup-save" id="saveBtn">Kaydet</button>
    `;

    const setupForm = document.getElementById('setupForm');

    const incomeList = document.getElementById('incomeList');
    incomes.forEach(inc => addIncomeRow(incomeList, inc.mode, inc.amount));
    updateIncomeTotal();

    const fixedList = document.getElementById('fixedList');
    if (fixed.length === 0) addFixedRow(fixedList);
    else fixed.forEach(f => addFixedRow(fixedList, f.name, f.amount));

    applyNumFmt(document.getElementById('savings'));

    document.getElementById('addIncome').addEventListener('click', () => {
      const row = addIncomeRow(incomeList, 'net');
      row.querySelector('.inc-amount').focus();
    });

    applyNumFmt(document.getElementById('mealLoad'));
    document.getElementById('mealEnabled').addEventListener('change', (e) => {
      document.getElementById('mealFields').hidden = !e.target.checked;
    });

    document.querySelector('.pct-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.pct-chip');
      if (!chip) return;
      const income = incomeForSavingsPercent();
      if (!income) { alert('Önce gelir girin.'); return; }
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

    document.getElementById('applyTemplate').addEventListener('click', () => {
      // Zaten dolu satir varsa ayni ismi tekrar ekleme
      const existing = new Set(
        [...fixedList.querySelectorAll('.fx-name')].map(i => i.value.trim().toLowerCase())
      );
      // Bos tek satir varsa onu temizle (taslak kalabalik gostermesin)
      const rows = fixedList.querySelectorAll('.fixed-row');
      if (rows.length === 1) {
        const onlyName = rows[0].querySelector('.fx-name').value.trim();
        const onlyAmt = rows[0].querySelector('.fx-amount').value.trim();
        if (!onlyName && !onlyAmt) rows[0].remove();
      }
      STARTER_TEMPLATE
        .filter(name => !existing.has(name.toLowerCase()))
        .forEach(name => addFixedRow(fixedList, name));
      fixedList.scrollIntoView({ block: 'start', behavior: 'smooth' });
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

    setupEkstreHelper();
  }

  // Ekstreden sabit gider bulma yardimcisi: banka rehberi + hazir prompt.
  function setupEkstreHelper() {
    const toggle = document.getElementById('ekstreToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const body = document.getElementById('ekstreBody');
      const chev = toggle.querySelector('.ekstre-chevron');
      body.hidden = !body.hidden;
      chev.textContent = body.hidden ? '▸' : '▾';
    });

    const chips = document.getElementById('bankChips');
    if (chips) chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.bank-chip');
      if (!chip) return;
      document.querySelectorAll('.bank-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const bank = BankGuide.BANKS[chip.dataset.bank];
      const stepsEl = document.getElementById('bankSteps');
      stepsEl.innerHTML = bank.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('') +
        (bank.note ? `<li class="bank-note">${escapeHTML(bank.note)}</li>` : '');
    });

    const copyBtn = document.getElementById('copyPrompt');
    if (copyBtn) copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(BankGuide.STATEMENT_PROMPT);
        copyBtn.textContent = '✓ Kopyalandı';
        setTimeout(() => { copyBtn.textContent = 'Promptu kopyala'; }, 2000);
      } catch {
        alert('Kopyalanamadı. Metni elle seçip kopyalayın.');
      }
    });
  }

  // Gelir satiri: Net/Brut toggle + tutar + sil. Brutte anlik net onizleme.
  function addIncomeRow(container, mode, amount) {
    const row = document.createElement('div');
    row.className = 'income-row';
    row.dataset.mode = mode === 'gross' ? 'gross' : 'net';
    row.innerHTML = `
      <div class="income-head">
        <div class="inc-switch">
          <button type="button" class="inc-mode" data-mode="net">Net</button>
          <button type="button" class="inc-mode" data-mode="gross">Brüt</button>
        </div>
        <button type="button" class="inc-del" aria-label="Sil">×</button>
      </div>
      <input class="inc-amount" type="text" inputmode="numeric" placeholder="Aylık tutar (TL)" value="${amount > 0 ? tlFmt.format(amount) : ''}">
      <small class="inc-preview hint"></small>
    `;
    row.querySelectorAll('.inc-mode').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === row.dataset.mode));

    row.querySelector('.inc-switch').addEventListener('click', (e) => {
      const btn = e.target.closest('.inc-mode');
      if (!btn) return;
      row.dataset.mode = btn.dataset.mode;
      row.querySelectorAll('.inc-mode').forEach(b => b.classList.toggle('active', b === btn));
      updateIncomeRowPreview(row);
      updateIncomeTotal();
    });

    const amt = row.querySelector('.inc-amount');
    applyNumFmt(amt);
    amt.addEventListener('input', () => { updateIncomeRowPreview(row); updateIncomeTotal(); });
    amt.addEventListener('blur', () => { updateIncomeRowPreview(row); updateIncomeTotal(); });

    row.querySelector('.inc-del').addEventListener('click', () => {
      if (container.querySelectorAll('.income-row').length > 1) {
        row.remove();
        updateIncomeControls(container);
        updateIncomeTotal();
      }
    });

    container.appendChild(row);
    updateIncomeRowPreview(row);
    updateIncomeControls(container);
    return row;
  }

  // Tek gelir varken sil (×) butonunu gizle: varsayilan sade tek gelir gorunumu.
  function updateIncomeControls(container) {
    const single = container.querySelectorAll('.income-row').length <= 1;
    container.classList.toggle('single-income', single);
  }

  function updateIncomeRowPreview(row) {
    const preview = row.querySelector('.inc-preview');
    const amount = parseAmount(row.querySelector('.inc-amount').value);
    if (row.dataset.mode !== 'gross') {
      preview.textContent = '';
      return;
    }
    if (!amount) {
      preview.textContent = 'Brütten 2026 SGK/vergi sonrası net hesaplanır.';
      return;
    }
    const now = new Date();
    const p = Payroll.computeMonthlyNet({ gross: amount, year: now.getFullYear(), month: now.getMonth() + 1 });
    preview.textContent = `≈ net ${formatTL(p.net)} (${now.toLocaleDateString('tr-TR', { month: 'long' })})`;
  }

  function readIncomeRows() {
    return [...document.querySelectorAll('.income-row')]
      .map(r => ({
        mode: r.dataset.mode === 'gross' ? 'gross' : 'net',
        amount: parseAmount(r.querySelector('.inc-amount').value)
      }))
      .filter(i => i.amount > 0);
  }

  function updateIncomeTotal() {
    const el = document.getElementById('incomeTotal');
    if (!el) return;
    const incomes = readIncomeRows();
    if (!incomes.length) { el.textContent = ''; return; }
    const totalNet = Budget.incomeForDate({ incomes }, new Date());
    const hasGross = incomes.some(i => i.mode === 'gross');
    const prefix = incomes.length > 1 || hasGross ? 'Toplam net gelir: ' : 'Aylık gelir: ';
    el.textContent = prefix + formatTL(totalNet);
  }

  // Tasarruf yuzdesi toplam net gelir uzerinden.
  function incomeForSavingsPercent() {
    return Budget.incomeForDate({ incomes: readIncomeRows() }, new Date());
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

  // 'YYYY-MM-DD' veya Date -> donem basi 'YYYY-MM-01'
  function periodStartISO(dateStr) {
    const s = (dateStr instanceof Date)
      ? dateStr.getFullYear() + '-' + String(dateStr.getMonth() + 1).padStart(2, '0')
      : String(dateStr).slice(0, 7);
    return s + '-01';
  }

  // Snapshot karsilastirma anahtari (sira/format bagimsiz)
  function snapKey(snap) {
    const incs = (snap.incomes || []).map(i => (i.mode === 'gross' ? 'g' : 'n') + (Number(i.amount) || 0)).join('|');
    const fx = [...(snap.fixed || [])]
      .map(f => ({ n: (f.name || '').trim(), a: Number(f.amount) || 0 }))
      .sort((a, b) => a.n.localeCompare(b.n))
      .map(f => f.n + ':' + f.a).join('|');
    return incs + '#' + (Number(snap.savingsTarget) || 0) + '#' + fx;
  }

  function upsertSnapshot(history, snap) {
    const idx = history.findIndex(h => h.from === snap.from);
    if (idx >= 0) history[idx] = snap;
    else history.push(snap);
    history.sort((a, b) => a.from.localeCompare(b.from)); // ISO string = kronolojik
  }

  // Kaydederken "hangi aydan itibaren" sec. 'YYYY-MM-01' veya null (iptal) doner.
  function chooseEffectiveMonth(startPeriod, curPeriod) {
    return new Promise((resolve) => {
      const def = curPeriod.slice(0, 7);
      // Gelecek 12 aya kadar secilebilir (ileride gecerli olacak zam vb.)
      const curD = new Date(curPeriod + 'T00:00:00');
      const maxD = new Date(curD.getFullYear(), curD.getMonth() + 12, 1);
      const maxM = maxD.getFullYear() + '-' + String(maxD.getMonth() + 1).padStart(2, '0');
      const overlay = document.createElement('div');
      overlay.className = 'sheet-overlay';
      overlay.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle"></div>
          <div class="eff-sheet">
            <strong>Değişiklik hangi aydan itibaren geçerli?</strong>
            <p class="plan-hint">Geçmiş bir ay (geç giriş) ya da gelecek bir ay (ör. zam Haziran'da başlayacak) seçebilirsin. Seçtiğin aydan önceki dönemler eski değerlerle kalır.</p>
            <input id="effMonth" type="month" value="${def}" min="${startPeriod.slice(0, 7)}" max="${maxM}">
            <div class="edit-btns">
              <button type="button" class="edit-save" id="effOk">Uygula</button>
              <button type="button" class="edit-cancel" id="effCancel">İptal</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = (v) => { overlay.remove(); resolve(v); };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('#effCancel')) close(null);
      });
      overlay.querySelector('#effOk').addEventListener('click', () => {
        const m = overlay.querySelector('#effMonth').value || def;
        close(m + '-01');
      });
    });
  }

  async function onSaveSetup(e) {
    e.preventDefault();
    const incomes = readIncomeRows();
    const savingsTarget = parseAmount(document.getElementById('savings').value);
    const fixed = readFixedRows();
    const salaryDay = 1; // Dönem her zaman ayın 1'inde başlar

    if (incomes.length === 0) { alert('Lütfen en az bir gelir girin.'); return; }

    const existing = state.settings || {};
    const configured = isConfigured();
    const startPeriod = periodStartISO(existing.startDate || todayStr());
    const curPeriod = periodStartISO(todayStr());
    const curDate = new Date(curPeriod + 'T00:00:00');

    // Mevcut tarihli gecmis; yoksa eski tek-config'i baslangic donemine muhurle.
    let history = Array.isArray(existing.history) ? existing.history.map(h => ({ ...h })) : [];
    if (!history.length && configured) {
      history.push({
        from: startPeriod,
        incomes: Budget.normalizeIncomes(existing),
        savingsTarget: Number(existing.savingsTarget) || 0,
        fixed: (state.fixed || []).map(f => ({ name: f.name, amount: f.amount }))
      });
    }

    const newSnap = { incomes, savingsTarget, fixed };

    if (!history.length) {
      // Ilk kurulum: tek snapshot, baslangic doneminden gecerli.
      history = [{ from: startPeriod, ...newSnap }];
    } else {
      // Bu donemde gecerli config ile karsilastir; degistiyse ay sor.
      const curCfg = Budget.configForPeriod({ history }, curDate) || {};
      if (snapKey(newSnap) !== snapKey(curCfg)) {
        const effFrom = await chooseEffectiveMonth(startPeriod, curPeriod);
        if (effFrom === null) return; // iptal: kaydetme
        upsertSnapshot(history, { from: effFrom, ...newSnap });
      }
      // degisiklik yoksa history'e dokunma
    }

    // Bugun icin gecerli "canli" config -> UI/top-level alanlara yansir.
    const live = Budget.configForPeriod({ history }, curDate) || newSnap;
    const totalNet = Math.round(Budget.incomeForDate({ incomes: live.incomes }, new Date()));

    // Yemek karti config (ayri cuzdan)
    const mealEnabled = document.getElementById('mealEnabled').checked;
    let mealCard;
    if (mealEnabled) {
      const prevMc = existing.mealCard || {};
      mealCard = {
        enabled: true,
        provider: document.getElementById('mealProvider').value,
        monthlyLoad: parseAmount(document.getElementById('mealLoad').value),
        startMonth: prevMc.startMonth || curPeriod.slice(0, 7)
      };
    } else {
      mealCard = { enabled: false };
    }

    await DB.saveSettings({
      history,
      incomes: live.incomes,
      income: totalNet,
      savingsTarget: live.savingsTarget,
      incomeMode: live.incomes.length === 1 ? live.incomes[0].mode : 'mixed',
      grossIncome: 0,
      salaryDay,
      mealCard
    });
    await DB.replaceFixedExpenses(live.fixed);
    await loadAll();
    renderMain();
  }

  // ---------- Ana ekran ----------
  let draft = 0; // numpad taslagi (tam sayi TL)
  let selectedDate = todayStr();
  let entrySource = 'cash'; // harcama kaynagi: 'cash' | 'meal'

  // Hero sayisi count-up. Onceki degerden hedefe; prefers-reduced-motion'da aninda.
  let lastHeroValue = null;
  function animateHero(target) {
    const el = document.querySelector('.hero-amount');
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = (lastHeroValue == null) ? 0 : lastHeroValue;
    lastHeroValue = target;
    if (reduce || from === target) { el.textContent = formatTL(target); return; }
    const dur = 500, t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 3); // ease-out cubic
    el.textContent = formatTL(from);
    function frame(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = formatTL(from + (target - from) * ease(p));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Bu ayin freeze (telafi) jetonunu yonet + streak'i hesapla.
  // Ayda 1 telafi: tek gunluk bosluk zinciri kirmasin. Tek kalici state: settings.streakFreeze.
  function computeStreakWithFreeze(todaySpendable) {
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    let freeze = state.settings.streakFreeze;
    let changed = false;
    if (!freeze || freeze.month !== month) { freeze = { month, coveredDay: null }; changed = true; }

    let frozenDays = freeze.coveredDay ? [freeze.coveredDay] : [];
    let s = Streak.compute(state.expenses, { now, todaySpendable, frozenDays });

    // Jeton boşsa ve köprülenebilir tek boşluk varsa tüket.
    if (!freeze.coveredDay && s.bridgeableGap) {
      freeze = { month, coveredDay: s.bridgeableGap };
      frozenDays = [freeze.coveredDay];
      s = Streak.compute(state.expenses, { now, todaySpendable, frozenDays });
      changed = true;
    }
    if (changed) {
      state.settings.streakFreeze = freeze;
      DB.saveSettings({ streakFreeze: freeze }); // fire-and-forget
    }
    s.frozeUsed = !!freeze.coveredDay;
    return s;
  }

  // Hero altindaki streak gostergesi (yalniz bugun gorunumu).
  function streakHtml(s) {
    if (!s) return '';
    const best = s.best > s.current ? `<span class="streak-best">· rekor ${s.best}</span>` : '';
    let cls = 'streak';
    if (s.current >= 30) cls += ' tier2';
    else if (s.current >= 7) cls += ' tier1';
    let text;
    if (s.current === 0 && !s.riskToday) {
      text = 'Seriye başla — bugünkü harcamanı gir 🔥';
    } else if (s.riskToday) {
      cls += ' risk';
      text = `🔥 ${s.current} günlük seri sürüyor · bugün girersen kaçırmazsın`;
    } else {
      if (s.todayClean) cls += ' clean';
      text = `🔥 ${s.current} gündür takipte`;
    }
    const freeze = s.frozeUsed ? `<span class="streak-freeze">❄️ telafi kullanıldı</span>` : '';
    return `<p class="${cls}">${text} ${best} ${freeze}</p>`;
  }

  // ---------- Alt tab bar ----------
  const TABS = [
    { key: 'today', icon: '🧮', label: 'Bugün' },
    { key: 'stats', icon: '📊', label: 'İstatistik' },
    { key: 'piggy', icon: '🫙', label: 'Kumbara' }
  ];
  function tabBarHtml(active) {
    return `<nav class="tabbar">${TABS.map(t =>
      `<button type="button" class="tab ${t.key === active ? 'active' : ''}" data-tab="${t.key}">
        <span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span>
      </button>`).join('')}</nav>`;
  }
  function wireTabBar() {
    document.body.classList.add('has-tabbar');
    const bar = app.querySelector('.tabbar');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab === 'today') renderMain(todayStr());
      else if (tab === 'stats') renderStats();
      else if (tab === 'piggy') renderKumbara();
    });
  }

  function renderMain(dateStr) {
    draft = 0;
    selectedDate = clampViewDate(dateStr || selectedDate);
    const viewingToday = selectedDate === todayStr();
    // Yemek karti harcamalari nakit butcesine karismaz: budget'a yalniz cash verilir.
    const r = Budget.computeBudget(state.settings, state.fixed, cashExpenses(), new Date());
    const over = r.spendableToday < 0;
    const dayExpenses = expensesForDay(selectedDate)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const dayCashTotal = dayExpenses.filter(e => e.source !== 'meal').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const dayMealTotal = dayExpenses.filter(e => e.source === 'meal').reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const heroClass = viewingToday ? (over ? 'over' : '') : 'history';
    const streak = viewingToday ? computeStreakWithFreeze(r.spendableToday) : null;
    const meal = viewingToday ? mealCardInfo() : null;
    const inst = viewingToday ? installmentSummary() : null;

    app.innerHTML = `
      <header class="head">
        <h1>${viewingToday ? 'Bugün' : 'Geçmiş'}</h1>
        <button id="settingsBtn" class="icon-btn" aria-label="Menü">⚙</button>
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
        <p class="hero-amount">${formatTL(viewingToday ? r.spendableToday : dayCashTotal)}</p>
        <p class="hero-sub">${viewingToday ? `${r.daysRemaining} gün kaldı · bugün dahil` : `${dayExpenses.length} işlem · ${weekdayName(selectedDate)}`}</p>
      </section>

      ${streakHtml(streak)}

      <section class="balance ${r.cumulativeBalance < 0 ? 'neg' : 'pos'}">
        <span>Kümülatif bakiye</span>
        <strong>${r.cumulativeBalance >= 0 ? '+' : ''}${formatTL(r.cumulativeBalance)}</strong>
      </section>

      ${meal ? `
      <section class="balance mealcard">
        <span>🍽️ ${escapeAttr(meal.provider || 'Yemek kartı')}</span>
        <span class="mealcard-right">
          <strong>${formatTL(meal.balance)}</strong>
          <small>bu ay −${formatTL(meal.thisMonthSpent)}</small>
        </span>
      </section>` : ''}

      ${inst ? `
      <section class="balance instcard">
        <span>📅 Taksitler</span>
        <span class="mealcard-right">
          <strong>bu ay ${formatTL(inst.thisMonth)}</strong>
          ${inst.upcomingCount > 0 ? `<small>${inst.upcomingCount} ödeme kaldı · ${formatTL(inst.upcomingTotal)}</small>` : ''}
        </span>
      </section>` : ''}

      <section class="entry">
        <div class="draft" id="draft">0 TL</div>
        ${meal ? `
        <div class="src-switch" id="srcSwitch">
          <button type="button" class="src ${entrySource === 'cash' ? 'active' : ''}" data-src="cash">Nakit</button>
          <button type="button" class="src ${entrySource === 'meal' ? 'active' : ''}" data-src="meal">🍽️ Yemek kartı</button>
        </div>` : ''}
        <input id="noteInput" type="text" class="note-input" placeholder="Not (opsiyonel)" maxlength="60" autocomplete="off">
        <p class="entry-date">${formatDateLong(selectedDate)} için eklenir</p>
        <div class="numpad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="np" data-d="${n}">${n}</button>`).join('')}
          <button class="np np-back" id="back" aria-label="Sil">⌫</button>
          <button class="np" data-d="0">0</button>
          <button class="np np-add" id="add">Ekle</button>
        </div>
        ${entrySource === 'meal' ? '' : '<button type="button" id="taksitBtn" class="btn-ghost taksit-btn">Taksitlendir</button>'}
      </section>

      <section class="list">
        <h2 class="list-title">${formatDateLong(selectedDate)} · ${dayExpenses.length} işlem · ${formatTL(dayCashTotal)}${dayMealTotal > 0 ? ` · 🍽️ ${formatTL(dayMealTotal)}` : ''}</h2>
        ${dayExpenses.length === 0
          ? `<p class="empty">Bu gün için harcama yok.</p>
             <button type="button" id="noSpend" class="btn-ghost btn-ghost-accent nospend-btn">Harcama yapmadım ✓</button>`
          : dayExpenses.map(e => `
            <div class="exp-row ${e.source === 'meal' ? 'meal' : ''}" data-id="${e.id}">
              <span class="exp-amt">${Number(e.amount) === 0 ? '<span class="exp-zero">Harcama yok</span>' : formatTL(e.amount)}${e.source === 'meal' ? ' <span class="exp-badge">🍽️</span>' : ''}${e.inst ? ' <span class="exp-badge">📅</span>' : ''}</span>
              <span class="exp-meta">${e.note ? `<span class="exp-note">${escapeAttr(e.note)}</span>` : ''}<span class="exp-time">${formatWhen(e.ts)}</span></span>
              <button class="exp-del" data-id="${e.id}" aria-label="Sil">×</button>
            </div>`).join('')}
      </section>

      ${tabBarHtml('today')}
    `;

    if (viewingToday) {
      animateHero(r.spendableToday);
      if (streak && streak.todayClean) {
        const heroEl = app.querySelector('.hero');
        if (heroEl) { heroEl.classList.remove('clean-pulse'); void heroEl.offsetWidth; heroEl.classList.add('clean-pulse'); }
      }
    } else {
      lastHeroValue = null; // gecmis gun statik gosterilir
    }

    document.getElementById('settingsBtn').addEventListener('click', openSettingsSheet);
    wireTabBar();
    document.getElementById('prevDay').addEventListener('click', () => renderMain(addDays(selectedDate, -1)));
    document.getElementById('nextDay').addEventListener('click', () => renderMain(addDays(selectedDate, 1)));
    document.getElementById('viewDateInput').addEventListener('change', (e) => renderMain(e.target.value));
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) todayBtn.addEventListener('click', () => renderMain(todayStr()));

    const srcSwitch = document.getElementById('srcSwitch');
    if (srcSwitch) srcSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('.src');
      if (!btn) return;
      entrySource = btn.dataset.src;
      srcSwitch.querySelectorAll('.src').forEach(s => s.classList.toggle('active', s === btn));
    });

    app.querySelectorAll('.np[data-d]').forEach(b =>
      b.addEventListener('click', () => { draft = draft * 10 + Number(b.dataset.d); updateDraft(); }));

    document.getElementById('back').addEventListener('click', () => { draft = Math.floor(draft / 10); updateDraft(); });
    document.getElementById('add').addEventListener('click', () => {
      if (draft > 0) {
        const note = document.getElementById('noteInput').value.trim();
        const ts = dateToTs(selectedDate);
        addExpenseAndRefresh(draft, note, ts, entrySource);
      }
    });

    const noSpend = document.getElementById('noSpend');
    if (noSpend) noSpend.addEventListener('click', () => addExpenseAndRefresh(0, '', dateToTs(selectedDate), 'cash'));

    const taksitBtn = document.getElementById('taksitBtn');
    if (taksitBtn) taksitBtn.addEventListener('click', async () => {
      if (draft <= 0) { alert('Önce tutarı gir.'); return; }
      const note = document.getElementById('noteInput').value.trim();
      const n = await chooseInstallments(draft);
      if (n) await addInstallmentsAndRefresh(draft, note, n);
    });

    app.querySelectorAll('.exp-del').forEach(b =>
      b.addEventListener('click', () => {
        const id = Number(b.dataset.id);
        const e = state.expenses.find(x => x.id === id);
        if (e && e.inst) {
          if (confirm('Bu taksitli alışverişin tüm taksitleri silinsin mi?')) deleteInstallmentAndRefresh(e.inst.id);
        } else {
          deleteExpenseAndRefresh(id);
        }
      }));

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

  async function addExpenseAndRefresh(amount, note, ts, source) {
    await DB.addExpense(amount, note, ts, source);
    state.expenses = await DB.getExpenses();
    renderMain(selectedDate);
  }

  // Yemek karti yardimcilari
  function cashExpenses() { return state.expenses.filter(e => e.source !== 'meal'); }
  function mealExpenses() { return state.expenses.filter(e => e.source === 'meal'); }

  function mealCardInfo() {
    const mc = state.settings && state.settings.mealCard;
    if (!mc || !mc.enabled) return null;
    const load = Number(mc.monthlyLoad) || 0;
    const now = new Date();
    const start = mc.startMonth || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
    const [sy, sm] = start.split('-').map(Number);
    const loadMonths = Math.max(1, (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm) + 1);
    const totalLoaded = load * loadMonths;
    const totalSpent = mealExpenses().reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonthSpent = mealExpenses()
      .filter(e => new Date(e.ts).getTime() >= monthStart)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { balance: totalLoaded - totalSpent, monthlyLoad: load, thisMonthSpent, provider: mc.provider };
  }

  // Taksit ozeti: bu ayki taksit odemesi + gelecek aylardaki kalan taksitler.
  function installmentSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const inst = state.expenses.filter(e => e.inst);
    if (!inst.length) return null;
    const sum = arr => arr.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const thisMonth = sum(inst.filter(e => { const t = +new Date(e.ts); return t >= monthStart && t < nextMonthStart; }));
    const upcoming = inst.filter(e => +new Date(e.ts) >= nextMonthStart);
    if (thisMonth === 0 && upcoming.length === 0) return null;
    return { thisMonth, upcomingCount: upcoming.length, upcomingTotal: sum(upcoming) };
  }

  // Taksit secim sheet'i. Secilen taksit sayisini (n) ya da null (iptal) doner.
  function chooseInstallments(total) {
    return new Promise((resolve) => {
      const quick = [3, 6, 9, 12];
      const overlay = document.createElement('div');
      overlay.className = 'sheet-overlay';
      overlay.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle"></div>
          <div class="inst-sheet">
            <strong>${formatTL(total)} — kaç aya bölelim?</strong>
            <p class="plan-hint">Taksitli: bu ay bütçenden sadece aylık tutar düşer, kalanı sonraki aylara yayılır. Tek seferlik istersen iptal et, "Ekle"yi kullan.</p>
            <div class="inst-quick">
              ${quick.map(n => `<button type="button" class="inst-chip" data-n="${n}">${n}</button>`).join('')}
            </div>
            <input id="instCount" type="number" inputmode="numeric" min="2" max="36" placeholder="Taksit sayısı (ör. 5)">
            <p class="inst-preview" id="instPreview">&nbsp;</p>
            <div class="edit-btns">
              <button type="button" class="edit-save" id="instOk">Uygula</button>
              <button type="button" class="edit-cancel" id="instCancel">İptal</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = (v) => { overlay.remove(); resolve(v); };
      const input = overlay.querySelector('#instCount');
      const preview = overlay.querySelector('#instPreview');
      const update = () => {
        const n = parseInt(input.value, 10);
        preview.textContent = (n >= 2) ? `${n} ay · aylık ${formatTL(Math.round(total / n))}` : ' ';
      };
      input.addEventListener('input', update);
      overlay.querySelectorAll('.inst-chip').forEach(c =>
        c.addEventListener('click', () => { input.value = c.dataset.n; update(); }));
      overlay.querySelector('#instOk').addEventListener('click', () => {
        const n = parseInt(input.value, 10);
        if (!(n >= 2)) { alert('En az 2 taksit girin.'); return; }
        close(Math.min(n, 36));
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('#instCancel')) close(null);
      });
      input.focus();
    });
  }

  // Taksitli harcama olustur: n kayit (bu ay + sonraki n-1 ay), ortak instId.
  async function addInstallmentsAndRefresh(total, note, n) {
    const id = 'i' + Date.now();
    const base = Math.floor(total / n);
    const now = new Date();
    const day = now.getDate();
    for (let k = 1; k <= n; k++) {
      const amount = (k === n) ? total - base * (n - 1) : base; // artik son taksite
      let ts;
      if (k === 1) {
        ts = dateToTs(selectedDate); // bu ayki taksit: secili gun (genelde bugun)
      } else {
        const d = new Date(now.getFullYear(), now.getMonth() + (k - 1), 1);
        const clampedDay = Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
        d.setDate(clampedDay);
        d.setHours(12, 0, 0, 0);
        ts = d.toISOString();
      }
      const kNote = (note ? note + ' ' : '') + `(${k}/${n})`;
      await DB.addExpense(amount, kNote, ts, 'cash', { id, k, n });
    }
    state.expenses = await DB.getExpenses();
    renderMain(selectedDate);
  }

  async function deleteExpenseAndRefresh(id) {
    await DB.deleteExpense(id);
    state.expenses = await DB.getExpenses();
    renderMain(selectedDate);
  }

  async function deleteInstallmentAndRefresh(instId) {
    await DB.deleteInstallment(instId);
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

  // ---------- Istatistik ekrani ----------
  let statsPeriod = '7'; // '7' | '30' | 'period' | 'last'

  function atMid(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
  function addDaysDate(d, n) { const c = atMid(d); c.setDate(c.getDate() + n); return c; }

  // Secili periyot icin {from, to, label} + onceki esit donem {prevFrom, prevTo}.
  function statsRange(key) {
    const now = new Date();
    const today = atMid(now);
    const tomorrow = addDaysDate(today, 1);

    if (key === '30') {
      const from = addDaysDate(today, -29);
      return { from, to: tomorrow, label: 'Son 30 gün', prevFrom: addDaysDate(from, -30), prevTo: from };
    }
    if (key === 'period') {
      const from = Budget.periodStartFor(now, 1);
      const prevFrom = Budget.periodStartFor(addDaysDate(from, -1), 1);
      return { from, to: tomorrow, label: 'Bu dönem', prevFrom, prevTo: from };
    }
    if (key === 'last') {
      const curStart = Budget.periodStartFor(now, 1);
      const from = Budget.periodStartFor(addDaysDate(curStart, -1), 1);
      const prevFrom = Budget.periodStartFor(addDaysDate(from, -1), 1);
      return { from, to: curStart, label: 'Geçen dönem', prevFrom, prevTo: from };
    }
    // varsayilan: son 7 gun
    const from = addDaysDate(today, -6);
    return { from, to: tomorrow, label: 'Son 7 gün', prevFrom: addDaysDate(from, -7), prevTo: from };
  }

  const STAT_PERIODS = [
    { key: '7', label: 'Son 7 gün' },
    { key: '30', label: 'Son 30 gün' },
    { key: 'period', label: 'Bu dönem' },
    { key: 'last', label: 'Geçen dönem' }
  ];

  function shortDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  function renderStats() {
    const r = statsRange(statsPeriod);
    const cash = cashExpenses(); // yemek karti istatistige karismaz
    const sum = Stats.summarize(cash, r.from, r.to);
    const cmp = Stats.compare(cash, r.from, r.to, r.prevFrom, r.prevTo);

    const maxTotal = sum.series.reduce((m, d) => Math.max(m, d.total), 0);
    const manyBars = sum.series.length > 14;

    // Karsilastirma metni
    let cmpHtml = '';
    if (cmp.pct === null) {
      cmpHtml = cmp.current > 0
        ? '<span class="cmp-muted">Önceki eşit dönemde harcama yok</span>'
        : '';
    } else {
      const up = cmp.diff > 0;
      const arrow = up ? '▲' : (cmp.diff < 0 ? '▼' : '•');
      const cls = up ? 'cmp-up' : (cmp.diff < 0 ? 'cmp-down' : 'cmp-flat');
      cmpHtml = `<span class="${cls}">${arrow} %${Math.abs(cmp.pct)}</span>
        <span class="cmp-muted">önceki döneme göre (${formatTL(cmp.previous)})</span>`;
    }

    app.innerHTML = `
      <header class="head"><h1>İstatistikler</h1></header>

      <div class="stat-periods">
        ${STAT_PERIODS.map(p =>
          `<button type="button" class="stat-period ${p.key === statsPeriod ? 'active' : ''}" data-key="${p.key}">${p.label}</button>`
        ).join('')}
      </div>

      <section class="stat-cards">
        <div class="stat-card">
          <span class="stat-label">Toplam harcama</span>
          <strong class="stat-value">${formatTL(sum.total)}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Günlük ortalama</span>
          <strong class="stat-value">${formatTL(sum.dailyAvg)}</strong>
          <small class="stat-sub">${sum.loggedDays} günde</small>
        </div>
        <div class="stat-card">
          <span class="stat-label">En yüksek gün</span>
          <strong class="stat-value">${sum.maxDay.total > 0 ? formatTL(sum.maxDay.total) : '—'}</strong>
          <small class="stat-sub">${sum.maxDay.total > 0 ? shortDate(sum.maxDay.date) : ''}</small>
        </div>
        <div class="stat-card">
          <span class="stat-label">İşlem sayısı</span>
          <strong class="stat-value">${sum.count}</strong>
        </div>
      </section>

      ${cmpHtml ? `<section class="stat-compare">${cmpHtml}</section>` : ''}

      <section class="chart-wrap">
        <h2 class="list-title">Günlük harcama · ${r.label}</h2>
        ${sum.total === 0
          ? '<p class="empty">Bu dönemde harcama yok.</p>'
          : `<div class="chart ${manyBars ? 'chart-dense' : ''}">
              ${sum.series.map(d => {
                const h = maxTotal > 0 ? Math.round((d.total / maxTotal) * 100) : 0;
                return `<div class="chart-bar" style="height:${Math.max(h, d.total > 0 ? 4 : 0)}%" title="${shortDate(d.date)}: ${formatTL(d.total)}"></div>`;
              }).join('')}
            </div>
            <div class="chart-axis">
              <span>${shortDate(sum.series[0].date)}</span>
              <span>${shortDate(sum.series[sum.series.length - 1].date)}</span>
            </div>`}
      </section>

      ${tabBarHtml('stats')}
    `;

    document.querySelector('.stat-periods').addEventListener('click', (e) => {
      const btn = e.target.closest('.stat-period');
      if (!btn) return;
      statsPeriod = btn.dataset.key;
      renderStats();
    });
    wireTabBar();
  }

  // ---------- Kumbara ekrani ----------
  function renderKumbara() {
    const r = Budget.computeBudget(state.settings, state.fixed, cashExpenses(), new Date());
    const savingsTarget = Number(state.settings.savingsTarget) || 0;
    const spentToday = expensesForDay(todayStr())
      .filter(e => e.source !== 'meal')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const sv = Savings.compute({
      periodVariableBudget: r.periodVariableBudget,
      savingsTarget,
      daysInPeriod: r.daysInPeriod,
      daysAccrued: r.daysAccrued,
      spentThisPeriod: r.spentThisPeriod,
      spentToday
    });

    let body;
    if (!sv) {
      body = `
        <div class="piggy-empty">
          <div class="piggy-empty-icon">🫙</div>
          <p>Tasarruf hedefi belirlersen burada kumbaran dolmaya başlar.</p>
          <button type="button" id="piggySetup" class="btn-primary">Kurulumu düzenle</button>
        </div>`;
    } else {
      const fillPct = Math.max(0, Math.min(1, sv.pct)) * 100;
      const overPct = sv.overflow ? Math.round((sv.pct - 1) * 100) : 0;
      body = `
        <div class="piggy-wrap ${sv.overflow ? 'overflow' : ''} ${sv.saved < 0 ? 'behind' : ''}">
          <div class="jar">
            <div class="jar-fill" id="jarFill" style="height:0%"></div>
            <div class="jar-pct">${Math.round(sv.pct * 100)}%</div>
          </div>
        </div>
        <p class="piggy-main">Bu ay biriken: <strong>${formatTL(sv.saved)}</strong> / ${formatTL(sv.target)}</p>
        ${sv.overflow ? `<p class="piggy-over">✨ Hedefin %${overPct} üstündesin</p>` : ''}
        ${sv.todayContrib > 0 ? `<p class="piggy-today">bugün +${formatTL(sv.todayContrib)}</p>` : ''}
        <p class="piggy-cumulative">Kümülatif bakiye: ${r.cumulativeBalance >= 0 ? '+' : ''}${formatTL(r.cumulativeBalance)}</p>`;
    }

    app.innerHTML = `
      <header class="head"><h1>Kumbara</h1></header>
      <section class="piggy">${body}</section>
      ${tabBarHtml('piggy')}
    `;

    const setupBtn = document.getElementById('piggySetup');
    if (setupBtn) setupBtn.addEventListener('click', renderSetup);

    // Kavanoz dolum animasyonu (reduced-motion'da aninda)
    const fill = document.getElementById('jarFill');
    if (fill && sv) {
      const target = Math.max(0, Math.min(1, sv.pct)) * 100;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { fill.style.height = target + '%'; }
      else { requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.height = target + '%'; })); }
    }
    wireTabBar();
  }

  // ---------- Ayarlar sheet ----------
  function openSettingsSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <button class="sheet-item" id="sheetSettings">
          <span class="sheet-icon">✎</span> Kurulumu düzenle
        </button>
        <button class="sheet-item" id="sheetCsv">
          <span class="sheet-icon">📄</span> Harcama geçmişi (CSV / Excel)
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
    overlay.querySelector('#sheetCsv').addEventListener('click', () => { close(); exportCsv(); });
    overlay.querySelector('#sheetExport').addEventListener('click', () => { close(); exportData(); });
    overlay.querySelector('#sheetImportFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      close();
      if (file) await importData(file);
    });
  }

  // ---------- CSV (Excel / analiz) ----------
  async function exportCsv() {
    const expenses = (await DB.getExpenses())
      .sort((a, b) => new Date(a.ts) - new Date(b.ts)); // eskiden yeniye (trend analizi)
    const sep = ';'; // Turkce Excel ayraci
    const cell = (v) => {
      const s = String(v == null ? '' : v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = [['Tarih', 'Saat', 'Tutar (TL)', 'Not']];
    for (const e of expenses) {
      const d = new Date(e.ts);
      const tarih = String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
      const saat = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      rows.push([tarih, saat, Math.round(Number(e.amount) || 0), e.note || '']);
    }
    // UTF-8 BOM: Excel'de Turkce karakterler dogru gorunsun
    const csv = '﻿' + rows.map(r => r.map(cell).join(sep)).join('\r\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
      download: 'harcama-gecmisi-' + todayStr() + '.csv'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
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
