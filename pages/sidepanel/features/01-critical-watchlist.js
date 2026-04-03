﻿// =====================================================
// SIDEPANEL MAIN - Watchlist, Rendering, Reports, Integrations
// Note: Core variables, modals, and tabs loaded from separate files
// =====================================================

// --- VIP / Critical Watchlist ---
const __sidepanelConfig = typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
const DEFAULT_CRITICAL_IPS = (__sidepanelConfig && __sidepanelConfig.watchlist && Array.isArray(__sidepanelConfig.watchlist.defaultIps))
  ? [...__sidepanelConfig.watchlist.defaultIps]
  : ['166.88.54.203', '166.88.167.40', '77.76.9.250'];
const DEFAULT_CRITICAL_IP_NOTE_MAP = Object.freeze({
  '77.76.9.250': 'ايبي خاص بسيرفر الشركة',
  '188.240.63.210': 'ايبي مزود النسخ'
});
if (!DEFAULT_CRITICAL_IPS.includes('188.240.63.210')) {
  DEFAULT_CRITICAL_IPS.push('188.240.63.210');
}
const DEFAULT_CRITICAL_ACCOUNT_ITEMS = Object.freeze([
  { account: '2041233', note: 'وكيل لا يتم الحظر' },
  { account: '3348067', note: 'وكيل لا يتم الحظر' },
  { account: '2058979', note: 'وكيل لا يتم الحظر' },
  { account: '2153392', note: 'وكيل لا يتم الحظر' },
  { account: '3342008', note: 'وكيل لا يتم الحظر' },
  { account: '3332257', note: 'وكيل لا يتم الحظر' },
  { account: '2945609', note: 'وكيل لا يتم الحظر' },
  { account: '3187748', note: 'وكيل لا يتم الحظر' },
  { account: '3008530', note: 'وكيل لا يتم الحظر' },
  { account: '2074142', note: 'بعض صفقاته expert' },
  { account: '2934735', note: 'لا يتم حظر الايبي التركي' },
  { account: '2975135', note: 'مقيم بالمانيا' },
  { account: '3005420', note: 'مقيم بالمانيا' },
  { account: '2979448', note: 'مقيم بالمانيا' },
  { account: '3049338', note: 'مقيم بالمانيا' },
  { account: '3031306', note: 'مقيم بالمانيا' },
  { account: '3041333', note: 'مقيم بالمانيا' },
  { account: '3034898', note: 'العميل مقيم بالدنمارك' },
  { account: '3036560', note: 'اكسبرت' },
  { account: '3044094', note: 'اكسبرت' },
  { account: '3079967', note: 'عميل مقيم بالهند' },
  { account: '3100474', note: 'العميل مقيم ب فينزويلا' },
  { account: '3125660', note: 'مقيم في تركيا' },
  { account: '3146070', note: 'مقيم في تركيا' },
  { account: '3228868', note: 'مقيم في تركيا' },
  { account: '3236766', note: 'بعض صفقاته expert' },
  { account: '3237681', note: 'مقيم في تركيا' },
  { account: '3261443', note: 'ساكن عالحدود مع تركيا' },
  { account: '3311500', note: 'ساكن عالحدود مع تركيا' },
  { account: '3317530', note: 'ساكن عالحدود مع تركيا' },
  { account: '3338587', note: 'بعض صفقاته expert' },
  { account: '3335180', note: 'ساكن عالحدود مع تركيا' },
  { account: '3331154', note: 'اذا ايبي الماني / استريا النمسا ما ينحظر' },
  { account: '3349785', note: 'لا يتم حظر الايبي التركي' },
  { account: '3357990', note: 'بعض صفقاته expert' },
  { account: '3355764', note: 'ساكن عالحدود مع تركيا' },
  { account: '3355511', note: 'مقيم في المانيا' },
  { account: '3361081', note: 'مقيم في تركيا' },
  { account: '3360871', note: 'ip تركى لا يتم حظره' },
  { account: '3358131', note: 'بعض صفقاته expert' },
  { account: '3362504', note: 'مقيم في تركيا' },
  { account: '3362325', note: 'ساكن عالحدود مع تركيا' },
  { account: '3142464', note: 'بعض صفقاته expert' },
  { account: '3316639', note: 'مقيم في تايلاندا' }
]);
const DEFAULT_CRITICAL_ACCOUNTS = DEFAULT_CRITICAL_ACCOUNT_ITEMS.map(item => item.account);
const CRITICAL_WATCHLIST_STORAGE_KEY = (__sidepanelConfig && __sidepanelConfig.storageKeys && __sidepanelConfig.storageKeys.criticalWatchlist)
  ? __sidepanelConfig.storageKeys.criticalWatchlist
  : 'criticalWatchlist';
let criticalWatchlistState = { ips: [], accounts: [] };

function normalizeIPv4Value(raw) {
  if (typeof raw !== 'string') return null;
  const ip = raw.trim();
  if (!ip) return null;
  const octets = ip.split('.');
  if (octets.length !== 4) return null;
  if (!octets.every(o => o !== '' && /^\d+$/.test(o))) return null;
  const ok = octets.every(o => {
    const n = Number(o);
    return n >= 0 && n <= 255;
  });
  return ok ? ip : null;
}

function normalizeSevenDigitAccountValue(raw) {
  if (typeof raw !== 'string') return null;
  const acc = raw.trim();
  if (!/^\d{6,7}$/.test(acc)) return null;
  return acc;
}

function normalizeUniqueList(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function getSafeWatchlist(raw) {
  const ipsRaw = raw && Array.isArray(raw.ips) ? raw.ips : [];
  const accountsRaw = raw && Array.isArray(raw.accounts) ? raw.accounts : [];

  const ips = [];
  for (const item of ipsRaw) {
    if (typeof item === 'string') {
      const ip = normalizeIPv4Value(item);
      if (ip) ips.push({ ip, note: '' });
      continue;
    }
    if (item && typeof item === 'object') {
      const ip = normalizeIPv4Value(item.ip);
      if (!ip) continue;
      const note = typeof item.note === 'string' ? item.note.trim() : '';
      ips.push({ ip, note });
    }
  }

  const accounts = [];
  for (const item of accountsRaw) {
    if (typeof item === 'string') {
      const account = normalizeSevenDigitAccountValue(item);
      if (account) accounts.push({ account, note: '' });
      continue;
    }
    if (item && typeof item === 'object') {
      const account = normalizeSevenDigitAccountValue(item.account);
      if (!account) continue;
      const note = typeof item.note === 'string' ? item.note.trim() : '';
      accounts.push({ account, note });
    }
  }

  const ipMap = new Map();
  for (const i of ips) {
    if (!ipMap.has(i.ip)) ipMap.set(i.ip, i);
  }

  const accountMap = new Map();
  for (const a of accounts) {
    if (!accountMap.has(a.account)) accountMap.set(a.account, a);
  }

  return { ips: Array.from(ipMap.values()), accounts: Array.from(accountMap.values()) };
}

async function loadCriticalWatchlist() {
  try {
    const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
    criticalWatchlistState = getSafeWatchlist(data[CRITICAL_WATCHLIST_STORAGE_KEY] || {});
  } catch (e) {
    criticalWatchlistState = { ips: [], accounts: [] };
  }
  renderCriticalWatchlist();
}

async function saveCriticalWatchlist(nextState) {
  const safe = getSafeWatchlist(nextState);
  criticalWatchlistState = safe;
  await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: safe });
  renderCriticalWatchlist();
}

function renderCriticalWatchlist() {
  if (!criticalDefaultIpList || !criticalCustomIpList || !criticalAccountListEl) return;

  // Defaults (locked)
  criticalDefaultIpList.innerHTML = '';
  DEFAULT_CRITICAL_IPS.forEach(ip => {
    const override = (Array.isArray(criticalWatchlistState.ips) ? criticalWatchlistState.ips : [])
      .find(v => v && typeof v === 'object' && v.ip === ip);
    let existingNote = override && typeof override.note === 'string' ? override.note.trim() : '';
    const defaultNote = DEFAULT_CRITICAL_IP_NOTE_MAP[ip] || '';
    if (!existingNote && defaultNote) {
      existingNote = defaultNote;
    }

    const li = document.createElement('li');
    li.className = 'critical-watchlist-item';

    const value = document.createElement('span');
    value.className = 'critical-watchlist-value';
    value.textContent = ip;

    const noteEl = existingNote ? document.createElement('span') : null;
    if (noteEl) {
      noteEl.className = 'critical-watchlist-note';
      noteEl.textContent = existingNote;
    }

    const locked = document.createElement('span');
    locked.className = 'critical-watchlist-badge';
    locked.textContent = 'مقفول';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'critical-edit-btn';
    edit.textContent = 'تعديل الملاحظة';
    edit.addEventListener('click', async () => {
      const nextNote = await openNoteEditModal({ kind: 'IP', value: ip, note: existingNote });
      if (nextNote === null) return;
      const trimmed = String(nextNote).trim();

      const existing = Array.isArray(criticalWatchlistState.ips) ? criticalWatchlistState.ips : [];
      const filtered = existing.filter(v => !(v && typeof v === 'object' && v.ip === ip));
      const nextIps = trimmed ? filtered.concat({ ip, note: trimmed }) : filtered;
      void saveCriticalWatchlist({ ...criticalWatchlistState, ips: nextIps });
    });

    li.appendChild(value);
    if (noteEl) li.appendChild(noteEl);
    li.appendChild(locked);
    li.appendChild(edit);
    criticalDefaultIpList.appendChild(li);
  });

  // Custom IPs
  criticalCustomIpList.innerHTML = '';
  const customIps = (Array.isArray(criticalWatchlistState.ips) ? criticalWatchlistState.ips : [])
    .filter(i => i && typeof i === 'object')
    .map(i => ({ ip: normalizeIPv4Value(i.ip), note: typeof i.note === 'string' ? i.note.trim() : '' }))
    .filter(i => i.ip && !DEFAULT_CRITICAL_IPS.includes(i.ip))
    .sort((a, b) => a.ip.localeCompare(b.ip));

  if (!customIps.length) {
    const empty = document.createElement('li');
    empty.className = 'critical-watchlist-empty';
    empty.textContent = 'لا يوجد IPs مضافة حتى الآن.';
    criticalCustomIpList.appendChild(empty);
  } else {
    customIps.forEach(({ ip, note }) => {
      const li = document.createElement('li');
      li.className = 'critical-watchlist-item';

      const value = document.createElement('span');
      value.className = 'critical-watchlist-value';
      value.textContent = ip;

      const noteEl = note ? document.createElement('span') : null;
      if (noteEl) {
        noteEl.className = 'critical-watchlist-note';
        noteEl.textContent = note;
      }

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'critical-edit-btn';
      edit.textContent = 'تعديل';
      edit.addEventListener('click', async () => {
        const nextNote = await openNoteEditModal({ kind: 'IP', value: ip, note });
        if (nextNote === null) return;
        const trimmed = String(nextNote).trim();

        const existing = Array.isArray(criticalWatchlistState.ips) ? criticalWatchlistState.ips : [];
        const filtered = existing.filter(v => !(v && typeof v === 'object' && v.ip === ip));
        const nextIps = filtered.concat({ ip, note: trimmed });
        void saveCriticalWatchlist({ ...criticalWatchlistState, ips: nextIps });
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'critical-remove-btn';
      remove.innerHTML = '🗑️';
      remove.title = 'حذف';
      remove.addEventListener('click', () => {
        showDeleteConfirm('هل أنت متأكد من حذف هذا الـ IP من قائمة VIP؟', () => {
          const next = { ...criticalWatchlistState, ips: criticalWatchlistState.ips.filter(v => !(v && typeof v === 'object' && v.ip === ip)) };
          void saveCriticalWatchlist(next);
          showToast('VIP', 'تم حذف الـ IP من القائمة.', 'default');
        });
      });

      li.appendChild(value);
      if (noteEl) li.appendChild(noteEl);
      li.appendChild(edit);
      li.appendChild(remove);
      criticalCustomIpList.appendChild(li);
    });
  }
  // Accounts
  criticalAccountListEl.innerHTML = '';
  const stateAccounts = (Array.isArray(criticalWatchlistState.accounts) ? criticalWatchlistState.accounts : [])
    .filter(a => a && typeof a === 'object')
    .map(a => ({ account: normalizeSevenDigitAccountValue(a.account), note: typeof a.note === 'string' ? a.note.trim() : '' }))
    .filter(a => a.account);
  const accountNoteMap = new Map();
  stateAccounts.forEach(({ account, note }) => {
    if (!accountNoteMap.has(account)) accountNoteMap.set(account, note);
  });
  const defaultAccountSet = new Set(DEFAULT_CRITICAL_ACCOUNTS);

  DEFAULT_CRITICAL_ACCOUNT_ITEMS.forEach(({ account: acc, note: defaultNote }) => {
    const li = document.createElement('li');
    li.className = 'critical-watchlist-item';

    const value = document.createElement('span');
    value.className = 'critical-watchlist-value';
    value.textContent = acc;

    const existingNote = accountNoteMap.get(acc) || defaultNote;
    const noteEl = existingNote ? document.createElement('span') : null;
    if (noteEl) {
      noteEl.className = 'critical-watchlist-note';
      noteEl.textContent = existingNote;
    }

    const locked = document.createElement('span');
    locked.className = 'critical-watchlist-badge';
    locked.textContent = 'مقفول';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'critical-edit-btn';
    edit.textContent = 'تعديل الملاحظة';
    edit.addEventListener('click', async () => {
      const nextNote = await openNoteEditModal({ kind: 'AC', value: acc, note: existingNote });
      if (nextNote === null) return;
      const trimmed = String(nextNote).trim();

      const existing = Array.isArray(criticalWatchlistState.accounts) ? criticalWatchlistState.accounts : [];
      const filtered = existing.filter(v => !(v && typeof v === 'object' && v.account === acc));
      const nextAccounts = trimmed ? filtered.concat({ account: acc, note: trimmed }) : filtered;
      void saveCriticalWatchlist({ ...criticalWatchlistState, accounts: nextAccounts });
    });

    li.appendChild(value);
    if (noteEl) li.appendChild(noteEl);
    li.appendChild(locked);
    li.appendChild(edit);
    criticalAccountListEl.appendChild(li);
  });

  const customAccounts = Array.from(accountNoteMap.entries())
    .map(([account, note]) => ({ account, note }))
    .filter(a => !defaultAccountSet.has(a.account))
    .sort((a, b) => a.account.localeCompare(b.account));
  if (!DEFAULT_CRITICAL_ACCOUNT_ITEMS.length && !customAccounts.length) {
    const empty = document.createElement('li');
    empty.className = 'critical-watchlist-empty';
    empty.textContent = 'لا يوجد أرقام حسابات مضافة حتى الآن.';
    criticalAccountListEl.appendChild(empty);
  } else {
    customAccounts.forEach(({ account: acc, note }) => {
      const li = document.createElement('li');
      li.className = 'critical-watchlist-item';

      const value = document.createElement('span');
      value.className = 'critical-watchlist-value';
      value.textContent = acc;

      const noteEl = note ? document.createElement('span') : null;
      if (noteEl) {
        noteEl.className = 'critical-watchlist-note';
        noteEl.textContent = note;
      }

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'critical-edit-btn';
      edit.textContent = 'تعديل';
      edit.addEventListener('click', async () => {
        const nextNote = await openNoteEditModal({ kind: 'AC', value: acc, note });
        if (nextNote === null) return;
        const trimmed = String(nextNote).trim();

        const existing = Array.isArray(criticalWatchlistState.accounts) ? criticalWatchlistState.accounts : [];
        const filtered = existing.filter(v => !(v && typeof v === 'object' && v.account === acc));
        const nextAccounts = filtered.concat({ account: acc, note: trimmed });
        void saveCriticalWatchlist({ ...criticalWatchlistState, accounts: nextAccounts });
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'critical-remove-btn';
      remove.innerHTML = '🗑️';
      remove.title = 'حذف';
      remove.addEventListener('click', () => {
        showDeleteConfirm('هل أنت متأكد من حذف هذا الحساب من قائمة VIP؟', () => {
          const next = { ...criticalWatchlistState, accounts: criticalWatchlistState.accounts.filter(v => !(v && typeof v === 'object' && v.account === acc)) };
          void saveCriticalWatchlist(next);
          showToast('VIP', 'تم حذف الحساب من القائمة.', 'default');
        });
      });

      li.appendChild(value);
      if (noteEl) li.appendChild(noteEl);
      li.appendChild(edit);
      li.appendChild(remove);
      criticalAccountListEl.appendChild(li);
    });
  }
}
function addCriticalIpFromInput() {
  if (!criticalIpInput) return;
  const ip = normalizeIPv4Value(criticalIpInput.value);
  if (!ip) {
    showToast('VIP', 'صيغة IP غير صحيحة.', 'warning');
    return;
  }
  if (DEFAULT_CRITICAL_IPS.includes(ip)) {
    showToast('VIP', 'هذا الـ IP موجود ضمن القائمة الأساسية المقفولة.', 'duplicate');
    criticalIpInput.value = '';
    return;
  }
  const existing = Array.isArray(criticalWatchlistState.ips) ? criticalWatchlistState.ips : [];
  if (existing.some(v => v && typeof v === 'object' && v.ip === ip)) {
    showToast('VIP', 'هذا الـ IP مضاف بالفعل.', 'duplicate');
    criticalIpInput.value = '';
    return;
  }

  const note = criticalIpNoteInput && typeof criticalIpNoteInput.value === 'string' ? criticalIpNoteInput.value.trim() : '';
  const next = { ...criticalWatchlistState, ips: existing.concat({ ip, note }) };
  void saveCriticalWatchlist(next);
  criticalIpInput.value = '';
  if (criticalIpNoteInput) criticalIpNoteInput.value = '';
  showToast('VIP', `تمت إضافة IP: ${ip}`, 'ip');
}

function addCriticalAccountFromInput() {
  if (!criticalAccountInput) return;
  const acc = normalizeSevenDigitAccountValue(criticalAccountInput.value);
  if (!acc) {
    showToast('VIP', 'رقم الحساب لازم يكون 6 أو 7 أرقام.', 'warning');
    return;
  }
  if (DEFAULT_CRITICAL_ACCOUNTS.includes(acc)) {
    showToast('VIP', 'هذا الحساب موجود ضمن القائمة الأساسية المقفولة.', 'duplicate');
    criticalAccountInput.value = '';
    return;
  }
  const existing = Array.isArray(criticalWatchlistState.accounts) ? criticalWatchlistState.accounts : [];
  if (existing.some(v => v && typeof v === 'object' && v.account === acc)) {
    showToast('VIP', 'رقم الحساب مضاف بالفعل.', 'duplicate');
    criticalAccountInput.value = '';
    return;
  }

  const note = criticalAccountNoteInput && typeof criticalAccountNoteInput.value === 'string' ? criticalAccountNoteInput.value.trim() : '';
  const next = { ...criticalWatchlistState, accounts: existing.concat({ account: acc, note }) };
  void saveCriticalWatchlist(next);
  criticalAccountInput.value = '';
  if (criticalAccountNoteInput) criticalAccountNoteInput.value = '';
  showToast('VIP', `تمت إضافة حساب: ${acc}`, 'default');
}

if (criticalAddIpBtn) criticalAddIpBtn.addEventListener('click', addCriticalIpFromInput);
if (criticalAddAccountBtn) criticalAddAccountBtn.addEventListener('click', addCriticalAccountFromInput);

if (criticalIpInput) {
  criticalIpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCriticalIpFromInput();
  });
}

if (criticalIpNoteInput) {
  criticalIpNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCriticalIpFromInput();
  });
}

if (criticalAccountInput) {
  criticalAccountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCriticalAccountFromInput();
  });
}

if (criticalAccountNoteInput) {
  criticalAccountNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCriticalAccountFromInput();
  });
}

if (criticalClearCustomBtn) {
  criticalClearCustomBtn.addEventListener('click', () => {
    // Keep notes for default IPs/accounts, remove custom entries
    const defaultNotes = (criticalWatchlistState.ips || []).filter(v => v && typeof v === 'object' && DEFAULT_CRITICAL_IPS.includes(v.ip));
    const defaultAccountNotes = (criticalWatchlistState.accounts || []).filter(v => {
      if (!v || typeof v !== 'object') return false;
      const normalized = normalizeSevenDigitAccountValue(v.account);
      return !!normalized && DEFAULT_CRITICAL_ACCOUNTS.includes(normalized);
    });
    void saveCriticalWatchlist({ ips: defaultNotes, accounts: defaultAccountNotes });
    showToast('VIP', 'تم مسح القائمة المضافة.', 'default');
  });
}




