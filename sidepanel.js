const accountList = document.getElementById('account-list');
const ipList = document.getElementById('ip-list');
const clearButton = document.getElementById('clear-history');
const searchBar = document.getElementById('search-bar');
const accountItemTemplate = document.getElementById('account-item-template');
const ipItemTemplate = document.getElementById('ip-item-template');
const accountsTab = document.getElementById('accounts-tab');
const ipsTab = document.getElementById('ips-tab');
const criticalTab = document.getElementById('critical-tab');
const walletsTab = document.getElementById('wallets-tab');
const profitTab = document.getElementById('profit-tab');
const profitSection = document.getElementById('profit-section');
const criticalSection = document.getElementById('critical-section');
const walletsSection = document.getElementById('wallets-section');
const walletsContainer = document.getElementById('wallets-container');
const tradesInput = document.getElementById('trades-input');
const calculateProfitBtn = document.getElementById('calculate-profit-btn');
const pasteFromClipboardBtn = document.getElementById('paste-from-clipboard-btn');
const clearInputBtn = document.getElementById('clear-input-btn');
const profitResults = document.getElementById('profit-results');
const pauseToggle = document.getElementById('pause-tracking-toggle');
const pausedIndicator = document.getElementById('paused-indicator');
const toggleLabelText = document.getElementById('toggle-label-text');
const headerEl = document.querySelector('.header');

// VIP / Critical Watchlist elements
const criticalDefaultIpList = document.getElementById('critical-default-ip-list');
const criticalCustomIpList = document.getElementById('critical-custom-ip-list');
const criticalAccountListEl = document.getElementById('critical-account-list');
const criticalIpInput = document.getElementById('critical-ip-input');
const criticalIpNoteInput = document.getElementById('critical-ip-note');
const criticalAccountInput = document.getElementById('critical-account-input');
const criticalAccountNoteInput = document.getElementById('critical-account-note');
const criticalAddIpBtn = document.getElementById('critical-add-ip');
const criticalAddAccountBtn = document.getElementById('critical-add-account');
const criticalClearCustomBtn = document.getElementById('critical-clear-custom');
// Filters removed from UI; will read from chrome.storage.sync
let statusFilterValue = 'all';
let dateFilterValue = 'all';

const port = chrome.runtime.connect({ name: 'sidepanel' });
port.onDisconnect.addListener(() => {
  void chrome.runtime.lastError;
});
// --- Toast Notification System ---
let currentToast = null;
let tooltipsEnabled = true;

function showToast(title, message, type = 'default') {
  const toast = document.getElementById('toast-notification');
  const toastIcon = toast.querySelector('.toast-icon');
  const toastTitle = toast.querySelector('.toast-title');
  const toastMessage = toast.querySelector('.toast-message');
  
  // Hide current toast if exists
  if (currentToast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }
  
  // Clear previous timeout
  if (currentToast) {
    clearTimeout(currentToast);
  }
  
  // Reset classes
  setTimeout(() => {
    toast.classList.remove('hide', 'duplicate', 'ip', 'erbil', 'warning', 'wallet-new', 'wallet-duplicate', 'uk', 'netherlands');
    
    // Set icon based on type
    if (type === 'duplicate' || type === 'wallet-duplicate') {
      toastIcon.textContent = '🔄';
      toast.classList.add('duplicate');
    } else if (type === 'ip') {
      toastIcon.textContent = '✅';
      toast.classList.add('ip');
    } else if (type === 'erbil') {
      toastIcon.textContent = '⭐';
      toast.classList.add('erbil');
    } else if (type === 'warning') {
      toastIcon.textContent = '⚠️';
      toast.classList.add('warning');
    } else if (type === 'wallet-new') {
      toastIcon.textContent = '💼';
      toast.classList.add('duplicate');
    } else if (type === 'uk') {
      toastIcon.textContent = '🇬🇧';
      toast.classList.add('uk');
    } else if (type === 'netherlands') {
      toastIcon.textContent = '🇳🇱';
      toast.classList.add('netherlands');
    } else {
      toastIcon.textContent = '✅';
    }
    
    // Set content
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 5 seconds
    currentToast = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      currentToast = null;
    }, 5000);
  }, currentToast ? 300 : 0);
}

// Toast close button handler
document.querySelector('.toast-close').addEventListener('click', () => {
  const toast = document.getElementById('toast-notification');
  toast.classList.remove('show');
  toast.classList.add('hide');
  if (currentToast) {
    clearTimeout(currentToast);
    currentToast = null;
  }
});


const modal = document.getElementById('history-modal');
const closeButton = document.querySelector('.close-button');
const historyContent = document.getElementById('history-content');

const ipDetailsModal = document.getElementById('ip-details-modal');
const ipDetailsContent = document.getElementById('ip-details-content');
const ipDetailsCloseButton = ipDetailsModal.querySelector('.close-button');

// VIP note edit modal (in-extension, no browser prompt)
const noteEditModal = document.getElementById('note-edit-modal');
const noteEditTitle = document.getElementById('note-edit-title');
const noteEditKind = document.getElementById('note-edit-kind');
const noteEditValue = document.getElementById('note-edit-value');
const noteEditInput = document.getElementById('note-edit-input');
const noteEditSaveBtn = document.getElementById('note-edit-save');
const noteEditCancelBtn = document.getElementById('note-edit-cancel');
const noteEditCloseBtn = document.getElementById('note-edit-close');
let noteEditResolve = null;
let noteEditOpen = false;

function closeNoteEditModal(result) {
  if (!noteEditModal) return;
  noteEditModal.style.display = 'none';
  noteEditOpen = false;
  const resolve = noteEditResolve;
  noteEditResolve = null;
  if (resolve) resolve(result);
}

function openNoteEditModal({ kind, value, note }) {
  if (!noteEditModal || !noteEditInput || !noteEditTitle || !noteEditKind || !noteEditValue) {
    return Promise.resolve(null);
  }

  const safeValue = typeof value === 'string' ? value.trim() : '';
  const safeNote = typeof note === 'string' ? note : '';
  const isAccount = kind === 'AC';

  noteEditTitle.textContent = isAccount ? 'تعديل ملاحظة رقم الحساب' : 'تعديل ملاحظة الـ IP';
  noteEditKind.textContent = isAccount ? 'رقم حساب' : 'IP';
  noteEditValue.textContent = safeValue;
  noteEditInput.value = safeNote;

  noteEditModal.style.display = 'block';
  noteEditOpen = true;
  setTimeout(() => {
    try { noteEditInput.focus(); } catch (e) { /* ignore */ }
    try { noteEditInput.select(); } catch (e) { /* ignore */ }
  }, 0);

  return new Promise((resolve) => {
    noteEditResolve = resolve;
  });
}

if (noteEditSaveBtn && noteEditCancelBtn && noteEditCloseBtn && noteEditInput && noteEditModal) {
  noteEditSaveBtn.addEventListener('click', () => closeNoteEditModal(String(noteEditInput.value || '').trim()));
  noteEditCancelBtn.addEventListener('click', () => closeNoteEditModal(null));
  noteEditCloseBtn.addEventListener('click', () => closeNoteEditModal(null));

  noteEditInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      closeNoteEditModal(String(noteEditInput.value || '').trim());
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!noteEditOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeNoteEditModal(null);
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target === noteEditModal) {
      closeNoteEditModal(null);
    }
  });
}

let allAccounts = [];
let allIPs = [];
let maxAccounts = 50; // This can be reused for IPs or a new variable can be created
let timestampFormat = 'locale';
let activeTab = 'accounts'; // 'accounts' or 'ips'
const filterState = {
  accounts: { status: 'all', date: 'all' },
  ips: { status: 'all', date: 'all' }
};

// --- Arabic Translation Maps (same as in options.js) ---
const arabicMaps = {
  continent: {
    'Africa': 'أفريقيا',
    'Asia': 'آسيا',
    'Europe': 'أوروبا',
    'North America': 'أمريكا الشمالية',
    'South America': 'أمريكا الجنوبية',
    'Oceania': 'أوقيانوسيا',
    'Antarctica': 'أنتاركتيكا'
  },
  countries: {
    'Yemen': 'اليمن',
    'Syria': 'سوريا',
    'Egypt': 'مصر',
    'Saudi Arabia': 'السعودية',
    'United Arab Emirates': 'الإمارات',
    'Qatar': 'قطر',
    'Oman': 'عُمان',
    'Kuwait': 'الكويت',
    'Bahrain': 'البحرين',
    'Jordan': 'الأردن',
    'Lebanon': 'لبنان',
    'Iraq': 'العراق',
    'Morocco': 'المغرب',
    'Algeria': 'الجزائر',
    'Tunisia': 'تونس',
    'Libya': 'ليبيا',
    'Palestine': 'فلسطين',
    'Turkey': 'تركيا'
  },
  cities: {
    "Sana'a": 'صنعاء',
    'Aleppo': 'حلب',
    'Najaf': 'النجف',
    'Aden': 'عدن',
    'Cairo': 'القاهرة',
    'Riyadh': 'الرياض',
    'Jeddah': 'جدة',
    'Doha': 'الدوحة',
    'Dubai': 'دبي',
    'Abu Dhabi': 'أبوظبي',
    'Muscat': 'مسقط',
    'Kuwait City': 'مدينة الكويت',
    'Manama': 'المنامة',
    'Amman': 'عمّان',
    'Beirut': 'بيروت',
    'Damascus': 'دمشق',
    'Baghdad': 'بغداد',
    'Casablanca': 'الدار البيضاء',
    'Rabat': 'الرباط',
    'Algiers': 'الجزائر',
    'Tunis': 'تونس',
    'Tripoli': 'طرابلس'
  },
  regions: {
    'Amanat Al Asimah': 'أمانة العاصمة',
    'Aleppo Governorate': 'محافظة حلب',
    'Al-Najaf Governorate': 'محافظة النجف',
    'Baghdad Governorate': 'محافظة بغداد',
    'Basra Governorate': 'محافظة البصرة'
  },
  currency: {
    'Yemeni Rial': 'ريال يمني',
    'Syrian Pound': 'ليرة سورية',
    'Egyptian Pound': 'جنيه مصري',
    'Saudi Riyal': 'ريال سعودي',
    'Qatari Riyal': 'ريال قطري',
    'UAE Dirham': 'درهم إماراتي',
    'Omani Rial': 'ريال عماني',
    'Kuwaiti Dinar': 'دينار كويتي',
    'Bahraini Dinar': 'دينار بحريني',
    'Jordanian Dinar': 'دينار أردني',
    'Lebanese Pound': 'ليرة لبنانية',
    'Syrian Pound': 'ليرة سورية',
    'Iraqi Dinar': 'دينار عراقي',
    'Moroccan Dirham': 'درهم مغربي',
    'Algerian Dinar': 'دينار جزائري',
    'Tunisian Dinar': 'دينار تونسي',
    'Libyan Dinar': 'دينار ليبي',
    'Turkish Lira': 'ليرة تركية'
  }
};

const regionDisplayNames = (typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined')
  ? new Intl.DisplayNames(['ar'], { type: 'region' })
  : null;

function translateValue(type, value) {
  if (!value) return 'N/A';
  const map = arabicMaps[type];
  if (map && map[value]) return map[value];
  return value;
}

function buildArabicDetailHTML(data) {
  const ip = data.ip || 'N/A';
  const ipType = data.type || 'N/A';
  const continent = translateValue('continent', data.continent || 'N/A');
  const continentCode = data.continent_code || 'N/A';
  const country = (regionDisplayNames && data.country_code)
    ? (regionDisplayNames.of(String(data.country_code).toUpperCase()) || translateValue('countries', data.country || 'N/A'))
    : translateValue('countries', data.country || 'N/A');
  const countryCode = data.country_code || 'N/A';
  const capital = translateValue('cities', data.country_capital || data.country_capital || 'N/A');
  const phone = data.country_phone || 'N/A';
  const region = translateValue('regions', data.region || 'N/A');
  const city = translateValue('cities', data.city || 'N/A');
  const latitude = data.latitude || 'N/A';
  const longitude = data.longitude || 'N/A';
  const asn = data.asn || 'N/A';
  const org = data.org || 'N/A';
  const isp = data.isp || 'N/A';
  const timezone = data.timezone || 'N/A';
  const timezoneGMT = data.timezone_gmt || 'N/A';
  const currency = translateValue('currency', data.currency || 'N/A');
  const currencyCode = data.currency_code || 'N/A';
  const currencyRates = data.currency_rates || 'N/A';

  return `
    <div class="ip-details-container" dir="rtl">
      <div class="ip-detail-item"><strong>الآي بي:</strong> <span>${ip} (${ipType})</span></div>
      <div class="ip-detail-item"><strong>القارة:</strong> <span>${continent} (${continentCode})</span></div>
      <div class="ip-detail-item"><strong>الدولة:</strong> <span>${country} (${countryCode})</span></div>
      <div class="ip-detail-item"><strong>العاصمة:</strong> <span>${capital}</span></div>
      <div class="ip-detail-item"><strong>الهاتف:</strong> <span>${phone}</span></div>
      <div class="ip-detail-item"><strong>المنطقة:</strong> <span>${region}</span></div>
      <div class="ip-detail-item"><strong>المدينة:</strong> <span>${city}</span></div>
      <div class="ip-detail-item"><strong>خط العرض:</strong> <span>${latitude}</span></div>
      <div class="ip-detail-item"><strong>خط الطول:</strong> <span>${longitude}</span></div>
      <div class="ip-detail-item"><strong>النظام المستقل (AS):</strong> <span>${asn}</span></div>
      <div class="ip-detail-item"><strong>المنظمة:</strong> <span>${org}</span></div>
      <div class="ip-detail-item"><strong>مزود الخدمة (ISP):</strong> <span>${isp}</span></div>
      <div class="ip-detail-item"><strong>المنطقة الزمنية:</strong> <span>${timezone}</span></div>
      <div class="ip-detail-item"><strong>التوقيت العالمي المنسق (UTC):</strong> <span>${timezoneGMT}</span></div>
      <div class="ip-detail-item"><strong>العملة:</strong> <span>${currency} (${currencyCode})</span></div>
      <div class="ip-detail-item"><strong>سعر الصرف:</strong> <span>${currencyRates}</span></div>
    </div>
  `;
}

// --- Tab Switching ---
accountsTab.addEventListener('click', () => {
  switchTab('accounts');
});

ipsTab.addEventListener('click', () => {
  switchTab('ips');
});

criticalTab.addEventListener('click', () => {
  switchTab('critical');
});

walletsTab.addEventListener('click', () => {
  switchTab('wallets');
});

profitTab.addEventListener('click', () => {
  switchTab('profit');
});

// Tag filter state
let currentTagFilter = 'all';

function switchTab(tabName) {
  activeTab = tabName;

  // Reset tab buttons
  accountsTab.classList.remove('active');
  ipsTab.classList.remove('active');
  criticalTab.classList.remove('active');
  walletsTab.classList.remove('active');
  profitTab.classList.remove('active');

  // Hide all sections
  accountList.classList.remove('active');
  ipList.classList.remove('active');
  walletsSection.style.display = 'none';
  profitSection.style.display = 'none';
  criticalSection.style.display = 'none';

  // Reset header UI
  document.getElementById('tag-filter-bar').style.display = 'none';
  searchBar.style.display = 'none';

  if (tabName === 'accounts') {
    accountsTab.classList.add('active');
    accountList.classList.add('active');
    document.getElementById('tag-filter-bar').style.display = 'flex';
    searchBar.placeholder = 'Search accounts...';
    searchBar.style.display = 'block';
    renderAccounts();
    return;
  }

  if (tabName === 'ips') {
    ipsTab.classList.add('active');
    ipList.classList.add('active');
    searchBar.placeholder = 'Search IP...';
    searchBar.style.display = 'block';
    renderIPs();
    return;
  }

  if (tabName === 'critical') {
    criticalTab.classList.add('active');
    criticalSection.style.display = 'block';
    renderCriticalWatchlist();
    return;
  }

  if (tabName === 'wallets') {
    walletsTab.classList.add('active');
    walletsSection.style.display = 'block';
    searchBar.placeholder = 'Search wallets...';
    searchBar.style.display = 'block';
    loadWallets();
    return;
  }

  if (tabName === 'profit') {
    profitTab.classList.add('active');
    profitSection.style.display = 'block';
  }
}

// --- VIP / Critical Watchlist ---
const DEFAULT_CRITICAL_IPS = ['166.88.54.203', '166.88.167.40'];
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
    const existingNote = override && typeof override.note === 'string' ? override.note.trim() : '';

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
        const next = { ...criticalWatchlistState, ips: criticalWatchlistState.ips.filter(v => !(v && typeof v === 'object' && v.ip === ip)) };
        void saveCriticalWatchlist(next);
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
        const next = { ...criticalWatchlistState, accounts: criticalWatchlistState.accounts.filter(v => !(v && typeof v === 'object' && v.account === acc)) };
        void saveCriticalWatchlist(next);
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
  applyDarkMode(data.darkMode);
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
      // Badge is hidden, only show in dropdown and on card background
      const tagConfig = {
        'suspicious': { text: '🔴 مشبوه', class: 'tag-suspicious' },
        'safe': { text: '🟢 آمن', class: 'tag-safe' },
        'under-review': { text: '🟡 قيد المراجعة', class: 'tag-under-review' },
        'flagged': { text: '🚩 محظور', class: 'tag-flagged' }
      };
      const config = tagConfig[item.tag];
      if (config) {
        listItem.classList.add('tagged-' + item.tag);
      }
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
    
    // Check if UK
    const isUK = ht === 'uk' || lowerCountry.includes('united kingdom') || lowerCountry === 'uk';
    const isNetherlands = ht === 'netherlands' || lowerCountry.includes('netherlands') || lowerCountry === 'nl';
    
    // Check if Iraqi highlighted regions with comprehensive patterns
    const isKirkuk = ht === 'kirkuk' || lowerRegion.includes('kirkuk') || lowerCity.includes('kirkuk') || lowerRegion.includes('كركوك') || lowerCity.includes('كركوك');
    const isSulaymaniyah = ht === 'sulaymaniyah' || lowerRegion.includes('sulay') || lowerCity.includes('sulay') || lowerRegion.includes('slemani') || lowerCity.includes('slemani') || lowerRegion.includes('sulaimani') || lowerCity.includes('sulaimani') || lowerRegion.includes('السلي') || lowerCity.includes('السلي') || lowerRegion.includes('السليماني') || lowerCity.includes('السليماني') || lowerRegion.includes('iraqi kurdistan') || lowerCity.includes('iraqi kurdistan');
    const isErbilRegion = ht === 'erbil' || lowerRegion.includes('erbil') || lowerCity.includes('erbil') || lowerRegion.includes('arbil') || lowerCity.includes('arbil') || lowerRegion.includes('أربيل') || lowerCity.includes('أربيل') || lowerRegion.includes('hewler') || lowerCity.includes('hewler');
    
    // Handle highlighted IPs with proper badge
    if (isUK || isNetherlands || isKirkuk || isSulaymaniyah || isErbilRegion || item.isHighlighted || item.isErbil) {
      listItem.classList.add('erbil');
      highlightBadge.style.display = 'inline-block';
      
      // Check UK first
      if (isUK) {
        highlightBadge.textContent = '🇬🇧 UK';
        highlightBadge.style.background = '#1d4ed8';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('uk-highlight');
      }
      // Check Netherlands
      else if (isNetherlands) {
        highlightBadge.textContent = '🇳🇱 NL';
        highlightBadge.style.background = 'linear-gradient(135deg, #f97316, #2563eb)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('nl-highlight');
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
        const response = await chrome.runtime.sendMessage({ type: 'lookupIp', ip: item.ip });
        if (response && response.data) {
          ipDetailsContent.innerHTML = buildArabicDetailHTML(response.data);
        } else if (response && response.error) {
          ipDetailsContent.innerHTML = `خطأ: ${response.error}`;
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

// --- Event Listeners ---
searchBar.addEventListener('input', () => {
  if (activeTab === 'accounts') {
    renderAccounts(searchBar.value);
  } else if (activeTab === 'ips') {
    renderIPs(searchBar.value);
  } else if (activeTab === 'wallets') {
    renderWallets(searchBar.value);
  }
});

// Tag filter buttons
document.querySelectorAll('.tag-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTagFilter = btn.getAttribute('data-filter');
    renderAccounts();
  });
});

// No filter UI events anymore; filters are controlled via options page.

clearButton.addEventListener('click', async () => {
  if (activeTab === 'accounts') {
    if (confirm('Are you sure you want to clear all account history?')) {
      await chrome.storage.local.set({ copiedAccounts: [] });
    }
  } else if (activeTab === 'ips') {
    if (confirm('Are you sure you want to clear all IP history?')) {
      await chrome.storage.local.set({ copiedIPs: [] });
    }
  } else if (activeTab === 'wallets') {
    if (confirm('Are you sure you want to clear all wallet history?')) {
      await chrome.storage.local.remove('walletNotes');
      loadWallets();
    }
  }
});

document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// --- Modal Listeners ---
closeButton.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
});

ipDetailsCloseButton.addEventListener('click', () => {
  ipDetailsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target == ipDetailsModal) {
    ipDetailsModal.style.display = 'none';
  }
});

// Initial Load
switchTab('accounts'); // Start on accounts tab
loadAllData();

// Listen for toast notifications from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('Sidepanel received message:', message);
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

// --- Pause Tracking Logic ---
(async function initPauseToggle() {
  const syncData = await chrome.storage.sync.get(['trackingPaused']);
  const isPaused = !!syncData.trackingPaused;
  applyPauseUI(isPaused);
  pauseToggle.checked = !isPaused; // checked means running
})();

pauseToggle.addEventListener('change', async () => {
  const isRunning = pauseToggle.checked;
  const isPaused = !isRunning;
  await chrome.storage.sync.set({ trackingPaused: isPaused });
  applyPauseUI(isPaused);
  if (isPaused) {
    showToast('تم إيقاف التتبع مؤقتاً', 'لن يتم تسجيل النسخ حتى إعادة التشغيل.', 'duplicate');
  } else {
    showToast('تم استئناف التتبع', 'سيتم تسجيل النسخ مرة أخرى.', 'ip');
  }
});

function applyPauseUI(isPaused) {
  if (isPaused) {
    pausedIndicator.style.display = 'inline-block';
    toggleLabelText.textContent = 'إيقاف التتبع مفعل';
  } else {
    pausedIndicator.style.display = 'none';
    toggleLabelText.textContent = 'تشغيل المراقبة';
  }
}

// --- Header Auto-Hide on Scroll ---
let lastScrollY = 0;
let ticking = false;
function handleScroll() {
  const currentY = window.scrollY;
  const goingDown = currentY > lastScrollY;
  if (goingDown && currentY > 40) {
    headerEl.classList.add('hidden');
  } else {
    headerEl.classList.remove('hidden');
  }
  lastScrollY = currentY;
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(handleScroll);
    ticking = true;
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
  
  // Show results
  profitResults.style.display = 'block';
  
  // Smooth scroll to results
  setTimeout(() => {
    profitResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
  
  showToast('نجح!', `تم حساب profit لـ ${trades.length} صفقة\nرابحة: ${winningTrades} | خاسرة: ${losingTrades}`, 'default');
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
