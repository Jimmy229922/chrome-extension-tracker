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
  { account: '3316639', note: 'مقيم في تايلاندا' },
  { account: '3041049', note: 'وكيل لا يتم الحظر' },
  { account: '3202180', note: 'مقيم في روسيا' },
  { account: '3364374', note: 'اكسبرت' },
  { account: '2998979', note: 'اكسبرت' },
  { account: '3380333', note: 'اكسبرت' },
  { account: '3355512', note: 'Expert' },
  { account: '3258157', note: 'اكسبرت' },
  { account: '3242468', note: 'مقيم بالادقية' },
  { account: '2102065', note: 'اكسبرت' },
  { account: '2105925', note: 'اكسبرت' },
  { account: '3210111', note: 'اكسبرت' },
  { account: '2152557', note: 'اسلوب سحب الارباح' },
  { account: '2152539', note: 'اكسبرت' },
  { account: '3363184', note: 'اكسبرت' },
  { account: '3363542', note: 'اكسبرت' },
  { account: '3376018', note: 'اكسبرت' },
  { account: '3376064', note: 'اكسبرت' },
  { account: '3371624', note: 'ستاندر 2 بطلب الادارة' },
  { account: '3373048', note: 'ستاندر 2 بطلب الادارة' },
  { account: '3373656', note: 'اكسبرت' },
  { account: '3375020', note: 'اكسبرت' },
  { account: '3365020', note: 'اكسبرت' },
  { account: '3367456', note: 'اكسبرت' },
  { account: '3368059', note: 'اكسبرت' },
  { account: '3367362', note: 'اكسبرت' },
  { account: '3367399', note: 'اكسبرت' },
  { account: '3366153', note: 'اكسبرت' },
  { account: '3360765', note: 'ستاندر2 ( ذو الفقار مهدي )' },
  { account: '3274734', note: 'اكسبرت' },
  { account: '2090458', note: 'اكسبرت' },
  { account: '2089517', note: 'اكسبرت' },
  { account: '3264577', note: 'اكسبرت' },
  { account: '2990152', note: 'ارباح عالية ( ستاندر 2)' },
  { account: '2941256', note: 'فئة الاكسبريت بطلب الادارة' },
  { account: '2969279', note: 'اكسبرت' },
  { account: '3346525', note: 'اكسبرت' },
  { account: '2076134', note: 'اكسبرت' },
  { account: '2921339', note: 'اكسبرت' },
  { account: '2032875', note: 'فئة الاكسبريت بطلب الادارة' },
  { account: '2069926', note: 'اكسبرت' },
  { account: '3356197', note: 'اكسبرت' },
  { account: '2086275', note: 'اكسبرت' },
  { account: '3337076', note: 'اكسبرت' },
  { account: '3182854', note: 'اكسبرت' },
  { account: '3333108', note: 'فئة الاكسبريت بطلب الادارة' },
  { account: '3022840', note: 'اكسبرت' },
  { account: '3370783', note: 'اكسبرت' },
  { account: '3061290', note: 'اكسبرت' },
  { account: '3330084', note: 'اكسبرت' },
  { account: '3368870', note: 'اكسبرت' },
  { account: '3371535', note: 'اكسبرت' },
  { account: '3376561', note: 'فئة الاكسبريت بطلب الادارة' },
  { account: '3365857', note: 'اكسبرت' },
  { account: '3364444', note: 'اكسبرت' },
  { account: '3313838', note: 'اكسبرت' },
  { account: '3298545', note: 'اكسبرت' },
  { account: '3269706', note: 'اكسبرت' },
  { account: '3148440', note: 'اكسبرت' },
  { account: '3123231', note: 'اكسبرت' },
  { account: '3061952', note: 'فئة الاكسبريت بطلب الادارة' },
  { account: '3064430', note: 'اكسبرت' },
  { account: '3368657', note: 'Expert' },
  { account: '3196865', note: 'اكسبرت' },
  { account: '3378695', note: 'اكسبرت' },
  { account: '3378693', note: 'اكسبرت' },
  { account: '3378623', note: 'اكسبرت' },
  { account: '3062257', note: 'اكسبرت' },
  { account: '3369837', note: 'اكسبرت' },
  { account: '3365513', note: 'اكسبرت' },
  { account: '3364813', note: 'اكسبرت' },
  { account: '3342626', note: 'اكسبرت' },
  { account: '3336514', note: 'اكسبرت' },
  { account: '3210749', note: 'اكسبرت' },
  { account: '2133012', note: 'اكسبرت' },
  { account: '2056646', note: 'اكسبرت' },
  { account: '998352', note: 'اكسبرت' },
  { account: '3359540', note: 'مفعل لهم اكسبرت' },
  { account: '3120253', note: 'اكسبرت' },
  { account: '3373189', note: 'مقيم بالادقية' },
  { account: '3379259', note: 'من إدلب' },
  { account: '3262516', note: 'من حلب' },
  { account: '3368627', note: 'من حلب' },
  { account: '3374715', note: 'من حلب' },
  { account: '3159561', note: 'Expert' },
  { account: '3373658', note: 'اكسبرت' },
  { account: '3315170', note: 'من حلب' },
  { account: '3346671', note: 'Expert' },
  { account: '3359589', note: 'Expert' },
  { account: '3345825', note: 'Expert' },
  { account: '3372547', note: 'Expert' },
  { account: '3373224', note: 'expert' },
  { account: '3373304', note: 'expert' },
  { account: '3377341', note: 'mini4 بطلب من الإدارة' },
  { account: '3331304', note: 'Expert' },
  { account: '3378124', note: 'Expert' },
  { account: '2082362', note: 'Expert' },
  { account: '3346448', note: 'Expert' },
  { account: '3365080', note: 'Expert' },
  { account: '3381277', note: 'العميل من حلب' },
  { account: '3315308', note: 'العميل من الرقة' },
  { account: '3114800', note: 'وكيل لا يتم الحظر' },
  { account: '2058982', note: 'وكيل لا يتم الحظر' },
  { account: '3348823', note: 'من الرقة' },
  { account: '3379119', note: 'من الأتارب - حلب' },
  { account: '3352978', note: 'الأتارب - حلب' },
  { account: '3274305', note: 'Expert' },
  { account: '3288161', note: 'مقيم' },
  { account: '3352669', note: 'العميل من أدلب' },
  { account: '3384755', note: 'من إدلب' },
  { account: '3346473', note: 'مقيم الرقة' },
  { account: '3283394', note: 'Expert' },
  { account: '3375132', note: 'من حلب' },
  { account: '3336104', note: 'من الرقة' },
  { account: '3203578', note: 'مقيم حلب' },
  { account: '3383033', note: 'منطقة حدودية' },
  { account: '3371049', note: 'Expert' },
  { account: '3131392', note: 'من الأتارب - حلب' },
  { account: '3376432', note: 'مقيم حلب' },
  { account: '3378901', note: 'من الرقة' },
  { account: '3313067', note: 'من أدلب' },
  { account: '3383951', note: 'مقيم ادلب' },
  { account: '3381021', note: 'Expert' },
  { account: '3364028', note: 'Expert' },
  { account: '3382703', note: 'Expert' },
  { account: '2043245', note: 'Expert' },
  { account: '2049787', note: 'Expert' },
  { account: '3228737', note: 'خناصر - حلب' },
  { account: '3383699', note: 'مقيم الرقة' },
  { account: '3352394', note: 'من الرقة' },
  { account: '3379479', note: 'من الباب - حلب' },
  { account: '3384296', note: 'من حلب' },
  { account: '3371454', note: 'اكسبرت' },
  { account: '3384253', note: 'من إدلب' },
  { account: '3383665', note: 'مقيم في اللاذقية' },
  { account: '3350273', note: 'من حلب' },
  { account: '3267682', note: 'Expert' },
  { account: '3350579', note: 'من اللاذقية' },
  { account: '3384580', note: 'مقيم ادلب' },
  { account: '3376770', note: 'مقيم إدلب' },
  { account: '3325714', note: 'مقيم بالادقية' },
  { account: '3364239', note: 'اكسبرت' },
  { account: '3384226', note: 'لاذقية' },
  { account: '3385577', note: 'مقيم بادلب' },
  { account: '3383939', note: 'لاذقية' },
  { account: '3385881', note: 'لاذقية' },
  { account: '3363015', note: 'من حلب' },
  { account: '3354077', note: 'Expert' },
  { account: '3376678', note: 'مقيم ادلب' },
  { account: '3334994', note: 'مقيم حلب' },
  { account: '3371067', note: 'Expert' },
  { account: '3321442', note: 'مقيم الرقة' },
  { account: '3366116', note: 'Expert' },
  { account: '3363511', note: 'Expert' },
  { account: '3387835', note: 'Expert' },
  { account: '3259577', note: 'مقيم في حلب' },
  { account: '2017732', note: 'expert' },
  { account: '3363506', note: 'Expert' },
  { account: '3134068', note: 'Expert' },
  { account: '3386571', note: 'من حلب' },
  { account: '3368939', note: 'ادلب' },
  { account: '3387974', note: 'حلب' },
  { account: '3359531', note: 'حلب' },
  { account: '3385764', note: 'مقيم حلب' },
  { account: '3344207', note: 'حلب' },
  { account: '3275467', note: 'Expert' },
  { account: '3186959', note: 'Expert' },
  { account: '3234182', note: 'Expert' },
  { account: '3390091', note: 'Expert' },
  { account: '3388595', note: 'من اللائقية' },
  { account: '3369588', note: 'Expert' },
  { account: '3367335', note: 'من حلب' },
  { account: '3015898', note: 'Expert' },
  { account: '3080992', note: 'Expert' },
  { account: '3355441', note: 'Expert' },
  { account: '3371725', note: 'اللاذقية' },
  { account: '3317578', note: 'Expert' },
  { account: '3389484', note: 'ادلب' },
  { account: '3390211', note: 'Expert' },
  { account: '3204578', note: 'وكيل لا يتم الحظر' },
  { account: '2041406', note: 'Expert' },
  { account: '2041411', note: 'Expert' },
  { account: '2064955', note: 'Expert' },
  { account: '2067672', note: 'Expert' },
  { account: '2065983', note: 'Expert' },
  { account: '2017703', note: 'Expert' },
  { account: '2024107', note: 'Expert' },
  { account: '2041482', note: 'Expert' },
  { account: '3378804', note: 'مقيم اللادقية' },
  { account: '3123262', note: 'Expert' },
  { account: '3300939', note: 'Expert' },
  { account: '3392271', note: 'Expert' },
  { account: '947270', note: 'Expert' },
  { account: '3389883', note: 'من الرقة' },
  { account: '3328355', note: 'من حلب' },
  { account: '3392976', note: 'ادلب' },
  { account: '3280070', note: 'مقيم بالادقية' },
  { account: '3393154', note: 'من إدلب' },
  { account: '3393503', note: 'من إدلب' },
  { account: '3387594', note: 'مقيم بالادقية' },
  { account: '3392678', note: 'من حلب' },
  { account: '3318877', note: 'من حلب' },
  { account: '3393625', note: 'من إدلب' },
  { account: '3103876', note: 'مقيم في إيرلندا' },
  { account: '3392732', note: 'حلب' },
  { account: '3393588', note: 'Expert' },
  { account: '2050117', note: 'وكيل لا يتم حظره' },
  { account: '2091063', note: 'مقيم بالمانيا' },
  { account: '3092153', note: 'مقيم بالمانيا' },
  { account: '3390369', note: 'حلب' },
  { account: '3390632', note: 'مقيم بالادقية' }
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




