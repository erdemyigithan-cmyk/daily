// IndexedDB sarmalayici. Sadece veri okur/yazar; hesap yok, DOM yok.
(function (root) {
  'use strict';

  const DB_NAME = 'gunluk-harcama';
  const DB_VERSION = 1;
  const SETTINGS_KEY = 'main';

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings'); // key disaridan ('main')
        }
        if (!db.objectStoreNames.contains('fixedExpenses')) {
          db.createObjectStore('fixedExpenses', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          const s = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          s.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---
  function getSettings() {
    return tx('settings', 'readonly', s => reqToPromise(s.get(SETTINGS_KEY)))
      .then(v => v || null);
  }

  function saveSettings(obj) {
    return getSettings().then(existing => {
      const next = Object.assign({}, existing, obj);
      // startDate ilk kayitta sabitlenir, sonra degismez (rollover capasi).
      if (!next.startDate) {
        const d = new Date();
        next.startDate = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
      }
      return tx('settings', 'readwrite', s => reqToPromise(s.put(next, SETTINGS_KEY)))
        .then(() => next);
    });
  }

  // --- Sabit giderler (toplu degistir) ---
  function getFixedExpenses() {
    return tx('fixedExpenses', 'readonly', s => reqToPromise(s.getAll()));
  }

  function replaceFixedExpenses(list) {
    return tx('fixedExpenses', 'readwrite', s => {
      s.clear();
      for (const item of list) {
        s.add({ name: item.name, amount: Number(item.amount) || 0 });
      }
    });
  }

  // --- Degisken harcamalar ---
  function getExpenses() {
    return tx('expenses', 'readonly', s => reqToPromise(s.getAll()));
  }

  function addExpense(amount, note, ts) {
    const rec = { amount: Number(amount), ts: ts || new Date().toISOString() };
    if (note) rec.note = String(note).trim();
    return tx('expenses', 'readwrite', s => reqToPromise(s.add(rec)));
  }

  function deleteExpense(id) {
    return tx('expenses', 'readwrite', s => reqToPromise(s.delete(id)));
  }

  function updateExpense(id, amount, note, ts) {
    return tx('expenses', 'readonly', s => reqToPromise(s.get(id)))
      .then(rec => {
        if (!rec) return;
        rec.amount = Number(amount);
        if (note && String(note).trim()) rec.note = String(note).trim();
        else delete rec.note;
        if (ts) rec.ts = ts;
        return tx('expenses', 'readwrite', s => reqToPromise(s.put(rec)));
      });
  }

  function replaceExpenses(list) {
    return tx('expenses', 'readwrite', s => {
      s.clear();
      for (const item of list) {
        const rec = { amount: Number(item.amount), ts: item.ts };
        if (item.note) rec.note = String(item.note);
        s.add(rec);
      }
    });
  }

  root.DB = {
    getSettings,
    saveSettings,
    getFixedExpenses,
    replaceFixedExpenses,
    getExpenses,
    addExpense,
    deleteExpense,
    updateExpense,
    replaceExpenses
  };
})(typeof self !== 'undefined' ? self : this);
