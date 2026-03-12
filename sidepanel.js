// =====================================================
// SIDEPANEL MAIN - Watchlist, Rendering, Reports, Integrations
// Note: Core variables, modals, and tabs loaded from separate files
// =====================================================

// --- VIP / Critical Watchlist ---
const DEFAULT_CRITICAL_IPS = ['166.88.54.203', '166.88.167.40', '77.76.9.250'];
const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';
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

    // Hardcoded default note for specific IP
    if (!existingNote && ip === '77.76.9.250') {
        existingNote = 'ال IP دة خاص ب سيرفر الشركة';
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
  const accounts = (Array.isArray(criticalWatchlistState.accounts) ? criticalWatchlistState.accounts : [])
    .filter(a => a && typeof a === 'object')
    .map(a => ({ account: normalizeSevenDigitAccountValue(a.account), note: typeof a.note === 'string' ? a.note.trim() : '' }))
    .filter(a => a.account)
    .sort((a, b) => a.account.localeCompare(b.account));
  if (!accounts.length) {
    const empty = document.createElement('li');
    empty.className = 'critical-watchlist-empty';
    empty.textContent = 'لا يوجد أرقام حسابات مضافة حتى الآن.';
    criticalAccountListEl.appendChild(empty);
  } else {
    accounts.forEach(({ account: acc, note }) => {
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
    // Keep notes for default IPs, remove custom ones
    const defaultNotes = (criticalWatchlistState.ips || []).filter(v => v && typeof v === 'object' && DEFAULT_CRITICAL_IPS.includes(v.ip));
    void saveCriticalWatchlist({ ips: defaultNotes, accounts: [] });
    showToast('VIP', 'تم مسح القائمة المضافة.', 'default');
  });
}

// --- Dark Mode & Settings ---
function applyDarkMode(isDarkMode) {
  document.body.classList.toggle('dark-mode', isDarkMode);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (timestampFormat === 'hide') return '';
  return date.toLocaleString(); // Simplified for now
}

chrome.storage.sync.get(['darkMode', 'maxAccounts', 'timestampFormat', 'filters', 'tooltipsEnabled'], (data) => {
  applyDarkMode(data.darkMode !== false);
  maxAccounts = data.maxAccounts || 50;
  timestampFormat = data.timestampFormat || 'locale';
  // Load persisted filters (accounts & ips)
  if (data.filters) {
    filterState.accounts = data.filters.accounts || filterState.accounts;
    filterState.ips = data.filters.ips || filterState.ips;
  }
  tooltipsEnabled = data.tooltipsEnabled !== false; // default true
  loadAllData();
  loadCriticalWatchlist();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.darkMode) applyDarkMode(changes.darkMode.newValue);
    if (changes.maxAccounts) maxAccounts = changes.maxAccounts.newValue;
    if (changes.timestampFormat) timestampFormat = changes.timestampFormat.newValue;
    if (changes.filters) {
      const newFilters = changes.filters.newValue;
      if (newFilters.accounts) filterState.accounts = newFilters.accounts;
      if (newFilters.ips) filterState.ips = newFilters.ips;
    }
    if (changes.tooltipsEnabled) tooltipsEnabled = changes.tooltipsEnabled.newValue !== false;
    if (changes[CRITICAL_WATCHLIST_STORAGE_KEY]) loadCriticalWatchlist();
    renderAll();
  }
  if (namespace === 'local') {
    if (changes.copiedAccounts) loadAccounts();
    if (changes.copiedIPs) loadIPs();
    if (changes.copiedCards) loadCards();
    if (changes.walletNotes) loadWallets();
  }
});

// --- Data Loading ---
async function loadAccounts() {
  const data = await chrome.storage.local.get('copiedAccounts');
  allAccounts = data.copiedAccounts || [];
  renderAccounts();
}

async function loadIPs() {
  const data = await chrome.storage.local.get('copiedIPs');
  allIPs = data.copiedIPs || [];
  renderIPs();
}

function loadAllData() {
  loadAccounts();
  loadIPs();
}

// --- Rendering ---
function renderAll() {
  renderAccounts();
  renderIPs();
}

function renderAccounts(filter = searchBar.value) {
  if (activeTab !== 'accounts') return;
  accountList.innerHTML = '';

  // Create a map to hold unique accounts and their most recent entry
  const uniqueAccountsMap = new Map();
  allAccounts.forEach(item => {
      if (!uniqueAccountsMap.has(item.account) || item.timestamp > uniqueAccountsMap.get(item.account).timestamp) {
          uniqueAccountsMap.set(item.account, item);
      }
  });

  let uniqueAccounts = Array.from(uniqueAccountsMap.values());
  
  // Sort: pinned items first, then by most recent timestamp
  uniqueAccounts.sort((a, b) => {
    // Pinned items come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // If both pinned or both not pinned, sort by timestamp
    return b.timestamp - a.timestamp;
  });

  // Apply text filter
  let filtered = uniqueAccounts.filter(item => item.account.toLowerCase().includes(filter.toLowerCase()));

  // Apply status filter (from sync storage state)
  const st = filterState.accounts.status;
  if (st === 'pinned') filtered = filtered.filter(i => i.isPinned);
  if (st === 'duplicate') filtered = filtered.filter(i => allAccounts.filter(a => a.account === i.account).length > 1);
  if (st === 'noted') filtered = filtered.filter(i => (i.notes || '').trim().length > 0);

  // Apply tag filter
  if (currentTagFilter !== 'all') {
    if (currentTagFilter === 'none') {
      filtered = filtered.filter(i => !i.tag || i.tag === 'none');
    } else {
      filtered = filtered.filter(i => i.tag === currentTagFilter);
    }
  }

  // Apply date filter (from sync storage state)
  const dt = filterState.accounts.date;
  const now = Date.now();
  const cutoffs = {
    'today': new Date(new Date().toDateString()).getTime(),
    '24h': now - 24*60*60*1000,
    '7d': now - 7*24*60*60*1000
  };
  if (dt !== 'all') {
    const cutoff = cutoffs[dt] ?? 0;
    filtered = filtered.filter(i => i.timestamp >= cutoff);
  }

  filtered.slice(0, maxAccounts).forEach(item => {
    const templateClone = accountItemTemplate.content.cloneNode(true);
    const listItem = templateClone.querySelector('li');
    const accountName = templateClone.querySelector('.account-name');
    const timestamp = templateClone.querySelector('.timestamp');
    const copyButton = templateClone.querySelector('.copy-button');
    const deleteButton = templateClone.querySelector('.delete-button');
    const notesContainer = templateClone.querySelector('.notes-container');
    const noteText = templateClone.querySelector('.note-text');
    const noteInput = templateClone.querySelector('.note-input');
    const addNoteButton = templateClone.querySelector('.add-note-button');
    const saveNoteButton = templateClone.querySelector('.save-note-button');
    const pinIcon = templateClone.querySelector('.pin-icon');
    const tagButton = templateClone.querySelector('.tag-button');
    const tagDropdown = templateClone.querySelector('.tag-dropdown');
    const tagBadge = templateClone.querySelector('.account-tag-badge');

    accountName.textContent = item.account;
    timestamp.textContent = formatTimestamp(item.timestamp);

    // Display tag badge if exists
    if (item.tag && item.tag !== 'none') {
      const tagConfig = {
        'suspicious': { text: '🔴 مشبوه', class: 'tag-suspicious' },
        'safe': { text: '🟢 آمن', class: 'tag-safe' },
        'under-review': { text: '🟡 قيد المراجعة', class: 'tag-under-review' },
        'flagged': { text: '🚩 محظور', class: 'tag-flagged' }
      };
      const config = tagConfig[item.tag];
      if (config) {
        listItem.classList.add('tagged-' + item.tag);
        if (tagBadge) {
          tagBadge.style.display = 'inline-flex';
          tagBadge.className = `account-tag-badge ${config.class}`;
          tagBadge.textContent = config.text;
        }
      }
    } else if (tagBadge) {
      tagBadge.style.display = 'none';
      tagBadge.textContent = '';
      tagBadge.className = 'account-tag-badge';
    }

    // Tooltips
    if (tooltipsEnabled) {
      pinIcon.setAttribute('title', 'تثبيت/إلغاء التثبيت');
      pinIcon.setAttribute('aria-label', 'تثبيت');
      accountName.setAttribute('title', 'عرض السجل');
      copyButton.setAttribute('title', 'نسخ');
      deleteButton.setAttribute('title', 'حذف');
      addNoteButton.setAttribute('title', 'إضافة/تعديل الملاحظة');
      saveNoteButton.setAttribute('title', 'حفظ الملاحظة');
    }

    // Handle pinned status
    if (item.isPinned) {
      listItem.classList.add('pinned');
      pinIcon.style.fill = '#f39c12';
      pinIcon.style.stroke = '#f39c12';
    } else {
      pinIcon.style.fill = 'none';
      pinIcon.style.stroke = 'currentColor';
    }

    // Pin icon click handler
    pinIcon.addEventListener('click', async () => {
      const newPinnedStatus = !item.isPinned;
      
      // Update all instances of this account
      allAccounts = allAccounts.map(acc => {
        if (acc.account === item.account) {
          return { ...acc, isPinned: newPinnedStatus };
        }
        return acc;
      });
      
      await chrome.storage.local.set({ copiedAccounts: allAccounts });
      renderAccounts(); // Re-render to update display
    });

    // Tag system handlers
    tagButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other dropdowns first
      document.querySelectorAll('.tag-dropdown').forEach(dropdown => {
        if (dropdown !== tagDropdown) {
          dropdown.style.display = 'none';
          const parentLi = dropdown.closest('li');
          if (parentLi) parentLi.classList.remove('active-dropdown-container');
        }
      });
      
      const isHidden = tagDropdown.style.display === 'none';
      tagDropdown.style.display = isHidden ? 'block' : 'none';
      
      if (isHidden) {
        listItem.classList.add('active-dropdown-container');
      } else {
        listItem.classList.remove('active-dropdown-container');
      }
    });

    const tagOptions = templateClone.querySelectorAll('.tag-option');
    tagOptions.forEach(option => {
      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        const selectedTag = option.getAttribute('data-tag');
        
        // Update all instances of this account with the new tag
        allAccounts = allAccounts.map(acc => {
          if (acc.account === item.account) {
            return { ...acc, tag: selectedTag };
          }
          return acc;
        });
        
        await chrome.storage.local.set({ copiedAccounts: allAccounts });
        tagDropdown.style.display = 'none';
        listItem.classList.remove('active-dropdown-container');
        renderAccounts();
      });
      
      // Prevent dropdown from closing when hovering over options
      option.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
      });
      
      option.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!tagButton.contains(e.target) && !tagDropdown.contains(e.target)) {
        tagDropdown.style.display = 'none';
        listItem.classList.remove('active-dropdown-container');
      }
    }, { capture: true });

    // Display existing note
    if (item.notes && item.notes.trim() !== '') {
      noteText.textContent = item.notes;
      noteText.style.display = 'block';
      addNoteButton.textContent = 'تعديل الملاحظة';
    } else {
      noteText.style.display = 'none';
      addNoteButton.textContent = 'إضافة ملاحظة';
    }

    // Check for duplicates
    const historyCount = allAccounts.filter(acc => acc.account === item.account).length;
    if (historyCount > 1) {
        listItem.classList.add('duplicate');
    }

    // History Modal click listener
    accountName.addEventListener('click', () => {
      historyContent.innerHTML = '';
      document.querySelector('#history-modal h2').innerHTML = `📋 سجل الحساب: <span style="color: #667eea;">${item.account}</span>`;
      const accountHistory = allAccounts.filter(acc => acc.account === item.account).sort((a,b) => b.timestamp - a.timestamp);
      const historyList = document.createElement('ul');
      historyList.style.listStyle = 'none';
      historyList.style.padding = '0';
      accountHistory.forEach((histItem, index) => {
        const historyItem = document.createElement('li');
        historyItem.style.padding = '12px 15px';
        historyItem.style.marginBottom = '8px';
        historyItem.style.background = index % 2 === 0 ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.1)';
        historyItem.style.borderRadius = '8px';
        historyItem.style.borderRight = '4px solid ' + (index % 2 === 0 ? '#667eea' : '#764ba2');
        historyItem.innerHTML = `<strong>${index + 1}.</strong> ${new Date(histItem.timestamp).toLocaleString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
        historyList.appendChild(historyItem);
      });
      historyContent.appendChild(historyList);
      modal.style.display = 'block';
    });

    // Copy Button
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(item.account);
        copyButton.textContent = 'تم النسخ!';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1000);
    });

    // Delete Button
    deleteButton.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف جميع سجلات الحساب ${item.account}؟`)) {
        allAccounts = allAccounts.filter(acc => acc.account !== item.account);
        await chrome.storage.local.set({ copiedAccounts: allAccounts });
      }
    });

    // Add/Edit Note Button
    addNoteButton.addEventListener('click', () => {
      noteText.style.display = 'none';
      noteInput.style.display = 'block';
      noteInput.value = item.notes || '';
      addNoteButton.style.display = 'none';
      saveNoteButton.style.display = 'inline-block';
      noteInput.focus();
    });

    // Save note function (reusable)
    const saveNote = async () => {
      const newNote = noteInput.value.trim();
      
      // Update all instances of this account with the new note
      allAccounts = allAccounts.map(acc => {
        if (acc.account === item.account) {
          return { ...acc, notes: newNote };
        }
        return acc;
      });
      
      await chrome.storage.local.set({ copiedAccounts: allAccounts });
      
      // Update UI
      item.notes = newNote;
      if (newNote !== '') {
        noteText.textContent = newNote;
        noteText.style.display = 'block';
        addNoteButton.textContent = 'تعديل الملاحظة';
      } else {
        noteText.style.display = 'none';
        addNoteButton.textContent = 'إضافة ملاحظة';
      }
      
      noteInput.style.display = 'none';
      saveNoteButton.style.display = 'none';
      addNoteButton.style.display = 'inline-block';
    };

    // Save Note Button
    saveNoteButton.addEventListener('click', saveNote);

    // Save note on Enter key
    noteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveNote();
      }
    });

    accountList.appendChild(templateClone);
  });
}

function renderIPs(filter = searchBar.value) {
  if (activeTab !== 'ips') return;
  ipList.innerHTML = '';

  // Create a map to hold unique IPs and their most recent entry to display in the list
  const uniqueIPsMap = new Map();
  allIPs.forEach(item => {
      // We want the most recent entry for each IP
      if (!uniqueIPsMap.has(item.ip) || item.timestamp > uniqueIPsMap.get(item.ip).timestamp) {
          uniqueIPsMap.set(item.ip, item);
      }
  });
  
  let uniqueIPs = Array.from(uniqueIPsMap.values());
  uniqueIPs.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent

  // Apply text filter
  let filtered = uniqueIPs.filter(item => item.ip.toLowerCase().includes(filter.toLowerCase()));

  // Apply status filter (only duplicate makes sense for IPs now)
  const st = filterState.ips.status;
  if (st === 'duplicate') filtered = filtered.filter(i => allIPs.filter(x => x.ip === i.ip).length > 1);

  // Apply date filter
  const dt = filterState.ips.date;
  const now = Date.now();
  const cutoffs = {
    'today': new Date(new Date().toDateString()).getTime(),
    '24h': now - 24*60*60*1000,
    '7d': now - 7*24*60*60*1000
  };
  if (dt !== 'all') {
    const cutoff = cutoffs[dt] ?? 0;
    filtered = filtered.filter(i => i.timestamp >= cutoff);
  }

  filtered.slice(0, maxAccounts).forEach(item => {
    const templateClone = ipItemTemplate.content.cloneNode(true);
    const listItem = templateClone.querySelector('li');
    const ipAddressSpan = templateClone.querySelector('.ip-address');
    const ipCountry = templateClone.querySelector('.ip-country');
    const ipRegion = templateClone.querySelector('.ip-region');
    const highlightBadge = templateClone.querySelector('.highlight-badge');
    const timestamp = templateClone.querySelector('.timestamp');
    const copyButton = templateClone.querySelector('.copy-button');
    const deleteButton = templateClone.querySelector('.delete-button');
    const infoButton = templateClone.querySelector('.info-button');

    ipAddressSpan.textContent = item.ip;
    ipCountry.textContent = item.country;
    
    // Show region if available
    if (item.region && item.region !== 'N/A') {
      ipRegion.textContent = `(${item.region})`;
      ipRegion.style.color = '#444';
      ipRegion.style.fontWeight = '500';
    }
    
    timestamp.textContent = formatTimestamp(item.timestamp);
    
    // Determine badge based on country/region
    const ht = item.highlightType || '';
    const lowerRegion = (item.region || '').toLowerCase();
    const lowerCity = (item.city || '').toLowerCase();
    const lowerCountry = (item.country || '').toLowerCase();
    
    // Check banned countries
    const isUK = ht === 'uk' || lowerCountry.includes('united kingdom') || lowerCountry === 'uk';
    const isNetherlands = ht === 'netherlands' || lowerCountry.includes('netherlands') || lowerCountry === 'nl';
    const isSingapore = ht === 'singapore' || lowerCountry.includes('singapore');
    const isFrance = ht === 'france' || lowerCountry.includes('france');
    const isGermany = ht === 'germany' || lowerCountry.includes('germany');
    const isCanada = ht === 'canada' || lowerCountry.includes('canada');
    const isUSA = ht === 'usa' || lowerCountry.includes('united states') || lowerCountry.includes('usa');
    const isTurkey = ht === 'turkey' || lowerCountry.includes('turkey') || lowerCountry.includes('türkiye');
    const isItaly = ht === 'italy' || lowerCountry.includes('italy') || lowerCountry.includes('italia');
    const isAustria = ht === 'austria' || lowerCountry.includes('austria');
    const isRomania = ht === 'romania' || lowerCountry.includes('romania');
    const isFinland = ht === 'finland' || lowerCountry.includes('finland');
    const isPortugal = ht === 'portugal' || lowerCountry.includes('portugal');
    const isSwitzerland = ht === 'switzerland' || lowerCountry.includes('switzerland') || lowerCountry.includes('suisse');
    const isPakistan = ht === 'pakistan' || lowerCountry.includes('pakistan');
    const isBelgium = ht === 'belgium' || lowerCountry.includes('belgium') || lowerCountry.includes('belgique');
    const isDjibouti = ht === 'djibouti' || lowerCountry.includes('djibouti');
    const isHungary = ht === 'hungary' || lowerCountry.includes('hungary');
    const isKenya = ht === 'kenya' || lowerCountry.includes('kenya');
    const isBulgaria = ht === 'bulgaria' || lowerCountry.includes('bulgaria');
    const isChina = ht === 'china' || lowerCountry.includes('china');
    const isSerbia = ht === 'serbia' || lowerCountry.includes('serbia');
    const isBannedCountry = isUK || isNetherlands || isSingapore || isFrance || isGermany || isCanada || isUSA || isTurkey || isItaly || isAustria || isRomania || isFinland || isPortugal || isSwitzerland || isPakistan || isBelgium || isDjibouti || isHungary || isKenya || isBulgaria || isChina || isSerbia;
    
    // Check if Iraqi highlighted regions with comprehensive patterns
    const isKirkuk = ht === 'kirkuk' || lowerRegion.includes('kirkuk') || lowerCity.includes('kirkuk') || lowerRegion.includes('كركوك') || lowerCity.includes('كركوك');
    const isSulaymaniyah = ht === 'sulaymaniyah' || lowerRegion.includes('sulay') || lowerCity.includes('sulay') || lowerRegion.includes('slemani') || lowerCity.includes('slemani') || lowerRegion.includes('sulaimani') || lowerCity.includes('sulaimani') || lowerRegion.includes('السلي') || lowerCity.includes('السلي') || lowerRegion.includes('السليماني') || lowerCity.includes('السليماني') || lowerRegion.includes('iraqi kurdistan') || lowerCity.includes('iraqi kurdistan');
    const isErbilRegion = ht === 'erbil' || lowerRegion.includes('erbil') || lowerCity.includes('erbil') || lowerRegion.includes('arbil') || lowerCity.includes('arbil') || lowerRegion.includes('أربيل') || lowerCity.includes('أربيل') || lowerRegion.includes('hewler') || lowerCity.includes('hewler');
    
    // Handle highlighted IPs with proper badge
    if (isBannedCountry || isKirkuk || isSulaymaniyah || isErbilRegion || item.isHighlighted || item.isErbil) {
      listItem.classList.add('erbil');
      highlightBadge.style.display = 'inline-block';
      
      // Check UK first
      if (isUK) {
        highlightBadge.textContent = '🇬🇧 UK';
        highlightBadge.title = '⚠️ هام جداً: لازم نبعت ال IP دة لمدير الشيفت';
        highlightBadge.style.background = '#1d4ed8';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('uk-highlight');
      }
      // Check Netherlands
      else if (isNetherlands) {
        highlightBadge.textContent = '🇳🇱 NL';
        highlightBadge.title = '⚠️ هام جداً: لازم نبعت ال IP دة لمدير الشيفت';
        highlightBadge.style.background = 'linear-gradient(135deg, #f97316, #2563eb)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('nl-highlight');
      }
      // Check Singapore
      else if (isSingapore) {
        highlightBadge.textContent = '🇸🇬 SG';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - سنغافورة';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#000';
        listItem.classList.add('banned-highlight');
      }
      // Check France
      else if (isFrance) {
        highlightBadge.textContent = '🇫🇷 FR';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - فرنسا';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Germany
      else if (isGermany) {
        highlightBadge.textContent = '🇩🇪 DE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - ألمانيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Canada
      else if (isCanada) {
        highlightBadge.textContent = '🇨🇦 CA';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - كندا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check USA
      else if (isUSA) {
        highlightBadge.textContent = '🇺🇸 US';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - الولايات المتحدة';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Turkey
      else if (isTurkey) {
        highlightBadge.textContent = '🇹🇷 TR';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - تركيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Italy
      else if (isItaly) {
        highlightBadge.textContent = '🇮🇹 IT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - إيطاليا';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #fff, #dc2626)';
        highlightBadge.style.color = '#000';
        listItem.classList.add('banned-highlight');
      }
      // Check Austria
      else if (isAustria) {
        highlightBadge.textContent = '🇦🇹 AT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - النمسا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Romania
      else if (isRomania) {
        highlightBadge.textContent = '🇷🇴 RO';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - رومانيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #fbbf24, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Finland
      else if (isFinland) {
        highlightBadge.textContent = '🇫🇮 FI';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - فنلندا';
        highlightBadge.style.background = 'linear-gradient(135deg, #fff, #1e40af)';
        highlightBadge.style.color = '#1e40af';
        listItem.classList.add('banned-highlight');
      }
      // Check Portugal
      else if (isPortugal) {
        highlightBadge.textContent = '🇵🇹 PT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - البرتغال';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Switzerland
      else if (isSwitzerland) {
        highlightBadge.textContent = '🇨🇭 CH';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - سويسرا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Pakistan
      else if (isPakistan) {
        highlightBadge.textContent = '🇵🇰 PK';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - باكستان';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #fff)';
        highlightBadge.style.color = '#22c55e';
        listItem.classList.add('banned-highlight');
      }
      // Check Belgium
      else if (isBelgium) {
        highlightBadge.textContent = '🇧🇪 BE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - بلجيكا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #fbbf24, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Djibouti
      else if (isDjibouti) {
        highlightBadge.textContent = '🇩🇯 DJ';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - جيبوتي';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Hungary
      else if (isHungary) {
        highlightBadge.textContent = '🇭🇺 HU';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - المجر';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff, #22c55e)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Kenya
      else if (isKenya) {
        highlightBadge.textContent = '🇰🇪 KE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - كينيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #dc2626, #22c55e)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Bulgaria
      else if (isBulgaria) {
        highlightBadge.textContent = '🇧🇬 BG';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - بلغاريا';
        highlightBadge.style.background = 'linear-gradient(135deg, #fff, #22c55e, #dc2626)';
        highlightBadge.style.color = '#22c55e';
        listItem.classList.add('banned-highlight');
      }
      // Check China
      else if (isChina) {
        highlightBadge.textContent = '🇨🇳 CN';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - الصين';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Serbia
      else if (isSerbia) {
        highlightBadge.textContent = '🇷🇸 RS';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - صربيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #1e40af, #fff)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Kirkuk
      else if (isKirkuk) {
        highlightBadge.textContent = '⭐ كركوك';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      } 
      // Check Sulaymaniyah
      else if (isSulaymaniyah) {
        highlightBadge.textContent = '⭐ السليمانية';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      } 
      // Check Erbil explicitly
      else if (isErbilRegion) {
        highlightBadge.textContent = '⭐ أربيل';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      }
      // Default fallback (old data marked as highlighted but no specific region)
      else {
        highlightBadge.textContent = '⭐ محظور';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      }
      
      highlightBadge.style.padding = '2px 8px';
      highlightBadge.style.borderRadius = '4px';
      highlightBadge.style.fontSize = '0.8em';
      highlightBadge.style.fontWeight = 'bold';
      highlightBadge.style.marginBottom = '4px';
    }

    // Tooltips
    if (tooltipsEnabled) {
      ipAddressSpan.setAttribute('title', 'عرض السجل');
      copyButton.setAttribute('title', 'نسخ');
      deleteButton.setAttribute('title', 'حذف');
      infoButton.setAttribute('title', 'عرض تفاصيل IP');
    } else {
      infoButton.removeAttribute('title');
    }

    // Check if this IP has duplicates in the full list
    const historyCount = allIPs.filter(i => i.ip === item.ip).length;
    if (historyCount > 1) {
        listItem.classList.add('duplicate');
    }

    // Modal click listener
    ipAddressSpan.style.cursor = 'pointer'; // Make it look clickable
    ipAddressSpan.addEventListener('click', () => {
      historyContent.innerHTML = '';
      document.querySelector('#history-modal h2').innerHTML = `🌐 سجل IP: <span style="color: #667eea;">${item.ip}</span>`;
      const ipHistory = allIPs.filter(i => i.ip === item.ip).sort((a,b) => b.timestamp - a.timestamp);
      const historyList = document.createElement('ul');
      historyList.style.listStyle = 'none';
      historyList.style.padding = '0';
      ipHistory.forEach((histItem, index) => {
        const historyItem = document.createElement('li');
        historyItem.style.padding = '12px 15px';
        historyItem.style.marginBottom = '8px';
        historyItem.style.background = index % 2 === 0 ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.1)';
        historyItem.style.borderRadius = '8px';
        historyItem.style.borderRight = '4px solid ' + (index % 2 === 0 ? '#667eea' : '#764ba2');
        historyItem.innerHTML = `<strong>${index + 1}.</strong> ${new Date(histItem.timestamp).toLocaleString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })} - <span style="color: #7f8c8d;">${histItem.country}</span>`;
        historyList.appendChild(historyItem);
      });
      historyContent.appendChild(historyList);
      modal.style.display = 'block';
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(item.ip);
        copyButton.textContent = 'تم النسخ!';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1000);
    });

    deleteButton.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف جميع سجلات ${item.ip}؟`)) {
        allIPs = allIPs.filter(i => i.ip !== item.ip);
        await chrome.storage.local.set({ copiedIPs: allIPs });
      }
    });

    infoButton.addEventListener('click', async () => {
      ipDetailsContent.innerHTML = 'جاري تحميل التفاصيل...'; // Loading message
      ipDetailsModal.style.display = 'block';

      try {
        const geoClient = window.IPGeoClient;
        const result = geoClient ? await geoClient.lookup(item.ip) : { success: false, error: 'IPGeoClient unavailable' };
        if (result.success) {
          ipDetailsContent.innerHTML = buildArabicDetailHTML(result.data);
        } else if (result.error) {
          ipDetailsContent.innerHTML = `خطأ: ${result.error}`;
        } else {
          ipDetailsContent.innerHTML = 'تعذر استرداد معلومات IP.';
        }
      } catch (error) {
        ipDetailsContent.innerHTML = `خطأ: ${error.message}`;
      }
    });

    ipList.appendChild(templateClone);
  });
}

// --- Delegated UI wiring lives in sidepanel-tabs.js / sidepanel-modals.js ---

// Initial data load (tab selection is triggered once at file end)
loadAllData();

// Listen for toast notifications from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('Sidepanel received message:', message);

  if (activeTab === 'transfer-report' && message.type === 'showToast') {
    return;
  }

  if (message.type === 'showToast') {
    console.log('Showing toast with title:', message.title);
    showToast(message.title, message.message, message.toastType);
  } else if (message.type === 'tooltipsToggled') {
    try {
      tooltipsEnabled = !!message.enabled;
      renderAll();
    } catch (e) {
      console.warn('tooltipsToggled handler error', e);
    }
  }
});
// --- Sound Effects ---
function playWarningSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Alarm sound: High-Low-High-Low
    const now = ctx.currentTime;
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(440, now + 0.2); // A4
    osc.frequency.setValueAtTime(880, now + 0.4); // A5
    osc.frequency.setValueAtTime(440, now + 0.6); // A4
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  } catch (e) {
    console.error('Audio play failed', e);
  }
}

// --- Profit Calculator Functionality ---
calculateProfitBtn.addEventListener('click', () => {
  const tradesText = tradesInput.value.trim();
  
  if (!tradesText) {
    showToast('خطأ', 'الرجاء إدخال الصفقات أولاً', 'duplicate');
    return;
  }
  
  try {
    const trades = parseTradesText(tradesText);
    
    // Filter trades for profit calculation (exclude Balance transfers)
    const tradingTrades = trades.filter(t => !t.isBalance);
    displayProfitResults(tradingTrades);
    
    // Check for suspicious pattern using ALL trades (including Balance)
    const patterns = detectSuspiciousPatterns(trades);
    if (patterns.length > 0) {
      playWarningSound();
      showToast('تحذير أمني', `تم اكتشاف ${patterns.length} حالات تداول مشبوهة!`, 'warning');
      
      // Show the report modal
      showSuspiciousReport(patterns);
    }

  } catch (error) {
    showToast('خطأ', 'حدث خطأ في تحليل الصفقات. تأكد من صحة التنسيق', 'duplicate');
    console.error('Error parsing trades:', error);
  }
});

// Paste from clipboard button
pasteFromClipboardBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      tradesInput.value = text;
      showToast('نجح!', 'تم لصق الصفقات من Clipboard', 'default');
    } else {
      showToast('تنبيه', 'الـ Clipboard فارغ', 'duplicate');
    }
  } catch (error) {
    showToast('خطأ', 'لا يمكن الوصول إلى Clipboard', 'duplicate');
    console.error('Clipboard error:', error);
  }
});

// Clear input button
clearInputBtn.addEventListener('click', () => {
  tradesInput.value = '';
  profitResults.style.display = 'none';
  showToast('تم', 'تم مسح المحتوى', 'default');
});

function parseTradesText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const trades = [];
  
  for (const line of lines) {
    // Split by tabs or multiple spaces
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) continue;

    const type = parts[2];

    if (type === 'Balance') {
        // Handle Balance transaction
        let amount = 0;
        let comment = '';
        
        // Iterate backwards to find the first number which is likely the amount
        for (let i = parts.length - 1; i >= 3; i--) {
            const val = parseFloat(parts[i]);
            if (!isNaN(val) && parts[i].match(/^-?\d+\.?\d*$/)) {
                amount = val;
                comment = parts.slice(i + 1).join(' ');
                break;
            }
        }

        trades.push({
            date: parts[0] || '',
            ticket: parts[1] || '',
            type: 'Balance',
            volume: '',
            symbol: '',
            openPrice: '',
            closePrice: '',
            profit: amount, // Using profit field for amount
            comment: comment,
            isBalance: true
        });

    } else if (parts.length >= 10) {
      // Check if last column is a number (profit) or text (comment)
      const lastCol = parts[parts.length - 1];
      const lastColValue = parseFloat(lastCol);
      
      // If last column is NOT a valid number, it's a comment (deposit/withdrawal/transfer)
      // Skip these lines completely
      if (isNaN(lastColValue) || !lastCol.match(/^-?\d+\.?\d*$/)) {
        continue; // Skip this line - it's not a real trade
      }
      
      // If last column IS a number, it's the profit
      const profit = lastColValue;
      
      if (profit !== null && !isNaN(profit)) {
        trades.push({
          date: parts[0] || '',
          ticket: parts[1] || '',
          type: parts[2] || '',
          volume: parts[3] || '',
          symbol: parts[4] || '',
          openPrice: parts[5] || '',
          closePrice: parts[9] || '',
          profit: profit,
          isBalance: false
        });
      }
    }
  }
  
  return trades;
}

function detectSuspiciousPatterns(trades) {
  const patterns = [];
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.date.replace(/\./g, '-'));
    const dateB = new Date(b.date.replace(/\./g, '-'));
    return dateA - dateB;
  });

  for (let i = 0; i < sortedTrades.length; i++) {
    const tWithdrawal = sortedTrades[i];
    
    if (tWithdrawal.isBalance && tWithdrawal.profit < 0) {
        let patternFound = false;

        // Check Pattern 1: Market Test (Loss -> Win Opposite -> Withdrawal)
        if (i >= 2) {
            const tWin = sortedTrades[i-1];
            const tLoss = sortedTrades[i-2];
            
            if (!tWin.isBalance && tWin.profit > 0 && 
                !tLoss.isBalance && tLoss.profit < 0) {
                 
                 const isOpposite = (tLoss.type === 'Buy' && tWin.type === 'Sell') || (tLoss.type === 'Sell' && tWin.type === 'Buy');
                 if (isOpposite) {
                     patterns.push({
                         type: 'market_test',
                         lossTrade: tLoss,
                         winTrade: tWin,
                         withdrawal: tWithdrawal
                     });
                     patternFound = true;
                 }
            }
        }
        
        if (patternFound) continue;

        // Check Pattern 2: Quick Profit (Win(s) -> Withdrawal)
        if (i >= 1) {
            const tPrev = sortedTrades[i-1];
            if (!tPrev.isBalance && tPrev.profit > 0) {
                const winningTrades = [];
                let k = i - 1;
                while (k >= 0) {
                    const t = sortedTrades[k];
                    if (!t.isBalance && t.profit > 0) {
                        winningTrades.unshift(t);
                    } else {
                        break;
                    }
                    k--;
                }
                
                patterns.push({
                    type: 'quick_profit',
                    trades: winningTrades,
                    withdrawal: tWithdrawal
                });
            }
        }
    }
  }
  return patterns;
}

function showSuspiciousReport(patterns) {
  const modal = document.getElementById('suspicious-modal');
  const list = document.getElementById('suspicious-list');
  const closeBtn = document.getElementById('suspicious-close');
  
  list.innerHTML = '';
  
  patterns.forEach((p, index) => {
    const item = document.createElement('div');
    item.className = 'suspicious-item';
    
    if (p.type === 'market_test') {
        item.innerHTML = `
          <div class="suspicious-header">
            <span class="suspicious-badge">حالة #${index + 1} (اختبار السوق)</span>
            <span class="timestamp">${p.lossTrade.date.split(' ')[0]}</span>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">📉</div>
            <div class="step-details">
              <span class="step-title">1. اختبار السوق (خسارة)</span>
              <div class="step-info">
                ${p.lossTrade.type} ${p.lossTrade.volume} | ${p.lossTrade.symbol}<br>
                <span class="suspicious-profit-loss loss-text">${p.lossTrade.profit}</span>
              </div>
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">📈</div>
            <div class="step-details">
              <span class="step-title">2. صفقة عكسية (ربح)</span>
              <div class="step-info">
                ${p.winTrade.type} ${p.winTrade.volume} | ${p.winTrade.symbol}<br>
                <span class="suspicious-profit-loss win-text">+${p.winTrade.profit}</span>
              </div>
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💸</div>
            <div class="step-details">
              <span class="step-title">3. سحب الأرباح</span>
              <div class="step-info">
                ${p.withdrawal.date}<br>
                <span class="suspicious-profit-loss withdraw-text">${p.withdrawal.profit}</span><br>
                <small>${p.withdrawal.comment || ''}</small>
              </div>
            </div>
          </div>
        `;
    } else if (p.type === 'quick_profit') {
        const tradesHtml = p.trades.map(t => `
            <div class="step-info" style="margin-bottom: 4px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                ${t.date.split(' ')[1]} | ${t.type} ${t.volume} | ${t.symbol}<br>
                <span class="suspicious-profit-loss win-text">+${t.profit}</span>
            </div>
        `).join('');

        item.innerHTML = `
          <div class="suspicious-header">
            <span class="suspicious-badge" style="background: #f39c12;">حالة #${index + 1} (سحب أرباح سريع)</span>
            <span class="timestamp">${p.withdrawal.date.split(' ')[0]}</span>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💰</div>
            <div class="step-details">
              <span class="step-title">1. صفقات رابحة (${p.trades.length})</span>
              ${tradesHtml}
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💸</div>
            <div class="step-details">
              <span class="step-title">2. سحب الأرباح</span>
              <div class="step-info">
                ${p.withdrawal.date}<br>
                <span class="suspicious-profit-loss withdraw-text">${p.withdrawal.profit}</span><br>
                <small>${p.withdrawal.comment || ''}</small>
              </div>
            </div>
          </div>
        `;
    }
    
    list.appendChild(item);
  });
  
  modal.style.display = 'block';
  
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  }
  
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  }
}

function displayProfitResults(trades) {
  if (trades.length === 0) {
    showToast('تنبيه', 'لم يتم العثور على صفقات صحيحة', 'duplicate');
    return;
  }

  // 1. Setup Filters
  const filterContainer = document.getElementById('symbol-filter-buttons');
  if (filterContainer) {
    filterContainer.innerHTML = '';
    
    // Get unique symbols
    const symbols = [...new Set(trades.map(t => t.symbol).filter(s => s))].sort();
    
    // Create Select Dropdown
    const select = document.createElement('select');
    select.className = 'profit-filter-select';
    
    // "All" Option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'عرض الكل';
    select.appendChild(allOption);
    
    // Symbol Options
    symbols.forEach(sym => {
      const option = document.createElement('option');
      option.value = sym;
      option.textContent = sym;
      select.appendChild(option);
    });
    
    // Handle Change
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'all') {
        renderProfitView(trades);
      } else {
        const filtered = trades.filter(t => t.symbol === val);
        renderProfitView(filtered);
      }
    });
    
    filterContainer.appendChild(select);
  }

  // 2. Initial Render
  renderProfitView(trades);
  
  // Show results
  profitResults.style.display = 'block';
  
  // Smooth scroll to results
  setTimeout(() => {
    profitResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
  
  showToast('نجح!', `تم حساب profit لـ ${trades.length} صفقة`, 'default');
}

function renderProfitView(trades) {
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalLots = trades.reduce((sum, trade) => sum + (parseFloat(trade.volume) || 0), 0);
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const losingTrades = trades.filter(t => t.profit < 0).length;
  
  // Update summary
  document.getElementById('trades-count').textContent = trades.length;
  document.getElementById('total-lots').textContent = totalLots.toFixed(2);
  document.getElementById('winning-trades').textContent = winningTrades;
  document.getElementById('losing-trades').textContent = losingTrades;
  document.getElementById('total-profit').textContent = totalProfit.toFixed(2);
  
  // Update profit display color based on value
  const totalProfitElement = document.querySelector('.total-profit .stat-value');
  if (totalProfit > 0) {
    totalProfitElement.style.color = '#10b981';
  } else if (totalProfit < 0) {
    totalProfitElement.style.color = '#ef4444';
  } else {
    totalProfitElement.style.color = '#6b7280';
  }
  
  // Display trades details (newest first)
  const tradesList = document.getElementById('trades-list');
  tradesList.innerHTML = '';
  
  // Get today's date in YYYY.MM.DD format
  const today = new Date();
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  
  // Separate trades into today's trades and other trades
  const todayTrades = trades.filter(t => t.date.startsWith(todayStr));
  const otherTrades = trades.filter(t => !t.date.startsWith(todayStr));
  
  // Reverse both arrays to show newest first within each group
  todayTrades.reverse();
  otherTrades.reverse();
  
  // Combine: today's trades first, then other trades
  const sortedTrades = [...todayTrades, ...otherTrades];
  
  sortedTrades.forEach((trade, index) => {
    const tradeItem = document.createElement('div');
    tradeItem.className = 'trade-item';
    
    // Check if trade is from today
    const isToday = trade.date.startsWith(todayStr);
    if (isToday) {
      tradeItem.classList.add('trade-today');
    }
    
    const profitColor = trade.profit > 0 ? '#10b981' : trade.profit < 0 ? '#ef4444' : '#6b7280';
    const profitSign = trade.profit > 0 ? '+' : '';
    
    tradeItem.innerHTML = `
      <div class="trade-header">
        <span class="trade-number">#${index + 1}</span>
        <span class="trade-symbol">${trade.symbol || trade.type}</span>
        <span class="trade-profit" style="color: ${profitColor}; font-weight: bold;">${profitSign}${trade.profit.toFixed(2)}</span>
        ${isToday ? '<span class="today-badge">اليوم</span>' : ''}
      </div>
      <div class="trade-info">
        <span>${trade.type} ${trade.volume}</span>
        <span>${trade.date}</span>
      </div>
    `;
    
    tradesList.appendChild(tradeItem);
  });
}

// --- Wallets Logic ---
let allWallets = {};

const clearAllWalletsBtn = document.getElementById('clear-all-wallets-btn');
if (clearAllWalletsBtn) {
  clearAllWalletsBtn.addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من مسح جميع سجلات المحافظ؟\nسيتم حذف جميع الملاحظات المحفوظة.')) {
      await chrome.storage.local.remove('walletNotes');
      loadWallets();
      showToast('تم المسح', 'تم حذف جميع المحافظ بنجاح', 'default');
    }
  });
}

async function loadWallets() {
  const data = await chrome.storage.local.get('walletNotes');
  allWallets = data.walletNotes || {};
  renderWallets();
}

function renderWallets(filter = searchBar.value) {
  if (activeTab !== 'wallets') return;
  walletsContainer.innerHTML = '';

  const addresses = Object.keys(allWallets);

  if (addresses.length === 0) {
    walletsContainer.innerHTML = '<div class="empty-state" style="text-align:center;padding:20px;color:#888;">لا توجد محافظ محفوظة حالياً</div>';
    return;
  }

  // Filter addresses
  const filteredAddresses = addresses.filter(addr => addr.toLowerCase().includes(filter.toLowerCase()));

  filteredAddresses.forEach(address => {
    const note = allWallets[address];
    const item = document.createElement('div');
    item.className = 'wallet-item';
    item.style.cssText = 'background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;';
    
    item.innerHTML = `
      <div class="wallet-info" style="flex-grow:1;overflow:hidden;">
        <div class="wallet-address" style="font-family:monospace;font-weight:bold;color:#2c3e50;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${address}">${address}</div>
        <div class="wallet-note" style="color:#666;font-size:0.9em;">📝 ${note}</div>
      </div>
      <button class="delete-wallet-btn" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px;" title="حذف">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    `;
    
    const deleteBtn = item.querySelector('.delete-wallet-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm('هل أنت متأكد من حذف هذه المحفظة؟')) {
        delete allWallets[address];
        await chrome.storage.local.set({ walletNotes: allWallets });
        renderWallets(searchBar.value);
      }
    });

    walletsContainer.appendChild(item);
  });
}

// --- Transfer Report Logic ---

async function fetchIpInfo(ip) {
  if (!ip) return false;
  try {
    const geoClient = window.IPGeoClient;
    const result = geoClient
      ? await (geoClient.lookupWithRetry
        ? geoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120 })
        : geoClient.lookup(ip))
      : { success: false, error: 'IPGeoClient unavailable' };
    if (result.success) {
      const display = geoClient.toCountryDisplay(result.data, 'Unknown');
      reportCountryInput.value = display;
      if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
      if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
        return geoClient.isCountryTextResolved(display);
      }
      return !!display && display !== 'Unknown' && display !== 'Error';
    }

    console.warn('IP lookup failed:', result.error);
    reportCountryInput.value = 'Unknown';
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
    return false;
  } catch (error) {
    console.error('Error fetching IP info:', error);
    reportCountryInput.value = 'Error';
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
    return false;
  }
}

async function ensureCountryForInputs(ipInputEl, countryInputEl, fetcherFn, normalizeIpFn) {
  if (!ipInputEl || !countryInputEl || typeof fetcherFn !== 'function') return false;

  const rawIp = (ipInputEl.value || '').trim();
  if (!rawIp) return false;

  let cleanIp = rawIp;
  const extracted = rawIp.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (extracted && extracted[0]) cleanIp = extracted[0];
  if (typeof normalizeIpFn === 'function') {
    const normalized = normalizeIpFn(rawIp);
    if (!normalized) return false;
    cleanIp = normalized;
  } else if (window.IPGeoClient && typeof window.IPGeoClient.normalizeIPv4 === 'function') {
    const normalized = window.IPGeoClient.normalizeIPv4(rawIp);
    if (normalized) cleanIp = normalized;
  }

  if (cleanIp !== rawIp) ipInputEl.value = cleanIp;

  const geoClient = window.IPGeoClient;
  const currentCountry = (countryInputEl.value || '').trim();
  if (geoClient && typeof geoClient.isCountryTextResolved === 'function' && geoClient.isCountryTextResolved(currentCountry)) {
    return true;
  }

  const ok = await fetcherFn(cleanIp);
  if (ok) return true;

  const finalCountry = (countryInputEl.value || '').trim();
  if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
    return geoClient.isCountryTextResolved(finalCountry);
  }
  return !!finalCountry && finalCountry !== 'Unknown' && finalCountry !== 'Error';
}

// Auto-fill IP Country & Navigation
if (reportIpInput) {
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  // Fetch on blur (manual typing)
  reportIpInput.addEventListener('blur', () => {
    const val = reportIpInput.value.trim();
    const cleanIp = extractIp(val);
    
    if (cleanIp) {
      if (cleanIp !== val) reportIpInput.value = cleanIp;
      fetchIpInfo(cleanIp);
    } else if (val !== '') {
      // Check if it's Account or Email
      if (isAccount(val)) {
        reportAccountInput.value = val;
        reportIpInput.value = '';
        showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        reportAccountInput.focus();
      } else if (isEmail(val)) {
        reportEmailInput.value = val;
        reportIpInput.value = '';
        showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
        reportEmailInput.focus();
      } else {
        showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
      }
    }
  });

  // Fetch and Auto-advance on paste
  reportIpInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      const val = reportIpInput.value.trim();
      const cleanIp = extractIp(val);
      
      if (cleanIp) {
        reportIpInput.value = cleanIp;
        fetchIpInfo(cleanIp);
        reportAccountInput.focus();
      } else if (val !== '') {
        if (isAccount(val)) {
          reportAccountInput.value = val;
          reportIpInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
          reportAccountInput.focus();
        } else if (isEmail(val)) {
          reportEmailInput.value = val;
          reportIpInput.value = '';
          showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
          reportEmailInput.focus();
        } else {
          reportIpInput.value = '';
          showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
        }
      }
    }, 10);
  });

  // Enter key navigation
  reportIpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportAccountInput.focus();
    }
  });
}

// Email Filtering
if (reportEmailInput) {
  const extractEmail = (text) => {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  };
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  reportEmailInput.addEventListener('blur', () => {
    const val = reportEmailInput.value.trim();
    const cleanEmail = extractEmail(val);
    
    if (cleanEmail) {
      if (cleanEmail !== val) reportEmailInput.value = cleanEmail;
    } else if (val !== '') {
      if (isAccount(val)) {
        reportAccountInput.value = val;
        reportEmailInput.value = '';
        showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        reportAccountInput.focus();
      } else if (extractIp(val)) {
        const ip = extractIp(val);
        reportIpInput.value = ip;
        reportEmailInput.value = '';
        fetchIpInfo(ip);
        showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
        reportIpInput.focus();
      } else {
        showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
      }
    }
  });

  reportEmailInput.addEventListener('paste', () => {
    setTimeout(() => {
      const val = reportEmailInput.value.trim();
      const cleanEmail = extractEmail(val);
      
      if (cleanEmail) {
        reportEmailInput.value = cleanEmail;
        // Auto advance logic if needed
      } else if (val !== '') {
        if (isAccount(val)) {
          reportAccountInput.value = val;
          reportEmailInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
          reportAccountInput.focus();
        } else if (extractIp(val)) {
          const ip = extractIp(val);
          reportIpInput.value = ip;
          reportEmailInput.value = '';
          fetchIpInfo(ip);
          showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
          reportIpInput.focus();
        } else {
          reportEmailInput.value = '';
          showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
        }
      }
    }, 10);
  });
}

// Source Custom Input Toggle
if (reportSourceInput && reportSourceCustomInput) {
  reportSourceInput.addEventListener('change', () => {
    if (reportSourceInput.value === 'Other') {
      reportSourceCustomInput.style.display = 'block';
      reportSourceCustomInput.focus();
    } else {
      reportSourceCustomInput.style.display = 'none';
    }
  });
}

// Profits Custom Input Toggle
if (reportProfitsInput && reportProfitsCustomInput) {
  reportProfitsInput.addEventListener('change', () => {
    if (reportProfitsInput.value === 'Other') {
      reportProfitsCustomInput.style.display = 'block';
      reportProfitsCustomInput.focus();
    } else {
      reportProfitsCustomInput.style.display = 'none';
    }
  });
}

// Generate and Copy Report
if (generateReportBtn) {
  generateReportBtn.addEventListener('click', async () => {
    const hasIpBeforeCopy = !!reportIpInput.value.trim();
    if (hasIpBeforeCopy) {
      const countryReady = await ensureCountryForInputs(
        reportIpInput,
        reportCountryInput,
        fetchIpInfo,
        window.IPGeoClient && window.IPGeoClient.normalizeIPv4
          ? window.IPGeoClient.normalizeIPv4
          : null
      );
      if (!countryReady) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
        return;
      }
    }

    const ip = reportIpInput.value.trim();
    const country = reportCountryInput.value.trim();
    const account = reportAccountInput.value.trim();
    const email = reportEmailInput.value.trim();
    let source = reportSourceInput.value;
    if (source === 'Other' && reportSourceCustomInput) {
      source = reportSourceCustomInput.value.trim() || 'Other';
    }
    let profits = reportProfitsInput.value;
    if (profits === 'Other' && reportProfitsCustomInput) {
      profits = reportProfitsCustomInput.value.trim() || 'Other';
    }
    const notes = reportNotesInput.value.trim();

    const report = `تقرير تحويل الحسابات

ip country: ${country}
IP: ${ip}
الإيميل: ${email}
رقم الحساب: ${account}
مصدر التحويل: ${source}
الارباح: ${profits}
الملاحظات: ${notes}

#account_transfer`;

    try {
      await navigator.clipboard.writeText(report);
      showToast('تم النسخ', 'تم نسخ التقرير إلى الحافظة', 'default');
    } catch (err) {
      console.error('Failed to copy report:', err);
      showToast('خطأ', 'فشل نسخ التقرير', 'warning');
    }
  });
}

// Reset Report Form
if (resetReportBtn) {
  resetReportBtn.addEventListener('click', () => {
    if (reportIpInput) reportIpInput.value = '';
    if (reportCountryInput) reportCountryInput.value = '';
    if (reportAccountInput) reportAccountInput.value = '';
    if (reportEmailInput) reportEmailInput.value = '';
    if (reportSourceInput) reportSourceInput.value = 'suspicious traders';
    if (reportProfitsInput) reportProfitsInput.value = 'ارباح بالسالب';
    if (reportProfitsCustomInput) {
        reportProfitsCustomInput.value = '';
        reportProfitsCustomInput.style.display = 'none';
    }
    if (document.getElementById('report-old-group')) document.getElementById('report-old-group').value = '';
    if (document.getElementById('report-new-group')) document.getElementById('report-new-group').value = '';
    if (reportNotesInput) reportNotesInput.value = '';
    
    // Reset Shift (Auto Detect)
    if (typeof autoDetectShift === 'function') {
      autoDetectShift();
    } else {
      // Fallback if function not ready
      const reportShiftInput = document.getElementById('report-shift');
      const shiftBtns = document.querySelectorAll('#transfer-report-section .shift-btn:not(.deposit-shift-btn):not(.credit-out-shift-btn)');
      if (reportShiftInput) reportShiftInput.value = '';
      if (shiftBtns) shiftBtns.forEach(b => b.classList.remove('active'));
    }
    
    // Reset Mentions
    const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
    const mentionBatoulBtn = document.getElementById('mention-batoul-btn');
    if (mentionAhmedBtn) mentionAhmedBtn.classList.remove('active');
    if (mentionBatoulBtn) mentionBatoulBtn.classList.remove('active');

    // Reset Images
    selectedImages = [];
    renderImagePreviews();
    
    showToast('تم إعادة التعيين', 'تم مسح جميع الحقول', 'default');
  });
}

if (reportAccountInput) {
  // Helper to check if text is email
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  // Helper to check if text is valid account (6 or 7 digits)
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());
  // Helper to check if text is IP
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };

  // Handle Paste
  reportAccountInput.addEventListener('paste', (e) => {
    // We use setTimeout to get the value AFTER paste
    setTimeout(() => {
      const val = reportAccountInput.value.trim();
      
      if (isEmail(val)) {
        // It's an email! Move it.
        reportEmailInput.value = val;
        reportAccountInput.value = '';
        showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل الإيميل لحقله المخصص', 'warning');
        reportEmailInput.focus(); // Focus email field
      } else if (extractIp(val)) {
        // It's an IP! Move it.
        const ip = extractIp(val);
        reportIpInput.value = ip;
        reportAccountInput.value = '';
        fetchIpInfo(ip);
        showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل IP لحقله المخصص', 'warning');
        reportIpInput.focus();
      } else if (isAccount(val)) {
        // Valid account, just auto-advance
        reportEmailInput.focus();
      } else {
        // Invalid account format
        if (val !== '') {
           reportAccountInput.value = '';
           showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
        }
      }
    }, 10);
  });

  // Handle Blur (Validation)
  reportAccountInput.addEventListener('blur', () => {
      const val = reportAccountInput.value.trim();
      if (val !== '' && !isAccount(val)) {
          // Check if it's an email that was typed manually?
          if (isEmail(val)) {
              reportEmailInput.value = val;
              reportAccountInput.value = '';
              showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل الإيميل لحقله المخصص', 'warning');
          } else if (extractIp(val)) {
              const ip = extractIp(val);
              reportIpInput.value = ip;
              reportAccountInput.value = '';
              fetchIpInfo(ip);
              showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل IP لحقله المخصص', 'warning');
          } else {
              reportAccountInput.value = '';
              showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
          }
      }
  });

  reportAccountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportEmailInput.focus();
    }
  });
}

if (reportEmailInput) {
  // Auto-advance on paste
  reportEmailInput.addEventListener('paste', () => {
    setTimeout(() => {
      reportSourceInput.focus();
    }, 10);
  });

  reportEmailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportSourceInput.focus();
    }
  });
}

if (reportSourceInput) {
  reportSourceInput.addEventListener('change', () => {
    // reportNotesInput.focus(); // Removed to prevent auto-opening notes modal
  });
  // Also support Enter key to move to notes if user just tabs to it and presses Enter
  reportSourceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // reportNotesInput.focus(); // Removed to prevent auto-opening notes modal
    }
  });
}

// --- Saved Notes Modal Logic ---
const savedNotesModal = document.getElementById('saved-notes-modal');
const savedNotesList = document.getElementById('saved-notes-list');
const newNoteInput = document.getElementById('new-note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const savedNotesCloseBtn = document.getElementById('saved-notes-close');

let savedNotes = [];
const DEFAULT_REPORT_NOTE_TEMPLATES = [
  'تم تحويل الحساب تلقائيا من الاداة الى B1 Clients كون IP متغاير وتم مطابقته بالنظام ارباح العميل بالسالب',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان العميل يستخدم ip من كركوك وغير محظور',
  'تم تحويل الحساب الى   Standard Bonus كونه يعتمد اسلوب صفقات بسعر افتتاح مساوي  لسعر وقف الخسارة بالصفقات المغلقة من خلال اوامر معلقة',
  'تم تحويل الحساب الى Standard Bonus بسبب ان الارباح تجاوزت 100$',
  'تم اعادة الحساب الى B1 لانه مطابق اكثر من اسبوع',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان ارباح العميل خلال اخر اسبوع 1,821$ والكلية بالموجب'
];

// Load notes from storage
async function loadSavedNotes() {
  const result = await chrome.storage.local.get(['transferReportNotes']);
  const storedNotes = Array.isArray(result.transferReportNotes) ? result.transferReportNotes : [];
  savedNotes = storedNotes.length ? storedNotes : [...DEFAULT_REPORT_NOTE_TEMPLATES];
  if (!storedNotes.length) {
    await chrome.storage.local.set({ transferReportNotes: savedNotes });
  }
  renderSavedNotes();
}

// Render notes list
function renderSavedNotes() {
  savedNotesList.innerHTML = '';
  savedNotes.forEach((note, index) => {
    const li = document.createElement('li');
    li.className = 'saved-note-item';
    li.innerHTML = `
      <span class="saved-note-text">${note}</span>
      <div class="saved-note-actions">
        <button class="saved-note-btn edit" title="تعديل">✏️</button>
        <button class="saved-note-btn delete" title="حذف">🗑️</button>
      </div>
    `;

    // Click on text to select note
    li.querySelector('.saved-note-text').addEventListener('click', () => {
      reportNotesInput.value = note;
      savedNotesModal.style.display = 'none';
    });

    li.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const next = prompt('تعديل الملاحظة:', note);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        showToast('تنبيه', 'لا يمكن حفظ ملاحظة فارغة', 'warning');
        return;
      }
      savedNotes[index] = trimmed;
      saveNotesToStorage();
      renderSavedNotes();
    });

    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
      savedNotes.splice(index, 1);
      saveNotesToStorage();
      renderSavedNotes();
    });

    savedNotesList.appendChild(li);
  });
}

// Save to storage
function saveNotesToStorage() {
  chrome.storage.local.set({ transferReportNotes: savedNotes });
}

// Add new note
if (addNoteBtn) {
  addNoteBtn.addEventListener('click', () => {
    const text = (newNoteInput?.value || '').trim();
    if (!text) {
      showToast('تنبيه', 'الرجاء إدخال ملاحظة', 'warning');
      return;
    }
    savedNotes.push(text);
    saveNotesToStorage();
    renderSavedNotes();
    if (newNoteInput) newNoteInput.value = '';
  });
}

// Open modal on focus ONLY if empty
if (reportNotesInput) {
  reportNotesInput.addEventListener('focus', () => {
    if (reportNotesInput.value.trim() === '') {
      loadSavedNotes();
      savedNotesModal.style.display = 'block';
    }
  });
}

// Manual open button
const openNotesModalBtn = document.getElementById('open-notes-modal-btn');
if (openNotesModalBtn) {
  openNotesModalBtn.addEventListener('click', () => {
    loadSavedNotes();
    savedNotesModal.style.display = 'block';
  });
}

// Close modal
if (savedNotesCloseBtn) {
  savedNotesCloseBtn.addEventListener('click', () => {
    savedNotesModal.style.display = 'none';
  });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === savedNotesModal) {
    savedNotesModal.style.display = 'none';
  }
  if (event.target === telegramSettingsModal) {
    telegramSettingsModal.style.display = 'none';
  }
  if (event.target === googleFormSettingsModal) {
    googleFormSettingsModal.style.display = 'none';
  }
});

// --- Google Form Integration ---
const googleFormSettingsBtn = document.getElementById('google-form-settings-btn');
const googleFormSettingsModal = document.getElementById('google-form-settings-modal');
const googleFormSettingsClose = document.getElementById('google-form-settings-close');
const saveGoogleFormSettingsBtn = document.getElementById('save-google-form-settings');
const googleFormEnableCheckbox = document.getElementById('google-form-enable');
const googleFormUrlInput = document.getElementById('google-form-url');
const entryIpInput = document.getElementById('entry-ip');
const entryCountryInput = document.getElementById('entry-country');
const entryAccountInput = document.getElementById('entry-account');
const entryEmailInput = document.getElementById('entry-email');
const entryEmployeeInput = document.getElementById('entry-employee');
const entryShiftInput = document.getElementById('entry-shift');
const entrySourceInput = document.getElementById('entry-source');
const entryProfitsInput = document.getElementById('entry-profits');
const entryOldGroupInput = document.getElementById('entry-old-group');
const entryNewGroupInput = document.getElementById('entry-new-group');
const entryNotesInput = document.getElementById('entry-notes');

// Constants for Google Form (Extracted from user link)
const DEFAULT_GF_URL = 'https://script.google.com/macros/s/AKfycbyBv0x_fzNTvgOQPD-CHlYPInx3L15Em22vKLhpS5MSVzz748DQRMGBtsQCURjTfvVn/exec';
const DEFAULT_GF_IP = 'entry.529442460';
const DEFAULT_GF_COUNTRY = ''; // Merged with IP
const DEFAULT_GF_ACCOUNT = 'entry.792356739';
const DEFAULT_GF_EMAIL = 'entry.1006175456';
const DEFAULT_GF_EMPLOYEE = 'entry.2019293497';
const DEFAULT_GF_SHIFT = 'entry.746348465';
const DEFAULT_GF_SOURCE = 'entry.1976260898';
const DEFAULT_GF_PROFITS = 'entry.153138902';
const DEFAULT_GF_OLD_GROUP = 'entry.1707443046';
const DEFAULT_GF_NEW_GROUP = 'entry.811495440';
const DEFAULT_GF_NOTES = 'entry.1364885040';

// Load Google Form Settings
function loadGoogleFormSettings() {
  // Always force defaults first to ensure correct IDs
  const currentSettings = {
    enabled: true,
    url: DEFAULT_GF_URL,
    entryIp: DEFAULT_GF_IP,
    entryCountry: DEFAULT_GF_COUNTRY,
    entryAccount: DEFAULT_GF_ACCOUNT,
    entryEmail: DEFAULT_GF_EMAIL,
    entryEmployee: DEFAULT_GF_EMPLOYEE,
    entryShift: DEFAULT_GF_SHIFT,
    entrySource: DEFAULT_GF_SOURCE,
    entryProfits: DEFAULT_GF_PROFITS,
    entryOldGroup: DEFAULT_GF_OLD_GROUP,
    entryNewGroup: DEFAULT_GF_NEW_GROUP,
    entryNotes: DEFAULT_GF_NOTES
  };

  chrome.storage.local.get(['googleFormSettings'], (result) => {
    // If settings exist, we might want to respect user's enable/disable choice,
    // but we should FORCE the correct IDs and URL to prevent errors.
    if (result.googleFormSettings) {
      currentSettings.enabled = result.googleFormSettings.enabled !== undefined ? result.googleFormSettings.enabled : true;
      // Also load saved Shift/Profits/OldGroup/NewGroup ID if available
      if (result.googleFormSettings.entryShift) currentSettings.entryShift = result.googleFormSettings.entryShift;
      if (result.googleFormSettings.entryProfits) currentSettings.entryProfits = result.googleFormSettings.entryProfits;
      if (result.googleFormSettings.entryOldGroup) currentSettings.entryOldGroup = result.googleFormSettings.entryOldGroup;
      if (result.googleFormSettings.entryNewGroup) currentSettings.entryNewGroup = result.googleFormSettings.entryNewGroup;
    }
    
    // Update UI
    googleFormEnableCheckbox.checked = currentSettings.enabled;
    googleFormUrlInput.value = currentSettings.url;
    entryIpInput.value = currentSettings.entryIp;
    entryCountryInput.value = currentSettings.entryCountry;
    entryAccountInput.value = currentSettings.entryAccount;
    entryEmailInput.value = currentSettings.entryEmail;
    entryEmployeeInput.value = currentSettings.entryEmployee;
    if (entryShiftInput) entryShiftInput.value = currentSettings.entryShift || '';
    entrySourceInput.value = currentSettings.entrySource;
    if (entryProfitsInput) entryProfitsInput.value = currentSettings.entryProfits || '';
    if (entryOldGroupInput) entryOldGroupInput.value = currentSettings.entryOldGroup || '';
    if (entryNewGroupInput) entryNewGroupInput.value = currentSettings.entryNewGroup || '';
    entryNotesInput.value = currentSettings.entryNotes;
    
    // Save these correct settings back to storage to fix any old bad data
    chrome.storage.local.set({ googleFormSettings: currentSettings });
  });
}

// Restore Defaults Button
const restoreGoogleFormDefaultsBtn = document.getElementById('restore-google-form-defaults');
if (restoreGoogleFormDefaultsBtn) {
  restoreGoogleFormDefaultsBtn.addEventListener('click', () => {
    googleFormEnableCheckbox.checked = true;
    googleFormUrlInput.value = DEFAULT_GF_URL;
    entryIpInput.value = DEFAULT_GF_IP;
    entryCountryInput.value = DEFAULT_GF_COUNTRY;
    entryAccountInput.value = DEFAULT_GF_ACCOUNT;
    entryEmailInput.value = DEFAULT_GF_EMAIL;
    entryEmployeeInput.value = DEFAULT_GF_EMPLOYEE;
    if (entryShiftInput) entryShiftInput.value = DEFAULT_GF_SHIFT;
    entrySourceInput.value = DEFAULT_GF_SOURCE;
    if (entryProfitsInput) entryProfitsInput.value = DEFAULT_GF_PROFITS;
    if (entryOldGroupInput) entryOldGroupInput.value = DEFAULT_GF_OLD_GROUP;
    if (entryNewGroupInput) entryNewGroupInput.value = DEFAULT_GF_NEW_GROUP;
    entryNotesInput.value = DEFAULT_GF_NOTES;
    showToast('تم الاستعادة', 'تم استعادة الإعدادات الافتراضية (اضغط حفظ)', 'default');
  });
}

// Save Google Form Settings
if (saveGoogleFormSettingsBtn) {
  saveGoogleFormSettingsBtn.addEventListener('click', () => {
    const settings = {
      enabled: googleFormEnableCheckbox.checked,
      url: googleFormUrlInput.value.trim(),
      entryIp: entryIpInput.value.trim(),
      entryCountry: entryCountryInput.value.trim(),
      entryAccount: entryAccountInput.value.trim(),
      entryEmail: entryEmailInput.value.trim(),
      entryEmployee: entryEmployeeInput.value.trim(),
      entryShift: entryShiftInput ? entryShiftInput.value.trim() : '',
      entrySource: entrySourceInput.value.trim(),
      entryProfits: entryProfitsInput ? entryProfitsInput.value.trim() : '',
      entryOldGroup: entryOldGroupInput ? entryOldGroupInput.value.trim() : '',
      entryNewGroup: entryNewGroupInput ? entryNewGroupInput.value.trim() : '',
      entryNotes: entryNotesInput.value.trim()
    };

    chrome.storage.local.set({ googleFormSettings: settings }, () => {
      showToast('تم الحفظ', 'تم حفظ إعدادات Google Form', 'default');
      googleFormSettingsModal.style.display = 'none';
    });
  });
}

// --- User Settings (Employee Name) ---
const employeeNameSelect = document.getElementById('employee-name-select');
const saveUserSettingsBtn = document.getElementById('save-user-settings-btn');
const employeeDirectory = window.EmployeeDirectory;

if (employeeDirectory) {
  employeeDirectory.populateEmployeeSelect(employeeNameSelect);
}

// Debug (User Settings)
const DEBUG_USER_SETTINGS = false;
function dbgUserSettings(...args) {
  if (!DEBUG_USER_SETTINGS) return;
  console.log('[UserSettings]', ...args);
}

let isEmployeeNameLocked = false;

function lockEmployeeNameUI(employeeName) {
  if (!employeeNameSelect) return;
  employeeNameSelect.value = employeeName || employeeNameSelect.value;
  employeeNameSelect.disabled = true;
  employeeNameSelect.title = 'تم حفظ الاسم ولا يمكن تغييره';
  isEmployeeNameLocked = true;
  dbgUserSettings('lockEmployeeNameUI: locked with', employeeNameSelect.value);
}

function unlockEmployeeNameUI() {
  if (!employeeNameSelect) return;
  employeeNameSelect.disabled = false;
  employeeNameSelect.title = '';
  isEmployeeNameLocked = false;
  dbgUserSettings('unlockEmployeeNameUI: unlocked');
}

function getStoredEmployeeNameFromData(data) {
  const fromUserSettings = (
    data &&
    data.userSettings &&
    typeof data.userSettings.employeeName === 'string'
  ) ? data.userSettings.employeeName.trim() : '';

  const fromCreditOut = (
    data &&
    typeof data.creditOutEmployeeName === 'string'
  ) ? data.creditOutEmployeeName.trim() : '';

  const storedName = fromUserSettings || fromCreditOut || '';
  return employeeDirectory ? employeeDirectory.normalizeEmployeeName(storedName) : storedName;
}

function persistEmployeeNameOnce(name, onDone) {
  const selectedName = employeeDirectory
    ? employeeDirectory.normalizeEmployeeName(name)
    : (typeof name === 'string' ? name.trim() : '');
  if (!selectedName) {
    if (typeof onDone === 'function') onDone(false, '', 'empty');
    return;
  }

  chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (localData) => {
    const existingName = getStoredEmployeeNameFromData(localData);
    if (existingName && existingName !== selectedName) {
      if (typeof onDone === 'function') onDone(false, existingName, 'locked');
      return;
    }

    const finalName = existingName || selectedName;
    const nextUserSettings = {
      ...(localData.userSettings || {}),
      employeeName: finalName
    };

    chrome.storage.local.set({
      userSettings: nextUserSettings,
      creditOutEmployeeName: finalName
    }, () => {
      if (typeof onDone === 'function') onDone(true, finalName, existingName ? 'existing' : 'saved');
    });
  });
}

function restoreNativeSelect(selectId) {
  const originalSelect = document.getElementById(selectId);
  if (!originalSelect) return;

  const wrapper = document.querySelector('.wrapper-' + selectId);
  if (wrapper) {
    wrapper.remove();
    dbgUserSettings('restoreNativeSelect: removed custom wrapper for', selectId);
  }

  if (originalSelect.style.display === 'none') {
    originalSelect.style.display = '';
    dbgUserSettings('restoreNativeSelect: restored native select display for', selectId);
  }
}

// Load User Settings
function loadUserSettings() {
  chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (result) => {
    dbgUserSettings('loadUserSettings() -> storage result:', result);
    const savedName = getStoredEmployeeNameFromData(result);
    if (savedName) {
      if (employeeDirectory) employeeDirectory.ensureEmployeeOption(employeeNameSelect, savedName);
      employeeNameSelect.value = savedName;
      if (employeeNameSelect) employeeNameSelect.dispatchEvent(new Event('change'));
      lockEmployeeNameUI(savedName);
      const userSettingsName = (
        result &&
        result.userSettings &&
        typeof result.userSettings.employeeName === 'string'
      ) ? result.userSettings.employeeName.trim() : '';
      if (userSettingsName !== savedName) {
        const nextUserSettings = {
          ...(result.userSettings || {}),
          employeeName: savedName
        };
        chrome.storage.local.set({ userSettings: nextUserSettings, creditOutEmployeeName: savedName });
      }
      dbgUserSettings('Applied+locked employeeName:', employeeNameSelect.value);
    } else {
      unlockEmployeeNameUI();
    }
  });
}

// Save User Settings
if (saveUserSettingsBtn) {
  saveUserSettingsBtn.addEventListener('click', () => {
    if (isEmployeeNameLocked) {
      showToast('تنبيه', 'تم حفظ اسم الموظف ولا يمكن تغييره', 'warning');
      telegramSettingsModal.style.display = 'none';
      dbgUserSettings('Save clicked while locked -> closing modal');
      return;
    }

    const name = employeeNameSelect.value;

    dbgUserSettings('Save clicked. Current select value:', name);

    if (!name) {
      showToast('تنبيه', 'الرجاء اختيار اسم الموظف', 'warning');
      dbgUserSettings('Save blocked: no name selected');
      return;
    }

    persistEmployeeNameOnce(name, (saved, resolvedName, reason) => {
      if (!saved) {
        if (reason === 'locked' && resolvedName) {
          lockEmployeeNameUI(resolvedName);
          showToast('تنبيه', 'تم حفظ اسم الموظف مسبقًا ولا يمكن تغييره', 'warning');
          telegramSettingsModal.style.display = 'none';
          dbgUserSettings('Blocked overwrite attempt. Locked on existing name:', resolvedName);
          return;
        }
        showToast('تنبيه', 'الرجاء اختيار اسم الموظف', 'warning');
        return;
      }

      dbgUserSettings('Saved. Now verifying storage...');
      chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (verify) => {
        dbgUserSettings('Verify after save ->', verify);
      });

      // Lock immediately after first save
      lockEmployeeNameUI(resolvedName || name);

      showToast('تم الحفظ', 'تم حفظ الإعدادات بنجاح', 'default');
      telegramSettingsModal.style.display = 'none';
      dbgUserSettings('Modal closed after save.');
    });
  });
}

// Open Settings (Load saved name)
if (telegramSettingsBtn) {
  telegramSettingsBtn.addEventListener('click', () => {
    dbgUserSettings('Settings (gear) clicked. Opening modal...');
    // Critical reliability: keep Employee Name as native select
    restoreNativeSelect('employee-name-select');
    loadUserSettings();
    telegramSettingsModal.style.display = 'block';
    // Defer to allow custom select to render
    setTimeout(() => {
      const wrapper = document.querySelector('.wrapper-employee-name-select');
      const trigger = wrapper?.querySelector('.custom-select-trigger');
      dbgUserSettings('Modal opened. Wrapper exists?', !!wrapper, 'Trigger exists?', !!trigger);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        dbgUserSettings('Trigger rect:', { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
      }
    }, 0);
  });
}

// Open Google Form Settings
if (googleFormSettingsBtn) {
  googleFormSettingsBtn.addEventListener('click', () => {
    loadGoogleFormSettings();
    googleFormSettingsModal.style.display = 'block';
  });
}

// Close Google Form Settings
if (googleFormSettingsClose) {
  googleFormSettingsClose.addEventListener('click', () => {
    googleFormSettingsModal.style.display = 'none';
  });
}

// --- Telegram Integration ---
// Constants for Telegram
const DEFAULT_TELEGRAM_TOKEN = '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
const DEFAULT_TELEGRAM_CHAT_ID = '-1003692121203';

// Open Settings
if (telegramSettingsBtn) {
  telegramSettingsBtn.addEventListener('click', () => {
    telegramSettingsModal.style.display = 'block';
  });
}

// Close Settings
if (telegramSettingsClose) {
  telegramSettingsClose.addEventListener('click', () => {
    telegramSettingsModal.style.display = 'none';
  });
}

// --- Image Upload Logic ---
let selectedImages = [];
const reportImagesInput = document.getElementById('report-images');
const imagePreviewContainer = document.getElementById('image-preview-container');

function isDuplicateFile(newFile, currentList) {
  return currentList.some(existingFile => 
    existingFile.name === newFile.name &&
    existingFile.size === newFile.size &&
    existingFile.lastModified === newFile.lastModified
  );
}

if (reportImagesInput) {
  reportImagesInput.addEventListener('change', (e) => {
    console.log('Image upload detected (change event)');
    const files = Array.from(e.target.files);
    let addedCount = 0;
    
    files.forEach(file => {
      if (!isDuplicateFile(file, selectedImages)) {
        selectedImages.push(file);
        addedCount++;
      }
    });

    if (addedCount < files.length) {
      showToast('تنبيه', 'تم تجاهل الصور المكررة', 'warning');
    }

    renderImagePreviews();
    reportImagesInput.value = ''; // Reset input to allow selecting same files again
  });
}

// Mention Buttons Logic
const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
const mentionBatoulBtn = document.getElementById('mention-batoul-btn');
console.log('Mentions Init: Ahmed Btn found?', !!mentionAhmedBtn, 'Batoul Btn found?', !!mentionBatoulBtn);

// Helper for toggling UI state
function setMentionState(btn, isActive) {
  if (isActive) {
    btn.classList.add('active');
    btn.setAttribute('data-active', 'true'); // For CSS fallback
    btn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    btn.style.color = 'white';
  } else {
    btn.classList.remove('active');
    btn.removeAttribute('data-active');
    btn.style.background = '';
    btn.style.color = '';
  }
}

function handleMentionClick(clickedId) {
  console.log('Handle Mention Click:', clickedId);
  const ahmed = document.getElementById('mention-ahmed-btn');
  const batoul = document.getElementById('mention-batoul-btn');
  
  if (clickedId === 'mention-ahmed-btn' && ahmed) {
     const isAhmedActive = ahmed.classList.contains('active');
     // Toggle Ahmed only (Independent)
     setMentionState(ahmed, !isAhmedActive);
  } 
  else if (clickedId === 'mention-batoul-btn' && batoul) {
     const isBatoulActive = batoul.classList.contains('active');
     // Toggle Batoul only (Independent)
     setMentionState(batoul, !isBatoulActive);
  }
}

if (mentionAhmedBtn) {
  // Use onclick property to override any existing listeners completely and simply
  mentionAhmedBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Ahmed Button onclick fired');
    handleMentionClick('mention-ahmed-btn');
  };
}

if (mentionBatoulBtn) {
  mentionBatoulBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Batoul Button onclick fired');
    handleMentionClick('mention-batoul-btn');
  };
}

// Handle Paste (Ctrl+V) for images
document.addEventListener('paste', (e) => {
  // Only handle paste if we are in the transfer report tab
  if (activeTab !== 'transfer-report') return;

  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let blob = null;
  let hasImage = false;
  let duplicateCount = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') === 0) {
      blob = items[i].getAsFile();
      if (blob) {
        // For pasted images, we might not have reliable name/lastModified, 
        // but we can check size and type at least, or if it's a file copy, it has props.
        if (!isDuplicateFile(blob, selectedImages)) {
          selectedImages.push(blob);
          hasImage = true;
        } else {
          duplicateCount++;
        }
      }
    }
  }

  if (hasImage) {
    renderImagePreviews();
    showToast('تم اللصق', 'تم إضافة الصورة من الحافظة', 'default');
    e.preventDefault(); // Prevent default paste behavior if image was handled
  } else if (duplicateCount > 0) {
    showToast('تنبيه', 'الصورة موجودة بالفعل', 'warning');
    e.preventDefault();
  }
});

function renderImagePreviews() {
  console.log('renderImagePreviews called. Count:', selectedImages.length);
  const container = document.getElementById('image-preview-container');
  if (!container) {
    console.error('CRITICAL: image-preview-container NOT FOUND in DOM!');
    return;
  }
  console.log('Container found:', container);

  container.innerHTML = '';
  selectedImages.forEach((file, index) => {
    console.log(`Processing image ${index}:`, file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(`Image ${index} loaded by FileReader`);
      const div = document.createElement('div');
      div.className = 'preview-item';
      
      const img = document.createElement('img');
      img.src = e.target.result;
      
      const btn = document.createElement('button');
      btn.type = 'button'; // Explicit type
      btn.className = 'remove-image-btn';
      btn.innerHTML = '×';
      btn.dataset.index = index;
      
      // Inline style fallback in case CSS fails
      btn.style.position = 'absolute';
      btn.style.top = '5px';
      btn.style.right = '5px';
      btn.style.zIndex = '99999';
      btn.style.opacity = '1';
      btn.style.display = 'flex';
      btn.style.cursor = 'pointer';

      btn.onclick = (ev) => { // Direct property handler
         console.log('Remove btn CLICKED via onclick property', index);
         ev.stopPropagation();
         ev.preventDefault();
         selectedImages.splice(index, 1);
         renderImagePreviews();
      };
      
      div.appendChild(img);
      div.appendChild(btn);
      container.appendChild(div);
      console.log(`Image ${index} appended to container`);
    };
    reader.onerror = (err) => console.error('FileReader Error:', err);
    reader.readAsDataURL(file);
  });
}

// Shift Selector Logic
const transferReportShiftBtns = document.querySelectorAll('#transfer-report-section .shift-btn:not(.deposit-shift-btn):not(.credit-out-shift-btn)');
const reportShiftInput = document.getElementById('report-shift');

function setShift(shiftValue) {
  console.log('setShift called with:', shiftValue);
  if (transferReportShiftBtns && transferReportShiftBtns.length > 0) {
    transferReportShiftBtns.forEach(b => {
      // console.log('Checking button:', b.dataset.value, 'against', shiftValue);
      if (b.dataset.value === shiftValue) {
        b.classList.add('active');
        console.log('Activated button:', b.dataset.value);
      } else {
        b.classList.remove('active');
      }
    });
  } else {
    console.warn('No transfer-report shift buttons found in DOM');
  }
  if (reportShiftInput) {
    reportShiftInput.value = shiftValue;
  }
}

function autoDetectShift() {
  const now = new Date();
  const day = now.getDay(); // 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  console.log('autoDetectShift running. Day:', day, 'Time:', hour + ':' + minute);
  
  let shift = 'الخفر'; // Default

  // Friday Special Schedule
  if (day === 5) {
      // Morning: 07:00 (420m) - 12:39 (759m)
      if (totalMinutes >= 420 && totalMinutes <= 759) {
          shift = 'الصباحي';
      }
      // Evening: 12:40 (760m) - 18:19 (1099m)
      else if (totalMinutes >= 760 && totalMinutes <= 1099) {
          shift = 'المسائي';
      }
      // Night: 18:20 (1100m) onwards (covers until midnight)
      // Early morning (00:00 - 06:59) is also Night (handled by default or logic below)
      else if (totalMinutes >= 1100) {
          shift = 'الخفر';
      }
      // 00:00 - 06:59 is already 'الخفر' by default
  } 
  // Standard Schedule (Sat-Thu)
  else {
      // Morning: 07:00 - 14:59
      if (hour >= 7 && hour < 15) {
        shift = 'الصباحي';
      } 
      // Evening: 15:00 - 22:59
      else if (hour >= 15 && hour < 23) {
        shift = 'المسائي';
      }
      // Night: 23:00 - 06:59 (Default)
  }
  
  console.log('Detected Shift:', shift);
  setShift(shift);
}

// Initialize Shift Buttons
if (transferReportShiftBtns.length > 0) {
  transferReportShiftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setShift(btn.dataset.value);
    });
  });
}

// Send to Telegram
if (sendTelegramBtn) {
  sendTelegramBtn.addEventListener('click', async () => {
    // Check for Employee Name first
    const userSettings = await chrome.storage.local.get(['userSettings']);
    const employeeName = userSettings.userSettings?.employeeName;

    if (!employeeName) {
      showToast('تنبيه', 'الرجاء اختيار اسم الموظف من الإعدادات (⚙️)', 'warning');
      // Open settings automatically
      if (telegramSettingsBtn) telegramSettingsBtn.click();
      return;
    }

    // Always use defaults
    const token = DEFAULT_TELEGRAM_TOKEN;
    const chatId = DEFAULT_TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      showToast('خطأ', 'إعدادات Telegram غير صحيحة', 'warning');
      return;
    }

    const hasIpBeforeSend = !!reportIpInput.value.trim();
    if (hasIpBeforeSend) {
      const countryReady = await ensureCountryForInputs(
        reportIpInput,
        reportCountryInput,
        fetchIpInfo,
        window.IPGeoClient && window.IPGeoClient.normalizeIPv4
          ? window.IPGeoClient.normalizeIPv4
          : null
      );
      if (!countryReady) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
        return;
      }
    }

    const ip = reportIpInput.value.trim();
    const country = reportCountryInput.value.trim();
    const account = reportAccountInput.value.trim();
    const email = reportEmailInput.value.trim();
    let source = reportSourceInput.value;
    if (source === 'Other' && reportSourceCustomInput) {
      source = reportSourceCustomInput.value.trim() || 'Other';
    }
    let profits = reportProfitsInput.value;
    if (profits === 'Other' && reportProfitsCustomInput) {
      profits = reportProfitsCustomInput.value.trim() || 'Other';
    }
    const oldGroup = document.getElementById('report-old-group') ? document.getElementById('report-old-group').value : '';
    const newGroup = document.getElementById('report-new-group') ? document.getElementById('report-new-group').value : '';
    const notes = reportNotesInput.value.trim();
    const shift = reportShiftInput ? reportShiftInput.value : '';

    // Validation: Check for missing fields
    if (!shift || !ip || !country || !account || !email || !source || !profits || !oldGroup || !newGroup || !notes) {
      showToast('بيانات ناقصة', 'الرجاء ملء جميع الحقول المطلوبة قبل الإرسال', 'warning');
      return;
    }

    // Helper to escape HTML characters
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Format message for Telegram (HTML)
    let message = `<b>تقرير تحويل الحسابات</b>

<b>الموظف:</b> ${escapeHtml(employeeName)}
<b>فترة الشفت:</b> ${escapeHtml(shift)}
<b>ip country:</b> <code>${escapeHtml(country)}</code>
<b>IP:</b> <code>${escapeHtml(ip)}</code>
<b>الإيميل:</b> <code>${escapeHtml(email)}</code>
<b>رقم الحساب:</b> <code>${escapeHtml(account)}</code>
<b>مصدر التحويل:</b> ${escapeHtml(source)}
<b>الارباح:</b> ${escapeHtml(profits)}
<b>الملاحظات:</b> <code>${escapeHtml(notes)}</code>

#account_transfer`;

    // Handle Mentions
    const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
    const mentionBatoulBtn = document.getElementById('mention-batoul-btn');
    
    let mentions = [];
    if (mentionAhmedBtn && mentionAhmedBtn.classList.contains('active')) {
      mentions.push('@ahmedelgma');
    }
    if (mentionBatoulBtn && mentionBatoulBtn.classList.contains('active')) {
      mentions.push('@batoulhassan');
    }

    if (mentions.length > 0) {
      message += '\n\n' + mentions.join(' ');
    }

    sendTelegramBtn.disabled = true;
    sendTelegramBtn.textContent = 'جاري الإرسال...';

    // --- Google Form & Telegram Submission Logic (Delegated to Background) ---
    try {
      // 1. Get Google Form Settings
      const result = await chrome.storage.local.get(['googleFormSettings']);
      let gfSettings = result.googleFormSettings;

      // Fallback to defaults if not set
      if (!gfSettings) {
        gfSettings = {
          enabled: true,
          url: DEFAULT_GF_URL,
          entryIp: DEFAULT_GF_IP,
          entryCountry: DEFAULT_GF_COUNTRY,
          entryAccount: DEFAULT_GF_ACCOUNT,
          entryEmail: DEFAULT_GF_EMAIL,
          entryEmployee: DEFAULT_GF_EMPLOYEE,
          entryShift: DEFAULT_GF_SHIFT,
          entrySource: DEFAULT_GF_SOURCE,
          entryProfits: DEFAULT_GF_PROFITS,
          entryOldGroup: DEFAULT_GF_OLD_GROUP,
          entryNewGroup: DEFAULT_GF_NEW_GROUP,
          entryNotes: DEFAULT_GF_NOTES
        };
      }

      // Prepare Payload
      const payload = {
        ip: `${ip} || ${country}`,
        country: country,
        account: account,
        email: email,
        source: source,
        profits: profits,
        oldGroup: oldGroup,
        newGroup: newGroup,
        notes: notes,
        employeeName: employeeName,
        shift: shift
      };

      // Prepare Images for Background (Convert File to Base64)
      const telegramImages = [];
      if (selectedImages.length > 0) {
        for (const file of selectedImages) {
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          telegramImages.push({ data: base64, type: file.type });
        }
      }

      // Send Message to Background
      const response = await chrome.runtime.sendMessage({
        type: 'submitReport',
        data: {
          gfSettings,
          payload,
          telegramToken: token,
          telegramChatId: chatId,
          telegramMessage: message,
          telegramImages
        }
      });

      if (response && response.success) {
        showToast('تم الإرسال', 'تم إرسال التقرير بنجاح', 'default');
        
        // Auto Reset UI
        // 1. Reset Values
        if (reportIpInput) reportIpInput.value = '';
        if (reportCountryInput) reportCountryInput.value = '';
        if (reportAccountInput) reportAccountInput.value = '';
        if (reportEmailInput) reportEmailInput.value = '';
        
        // Reset defaults (User requested these kept)
        if (reportSourceInput) reportSourceInput.value = 'suspicious traders';
        if (reportProfitsInput) reportProfitsInput.value = 'ارباح بالسالب';
        
        const oldGroupInput = document.getElementById('report-old-group');
        const newGroupInput = document.getElementById('report-new-group');
        if (oldGroupInput) {
            oldGroupInput.value = '';
            oldGroupInput.selectedIndex = 0; // Force validation
        }
        if (newGroupInput) {
            newGroupInput.value = '';
            newGroupInput.selectedIndex = 0; // Force validation
        }
        
        if (reportNotesInput) reportNotesInput.value = '';

        // Hide custom inputs explicitly
        if (reportProfitsCustomInput) {
             reportProfitsCustomInput.value = '';
             reportProfitsCustomInput.style.display = 'none';
        }
        if (reportSourceCustomInput) {
             reportSourceCustomInput.value = '';
             reportSourceCustomInput.style.display = 'none';
        }

        // 2. Trigger Change Events to update UI state (including Custom Selects)
        const fieldsToReset = [
          reportIpInput, reportCountryInput, reportAccountInput, reportEmailInput,
          reportSourceInput, reportProfitsInput, reportNotesInput,
          oldGroupInput, newGroupInput
        ];

        fieldsToReset.forEach(field => {
          if (field) {
            // Dispatch event to let existing listeners update the UI (like applyFieldCompletionState)
            field.dispatchEvent(new Event('change', { bubbles: true }));
             // For select inputs, we might need to manually update the trigger text if the event doesn't catch it
             if (field.tagName === 'SELECT' && field.style.display === 'none') {
                const wrapper = field.previousElementSibling;
                if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                    const trigger = wrapper.querySelector('.custom-select-trigger');
                    const selectedOption = field.options[field.selectedIndex];
                    if (trigger && selectedOption) {
                        const span = trigger.querySelector('span');
                        if (span) {
                            span.textContent = selectedOption.textContent;
                        } else {
                            // If span is missing for some reason, re-add it or fallback
                            trigger.innerHTML = '<span>' + selectedOption.textContent + '</span>';
                        }
                    }
                }
             }
          }
        });

        // 3. Force Remove Green/Validation Classes for Default Value fields
        // Because dispatching 'change' on them will turn them green (since they have values), we strip it off again.
        const fieldsWithDefaults = [reportSourceInput, reportProfitsInput];
        fieldsWithDefaults.forEach(field => {
             if (field) {
                 field.classList.remove('field-complete', 'valid', 'success');
                 const group = field.closest('.report-field-group');
                 if (group) group.classList.remove('field-complete', 'valid', 'success');
                 
                 // Handle Custom Select Wrapper for defaults
                 if (field.tagName === 'SELECT' && field.style.display === 'none') {
                    const wrapper = field.previousElementSibling;
                    if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                        wrapper.classList.remove('field-complete', 'valid', 'success');
                    }
                 }
             }
        });

        // Reset Shift (Auto Detect)
        if (typeof autoDetectShift === 'function') {
          autoDetectShift();
        }
        
        // Reset Mentions
        if (typeof setMentionState === 'function') {
            if (mentionAhmedBtn) setMentionState(mentionAhmedBtn, false);
            if (mentionBatoulBtn) setMentionState(mentionBatoulBtn, false);
        } else {
             // Fallback if helper missing
             if (mentionAhmedBtn) {
                 mentionAhmedBtn.classList.remove('active');
                 mentionAhmedBtn.removeAttribute('data-active');
                 mentionAhmedBtn.style.background = '';
                 mentionAhmedBtn.style.color = '';
             }
             if (mentionBatoulBtn) {
                 mentionBatoulBtn.classList.remove('active');
                 mentionBatoulBtn.removeAttribute('data-active');
                 mentionBatoulBtn.style.background = '';
                 mentionBatoulBtn.style.color = '';
             }
        }

        // Reset Images
        selectedImages = [];
        renderImagePreviews();
        
        // Scroll to Top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response?.error || 'Unknown error from background');
      }

    } catch (error) {
      console.error('Submission Error:', error);
      showToast('فشل الإرسال', `حدث خطأ: ${error.message}`, 'warning');
    } finally {
      sendTelegramBtn.disabled = false;
      sendTelegramBtn.textContent = 'إرسال Telegram';
    }
  });
}

// --- Deposit Percentage Report Logic ---

async function fetchDepositIpInfo(ip) {
  if (!ip) return false;
  try {
    const geoClient = window.IPGeoClient;
    const result = geoClient
      ? await (geoClient.lookupWithRetry
        ? geoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120 })
        : geoClient.lookup(ip))
      : { success: false, error: 'IPGeoClient unavailable' };
    if (result.success) {
      const display = geoClient.toCountryDisplay(result.data, 'Unknown');
      if (depositReportCountryInput) depositReportCountryInput.value = display;
      if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
      if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
        return geoClient.isCountryTextResolved(display);
      }
      return !!display && display !== 'Unknown' && display !== 'Error';
    }

    console.warn('Deposit IP lookup failed:', result.error);
    if (depositReportCountryInput) depositReportCountryInput.value = 'Unknown';
    if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
    return false;
  } catch (error) {
    console.error('Error fetching IP info:', error);
    if (depositReportCountryInput) depositReportCountryInput.value = 'Error';
    if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
    return false;
  }
}

// Deposit Report Input Logic (Auto-move and IP Lookup)
if (depositReportIpInput) {
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  depositReportIpInput.addEventListener('blur', () => {
    const val = depositReportIpInput.value.trim();
    const cleanIp = extractIp(val);
    
    if (cleanIp) {
      if (cleanIp !== val) depositReportIpInput.value = cleanIp;
      fetchDepositIpInfo(cleanIp);
    } else if (val !== '') {
      if (isAccount(val)) {
        depositReportAccountInput.value = val;
        depositReportIpInput.value = '';
        showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        depositReportAccountInput.focus();
      } else if (isEmail(val)) {
        depositReportEmailInput.value = val;
        depositReportIpInput.value = '';
        showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
        depositReportEmailInput.focus();
      } else {
        showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
      }
    }
  });

  depositReportIpInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      const val = depositReportIpInput.value.trim();
      const cleanIp = extractIp(val);
      
      if (cleanIp) {
        depositReportIpInput.value = cleanIp;
        fetchDepositIpInfo(cleanIp);
        depositReportAccountInput.focus();
      } else if (val !== '') {
        if (isAccount(val)) {
          depositReportAccountInput.value = val;
          depositReportIpInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
          depositReportAccountInput.focus();
        } else if (isEmail(val)) {
          depositReportEmailInput.value = val;
          depositReportIpInput.value = '';
          showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
          depositReportEmailInput.focus();
        }
      }
    }, 10);
  });
}

if (depositReportAccountInput) {
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };

  depositReportAccountInput.addEventListener('blur', () => {
    const val = depositReportAccountInput.value.trim();
    if (val !== '' && !isAccount(val)) {
      if (isEmail(val)) {
        depositReportEmailInput.value = val;
        depositReportAccountInput.value = '';
        showToast('تنبيه', 'تم نقل الإيميل لحقله المخصص', 'warning');
      } else if (extractIp(val)) {
        const ip = extractIp(val);
        depositReportIpInput.value = ip;
        depositReportAccountInput.value = '';
        fetchDepositIpInfo(ip);
        showToast('تنبيه', 'تم نقل IP لحقله المخصص', 'warning');
      } else {
        depositReportAccountInput.value = '';
        showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
      }
    }
  });

  depositReportAccountInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      const val = depositReportAccountInput.value.trim();
      if (isEmail(val)) {
        depositReportEmailInput.value = val;
        depositReportAccountInput.value = '';
        showToast('تنبيه', 'تم نقل الإيميل لحقله المخصص', 'warning');
        depositReportEmailInput.focus();
      } else if (extractIp(val)) {
        const ip = extractIp(val);
        depositReportIpInput.value = ip;
        depositReportAccountInput.value = '';
        fetchDepositIpInfo(ip);
        showToast('تنبيه', 'تم نقل IP لحقله المخصص', 'warning');
        depositReportIpInput.focus();
      } else if (isAccount(val)) {
        depositReportEmailInput.focus();
      }
    }, 10);
  });
}

if (depositReportEmailInput) {
  depositReportEmailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      depositReportMarginInput.focus();
    }
  });

  depositReportEmailInput.addEventListener('paste', () => {
    setTimeout(() => {
       depositReportMarginInput.focus();
    }, 10);
  });
}

// Selector Buttons Logic
document.querySelectorAll('#deposit-percentage-section .selector-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    const value = btn.dataset.value;
    
    // Update hidden input
    const inputId = `deposit-report-${group}`;
    const input = document.getElementById(inputId);
    if (input) input.value = value;
    
    // Update visual state
    document.querySelectorAll(`#deposit-percentage-section .selector-btn[data-group="${group}"]`).forEach(b => {
      b.classList.remove('active');
    });
    btn.classList.add('active');
  });
});

// Deposit Report Image Upload
let depositSelectedImages = [];

function renderDepositImagePreviews() {
  if (!depositImagePreviewContainer) return;
  depositImagePreviewContainer.innerHTML = '';
  depositSelectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.style.position = 'relative'; // Ensure positioning context

      const img = document.createElement('img');
      img.src = e.target.result;
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove-image-btn';
      btn.innerHTML = '×';
      btn.dataset.index = index;
      
      // Inline style fallback
      btn.style.position = 'absolute';
      btn.style.top = '5px';
      btn.style.right = '5px';
      btn.style.zIndex = '99999';
      btn.style.opacity = '1';
      btn.style.display = 'flex';
      btn.style.cursor = 'pointer';
      btn.style.background = 'rgba(255, 0, 0, 0.8)';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '50%';
      btn.style.width = '24px';
      btn.style.height = '24px';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.fontSize = '18px';
      btn.style.lineHeight = '1';

      btn.onclick = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        depositSelectedImages.splice(index, 1);
        renderDepositImagePreviews();
      };

      div.appendChild(img);
      div.appendChild(btn);
      depositImagePreviewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

if (depositReportImagesInput) {
  depositReportImagesInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!isDuplicateFile(file, depositSelectedImages)) {
        depositSelectedImages.push(file);
      }
    });
    renderDepositImagePreviews();
    depositReportImagesInput.value = '';
  });
}

// Handle Paste for Deposit Report Images
document.addEventListener('paste', (e) => {
  if (activeTab !== 'deposit-percentage') return;

  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let hasImage = false;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') === 0) {
      const blob = items[i].getAsFile();
      if (blob && !isDuplicateFile(blob, depositSelectedImages)) {
        depositSelectedImages.push(blob);
        hasImage = true;
      }
    }
  }

  if (hasImage) {
    renderDepositImagePreviews();
    showToast('تم اللصق', 'تم إضافة الصورة من الحافظة', 'default');
    e.preventDefault();
  }
});

// Deposit Report Mentions
if (depositMentionAhmedBtn) {
  depositMentionAhmedBtn.classList.add('active');
  depositMentionAhmedBtn.addEventListener('click', () => {
    depositMentionAhmedBtn.classList.toggle('active');
  });
}
if (depositMentionBatoulBtn) {
  depositMentionBatoulBtn.classList.add('active');
  depositMentionBatoulBtn.addEventListener('click', () => {
    depositMentionBatoulBtn.classList.toggle('active');
  });
}

// Deposit Report Settings Button
if (depositTelegramSettingsBtn) {
  depositTelegramSettingsBtn.addEventListener('click', () => {
    loadUserSettings();
    telegramSettingsModal.style.display = 'block';
  });
}

// Deposit Report Shift Logic
const depositShiftBtns = document.querySelectorAll('.deposit-shift-btn');
const depositReportShiftInput = document.getElementById('deposit-report-shift');

function setDepositShift(shiftValue) {
  if (depositShiftBtns && depositShiftBtns.length > 0) {
    depositShiftBtns.forEach(b => {
      if (b.dataset.value === shiftValue) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
  if (depositReportShiftInput) {
    depositReportShiftInput.value = shiftValue;
  }
}

// Initialize Deposit Shift Buttons
if (depositShiftBtns.length > 0) {
  depositShiftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setDepositShift(btn.dataset.value);
    });
  });
}

// Reset Deposit Report
if (depositResetReportBtn) {
  depositResetReportBtn.addEventListener('click', () => {
    if (depositReportIpInput) depositReportIpInput.value = '';
    if (depositReportCountryInput) depositReportCountryInput.value = '';
    if (depositReportAccountInput) depositReportAccountInput.value = '';
    if (depositReportEmailInput) depositReportEmailInput.value = '';
    if (depositReportMarginInput) depositReportMarginInput.value = '';
    if (depositReportNotesInput) depositReportNotesInput.value = '';
    
    // Reset Selectors
    document.querySelectorAll('#deposit-percentage-section .selector-btn').forEach(b => b.classList.remove('active'));
    if (depositReportProfitsStatusInput) depositReportProfitsStatusInput.value = '';
    if (depositReportIpStatusInput) depositReportIpStatusInput.value = '';
    if (depositReportBonusStatusInput) depositReportBonusStatusInput.value = '';
    
    // Reset Shift
    const now = new Date();
    const hour = now.getHours();
    let shift = 'الخفر';
    if (hour >= 7 && hour < 15) shift = 'الصباحي';
    else if (hour >= 15 && hour < 23) shift = 'المسائي';
    setDepositShift(shift);

    // Reset Mentions
    if (depositMentionAhmedBtn) depositMentionAhmedBtn.classList.add('active');
    if (depositMentionBatoulBtn) depositMentionBatoulBtn.classList.add('active');
    
    // Reset Images
    depositSelectedImages = [];
    renderDepositImagePreviews();
    
    showToast('تم إعادة التعيين', 'تم مسح جميع الحقول', 'default');
  });
}

// Generate Deposit Report (Copy)
if (depositGenerateReportBtn) {
  depositGenerateReportBtn.addEventListener('click', async () => {
    const hasIpBeforeCopy = !!depositReportIpInput.value.trim();
    if (hasIpBeforeCopy) {
      const countryReady = await ensureCountryForInputs(
        depositReportIpInput,
        depositReportCountryInput,
        fetchDepositIpInfo,
        window.IPGeoClient && window.IPGeoClient.normalizeIPv4
          ? window.IPGeoClient.normalizeIPv4
          : null
      );
      if (!countryReady) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
        return;
      }
    }

    const ip = depositReportIpInput.value.trim();
    const country = depositReportCountryInput.value.trim();
    const account = depositReportAccountInput.value.trim();
    const email = depositReportEmailInput.value.trim();
    const margin = depositReportMarginInput.value.trim();
    const profitsStatus = depositReportProfitsStatusInput.value;
    const ipStatus = depositReportIpStatusInput.value;
    const bonusStatus = depositReportBonusStatusInput.value;
    const notes = depositReportNotesInput.value.trim();

    // Arabization mappings
    const profitsText = profitsStatus === 'positive' ? 'موجب' : 'سالب';
    const ipStatusText = ipStatus === 'matching' ? 'مطابق' : 'غير مطابق';
    const bonusText = bonusStatus === 'not-banned' ? 'العميل غير محظور من البونص' : 'العميل محظور من البونص';

    // Mentions
    let mentions = [];
    if (depositMentionAhmedBtn && depositMentionAhmedBtn.classList.contains('active')) {
      mentions.push('@ahmedelgma');
    }
    if (depositMentionBatoulBtn && depositMentionBatoulBtn.classList.contains('active')) {
      mentions.push('@batoulhassan');
    }
    const mentionsText = mentions.length > 0 ? '\n' + mentions.join(' ') : '';

    const report = `تقرير Deposit Report

ip country: ${country}
IP: ${ip}
الإيميل: ${email}
رقم الحساب: ${account}
نسبة الهامش: ${margin}

الأرباح للصفقات العائمة (${profitsText})
الـ IP الأخير (${ipStatusText}) لبلد التسجيل، ${bonusText}
${notes ? '\n' + notes : ''}
${mentionsText}
#deposit_percentages`;

    try {
      await navigator.clipboard.writeText(report);
      showToast('تم النسخ', 'تم نسخ التقرير إلى الحافظة', 'default');
    } catch (err) {
      console.error('Failed to copy report:', err);
      showToast('خطأ', 'فشل نسخ التقرير', 'warning');
    }
  });
}

// Send Deposit Report to Telegram
if (depositSendTelegramBtn) {
  depositSendTelegramBtn.addEventListener('click', async () => {
    const userSettings = await chrome.storage.local.get(['userSettings']);
    const employeeName = userSettings.userSettings?.employeeName;

    if (!employeeName) {
      showToast('تنبيه', 'الرجاء اختيار اسم الموظف من الإعدادات (⚙️)', 'warning');
      if (depositTelegramSettingsBtn) depositTelegramSettingsBtn.click();
      return;
    }

    const token = DEFAULT_TELEGRAM_TOKEN;
    const chatId = DEFAULT_TELEGRAM_CHAT_ID;

    const hasIpBeforeSend = !!depositReportIpInput.value.trim();
    if (hasIpBeforeSend) {
      const countryReady = await ensureCountryForInputs(
        depositReportIpInput,
        depositReportCountryInput,
        fetchDepositIpInfo,
        window.IPGeoClient && window.IPGeoClient.normalizeIPv4
          ? window.IPGeoClient.normalizeIPv4
          : null
      );
      if (!countryReady) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
        return;
      }
    }

    const ip = depositReportIpInput.value.trim();
    const country = depositReportCountryInput.value.trim();
    const account = depositReportAccountInput.value.trim();
    const email = depositReportEmailInput.value.trim();
    const margin = depositReportMarginInput.value.trim();
    const profitsStatus = depositReportProfitsStatusInput.value;
    const ipStatus = depositReportIpStatusInput.value;
    const bonusStatus = depositReportBonusStatusInput.value;
    const notes = depositReportNotesInput.value.trim();
    const shift = depositReportShiftInput ? depositReportShiftInput.value : '';

    if (!ip || !account || !email || !margin || !profitsStatus || !ipStatus || !bonusStatus || !shift) {
      showToast('بيانات ناقصة', 'الرجاء ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Map status values to readable text
    const statusMap = {
      'positive': 'موجب',
      'negative': 'سالب',
      'matching': 'مطابق',
      'not-matching': 'غير مطابق',
      'not-banned': 'غير محظور',
      'banned': 'محظور'
    };

    // Ensure margin has %
    let formattedMargin = margin;
    if (!formattedMargin.includes('%')) {
      formattedMargin += '%';
    }

    let message = `<b>تقرير Deposit Report</b>

<b>الموظف:</b> ${escapeHtml(employeeName)}
<b>فترة الشفت:</b> ${escapeHtml(shift)}
<b>ip country:</b> <code>${escapeHtml(country)}</code>
<b>IP:</b> <code>${escapeHtml(ip)}</code>
<b>الإيميل:</b> <code>${escapeHtml(email)}</code>
<b>رقم الحساب:</b> <code>${escapeHtml(account)}</code>
<b>نسبة الهامش:</b> <code>${escapeHtml(formattedMargin)}</code>

<b>الملاحظة:</b> <code>الأرباح للصفقات العائمة (${statusMap[profitsStatus] || profitsStatus}) - الـ IP الأخير (${statusMap[ipStatus] || ipStatus}) لبلد التسجيل، العميل ${statusMap[bonusStatus] || bonusStatus} من البونص</code>`;

    if (notes) {
      message += `\n\n<b>ملاحظة اضافية:</b> <code>${escapeHtml(notes)}</code>`;
    }

    message += `\n\n#deposit_percentages`;

    // Mentions
    let mentions = [];
    if (depositMentionAhmedBtn && depositMentionAhmedBtn.classList.contains('active')) {
      mentions.push('@ahmedelgma');
    }
    if (depositMentionBatoulBtn && depositMentionBatoulBtn.classList.contains('active')) {
      mentions.push('@batoulhassan');
    }

    if (mentions.length > 0) {
      message += '\n\n' + mentions.join(' ');
    }

    depositSendTelegramBtn.disabled = true;
    depositSendTelegramBtn.textContent = 'جاري الإرسال...';

    try {
      // Prepare Images
      const telegramImages = [];
      if (depositSelectedImages.length > 0) {
        for (const file of depositSelectedImages) {
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          telegramImages.push({ data: base64, type: file.type });
        }
      }

      // Send to Background
      const response = await chrome.runtime.sendMessage({
        type: 'submitReport',
        data: {
          gfSettings: null, // No Google Form for this report yet
          payload: {},
          telegramToken: token,
          telegramChatId: chatId,
          telegramMessage: message,
          telegramImages
        }
      });

      if (response && response.success) {
        showToast('تم الإرسال', 'تم إرسال التقرير بنجاح', 'default');
        // Reset UI
        depositResetReportBtn.click();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response?.error || 'Unknown error from background');
      }

      // Reset Button State
      depositSendTelegramBtn.disabled = false;
      depositSendTelegramBtn.textContent = 'إرسال';

    } catch (error) {
      console.error('Submission Error:', error);
      showToast('فشل الإرسال', `حدث خطأ: ${error.message}`, 'warning');
      depositSendTelegramBtn.disabled = false;
      depositSendTelegramBtn.textContent = 'إرسال';
    }
  });
}

// Withdrawal Report Button Handler
if (withdrawalReportBtn) {
  withdrawalReportBtn.addEventListener('click', () => {
    switchTab('withdrawal-report');
  });
}

// --- Withdrawal Report Logic ---
let withdrawalSelectedImages = [];

// --- Persistence Logic ---
const WITHDRAWAL_DRAFT_KEY = 'withdrawalReportDraft';

async function saveWithdrawalDraft() {
    const draft = {
        wallet: withdrawalWalletInput ? withdrawalWalletInput.value : '',
        email: withdrawalEmailInput ? withdrawalEmailInput.value : '',
        images: withdrawalSelectedImages.map(img => ({
            name: img.file.name,
            type: img.file.type,
            dataUrl: img.dataUrl
        }))
    };
    try {
        await chrome.storage.local.set({ [WITHDRAWAL_DRAFT_KEY]: draft });
    } catch (e) {
        console.error('Failed to save draft:', e);
    }
}

async function loadWithdrawalDraft() {
    try {
        const data = await chrome.storage.local.get(WITHDRAWAL_DRAFT_KEY);
        const draft = data[WITHDRAWAL_DRAFT_KEY];
        if (draft) {
            if (withdrawalWalletInput) withdrawalWalletInput.value = draft.wallet || '';
            if (withdrawalEmailInput) withdrawalEmailInput.value = draft.email || '';
            
            if (draft.images && Array.isArray(draft.images)) {
                withdrawalSelectedImages = draft.images.map(img => ({
                    file: { name: img.name, type: img.type }, // Mock file object
                    dataUrl: img.dataUrl
                }));
                renderWithdrawalPreviews();
            }
        }
    } catch (e) {
        console.error('Failed to load draft:', e);
    }
}

async function clearWithdrawalDraft() {
    try {
        await chrome.storage.local.remove(WITHDRAWAL_DRAFT_KEY);
    } catch (e) {
        console.error('Failed to clear draft:', e);
    }
}


// Add Listeners for Saving
if (withdrawalWalletInput) {
    withdrawalWalletInput.addEventListener('input', saveWithdrawalDraft);
}
if (withdrawalEmailInput) {
    withdrawalEmailInput.addEventListener('input', saveWithdrawalDraft);
}
// Note: Image saving is handled in handleWithdrawalFiles and remove logic

// 1. Email Paste Logic
if (withdrawalEmailInput) {
    withdrawalEmailInput.addEventListener('paste', (e) => {
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        if (!pastedText) return;

        // 1. Try to parse structured report (Email + Country)
        const lines = pastedText.split(/\r?\n/);
        const structuredRecords = [];
        let currentEmail = null;
        let foundWallet = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for Email
            if (line.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
                currentEmail = line;
            }
            
            // Check for Wallet (starts with T, 34 chars)
            if (line.match(/^T[a-zA-Z0-9]{33}$/)) {
                foundWallet = line;
                // Country is usually 2 lines before Wallet
                if (i >= 2) {
                    const country = lines[i-2].trim();
                    // Basic validation: Country shouldn't be an IP or empty
                    if (country && !country.match(/^\d+\./) && currentEmail) {
                        structuredRecords.push({ email: currentEmail, country: country });
                        currentEmail = null; // Reset
                    }
                }
            }
        }

        // If we found structured data
        if (structuredRecords.length > 0) {
            e.preventDefault();
            
            // Auto-fill wallet if empty
            if (foundWallet && withdrawalWalletInput && !withdrawalWalletInput.value) {
                withdrawalWalletInput.value = foundWallet;
                checkWithdrawalDuplicate(foundWallet);
            }

            // Deduplicate by Email (keep first occurrence)
            const uniqueMap = new Map();
            structuredRecords.forEach(rec => {
                if (!uniqueMap.has(rec.email)) {
                    uniqueMap.set(rec.email, rec.country);
                }
            });

            // Format: "email - Country"
            const newEntries = Array.from(uniqueMap.entries()).map(([email, country]) => `${email} - ${country}`);
            
            // Merge with existing content (if any)
            // We'll just append or replace? User usually pastes into empty or wants to add.
            // Let's append if there's content, but handle deduplication with existing is hard if format differs.
            // For simplicity, if the input is empty, just set. If not, append.
            
            const currentVal = withdrawalEmailInput.value.trim();
            if (currentVal) {
                withdrawalEmailInput.value = currentVal + '\n' + newEntries.join('\n');
            } else {
                withdrawalEmailInput.value = newEntries.join('\n');
            }
            
            saveWithdrawalDraft();
            showToast('تم الاستخراج', `تم استخراج ${uniqueMap.size} إيميل مع الدولة`, 'default');
            return;
        }

        // 2. Fallback: Simple Email Extraction (Old Logic)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = pastedText.match(emailRegex);
        
        if (matches && matches.length > 0) {
            e.preventDefault(); 
            
            const currentText = withdrawalEmailInput.value;
            const existingEmails = currentText.match(emailRegex) || [];
            
            const allEmails = [...existingEmails, ...matches];
            const uniqueEmails = [...new Set(allEmails)];
            
            withdrawalEmailInput.value = uniqueEmails.join('\n');
            saveWithdrawalDraft();
            
            showToast('تم الاستخراج', `تم استخراج ${uniqueEmails.length} إيميل بنجاح`, 'default');
        } else {
            setTimeout(saveWithdrawalDraft, 100);
        }
    });
}

// Wallet Copy Logic & Duplicate Check
if (withdrawalWalletInput) {
    withdrawalWalletInput.addEventListener('click', () => {
        if (withdrawalWalletInput.value.trim()) {
            navigator.clipboard.writeText(withdrawalWalletInput.value.trim());
            showToast('تم النسخ', 'تم نسخ عنوان المحفظة', 'default');
        }
    });

    withdrawalWalletInput.addEventListener('input', async () => {
        saveWithdrawalDraft();
        const wallet = withdrawalWalletInput.value.trim();
        if (wallet.length > 10) { // Basic length check
            checkWithdrawalDuplicate(wallet);
        }
    });
}

function getCurrentShiftInfo() {
    const now = new Date();
    const day = now.getDay(); // 5 = Friday
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    let shift = 'الخفر';

    // Friday Special Schedule
    if (day === 5) {
        if (totalMinutes >= 420 && totalMinutes <= 759) shift = 'الصباحي';
        else if (totalMinutes >= 760 && totalMinutes <= 1099) shift = 'المسائي';
        else shift = 'الخفر';
    } 
    // Standard Schedule
    else {
        if (hour >= 7 && hour < 15) shift = 'الصباحي';
        else if (hour >= 15 && hour < 23) shift = 'المسائي';
        else shift = 'الخفر';
    }
    
    let date = new Date(now);
    // If it's Night shift and we are in the early morning (00:00 - 06:59), 
    // we consider this part of the shift that started yesterday.
    // Note: On Friday, Night starts at 18:20. If it's Saturday 00:30 (day=6), 
    // it's still Night, and we roll back to Friday.
    if (shift === 'الخفر' && hour < 7) {
        date.setDate(date.getDate() - 1);
    }
    
    const shiftKey = `${date.toISOString().split('T')[0]}_${shift}`;
    return { shift, shiftKey };
}

async function checkWithdrawalDuplicate(wallet) {
    const feedbackEl = document.getElementById('withdrawal-wallet-feedback');
    
    if (!wallet) {
        withdrawalWalletInput.style.borderColor = '#4a5568';
        if (feedbackEl) {
            feedbackEl.textContent = '';
            feedbackEl.style.color = 'inherit';
        }
        return false;
    }

    const { shift: currentShift, shiftKey: currentShiftKey } = getCurrentShiftInfo();
    const data = await chrome.storage.local.get('withdrawalHistory');
    const history = data.withdrawalHistory || {};
    
    let lastUsed = null;
    let lastUsedShiftKey = null;

    // Search all history for this wallet
    for (const [sKey, sData] of Object.entries(history)) {
        if (sData[wallet]) {
            if (!lastUsed || sData[wallet] > lastUsed) {
                lastUsed = sData[wallet];
                lastUsedShiftKey = sKey;
            }
        }
    }

    if (lastUsed) {
        const dateObj = new Date(lastUsed);
        const timeStr = dateObj.toLocaleTimeString('ar-EG');
        const dateStr = dateObj.toLocaleDateString('ar-EG');
        const usedShiftName = lastUsedShiftKey.split('_')[1] || 'غير معروف';

        if (lastUsedShiftKey === currentShiftKey) {
            // Same Shift -> RED & Block
            const msg = `⛔ مكرر! تم استخدامه اليوم في شفت ${usedShiftName} الساعة ${timeStr}`;
            showToast('تنبيه تكرار', msg, 'warning', 8000);
            withdrawalWalletInput.style.borderColor = '#e74c3c'; // Red
            if (feedbackEl) {
                feedbackEl.textContent = msg;
                feedbackEl.style.color = '#e74c3c';
            }
            return true;
        } else {
            // Different Shift -> Orange & Warn
            const msg = `⚠️ تنبيه: تم استخدامه سابقاً بتاريخ ${dateStr} شفت ${usedShiftName} الساعة ${timeStr}`;
            withdrawalWalletInput.style.borderColor = '#f39c12'; // Orange
            if (feedbackEl) {
                feedbackEl.textContent = msg;
                feedbackEl.style.color = '#f39c12';
            }
            return false;
        }
    } else {
        // New Wallet -> Green
        withdrawalWalletInput.style.borderColor = '#2ecc71'; // Green
        if (feedbackEl) {
            feedbackEl.textContent = '✅ عنوان جديد (لم يتم استخدامه من قبل)';
            feedbackEl.style.color = '#2ecc71';
        }
        return false;
    }
}

async function saveWithdrawalToHistory(wallet) {
    const { shiftKey } = getCurrentShiftInfo();
    const data = await chrome.storage.local.get('withdrawalHistory');
    const history = data.withdrawalHistory || {};
    
    if (!history[shiftKey]) {
        history[shiftKey] = {};
    }
    
    history[shiftKey][wallet] = Date.now();
    
    // Cleanup old history (keep last 20 shifts ~ 1 week)
    const keys = Object.keys(history).sort();
    if (keys.length > 20) {
        const newHistory = {};
        keys.slice(-20).forEach(k => newHistory[k] = history[k]);
        await chrome.storage.local.set({ withdrawalHistory: newHistory });
    } else {
        await chrome.storage.local.set({ withdrawalHistory: history });
    }
}

// 2. Image Upload Logic
if (withdrawalDropZone && withdrawalFileInput) {
    withdrawalDropZone.addEventListener('click', () => withdrawalFileInput.click());

    withdrawalDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        withdrawalDropZone.classList.add('dragover');
    });

    withdrawalDropZone.addEventListener('dragleave', () => {
        withdrawalDropZone.classList.remove('dragover');
    });

    withdrawalDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        withdrawalDropZone.classList.remove('dragover');
        handleWithdrawalFiles(e.dataTransfer.files);
    });

    withdrawalFileInput.addEventListener('change', () => {
        handleWithdrawalFiles(withdrawalFileInput.files);
        withdrawalFileInput.value = ''; 
    });

    // Paste images
    document.addEventListener('paste', (e) => {
        if (activeTab !== 'withdrawal-report') return;
        
        if (e.clipboardData && e.clipboardData.items) {
            const items = e.clipboardData.items;
            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    files.push(items[i].getAsFile());
                }
            }
            if (files.length > 0) {
                handleWithdrawalFiles(files);
            }
        }
    });
}

function handleWithdrawalFiles(files) {
    if (withdrawalSelectedImages.length + files.length > 3) {
        showToast('تنبيه', 'الحد الأقصى 3 صور فقط', 'warning');
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imgObj = {
                file: file,
                dataUrl: e.target.result
            };
            withdrawalSelectedImages.push(imgObj);
            renderWithdrawalPreviews();
            saveWithdrawalDraft(); // Save after adding image
        };
        reader.readAsDataURL(file);
    });
}

function renderWithdrawalPreviews() {
    if (!withdrawalPreviewContainer) return;
    withdrawalPreviewContainer.innerHTML = '';
    withdrawalSelectedImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        
        div.innerHTML = `
            <img src="${img.dataUrl}" class="preview-image">
            <button class="remove-image-btn" data-index="${index}">×</button>
        `;
        withdrawalPreviewContainer.appendChild(div);
    });

    document.querySelectorAll('#withdrawal-preview-container .remove-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            withdrawalSelectedImages.splice(index, 1);
            renderWithdrawalPreviews();
            saveWithdrawalDraft(); // Save after removing image
        });
    });
}

// 3. Reset Logic
if (withdrawalResetBtn) {
    withdrawalResetBtn.addEventListener('click', () => {
        if (withdrawalWalletInput) withdrawalWalletInput.value = '';
        if (withdrawalEmailInput) withdrawalEmailInput.value = '';
        withdrawalSelectedImages = [];
        renderWithdrawalPreviews();
        clearWithdrawalDraft(); // Clear draft on reset
        showToast('تم', 'تم إعادة تعيين النموذج', 'default');
    });
}

// 4. Submit Logic
if (withdrawalSubmitBtn) {
    withdrawalSubmitBtn.addEventListener('click', async () => {
        const wallet = withdrawalWalletInput.value.trim();
        const email = withdrawalEmailInput.value.trim();
        
        if (!wallet || !email) {
            showToast('خطأ', 'يرجى ملء الحقول المطلوبة (المحفظة والإيميل)', 'warning');
            return;
        }

        // Check for duplicates before sending
        const isDuplicate = await checkWithdrawalDuplicate(wallet);
        if (isDuplicate) {
            // Optional: You could allow them to proceed with a confirmation dialog, 
            // but for now we just stop and show the warning from checkWithdrawalDuplicate.
            return; 
        }

        const userSettings = await chrome.storage.local.get(['userSettings']);
        const employeeName = userSettings.userSettings?.employeeName || 'Unknown';
        const token = DEFAULT_TELEGRAM_TOKEN;
        const chatId = DEFAULT_TELEGRAM_CHAT_ID;

        const escapeHtml = (text) => {
            if (!text) return '';
            return text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
        };

        // Format emails: split by newline, wrap each in <code>, join back
        const formattedEmails = email
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Check if line has " - " (Email - Country)
                const parts = line.split(' - ');
                if (parts.length >= 2) {
                    const em = parts[0].trim();
                    const co = parts[1].trim();
                    return `<code>${escapeHtml(em)}</code> - <code>${escapeHtml(co)}</code>`;
                } else {
                    return `<code>${escapeHtml(line)}</code>`;
                }
            })
            .join('\n');

        let message = `<b>تقرير سحب جديد</b>

<b>الموظف:</b> ${escapeHtml(employeeName)}

<b>عنوان المحفظة:</b> <code>${escapeHtml(wallet)}</code>

<b>الإيميلات:</b>
${formattedEmails}

اكثر من عميل يسحب علي نفس عنوان المحفظة

#payouts`;

        withdrawalSubmitBtn.disabled = true;
        withdrawalSubmitBtn.textContent = 'جاري الإرسال...';

        try {
            // Prepare Images
            const telegramImages = [];
            if (withdrawalSelectedImages.length > 0) {
                for (const fileObj of withdrawalSelectedImages) {
                    // dataUrl is already base64
                    telegramImages.push({ data: fileObj.dataUrl, type: fileObj.file.type });
                }
            }

            const response = await chrome.runtime.sendMessage({
                type: 'submitReport',
                data: {
                    gfSettings: null,
                    payload: {},
                    telegramToken: token,
                    telegramChatId: chatId,
                    telegramMessage: message,
                    telegramImages
                }
            });

            if (response && response.success) {
                await saveWithdrawalToHistory(wallet); // Save to history
                showToast('تم الإرسال', 'تم إرسال تقرير السحب بنجاح', 'default');
                withdrawalResetBtn.click();
            } else {
                throw new Error(response?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Withdrawal Submission Error:', error);
            showToast('فشل الإرسال', `حدث خطأ: ${error.message}`, 'warning');
        } finally {
            withdrawalSubmitBtn.disabled = false;
            withdrawalSubmitBtn.textContent = 'إرسال التقرير';
        }
    });
}


/* ==========================================================================
   CUSTOM DROPDOWN LOGIC (To Fix Separator Lines in Side Panel)
   ========================================================================== */
function convertToCustomSelect(selectId) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect || originalSelect.style.display === 'none') return; 

  // Reliability: keep Employee Name as native select (custom dropdown caused click/overlay issues)
  if (selectId === 'employee-name-select') return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.classList.add('wrapper-' + selectId);
    
    // Critical Fix: Ensure z-index is higher than subsequent elements (like buttons) in modals
    if (selectId === 'employee-name-select') {
        wrapper.style.zIndex = '1000'; // Increased to 1000 to beat any other modal elements
        wrapper.style.position = 'relative'; 
      dbgUserSettings('convertToCustomSelect(employee-name-select): created wrapper/trigger');
    }
    
    // Create trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';

    trigger.innerHTML = '<span>' + (originalSelect.options[originalSelect.selectedIndex]?.text || 'اختر...') + '</span>';
    
    // Create options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';

    // Populate options with categories
    if (originalSelect.querySelector('optgroup')) {
        originalSelect.querySelectorAll('optgroup').forEach(group => {
            const catHeader = document.createElement('div');
            catHeader.className = 'custom-option-category';
            catHeader.textContent = group.label;
            optionsContainer.appendChild(catHeader);

            group.querySelectorAll('option').forEach(opt => {
                const optDiv = createOptionDiv(opt, trigger, originalSelect, wrapper);
                optionsContainer.appendChild(optDiv);
            });
        });
    } else {
        Array.from(originalSelect.options).forEach(opt => {
            if (opt.disabled) return;
            const optDiv = createOptionDiv(opt, trigger, originalSelect, wrapper);
            optionsContainer.appendChild(optDiv);
        });
    }

    // Helper
    function createOptionDiv(opt, trigger, originalSelect, wrapper) {
        const div = document.createElement('div');
        div.className = 'custom-option';
        if (opt.selected) div.classList.add('selected');
        div.textContent = opt.text;
        div.dataset.value = opt.value;
        
        div.addEventListener('click', () => {
             trigger.querySelector('span').textContent = opt.text;
             wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
             div.classList.add('selected');
             originalSelect.value = opt.value;
             originalSelect.dispatchEvent(new Event('change')); 
             wrapper.classList.remove('open');
        });
        return div;
    }

    // Toggle
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Stop any form submission or focus stealing

        if (selectId === 'employee-name-select') {
          dbgUserSettings('Trigger click: before toggle. wrapper.open?', wrapper.classList.contains('open'));
          dbgUserSettings('Trigger click target:', e.target);
        }
        
        // Close others
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) {
                 w.classList.remove('open');
                 // Only reset zIndex if it's not the special employee one (which has its own logic handling, but we can override generally too for safety)
                 if (!w.classList.contains('wrapper-employee-name-select')) w.style.zIndex = '';
            }
        });
        
        const isOpening = !wrapper.classList.contains('open');

        // Force z-index update when opening
        if (isOpening) {
             wrapper.style.zIndex = '9999';
        } else {
             // Delay resetting z-index slightly to allow animation to finish perfectly
             // For employee-name-select we keep 1000, others remove
             const baseZ = (selectId === 'employee-name-select') ? '1000' : '';
             setTimeout(() => wrapper.style.zIndex = baseZ, 300);
        }

          // Adaptive open direction (up/down) for best viewport fit
          try {
            const rect = trigger.getBoundingClientRect();
            const viewportH = window.innerHeight || document.documentElement.clientHeight;
            const spaceBelow = viewportH - rect.bottom;
            const spaceAbove = rect.top;
            const maxH = 500; // keep aligned with CSS max-height
            const contentH = Math.min(optionsContainer.scrollHeight || 0, maxH);
            const margin = 12; // breathing room for shadows/margins
            const availableBelow = Math.max(0, spaceBelow - margin);
            const availableAbove = Math.max(0, spaceAbove - margin);
            const fitsBelow = contentH <= availableBelow;
            const fitsAbove = contentH <= availableAbove;

            wrapper.classList.remove('open-up', 'open-down');
            let openDir;
            if (fitsBelow && !fitsAbove) openDir = 'down';
            else if (fitsAbove && !fitsBelow) openDir = 'up';
            else openDir = (availableBelow >= availableAbove) ? 'down' : 'up';

            wrapper.classList.add(openDir === 'up' ? 'open-up' : 'open-down');
          } catch (_) {
            wrapper.classList.remove('open-up');
            wrapper.classList.add('open-down');
          }

          wrapper.classList.toggle('open');

           if (selectId === 'employee-name-select') {
          dbgUserSettings('Trigger click: after toggle. wrapper.open?', wrapper.classList.contains('open'), 'zIndex:', wrapper.style.zIndex);
           }
    });

    // Close outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
    });

    // Sync
    originalSelect.addEventListener('change', () => {
         const selectedText = originalSelect.options[originalSelect.selectedIndex]?.text;
         if (selectedText) trigger.querySelector('span').textContent = selectedText;
    });

    // Install
    originalSelect.parentNode.insertBefore(wrapper, originalSelect);
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    originalSelect.style.display = 'none';
}

// Employee Evaluation Button Logic
document.addEventListener('DOMContentLoaded', async () => {
    const evaluationBtn = document.getElementById('evaluation-btn');
    if (evaluationBtn) {
        const authorizedUsers = employeeDirectory ? employeeDirectory.getAuthorizedEmployeeNames() : [];
        
        const checkUser = async () => {
             const { userSettings } = await chrome.storage.local.get(['userSettings']);
             const employeeName = userSettings?.employeeName;
             if (authorizedUsers.includes(employeeDirectory ? employeeDirectory.normalizeEmployeeName(employeeName) : employeeName)) {
                 evaluationBtn.style.display = ''; // Revert to CSS default (visible)
             } else {
                 evaluationBtn.style.display = 'none';
             }
        };
        
        await checkUser();

        evaluationBtn.addEventListener('click', () => {
             chrome.tabs.create({ url: chrome.runtime.getURL('evaluation.html') });
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.userSettings) {
                checkUser();
            }
        });
    }
});

// =====================================================
// CREDIT OUT SECTION LOGIC
// =====================================================

(function() {
  // DOM Elements
  const creditOutEmailInput = document.getElementById('credit-out-email');
  const creditOutAccountInput = document.getElementById('credit-out-account');
  const creditOutIpInput = document.getElementById('credit-out-ip');
  const creditOutCountryInput = document.getElementById('credit-out-country');
  const creditOutDateInput = document.getElementById('credit-out-date');
  const creditOutAmountInput = document.getElementById('credit-out-amount');
  const creditOutNotesInput = document.getElementById('credit-out-notes');
  const creditOutShiftInput = document.getElementById('credit-out-shift');
  const creditOutShiftBtns = document.querySelectorAll('.credit-out-shift-btn');
  
  const creditOutCopyBtn = document.getElementById('credit-out-copy-btn');
  const creditOutSendBtn = document.getElementById('credit-out-send-btn');
  const creditOutResetBtn = document.getElementById('credit-out-reset-btn');
  
  const creditOutDropZone = document.getElementById('credit-out-drop-zone');
  const creditOutFileInput = document.getElementById('credit-out-file-input');
  const creditOutPreviewContainer = document.getElementById('credit-out-preview-container');
  
  const creditOutMentionAhmed = document.getElementById('credit-out-mention-ahmed');
  const creditOutMentionBatoul = document.getElementById('credit-out-mention-batoul');
  
  // Modals
  const creditOutNotesModal = document.getElementById('credit-out-notes-modal');
  const creditOutNotesModalBtn = document.getElementById('credit-out-notes-modal-btn');
  const creditOutNotesModalClose = document.getElementById('credit-out-notes-modal-close');
  const creditOutNotesList = document.getElementById('credit-out-notes-list');
  const creditOutNewNoteInput = document.getElementById('credit-out-new-note-input');
  const creditOutAddNoteBtn = document.getElementById('credit-out-add-note-btn');
  
  const creditOutSettingsModal = document.getElementById('credit-out-settings-modal');
  const creditOutSettingsBtn = document.getElementById('credit-out-settings-btn');
  const creditOutSettingsClose = document.getElementById('credit-out-settings-close');
  const creditOutEmployeeSelect = document.getElementById('credit-out-employee-select');
  const creditOutSaveSettingsBtn = document.getElementById('credit-out-save-settings-btn');

  if (employeeDirectory) {
    employeeDirectory.populateEmployeeSelect(creditOutEmployeeSelect);
  }

  // Constants - Use same token as main transfer report
  const CREDIT_OUT_TELEGRAM_TOKEN = '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
  const CREDIT_OUT_TELEGRAM_CHAT_ID = '-1003692121203';

  let creditOutSelectedImages = [];
  let creditOutSavedNotes = [];

  // Helper functions
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  function formatCreditOutAmountWithDollar(value) {
    const cleaned = (value || '').toString().replace(/\$/g, '').trim();
    if (!cleaned) return '';
    return `${cleaned}$`;
  }

  // Extract date/time from raw data
  function extractDateTime(rawText) {
    const dateTimePattern = /(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})/;
    const match = rawText.match(dateTimePattern);
    return match ? match[1] : '';
  }

  // Extract amount from a raw trade/balance line.
  // Primary source: MT row "PROFIT" column (column 15, 1-based) when tab-separated data is available.
  // Fallbacks handle non-tab text and notes like "... 961 From 3081770 P2P Account".
  function extractTradeAmount(rawText) {
    const text = (rawText || '').toString().trim();
    if (!text) return '';

    const normalizeNumericToken = (token) => {
      const cleaned = (token || '').toString().replace(/\$/g, '').replace(/,/g, '').trim();
      return /^[+-]?\d+(?:\.\d+)?$/.test(cleaned) ? cleaned : '';
    };

    // Preferred path: parse tab-separated MT row and read PROFIT column directly.
    // PROFIT is column 15 (1-based) => index 14.
    if (text.includes('\t')) {
      const columns = text.split('\t').map((part) => part.trim());
      if (columns.length >= 15) {
        const profitColumnAmount = normalizeNumericToken(columns[14]);
        if (profitColumnAmount) return profitColumnAmount;
      }
    }

    const beforeTransferPartyMatch = text.match(/([+-]?\d[\d,]*(?:\.\d+)?)\s+(?:From|To)\b/i);
    if (beforeTransferPartyMatch) {
      return beforeTransferPartyMatch[1].replace(/,/g, '');
    }

    const tokens = text
      .replace(/\$/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/,/g, '').trim())
      .filter(Boolean);

    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const amount = normalizeNumericToken(tokens[i]);
      if (amount) {
        return amount;
      }
    }
    return '';
  }

  // Fetch IP info
  async function creditOutFetchIpInfo(ip) {
    if (!ip || !creditOutCountryInput) return false;
    try {
      creditOutCountryInput.value = 'جاري البحث...';
      const geoClient = window.IPGeoClient;
      const result = geoClient
        ? await (geoClient.lookupWithRetry
          ? geoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120 })
          : geoClient.lookup(ip))
        : { success: false, error: 'IPGeoClient unavailable' };
      if (result.success) {
        const display = geoClient.toCountryDisplay(result.data, 'Unknown');
        creditOutCountryInput.value = display;
        if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
          return geoClient.isCountryTextResolved(display);
        }
        return !!display && display !== 'Unknown' && display !== 'Error';
      }

      console.warn('Credit-out IP lookup failed:', result.error);
      creditOutCountryInput.value = 'Unknown';
      return false;
    } catch (error) {
      console.error('Error fetching IP info:', error);
      creditOutCountryInput.value = 'Error';
      return false;
    }
  }

  async function ensureCreditOutCountry() {
    if (!creditOutIpInput || !creditOutCountryInput) return false;
    const ipRaw = (creditOutIpInput.value || '').trim();
    if (!ipRaw) return false;

    const ip = extractIp(ipRaw);
    if (!ip) return false;
    if (ip !== ipRaw) creditOutIpInput.value = ip;

    const geoClient = window.IPGeoClient;
    const currentCountry = (creditOutCountryInput.value || '').trim();
    if (geoClient && typeof geoClient.isCountryTextResolved === 'function' && geoClient.isCountryTextResolved(currentCountry)) {
      return true;
    }

    const ok = await creditOutFetchIpInfo(ip);
    if (ok) return true;

    const finalCountry = (creditOutCountryInput.value || '').trim();
    if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
      return geoClient.isCountryTextResolved(finalCountry);
    }
    return !!finalCountry && finalCountry !== 'Unknown' && finalCountry !== 'Error';
  }

  // Auto-detect shift
  window.creditOutAutoDetectShift = function() {
    const now = new Date();
    const hour = now.getHours();
    let shift = '';
    
    if (hour >= 8 && hour < 16) {
      shift = 'الصباحي';
    } else if (hour >= 16 && hour < 24) {
      shift = 'المسائي';
    } else {
      shift = 'الخفر';
    }
    
    creditOutShiftBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === shift) {
        btn.classList.add('active');
        if (creditOutShiftInput) creditOutShiftInput.value = shift;
      }
    });
  };

  // Amount input - auto add $
  if (creditOutAmountInput) {
    creditOutAmountInput.addEventListener('blur', () => {
      const raw = creditOutAmountInput.value;
      const formatted = formatCreditOutAmountWithDollar(raw);
      creditOutAmountInput.value = formatted;
    });
  }

  // Date input handlers - auto-filter to extract date/time
  if (creditOutDateInput) {
    creditOutDateInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = creditOutDateInput.value.trim();
        const extractedDate = extractDateTime(val);
        const extractedAmount = extractTradeAmount(val);

        if (extractedDate) {
          creditOutDateInput.value = extractedDate;
        }

        if (extractedAmount && creditOutAmountInput) {
          creditOutAmountInput.value = formatCreditOutAmountWithDollar(extractedAmount);
        }

        if (extractedDate && extractedAmount) {
          showToast('تم', 'تم استخراج التاريخ والوقت والمبلغ', 'success');
        } else if (extractedDate) {
          showToast('تم', 'تم استخراج التاريخ والوقت', 'success');
        } else if (extractedAmount) {
          showToast('تم', 'تم استخراج المبلغ', 'success');
        }
      }, 10);
    });

    creditOutDateInput.addEventListener('blur', () => {
      const val = creditOutDateInput.value.trim();
      if (val) {
        const extracted = extractDateTime(val);
        if (extracted && extracted !== val) {
          creditOutDateInput.value = extracted;
        }

        const extractedAmount = extractTradeAmount(val);
        if (
          extractedAmount &&
          creditOutAmountInput &&
          !(creditOutAmountInput.value || '').trim()
        ) {
          creditOutAmountInput.value = formatCreditOutAmountWithDollar(extractedAmount);
        }
      }
    });
  }

  // IP input handlers
  if (creditOutIpInput) {
    // Auto-fetch country when IP is typed (debounced)
    let creditOutIpDebounceTimer = null;
    creditOutIpInput.addEventListener('input', () => {
      clearTimeout(creditOutIpDebounceTimer);
      creditOutIpDebounceTimer = setTimeout(() => {
        const val = creditOutIpInput.value.trim();
        const cleanIp = extractIp(val);
        if (cleanIp) {
          creditOutFetchIpInfo(cleanIp);
        }
      }, 500);
    });

    creditOutIpInput.addEventListener('blur', () => {
      const val = creditOutIpInput.value.trim();
      
      // Check for IP//Country format
      if (val.includes('//')) {
        const parts = val.split('//');
        const ip = extractIp(parts[0]);
        if (ip) {
          creditOutIpInput.value = ip;
          if (creditOutCountryInput) creditOutCountryInput.value = parts[1]?.trim() || '';
          creditOutFetchIpInfo(ip);
          return;
        }
      }
      
      const cleanIp = extractIp(val);
      if (cleanIp) {
        if (cleanIp !== val) creditOutIpInput.value = cleanIp;
        creditOutFetchIpInfo(cleanIp);
      } else if (val !== '') {
        if (isAccount(val) && creditOutAccountInput) {
          creditOutAccountInput.value = val;
          creditOutIpInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        } else if (isEmail(val) && creditOutEmailInput) {
          creditOutEmailInput.value = val;
          creditOutIpInput.value = '';
          showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
        }
      }
    });

    creditOutIpInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = creditOutIpInput.value.trim();
        
        if (val.includes('//')) {
          const parts = val.split('//');
          const ip = extractIp(parts[0]);
          if (ip) {
            creditOutIpInput.value = ip;
            if (creditOutCountryInput) creditOutCountryInput.value = parts[1]?.trim() || '';
            creditOutFetchIpInfo(ip);
            return;
          }
        }
        
        const cleanIp = extractIp(val);
        if (cleanIp) {
          creditOutIpInput.value = cleanIp;
          creditOutFetchIpInfo(cleanIp);
        }
      }, 10);
    });
  }

  // Account input handlers
  if (creditOutAccountInput) {
    creditOutAccountInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = creditOutAccountInput.value.trim();
        if (isEmail(val) && creditOutEmailInput) {
          creditOutEmailInput.value = val;
          creditOutAccountInput.value = '';
          showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
        } else if (extractIp(val) && creditOutIpInput) {
          creditOutIpInput.value = extractIp(val);
          creditOutAccountInput.value = '';
          creditOutFetchIpInfo(extractIp(val));
          showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
        }
      }, 10);
    });
  }

  // Email input handlers
  if (creditOutEmailInput) {
    creditOutEmailInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = creditOutEmailInput.value.trim();
        if (isAccount(val) && creditOutAccountInput) {
          creditOutAccountInput.value = val;
          creditOutEmailInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        } else if (extractIp(val) && creditOutIpInput) {
          creditOutIpInput.value = extractIp(val);
          creditOutEmailInput.value = '';
          creditOutFetchIpInfo(extractIp(val));
          showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
        }
      }, 10);
    });
  }

  // Shift selection
  creditOutShiftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      creditOutShiftBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (creditOutShiftInput) creditOutShiftInput.value = btn.dataset.value;
    });
  });

  // Mentions - Allow selecting both or one or none
  if (creditOutMentionAhmed) {
    creditOutMentionAhmed.addEventListener('click', () => {
      creditOutMentionAhmed.classList.toggle('active');
    });
  }
  if (creditOutMentionBatoul) {
    creditOutMentionBatoul.addEventListener('click', () => {
      creditOutMentionBatoul.classList.toggle('active');
      if (creditOutMentionAhmed) creditOutMentionAhmed.classList.remove('active');
    });
  }

  // Image handling
  function renderCreditOutImagePreviews() {
    if (!creditOutPreviewContainer) return;
    creditOutPreviewContainer.innerHTML = '';
    creditOutSelectedImages.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      item.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid #444;';
      item.innerHTML = `
        <img src="${img.data}" style="width: 100%; height: 100%; object-fit: cover;">
        <button class="remove-credit-out-image" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(231, 76, 60, 0.9); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">×</button>
      `;
      creditOutPreviewContainer.appendChild(item);
    });

    document.querySelectorAll('.remove-credit-out-image').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        creditOutSelectedImages.splice(index, 1);
        renderCreditOutImagePreviews();
      });
    });
  }

  if (creditOutFileInput) {
    creditOutFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            creditOutSelectedImages.push({
              name: file.name,
              data: event.target.result,
              file: file
            });
            renderCreditOutImagePreviews();
          };
          reader.readAsDataURL(file);
        }
      });
      e.target.value = '';
    });
  }

  if (creditOutDropZone) {
    creditOutDropZone.addEventListener('click', () => {
      if (creditOutFileInput) creditOutFileInput.click();
    });

    creditOutDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      creditOutDropZone.style.borderColor = '#3498db';
    });

    creditOutDropZone.addEventListener('dragleave', () => {
      creditOutDropZone.style.borderColor = '';
    });

    creditOutDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      creditOutDropZone.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            creditOutSelectedImages.push({
              name: file.name,
              data: event.target.result,
              file: file
            });
            renderCreditOutImagePreviews();
          };
          reader.readAsDataURL(file);
        }
      });
    });

    // Paste from clipboard (Ctrl+V)
    document.addEventListener('paste', (e) => {
      // Only handle paste when credit-out section is visible
      const creditOutSection = document.getElementById('credit-out-section');
      if (!creditOutSection || creditOutSection.style.display === 'none') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              creditOutSelectedImages.push({
                name: `pasted-image-${Date.now()}.png`,
                data: event.target.result,
                file: file
              });
              renderCreditOutImagePreviews();
              showToast('تم', 'تم لصق الصورة بنجاح', 'success');
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    });
  }

  // Generate report text
  function generateCreditOutReportText() {
    const shift = creditOutShiftInput?.value || 'غير محدد';
    const email = creditOutEmailInput?.value.trim() || 'غير محدد';
    const account = creditOutAccountInput?.value.trim() || 'غير محدد';
    const ip = creditOutIpInput?.value.trim() || 'غير محدد';
    const country = creditOutCountryInput?.value.trim() || 'غير محدد';
    const dateTime = creditOutDateInput?.value.trim() || 'غير محدد';
    const rawAmount = creditOutAmountInput?.value.trim() || '';
    const amount = rawAmount ? formatCreditOutAmountWithDollar(rawAmount) : 'غير محدد';
    const notes = creditOutNotesInput?.value.trim() || 'لا توجد';

    // Get employee name from settings
    let employeeName = 'غير محدد';
    
    let reportText = `الموظف: ${employeeName}\n`;
    reportText += `فترة الشفت: ${shift}\n`;
    reportText += `ip country: ${country}\n`;
    reportText += `IP: ${ip}\n`;
    reportText += `الإيميل: ${email}\n`;
    reportText += `رقم الحساب: ${account}\n`;
    reportText += `التاريخ: ${dateTime}\n`;
    reportText += `المبلغ: ${amount}\n`;
    reportText += `الملاحظات: ${notes}`;

    // Add mentions
    const mentions = [];
    if (creditOutMentionAhmed?.classList.contains('active')) {
      mentions.push('@ahmedelgma');
    }
    if (creditOutMentionBatoul?.classList.contains('active')) {
      mentions.push('@batoulhassan');
    }
    if (mentions.length > 0) {
      reportText += `\n\n${mentions.join(' ')}`;
    }

    return reportText;
  }

  // Get employee name async
  async function getCreditOutEmployeeName() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['creditOutEmployeeName', 'userSettings'], (data) => {
        resolve(data.userSettings?.employeeName || data.creditOutEmployeeName || 'غير محدد');
      });
    });
  }

  // Generate report text with employee name
  async function generateCreditOutReportTextAsync() {
    const shift = creditOutShiftInput?.value || 'غير محدد';
    const email = creditOutEmailInput?.value.trim() || 'غير محدد';
    const account = creditOutAccountInput?.value.trim() || 'غير محدد';
    const ip = creditOutIpInput?.value.trim() || 'غير محدد';
    const country = creditOutCountryInput?.value.trim() || 'غير محدد';
    const dateTime = creditOutDateInput?.value.trim() || 'غير محدد';
    const rawAmount = creditOutAmountInput?.value.trim() || '';
    const amount = rawAmount ? formatCreditOutAmountWithDollar(rawAmount) : 'غير محدد';
    const notes = creditOutNotesInput?.value.trim() || 'لا توجد';
    const employeeName = await getCreditOutEmployeeName();

    let reportText = ``;
    reportText += `فترة الشفت: ${shift}\n`;
    reportText += `ip country: \`${country}\`\n`;
    reportText += `IP: \`${ip}\`\n`;
    reportText += `الإيميل: \`${email}\`\n`;
    reportText += `رقم الحساب: \`${account}\`\n`;
    reportText += `التاريخ: \`${dateTime}\`\n`;
    reportText += `المبلغ: \`${amount}\`\n`;
    reportText += `الملاحظات: ${notes}\n\n`;
    reportText += `#credit-out`;

    // Add mentions
    const mentions = [];
    if (creditOutMentionAhmed?.classList.contains('active')) {
      mentions.push('@ahmedelgma');
    }
    if (creditOutMentionBatoul?.classList.contains('active')) {
      mentions.push('@batoulhassan');
    }
    if (mentions.length > 0) {
      reportText += `\n${mentions.join(' ')}`;
    }

    return reportText;
  }

  // Copy report
  if (creditOutCopyBtn) {
    creditOutCopyBtn.addEventListener('click', async () => {
      const hasIpBeforeCopy = !!(creditOutIpInput && creditOutIpInput.value && creditOutIpInput.value.trim());
      if (hasIpBeforeCopy) {
        const countryReady = await ensureCreditOutCountry();
        if (!countryReady) {
          showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
          return;
        }
      }

      const reportText = await generateCreditOutReportTextAsync();
      try {
        await navigator.clipboard.writeText(reportText);
        showToast('تم النسخ', 'تم نسخ التقرير بنجاح', 'success');
      } catch (err) {
        showToast('خطأ', 'فشل في نسخ التقرير', 'error');
      }
    });
  }

  // Send to Telegram
  if (creditOutSendBtn) {
    creditOutSendBtn.addEventListener('click', async () => {
      const hasIpBeforeSend = !!(creditOutIpInput && creditOutIpInput.value && creditOutIpInput.value.trim());
      if (hasIpBeforeSend) {
        const countryReady = await ensureCreditOutCountry();
        if (!countryReady) {
          showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
          return;
        }
      }

      creditOutSendBtn.disabled = true;
      creditOutSendBtn.textContent = 'جاري الإرسال...';

      try {
        const reportText = await generateCreditOutReportTextAsync();
        let response;

        if (creditOutSelectedImages.length === 1) {
          // Single image with caption
          const firstImg = creditOutSelectedImages[0];
          const formData = new FormData();
          formData.append('chat_id', CREDIT_OUT_TELEGRAM_CHAT_ID);
          const imgResponse = await fetch(firstImg.data);
          const blob = await imgResponse.blob();
          formData.append('photo', blob, firstImg.name);
          formData.append('caption', reportText);
          formData.append('parse_mode', 'Markdown');

          response = await fetch(`https://api.telegram.org/bot${CREDIT_OUT_TELEGRAM_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
          });
        } else if (creditOutSelectedImages.length > 1) {
          // Multiple images - use sendMediaGroup
          const formData = new FormData();
          formData.append('chat_id', CREDIT_OUT_TELEGRAM_CHAT_ID);

          const mediaArray = [];
          for (let i = 0; i < creditOutSelectedImages.length; i++) {
            const img = creditOutSelectedImages[i];
            const imgResponse = await fetch(img.data);
            const blob = await imgResponse.blob();
            const attachName = `file${i}`;
            formData.append(attachName, blob, img.name || `image${i}.png`);

            mediaArray.push({
              type: 'photo',
              media: `attach://${attachName}`,
              caption: i === 0 ? reportText : '',
              parse_mode: 'Markdown'
            });
          }

          formData.append('media', JSON.stringify(mediaArray));

          response = await fetch(`https://api.telegram.org/bot${CREDIT_OUT_TELEGRAM_TOKEN}/sendMediaGroup`, {
            method: 'POST',
            body: formData
          });
        } else {
          // No images, just send text message
          response = await fetch(`https://api.telegram.org/bot${CREDIT_OUT_TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: CREDIT_OUT_TELEGRAM_CHAT_ID,
              text: reportText,
              parse_mode: 'Markdown'
            })
          });
        }

        const responseData = await response.json();
        if (!response.ok || !responseData.ok) {
          throw new Error(responseData.description || 'Failed to send message');
        }

        // Reset form after successful send
        if (creditOutEmailInput) creditOutEmailInput.value = '';
        if (creditOutAccountInput) creditOutAccountInput.value = '';
        if (creditOutIpInput) creditOutIpInput.value = '';
        if (creditOutCountryInput) creditOutCountryInput.value = '';
        if (creditOutDateInput) creditOutDateInput.value = '';
        if (creditOutAmountInput) creditOutAmountInput.value = '';
        if (creditOutNotesInput) creditOutNotesInput.value = '';
        creditOutSelectedImages = [];
        renderCreditOutImagePreviews();
        if (creditOutMentionAhmed) creditOutMentionAhmed.classList.remove('active');
        if (creditOutMentionBatoul) creditOutMentionBatoul.classList.remove('active');

        // Remove green/active states from shift buttons
        creditOutShiftBtns.forEach(btn => btn.classList.remove('active'));
        if (creditOutShiftInput) creditOutShiftInput.value = '';

        // Scroll to top of Credit Out section
        const creditOutSection = document.getElementById('credit-out-section');
        if (creditOutSection) {
          creditOutSection.scrollTo({ top: 0, behavior: 'smooth' });
        }

        showToast('تم الإرسال', 'تم إرسال التقرير إلى Telegram', 'success');
      } catch (error) {
        console.error('Telegram send error:', error);
        showToast('خطأ', `فشل في الإرسال: ${error.message}`, 'error');
      } finally {
        creditOutSendBtn.disabled = false;
        creditOutSendBtn.textContent = 'إرسال';
      }
    });
  }

  // Reset form
  if (creditOutResetBtn) {
    creditOutResetBtn.addEventListener('click', () => {
      if (creditOutEmailInput) creditOutEmailInput.value = '';
      if (creditOutAccountInput) creditOutAccountInput.value = '';
      if (creditOutIpInput) creditOutIpInput.value = '';
      if (creditOutCountryInput) creditOutCountryInput.value = '';
      if (creditOutDateInput) creditOutDateInput.value = '';
      if (creditOutAmountInput) creditOutAmountInput.value = '';
      if (creditOutNotesInput) creditOutNotesInput.value = '';
      if (creditOutShiftInput) creditOutShiftInput.value = '';
      
      creditOutShiftBtns.forEach(btn => btn.classList.remove('active'));
      if (creditOutMentionAhmed) creditOutMentionAhmed.classList.remove('active');
      if (creditOutMentionBatoul) creditOutMentionBatoul.classList.remove('active');
      
      creditOutSelectedImages = [];
      renderCreditOutImagePreviews();
      
      showToast('تم', 'تم إعادة تعيين النموذج', 'success');
    });
  }

  // Notes Modal
  if (creditOutNotesModalBtn) {
    creditOutNotesModalBtn.addEventListener('click', () => {
      if (creditOutNotesModal) creditOutNotesModal.style.display = 'block';
      loadCreditOutSavedNotes();
    });
  }

  if (creditOutNotesModalClose) {
    creditOutNotesModalClose.addEventListener('click', () => {
      if (creditOutNotesModal) creditOutNotesModal.style.display = 'none';
    });
  }

  if (creditOutNotesModal) {
    creditOutNotesModal.addEventListener('click', (e) => {
      if (e.target === creditOutNotesModal) {
        creditOutNotesModal.style.display = 'none';
      }
    });
  }

  function loadCreditOutSavedNotes() {
    chrome.storage.local.get(['creditOutSavedNotes'], (data) => {
      const storedNotes = Array.isArray(data.creditOutSavedNotes) ? data.creditOutSavedNotes : [];
      creditOutSavedNotes = storedNotes.length ? storedNotes : [...DEFAULT_REPORT_NOTE_TEMPLATES];
      if (!storedNotes.length) {
        chrome.storage.local.set({ creditOutSavedNotes: creditOutSavedNotes });
      }
      renderCreditOutSavedNotes();
    });
  }

  function renderCreditOutSavedNotes() {
    if (!creditOutNotesList) return;
    creditOutNotesList.innerHTML = '';

    creditOutSavedNotes.forEach((note, index) => {
      const li = document.createElement('li');
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #444; cursor: pointer;';
      li.innerHTML = `
        <span style="flex: 1;">${note}</span>
        <div style="display:flex; gap:6px;">
          <button class="saved-note-btn edit" data-index="${index}" title="تعديل" style="background:none;border:none;cursor:pointer;">✏️</button>
          <button class="saved-note-btn delete" data-index="${index}" title="حذف" style="background:none;border:none;cursor:pointer;color:#e74c3c;">🗑️</button>
        </div>
      `;

      li.querySelector('span').addEventListener('click', () => {
        if (creditOutNotesInput) creditOutNotesInput.value = note;
        if (creditOutNotesModal) creditOutNotesModal.style.display = 'none';
        showToast('تم', 'تم إضافة الملاحظة', 'success');
      });

      li.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        const next = prompt('تعديل الملاحظة:', creditOutSavedNotes[idx] || '');
        if (next === null) return;
        const trimmed = next.trim();
        if (!trimmed) {
          showToast('تنبيه', 'لا يمكن حفظ ملاحظة فارغة', 'warning');
          return;
        }
        creditOutSavedNotes[idx] = trimmed;
        chrome.storage.local.set({ creditOutSavedNotes }, () => renderCreditOutSavedNotes());
      });

      li.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
        creditOutSavedNotes.splice(idx, 1);
        chrome.storage.local.set({ creditOutSavedNotes }, () => renderCreditOutSavedNotes());
      });

      creditOutNotesList.appendChild(li);
    });
  }

  if (creditOutAddNoteBtn) {
    creditOutAddNoteBtn.addEventListener('click', () => {
      const newNote = (creditOutNewNoteInput?.value || '').trim();
      if (!newNote) {
        showToast('تنبيه', 'الرجاء إدخال ملاحظة', 'warning');
        return;
      }
      creditOutSavedNotes.push(newNote);
      chrome.storage.local.set({ creditOutSavedNotes }, () => {
        if (creditOutNewNoteInput) creditOutNewNoteInput.value = '';
        renderCreditOutSavedNotes();
        showToast('تم', 'تم إضافة الملاحظة', 'success');
      });
    });
  }

  // Settings Modal
  if (creditOutSettingsBtn) {
    creditOutSettingsBtn.addEventListener('click', () => {
      if (creditOutSettingsModal) creditOutSettingsModal.style.display = 'block';
      loadCreditOutSettings();
    });
  }

  if (creditOutSettingsClose) {
    creditOutSettingsClose.addEventListener('click', () => {
      if (creditOutSettingsModal) creditOutSettingsModal.style.display = 'none';
    });
  }

  if (creditOutSettingsModal) {
    creditOutSettingsModal.addEventListener('click', (e) => {
      if (e.target === creditOutSettingsModal) {
        creditOutSettingsModal.style.display = 'none';
      }
    });
  }

  function loadCreditOutSettings() {
    chrome.storage.local.get(['creditOutEmployeeName', 'userSettings'], (data) => {
      const savedName = getStoredEmployeeNameFromData(data);
      if (savedName && creditOutEmployeeSelect) {
        if (employeeDirectory) employeeDirectory.ensureEmployeeOption(creditOutEmployeeSelect, savedName);
        creditOutEmployeeSelect.value = savedName;
      }
      const isLocked = !!savedName;
      if (creditOutEmployeeSelect) {
        creditOutEmployeeSelect.disabled = isLocked;
        creditOutEmployeeSelect.title = isLocked ? 'تم حفظ الاسم ولا يمكن تغييره' : '';
      }
      if (creditOutSaveSettingsBtn) {
        creditOutSaveSettingsBtn.disabled = isLocked;
        creditOutSaveSettingsBtn.title = isLocked ? 'تم حفظ الاسم ولا يمكن تغييره' : '';
      }
    });
  }

  if (creditOutSaveSettingsBtn) {
    creditOutSaveSettingsBtn.addEventListener('click', () => {
      const employeeName = creditOutEmployeeSelect?.value;
      persistEmployeeNameOnce(employeeName, (saved, resolvedName, reason) => {
        if (!saved) {
          if (reason === 'locked' && resolvedName) {
            if (creditOutEmployeeSelect) creditOutEmployeeSelect.value = resolvedName;
            if (creditOutEmployeeSelect) {
              creditOutEmployeeSelect.disabled = true;
              creditOutEmployeeSelect.title = 'تم حفظ الاسم ولا يمكن تغييره';
            }
            if (creditOutSaveSettingsBtn) {
              creditOutSaveSettingsBtn.disabled = true;
              creditOutSaveSettingsBtn.title = 'تم حفظ الاسم ولا يمكن تغييره';
            }
            showToast('تنبيه', 'تم حفظ اسم الموظف مسبقًا ولا يمكن تغييره', 'warning');
            if (creditOutSettingsModal) creditOutSettingsModal.style.display = 'none';
            return;
          }
          showToast('تنبيه', 'الرجاء اختيار اسم الموظف', 'warning');
          return;
        }

        if (creditOutEmployeeSelect) creditOutEmployeeSelect.value = resolvedName || employeeName;
        if (creditOutEmployeeSelect) {
          creditOutEmployeeSelect.disabled = true;
          creditOutEmployeeSelect.title = 'تم حفظ الاسم ولا يمكن تغييره';
        }
        if (creditOutSaveSettingsBtn) {
          creditOutSaveSettingsBtn.disabled = true;
          creditOutSaveSettingsBtn.title = 'تم حفظ الاسم ولا يمكن تغييره';
        }
        showToast('تم الحفظ', 'تم حفظ الإعدادات بنجاح', 'success');
        if (creditOutSettingsModal) creditOutSettingsModal.style.display = 'none';
      });
    });
  }

})();

// --- Lazy Tab Initializers (run once when tab opens) ---
function registerLazyTabInit(tabName, initializer) {
  if (typeof initializer !== 'function') return;
  if (typeof window.registerTabInitializer === 'function') {
    window.registerTabInitializer(tabName, initializer);
    return;
  }

  // Fallback for environments where tabs module isn't loaded yet.
  try {
    initializer();
  } catch (err) {
    console.warn(`Lazy init fallback failed for "${tabName}"`, err);
  }
}

registerLazyTabInit('transfer-report', () => {
  if (typeof autoDetectShift === 'function') {
    autoDetectShift();
  }
  if (typeof convertToCustomSelect === 'function') {
    convertToCustomSelect('report-old-group');
    convertToCustomSelect('report-new-group');
  }
  if (typeof restoreNativeSelect === 'function') {
    restoreNativeSelect('employee-name-select');
  }
});

registerLazyTabInit('deposit-percentage', () => {
  if (!depositReportShiftInput || !depositReportShiftInput.value) {
    const now = new Date();
    const hour = now.getHours();
    let shift = 'الخفر';
    if (hour >= 7 && hour < 15) shift = 'الصباحي';
    else if (hour >= 15 && hour < 23) shift = 'المسائي';
    setDepositShift(shift);
  }
});

registerLazyTabInit('withdrawal-report', () => {
  if (window.__withdrawalDraftLoaded) return;
  window.__withdrawalDraftLoaded = true;
  void loadWithdrawalDraft();
});

registerLazyTabInit('credit-out', () => {
  if (typeof window.creditOutAutoDetectShift === 'function') {
    window.creditOutAutoDetectShift();
  }
});

// --- Initial Load ---
switchTab('accounts');


