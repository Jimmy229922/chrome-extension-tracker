let creating;
let lastProcessedText = '';
let isSidePanelOpen = false;
let lastNotificationId = null; // Track the last notification ID
let toastQueue = []; // Queue toast messages when side panel not open
let trackingPaused = false; // Pause clipboard tracking state
let latestWalletAddress = null; // Track the last detected wallet address
let justCopiedFromExtension = false; // Flag to ignore clipboard content after copying from extension
let lastCopiedText = ''; // Track the last text copied from extension
const accountNumberRegex = /^\d{6,7}$/;
const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const walletRegex = /^\s*T[a-zA-Z0-9]{33}\s*$/;

const DEFAULT_CRITICAL_IPS = ['166.88.54.203', '166.88.167.40', '77.76.9.250'];
const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';
const CRITICAL_BADGE_COLOR = '#dc2626';
const CRITICAL_IP_ALERT_STORAGE_KEY = 'criticalIpAlert';
const DEFAULT_ACTION_TITLE = (() => {
  try {
    const manifest = chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest() : null;
    return manifest && manifest.name ? manifest.name : 'Extension';
  } catch (e) {
    return 'Extension';
  }
})();

let criticalIpSet = new Set(DEFAULT_CRITICAL_IPS);
let criticalAccountSet = new Set();
let criticalIpNoteMap = new Map(); // ip -> note
let criticalAccountNoteMap = new Map(); // account -> note

const CRITICAL_POPUP_WIDTH = 560;
const CRITICAL_POPUP_HEIGHT = 340;
const CRITICAL_POPUP_MARGIN = 16;

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA'; // Same token as Sidepanel
const ALERT_CHAT_ID = '-1003537370414'; // Telegram group: IP BLOCKED (Supergroup)

const BACKGROUND_I18N_FALLBACK = {
  unknown: 'غير معروف',
  unknownFeminine: 'غير معروفة',
  geoReasonUnknown: 'سبب غير معروف',
  geoReasonAllProviders: 'فشل مزود تحديد الموقع على هذا الجهاز/الشبكة',
  geoReasonAuth: 'خطأ صلاحيات أو حظر من المزود (401/403)',
  geoReasonQuota: 'تم تجاوز الحد المتاح أو الـ Quota للمزود (402/429)',
  geoReasonTimeout: 'انتهت مدة الطلب مع مزود تحديد الموقع',
  geoReasonNetwork: 'الشبكة تمنع الوصول لمزودات تحديد الموقع',
  ipUiNewIpTitle: 'تم نسخ عنوان IP جديد',
  ipUiDuplicateIpTitle: 'تم نسخ IP مكرر',
  ipUiGenericIpTitle: 'تم نسخ عنوان IP',
  ipUiCountryCityButton: 'نسخ الدولة والمدينة',
  ipUiCountryRegionButton: 'نسخ الدولة والمحافظة',
  ipUiCountryButton: 'نسخ الدولة',
  ipUiRegionButton: 'نسخ المحافظة',
  ipUiCountryLabel: 'الدولة',
  ipUiRegionLabel: 'المحافظة',
  ipUiCityLabel: 'المدينة',
  ipUiAddressLabel: 'العنوان',
  ipUiReasonLabel: 'السبب',
  ipUiUnavailableCountry: 'غير متوفرة',
  ipUiKirkukTitle: '⭐ محافظة كركوك',
  ipUiSulaymaniyahTitle: '⭐ محافظة السليمانية',
  ipUiErbilTitle: '⭐ محافظة أربيل',
  duplicateAlertTitle: '⚠️ تنبيه مكرر',
  duplicateAlertPrefix: 'تم إرسال تنبيه لهذا الـ IP',
  duplicateAlertSuffix: 'مسبقًا ولا يمكن إرساله مرة أخرى.',
  duplicateAlertLastSentPrefix: 'آخر إرسال كان بتاريخ:',
  duplicateSentFooterPrefix: 'تم إرسال هذا الـ IP مسبقًا. آخر إرسال كان بتاريخ:',
  alertPrefix: '🚨',
  specialRegionTitle: '⭐⭐⭐ محافظة مميزة جدًا',
  urgentManagerNote: '⚠️ هام جدًا: لازم نبعت الـ IP ده لمدير الشيفت',
  ukTitle: '🇬🇧 عنوان IP من المملكة المتحدة',
  nlTitle: '🇳🇱 عنوان IP من هولندا'
};

let backgroundI18n = { ...BACKGROUND_I18N_FALLBACK };
let backgroundI18nLoadPromise = null;

function getPreferredLocaleCode() {
  return 'ar';
}

function getBackgroundText(key) {
  if (!key) return '';
  if (Object.prototype.hasOwnProperty.call(backgroundI18n, key)) {
    return backgroundI18n[key];
  }
  if (Object.prototype.hasOwnProperty.call(BACKGROUND_I18N_FALLBACK, key)) {
    return BACKGROUND_I18N_FALLBACK[key];
  }
  return key;
}

async function loadBackgroundI18n(forceReload = false) {
  if (!forceReload && backgroundI18nLoadPromise) return backgroundI18nLoadPromise;

  backgroundI18nLoadPromise = (async () => {
    const locale = getPreferredLocaleCode();
    const fileName = locale === 'en' ? 'en.json' : 'ar.json';

    try {
      const response = await fetch(chrome.runtime.getURL(fileName), { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`i18n file not found: ${fileName}`);
      }
      const data = await response.json();
      const section = data && data.background && typeof data.background === 'object' ? data.background : {};
      backgroundI18n = { ...BACKGROUND_I18N_FALLBACK, ...section };
      if (typeof refreshIpUiText === 'function') {
        refreshIpUiText();
      }
    } catch (error) {
      console.warn('Failed to load background i18n file, using fallback texts:', error);
      backgroundI18n = { ...BACKGROUND_I18N_FALLBACK };
      if (typeof refreshIpUiText === 'function') {
        refreshIpUiText();
      }
    }
  })();

  return backgroundI18nLoadPromise;
}

loadBackgroundI18n().catch(() => {});

// --- Persistent Security Alert History ---
const SENT_SECURITY_ALERTS_STORAGE_KEY = 'sentSecurityAlerts';
const SENT_SECURITY_ALERTS_VERSION = 2;

function createEmptySentSecurityAlertsRecord() {
  return {
    version: SENT_SECURITY_ALERTS_VERSION,
    ips: {}
  };
}

function parseLegacyShiftToTimestamp(shiftId) {
  if (typeof shiftId !== 'string') return null;
  const match = shiftId.match(/^(\d{4}-\d{2}-\d{2})-S([123])$/);
  if (!match) return null;
  const datePart = match[1];
  const shiftPart = match[2];
  const shiftHourMap = { '1': 8, '2': 16, '3': 0 };
  const hour = shiftHourMap[shiftPart] !== undefined ? shiftHourMap[shiftPart] : 0;
  const date = new Date(`${datePart}T${String(hour).padStart(2, '0')}:00:00`);
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : null;
}

function normalizeSentSecurityAlertEntry(rawEntry, fallbackTimestamp) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  const safeFallback = Number.isFinite(fallbackTimestamp) && fallbackTimestamp > 0
    ? fallbackTimestamp
    : Date.now();

  const firstRaw = Number(rawEntry.firstSentAt);
  const lastRaw = Number(rawEntry.lastSentAt);
  const firstSentAt = Number.isFinite(firstRaw) && firstRaw > 0
    ? firstRaw
    : (Number.isFinite(lastRaw) && lastRaw > 0 ? lastRaw : safeFallback);
  const lastSentAt = Number.isFinite(lastRaw) && lastRaw > 0 ? lastRaw : firstSentAt;

  let sendCount = Number(rawEntry.sendCount);
  if (!Number.isFinite(sendCount) || sendCount < 1) {
    sendCount = 1;
  }

  const normalized = {
    firstSentAt: firstSentAt,
    lastSentAt: lastSentAt,
    sendCount: Math.max(1, Math.floor(sendCount))
  };

  if (typeof rawEntry.lastAccountNumber === 'string' && rawEntry.lastAccountNumber.trim()) {
    normalized.lastAccountNumber = rawEntry.lastAccountNumber.trim();
  }
  if (typeof rawEntry.lastGroupType === 'string' && rawEntry.lastGroupType.trim()) {
    normalized.lastGroupType = rawEntry.lastGroupType.trim();
  }

  return normalized;
}

function normalizeSentSecurityAlertsRecord(rawRecord) {
  // New schema: { version: 2, ips: { "1.2.3.4": { ... } } }
  if (
    rawRecord &&
    typeof rawRecord === 'object' &&
    !Array.isArray(rawRecord) &&
    Number(rawRecord.version) === SENT_SECURITY_ALERTS_VERSION &&
    rawRecord.ips &&
    typeof rawRecord.ips === 'object' &&
    !Array.isArray(rawRecord.ips)
  ) {
    const normalizedIps = {};
    for (const [rawIp, entry] of Object.entries(rawRecord.ips)) {
      if (typeof rawIp !== 'string') continue;
      const ip = rawIp.trim();
      if (!ip) continue;
      const normalizedEntry = normalizeSentSecurityAlertEntry(entry);
      if (!normalizedEntry) continue;
      normalizedIps[ip] = normalizedEntry;
    }
    return {
      record: {
        version: SENT_SECURITY_ALERTS_VERSION,
        ips: normalizedIps
      },
      migrated: false
    };
  }

  // Legacy schema: { shiftId: "YYYY-MM-DD-Sx", ips: [] }
  if (
    rawRecord &&
    typeof rawRecord === 'object' &&
    !Array.isArray(rawRecord) &&
    Array.isArray(rawRecord.ips)
  ) {
    const fallbackTimestamp = parseLegacyShiftToTimestamp(rawRecord.shiftId) || Date.now();
    const migratedRecord = createEmptySentSecurityAlertsRecord();

    for (const value of rawRecord.ips) {
      if (typeof value !== 'string') continue;
      const ip = value.trim();
      if (!ip) continue;
      migratedRecord.ips[ip] = {
        firstSentAt: fallbackTimestamp,
        lastSentAt: fallbackTimestamp,
        sendCount: 1
      };
    }

    return { record: migratedRecord, migrated: true };
  }

  return { record: createEmptySentSecurityAlertsRecord(), migrated: !!rawRecord };
}

async function loadSentSecurityAlertsRecord() {
  try {
    const data = await chrome.storage.local.get(SENT_SECURITY_ALERTS_STORAGE_KEY);
    const rawRecord = data[SENT_SECURITY_ALERTS_STORAGE_KEY];
    const { record, migrated } = normalizeSentSecurityAlertsRecord(rawRecord);

    if (migrated) {
      await chrome.storage.local.set({ [SENT_SECURITY_ALERTS_STORAGE_KEY]: record });
    }

    return record;
  } catch (e) {
    console.warn('Failed to load sent security alerts history:', e);
    return createEmptySentSecurityAlertsRecord();
  }
}

function formatSentAtForNotification(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return getBackgroundText('unknown');
  try {
    return new Date(timestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return new Date(timestamp).toLocaleString();
  }
}

async function getIpSentRecord(ip) {
  if (!ip || ip === 'N/A') return null;
  const normalizedIp = String(ip).trim();
  if (!normalizedIp) return null;

  const record = await loadSentSecurityAlertsRecord();
  return record.ips[normalizedIp] || null;
}

async function markIpAsSent(ip, metadata = {}) {
  if (!ip || ip === 'N/A') return;
  const normalizedIp = String(ip).trim();
  if (!normalizedIp) return;

  try {
    const record = await loadSentSecurityAlertsRecord();
    const existing = record.ips[normalizedIp];
    const now = Date.now();
    const updated = {
      firstSentAt: existing && Number.isFinite(existing.firstSentAt) && existing.firstSentAt > 0
        ? existing.firstSentAt
        : now,
      lastSentAt: now,
      sendCount: existing && Number.isFinite(existing.sendCount) && existing.sendCount > 0
        ? existing.sendCount + 1
        : 1
    };

    const accountNumber = typeof metadata.accountNumber === 'string' ? metadata.accountNumber.trim() : '';
    const groupType = typeof metadata.groupType === 'string' ? metadata.groupType.trim() : '';

    if (accountNumber) {
      updated.lastAccountNumber = accountNumber;
    } else if (existing && typeof existing.lastAccountNumber === 'string' && existing.lastAccountNumber.trim()) {
      updated.lastAccountNumber = existing.lastAccountNumber.trim();
    }

    if (groupType) {
      updated.lastGroupType = groupType;
    } else if (existing && typeof existing.lastGroupType === 'string' && existing.lastGroupType.trim()) {
      updated.lastGroupType = existing.lastGroupType.trim();
    }

    record.ips[normalizedIp] = updated;
    await chrome.storage.local.set({ [SENT_SECURITY_ALERTS_STORAGE_KEY]: record });
  } catch (e) {
    console.warn('Failed to mark IP as sent:', e);
  }
}
// -----------------------------------------

function normalizeGeoData(rawData) {
  if (!rawData || typeof rawData !== 'object') return null;

  const toScalarText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
    return '';
  };

  const pickText = (values) => {
    for (const value of values) {
      const text = toScalarText(value);
      if (text) return text;
    }
    return '';
  };

  const normalizeAsnValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const asnText = pickText([
        value.asn,
        value.number,
        value.autonomous_system_number,
        value.id,
        value.route,
        value.code
      ]);
      if (!asnText) return '';
      const asnMatch = asnText.match(/AS\s*([0-9]{1,10})/i);
      if (asnMatch) return `AS${asnMatch[1]}`;
      if (/^[0-9]{1,10}$/.test(asnText)) return `AS${asnText}`;
      return asnText.toUpperCase();
    }

    const text = toScalarText(value);
    if (!text) return '';
    const asnMatch = text.match(/AS\s*([0-9]{1,10})/i);
    if (asnMatch) return `AS${asnMatch[1]}`;
    if (/^[0-9]{1,10}$/.test(text)) return `AS${text}`;
    return text.toUpperCase();
  };

  const toCoordinateString = (value, min, max) => {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text) return '';
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return '';
    if (parsed < min || parsed > max) return '';
    return String(parsed);
  };

  const pickCoordinate = (candidates, min, max) => {
    for (const candidate of candidates) {
      const normalizedCandidate = toCoordinateString(candidate, min, max);
      if (normalizedCandidate) return normalizedCandidate;
    }
    return '';
  };

  const getCountryNameFromCode = (code) => {
    if (!code || typeof code !== 'string') return '';
    const upper = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return '';
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
        const regionDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionDisplayNames.of(upper) || '';
      }
    } catch (e) {
      // ignore and fallback
    }
    return '';
  };

  const parseLoc = (loc) => {
    if (typeof loc !== 'string') return { lat: '', lon: '' };
    const parts = loc.split(',');
    if (parts.length !== 2) return { lat: '', lon: '' };
    const lat = parts[0] && parts[0].trim() ? parts[0].trim() : '';
    const lon = parts[1] && parts[1].trim() ? parts[1].trim() : '';
    return { lat, lon };
  };

  const normalized = { ...rawData };
  const maybeCountryCodeFromCountry =
    typeof normalized.country === 'string' && /^[A-Za-z]{2}$/.test(normalized.country.trim())
      ? normalized.country.trim().toUpperCase()
      : '';

  const countryCode =
    normalized.country_code ||
    normalized.countryCode ||
    normalized.country_iso ||
    normalized.country_iso_code ||
    maybeCountryCodeFromCountry ||
    '';
  normalized.country_code = typeof countryCode === 'string' ? countryCode.toUpperCase() : '';

  const inferredCountryName = getCountryNameFromCode(normalized.country_code);
  const directCountry =
    typeof normalized.country === 'string' && normalized.country.trim() ? normalized.country.trim() : '';
  normalized.country = directCountry || normalized.country_name || inferredCountryName || 'N/A';
  if (/^[A-Za-z]{2}$/.test(normalized.country) && inferredCountryName) {
    normalized.country = inferredCountryName;
  }

  normalized.region = normalized.region || normalized.region_name || normalized.regionName || '';
  normalized.city = normalized.city || normalized.city_name || '';

  normalized.country_phone = normalized.country_phone || normalized.country_calling_code || '';
  normalized.country_capital = normalized.country_capital || normalized.capital || '';
  normalized.timezone = normalized.timezone || normalized.time_zone || '';
  normalized.org = normalized.org || normalized.organization || normalized.isp || '';

  const parsedLoc = parseLoc(normalized.loc);
  const connectionObj = normalized.connection && typeof normalized.connection === 'object' ? normalized.connection : null;
  const companyObj = normalized.company && typeof normalized.company === 'object' ? normalized.company : null;
  const securityObj = normalized.security && typeof normalized.security === 'object' ? normalized.security : null;
  const asnObj = normalized.asn && typeof normalized.asn === 'object' ? normalized.asn : null;
  const locationObj = normalized.location && typeof normalized.location === 'object' ? normalized.location : null;
  const orgText = pickText([
    normalized.org,
    normalized.organization,
    connectionObj && connectionObj.org,
    connectionObj && connectionObj.organization,
    connectionObj && connectionObj.organization_name,
    companyObj && companyObj.name
  ]);
  normalized.org = orgText;

  normalized.isp = pickText([
    normalized.isp,
    connectionObj && connectionObj.isp,
    connectionObj && connectionObj.isp_name,
    connectionObj && connectionObj.provider_name,
    companyObj && companyObj.name,
    orgText
  ]);

  const hostnameText = pickText([
    normalized.reverse,
    normalized.reverse_dns,
    normalized.ptr,
    normalized.rdns,
    Array.isArray(normalized.hostnames) ? normalized.hostnames[0] : '',
    normalized.hostname,
    normalized.host,
    normalized.domain,
    connectionObj && connectionObj.domain,
    companyObj && companyObj.domain,
    asnObj && asnObj.domain
  ]);
  if (hostnameText) {
    normalized.hostname = hostnameText;
    if (!Array.isArray(normalized.hostnames) || !normalized.hostnames.length) {
      normalized.hostnames = [hostnameText];
    }
  }

  normalized.connection_type =
    normalized.connection_type ||
    normalized.usage_type ||
    (connectionObj && (connectionObj.type || connectionObj.connection_type || connectionObj.usage_type)) ||
    (companyObj && companyObj.type) ||
    (securityObj && securityObj.type) ||
    '';
  if (typeof normalized.connection_type === 'string' && /hosting|data\s*center|datacenter|transit|colo|colocation|cloud|vps|server/i.test(normalized.connection_type)) {
    normalized.connection_type = 'Data Center/Transit';
  }

  normalized.latitude = pickCoordinate(
    [
      normalized.latitude,
      normalized.lat,
      normalized.latitude_deg,
      normalized.latitudeDegree,
      parsedLoc.lat,
      locationObj && locationObj.latitude,
      locationObj && locationObj.lat
    ],
    -90,
    90
  );
  normalized.longitude = pickCoordinate(
    [
      normalized.longitude,
      normalized.lon,
      normalized.lng,
      normalized.long,
      normalized.longitude_deg,
      normalized.longitudeDegree,
      parsedLoc.lon,
      locationObj && locationObj.longitude,
      locationObj && locationObj.lon,
      locationObj && locationObj.lng,
      locationObj && locationObj.long
    ],
    -180,
    180
  );
  normalized.asn = normalizeAsnValue(
    normalized.asn ||
    normalized.as ||
    (connectionObj && (connectionObj.asn || connectionObj.autonomous_system_number)) ||
    (companyObj && companyObj.asn) ||
    (asnObj && (asnObj.asn || asnObj.number || asnObj.route)) ||
    ''
  );

  if (!normalized.connection_type) {
    const infraHint = `${normalized.org || ''} ${normalized.isp || ''}`.toLowerCase();
    if (/(ovh|amazon|aws|google cloud|microsoft|azure|digitalocean|linode|vultr|scaleway|hetzner|leaseweb|host|hosting|cloud|datacenter|data center)/.test(infraHint)) {
      normalized.connection_type = 'Data Center/Transit';
    }
  }
  if (!normalized.usage_type && normalized.connection_type) {
    normalized.usage_type = normalized.connection_type;
  }

  normalized.success = true;
  return normalized;
}

const IP_GEO_CACHE_TTL_MS = 30 * 60 * 1000;
const ipGeoCache = new Map();


function normalizeOptionalString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  return '';
}

function normalizeHostnameValue(value) {
  const text = normalizeOptionalString(value);
  if (!text) return '';
  const cleaned = text.replace(/^"+|"+$/g, '').replace(/\.$/, '').trim();
  if (!cleaned) return '';
  if (cleaned.length > 253) return '';
  if (!/^[A-Za-z0-9.-]+$/.test(cleaned)) return '';
  if (!cleaned.includes('.')) return '';
  if (cleaned.toLowerCase() === 'localhost') return '';
  return cleaned;
}

function collectOrgTokens(data) {
  if (!data || typeof data !== 'object') return [];
  const text = `${normalizeOptionalString(data.org)} ${normalizeOptionalString(data.organization)} ${normalizeOptionalString(data.isp)}`.toLowerCase();
  if (!text) return [];
  const tokens = text.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
  return Array.from(new Set(tokens));
}

function getHostnameQualityScore(hostname, contextData) {
  const normalized = normalizeHostnameValue(hostname);
  if (!normalized) return -1;

  const lower = normalized.toLowerCase();
  const labels = lower.split('.').filter(Boolean);
  let score = 0;

  score += 4;
  if (labels.length >= 3) score += 4;
  if (labels.length >= 4) score += 2;
  if (/\d/.test(lower)) score += 2;
  if (/(^|[.-])(ip|ns|srv|host|server|node|static|dyn)[0-9-]*([.-]|$)/.test(lower)) score += 3;
  if (labels.length <= 2) score -= 4;
  if (/(^|[.-])(www|mail|webmail|cpanel)([.-]|$)/.test(lower)) score -= 2;

  const orgTokens = collectOrgTokens(contextData);
  if (labels.length <= 2 && orgTokens.some((token) => lower.includes(token))) {
    score -= 5;
  }

  return score;
}

function chooseBestHostname(currentHostname, incomingHostname, contextData) {
  const current = normalizeHostnameValue(currentHostname);
  const incoming = normalizeHostnameValue(incomingHostname);
  if (!incoming) return current;
  if (!current) return incoming;

  const currentScore = getHostnameQualityScore(current, contextData);
  const incomingScore = getHostnameQualityScore(incoming, contextData);
  if (incomingScore > currentScore) return incoming;
  if (incomingScore === currentScore && incoming.length > current.length) return incoming;
  return current;
}

function dedupeHostnames(values, max = 6) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const hostname = normalizeHostnameValue(value);
    if (!hostname) continue;
    const key = hostname.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hostname);
    if (out.length >= max) break;
  }
  return out;
}

function toGeoNumber(value, min, max) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function parseIPv4(ip) {
  if (typeof ip !== 'string') return null;
  const v = ip.trim();
  const parts = v.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function toReversePtrDomain(ip) {
  const octets = parseIPv4(ip);
  if (!octets) return '';
  return `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}.in-addr.arpa`;
}

function parseReverseDnsHostname(responseBody) {
  if (!responseBody || typeof responseBody !== 'object' || !Array.isArray(responseBody.Answer)) return '';
  for (const answer of responseBody.Answer) {
    if (!answer || typeof answer !== 'object') continue;
    if (Number(answer.type) !== 12) continue; // PTR record
    const hostname = normalizeHostnameValue(answer.data);
    if (hostname) return hostname;
  }
  return '';
}

function needsReverseDnsHostname(data) {
  if (!data || typeof data !== 'object') return true;
  const hostname = normalizeHostnameValue(data.hostname);
  if (!hostname) return true;
  return getHostnameQualityScore(hostname, data) < 6;
}

async function fetchReverseDnsHostname(ip) {
  const ptrDomain = toReversePtrDomain(ip);
  if (!ptrDomain) return '';

  const resolverEndpoints = [
    {
      url: `https://dns.google/resolve?name=${encodeURIComponent(ptrDomain)}&type=PTR`,
      requestInit: { headers: { Accept: 'application/dns-json' } }
    },
    {
      url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(ptrDomain)}&type=PTR`,
      requestInit: { headers: { Accept: 'application/dns-json' } }
    }
  ];

  for (const resolver of resolverEndpoints) {
    try {
      const response = await fetchWithTimeout(resolver.url, 1600, resolver.requestInit);
      if (!response.ok) continue;
      const payload = await response.json();
      const hostname = parseReverseDnsHostname(payload);
      if (hostname) return hostname;
    } catch (error) {
      // Ignore resolver errors and continue with next resolver.
    }
  }

  return '';
}

function getSpecialIPv4Geo(ip) {
  const o = parseIPv4(ip);
  if (!o) return { success: false, error: 'Invalid IPv4 format' };
  const [a, b] = o;

  const isPrivate =
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);

  const isLoopback = a === 127;
  const isLinkLocal = a === 169 && b === 254;
  const isDocumentation =
    (a === 192 && b === 0 && o[2] === 2) ||
    (a === 198 && b === 51 && o[2] === 100) ||
    (a === 203 && b === 0 && o[2] === 113);
  const isBenchmark = a === 198 && (b === 18 || b === 19);
  const isBroadcast = a === 255 && b === 255 && o[2] === 255 && o[3] === 255;
  const isThisNetwork = a === 0;
  const isMulticast = a >= 224 && a <= 239;
  const isReserved = a >= 240;

  if (
    isPrivate ||
    isLoopback ||
    isLinkLocal ||
    isDocumentation ||
    isBenchmark ||
    isBroadcast ||
    isThisNetwork ||
    isMulticast ||
    isReserved
  ) {
    return {
      success: true,
      data: {
        ip: ip,
        country: 'Private/Reserved IP',
        country_code: '',
        region: '',
        city: '',
        org: '',
        success: true
      },
      provider: 'local-classifier'
    };
  }

  return null;
}

async function fetchWithTimeout(url, timeoutMs = 1800, requestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = requestInit && typeof requestInit === 'object' ? { ...requestInit } : {};
    init.signal = controller.signal;
    return await fetch(url, init);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchIpGeolocation(ip, lang = 'ar', options = {}) {
  const forceRefresh = !!(options && options.forceRefresh);
  const special = getSpecialIPv4Geo(ip);
  if (special) return special;

  const cacheKey = `${ip}|${lang}`;
  const cached = ipGeoCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now() && cached.data) {
    return { success: true, data: cached.data, provider: cached.provider };
  }
  const staleCached = cached && cached.data ? cached : null;

  const encodedIp = encodeURIComponent(ip);

  try {
    const response = await fetchWithTimeout(`https://ipwhois.app/json/${encodedIp}`, 2000);
    if (!response.ok) {
      throw new Error(`ipwhois.io HTTP ${response.status}`);
    }

    let rawGeoData = null;
    try {
      rawGeoData = await response.json();
    } catch (e) {
      throw new Error('ipwhois.io: invalid JSON response');
    }

    if (!rawGeoData || rawGeoData.success === false || !!rawGeoData.error) {
      const reason = rawGeoData && (rawGeoData.message || rawGeoData.reason || (rawGeoData.error && (rawGeoData.error.message || rawGeoData.error)));
      throw new Error(`ipwhois.io: ${normalizeOptionalString(reason) || 'unsuccessful response'}`);
    }

    const timezoneObj = rawGeoData && typeof rawGeoData.timezone === 'object' ? rawGeoData.timezone : null;
    const connectionObj = rawGeoData && typeof rawGeoData.connection === 'object' ? rawGeoData.connection : null;
    const geoData = {
      ...rawGeoData,
      country: normalizeOptionalString(rawGeoData.country) || '',
      country_code: normalizeOptionalString(rawGeoData.country_code) || '',
      region: normalizeOptionalString(rawGeoData.region) || '',
      city: normalizeOptionalString(rawGeoData.city) || '',
      timezone:
        normalizeOptionalString(rawGeoData.timezone) ||
        normalizeOptionalString(timezoneObj && timezoneObj.id) ||
        normalizeOptionalString(timezoneObj && timezoneObj.abbr) ||
        '',
      org:
        normalizeOptionalString(rawGeoData.org) ||
        normalizeOptionalString(connectionObj && connectionObj.org) ||
        normalizeOptionalString(connectionObj && connectionObj.isp) ||
        '',
      asn:
        normalizeOptionalString(rawGeoData.asn) ||
        normalizeOptionalString(connectionObj && connectionObj.asn) ||
        ''
    };

    const normalized = normalizeGeoData(geoData);
    const hasCountry = normalized && ((normalized.country && normalized.country !== 'N/A') || normalized.country_code);
    if (!hasCountry) {
      throw new Error('ipwhois.io: missing country data');
    }

    const result = { success: true, data: normalized, provider: 'ipwhois.io' };

    if (result.data && needsReverseDnsHostname(result.data)) {
      try {
        const reverseDnsHostname = await fetchReverseDnsHostname(ip);
        if (reverseDnsHostname) {
          result.data.hostname = chooseBestHostname(result.data.hostname, reverseDnsHostname, result.data);
          result.data.hostnames = dedupeHostnames(
            []
              .concat(result.data.hostname ? [result.data.hostname] : [])
              .concat(Array.isArray(result.data.hostnames) ? result.data.hostnames : [])
              .concat([reverseDnsHostname])
          );
        }
      } catch (reverseDnsError) {
        // Continue with geolocation result if reverse DNS lookup fails.
      }
    }

    result.data = normalizeGeoData(result.data) || result.data;

    ipGeoCache.set(cacheKey, {
      data: result.data,
      provider: result.provider,
      expiresAt: Date.now() + IP_GEO_CACHE_TTL_MS
    });
    return result;
  } catch (error) {
    const errorText = error && error.message ? error.message : String(error);

    if (staleCached && staleCached.data) {
      return { success: true, data: staleCached.data, provider: `${staleCached.provider || 'cache'}-stale` };
    }

    return {
      success: false,
      error: errorText || 'ipwhois.io geolocation lookup failed'
    };
  }
}

function buildGeoFailureReason(rawError) {
  const text = normalizeOptionalString(rawError).toLowerCase();
  if (!text) return getBackgroundText('geoReasonUnknown');
  if (text.includes('all geolocation providers failed') || text.includes('ipwhois.io')) {
    return getBackgroundText('geoReasonAllProviders');
  }
  if (/http\s*(401|403)/.test(text) || text.includes('unauthorized') || text.includes('forbidden')) {
    return getBackgroundText('geoReasonAuth');
  }
  if (/http\s*(402|429)/.test(text) || text.includes('quota') || text.includes('rate limit')) {
    return getBackgroundText('geoReasonQuota');
  }
  if (text.includes('aborted') || text.includes('timeout')) return getBackgroundText('geoReasonTimeout');
  if (text.includes('failed to fetch') || text.includes('network')) return getBackgroundText('geoReasonNetwork');
  return rawError;
}

function buildGeoUnavailableMessage(ip, rawError) {
  const reason = buildGeoFailureReason(rawError);
  return `${IP_UI_TEXT.addressLabel}: ${ip}\n${IP_UI_TEXT.countryLabel}: ${IP_UI_TEXT.unavailableCountry}\n${IP_UI_TEXT.reasonLabel}: ${reason}`;
}

let IP_UI_TEXT = {};

function refreshIpUiText() {
  IP_UI_TEXT = {
    newIpTitle: getBackgroundText('ipUiNewIpTitle'),
    duplicateIpTitle: getBackgroundText('ipUiDuplicateIpTitle'),
    genericIpTitle: getBackgroundText('ipUiGenericIpTitle'),
    countryCityButton: getBackgroundText('ipUiCountryCityButton'),
    countryRegionButton: getBackgroundText('ipUiCountryRegionButton'),
    countryButton: getBackgroundText('ipUiCountryButton'),
    regionButton: getBackgroundText('ipUiRegionButton'),
    countryLabel: getBackgroundText('ipUiCountryLabel'),
    regionLabel: getBackgroundText('ipUiRegionLabel'),
    cityLabel: getBackgroundText('ipUiCityLabel'),
    addressLabel: getBackgroundText('ipUiAddressLabel'),
    reasonLabel: getBackgroundText('ipUiReasonLabel'),
    unavailableCountry: getBackgroundText('ipUiUnavailableCountry'),
    kirkukTitle: getBackgroundText('ipUiKirkukTitle'),
    sulaymaniyahTitle: getBackgroundText('ipUiSulaymaniyahTitle'),
    erbilTitle: getBackgroundText('ipUiErbilTitle')
  };
}

refreshIpUiText();

let securityAlertWindowId = null;

// Clean up ID when window is closed
chrome.windows.onRemoved.addListener((winId) => {
    if (winId === securityAlertWindowId) {
        securityAlertWindowId = null;
    }
});

function openSecurityAlertPopup(ipMessage, country, type) {
    // If already open, focus it
    if (securityAlertWindowId) {
        chrome.windows.update(securityAlertWindowId, { focused: true }).catch(() => {
            securityAlertWindowId = null;
            openSecurityAlertPopup(ipMessage, country, type); // Retry
        });
        return;
    }

    const params = new URLSearchParams({
        ipMessage: ipMessage,
        country: country,
        type: type
    });
    
    chrome.windows.create({
        url: chrome.runtime.getURL('security-alert.html') + '?' + params.toString(),
        type: 'popup',
        width: 420,
        height: 550,
        focused: true
    }).then(win => {
        securityAlertWindowId = win.id;
    }).catch(err => console.warn('Failed to open security popup:', err));
}

function formatSecurityAlertErrorArabic(rawError) {
  const text = String(rawError || '').trim();
  if (!text) return 'فشل الإرسال إلى Telegram بسبب غير معروف.';

  // If already Arabic, keep it as-is
  if (/[\u0600-\u06FF]/.test(text)) return text;

  const lower = text.toLowerCase();

  if (lower.includes('group chat was upgraded to a supergroup chat')) {
    return 'فشل الإرسال: تم ترقية الجروب إلى Supergroup. استخدم Chat ID الجديد.';
  }
  if (lower.includes('chat not found')) {
    return 'فشل الإرسال: Chat ID غير صحيح أو البوت غير موجود داخل الجروب.';
  }
  if (lower.includes('bot was kicked from the supergroup chat') || lower.includes('bot was blocked by the user')) {
    return 'فشل الإرسال: البوت محظور أو تم طرده من الجروب.';
  }
  if (
    lower.includes('not enough rights') ||
    lower.includes('have no rights to send a message') ||
    lower.includes('need administrator rights')
  ) {
    return 'فشل الإرسال: البوت لا يملك صلاحية إرسال رسائل في الجروب.';
  }
  if (lower.includes('unauthorized')) {
    return 'فشل الإرسال: Bot Token غير صحيح.';
  }
  if (lower.includes('forbidden')) {
    return 'فشل الإرسال: Telegram رفض الطلب. تحقق من صلاحيات البوت داخل الجروب.';
  }

  const cleaned = text
    .replace(/^telegram api error:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .trim();
  return `فشل الإرسال إلى Telegram: ${cleaned || text}`;
}

async function sendTelegramAlert(ipMessage, country, type, accountNumber = null, groupType = null) {
  console.log('%c >>> STARTING TELEGRAM ALERT <<<', 'background: #222; color: #bada55; font-size: 20px');
  console.log('Parameters:', { ipMessage, country, type, ALERT_CHAT_ID, accountNumber, groupType });

  try {
    if (!TELEGRAM_BOT_TOKEN || !ALERT_CHAT_ID) {
      throw new Error('فشل الإرسال: إعدادات Telegram غير مكتملة (Bot Token أو Chat ID).');
    }

    const { userSettings } = await chrome.storage.local.get(['userSettings']);
    console.log('Fetched User Settings:', userSettings);

    const employee = userSettings && userSettings.employeeName ? userSettings.employeeName : 'Unknown/Not Set';

    let ip = 'N/A';
    let regionName = '';

    if (ipMessage) {
      const ipMatch = ipMessage.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      ip = ipMatch ? ipMatch[0] : ipMessage.substring(0, 20);

      const labelsToTry = [IP_UI_TEXT.regionLabel, 'المحافظة', 'Region'].filter(Boolean);
      for (const label of labelsToTry) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regionMatch = ipMessage.match(new RegExp(`${escaped}:\\s*(.+)`));
        if (regionMatch && regionMatch[1]) {
          regionName = regionMatch[1].trim();
          break;
        }
      }
    }

    console.log(`Processing Alert -> IP: ${ip}, Country: ${country}, ChatID: ${ALERT_CHAT_ID}, Employee: ${employee}`);

    const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let text = '';
    if (accountNumber) {
      text += `رقم الحساب: ${escHtml(accountNumber)}\n`;
    }
    if (groupType) {
      text += `نوع الجروب: ${escHtml(groupType)}\n`;
    }

    text += `IP: <code>${escHtml(ip)}</code> // <code>${escHtml(country)}</code>`;
    if (regionName) {
      text += ` // ${escHtml(regionName)}`;
    }
    text += `\n${escHtml(employee)}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: ALERT_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    };

    console.log('Attempting fetch to:', url);
    console.log('Request Body:', JSON.stringify(body));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Fetch Response Status:', response.status);

    const rawResponseText = await response.text();
    let responseData = null;
    try {
      responseData = rawResponseText ? JSON.parse(rawResponseText) : null;
    } catch (parseError) {
      responseData = null;
    }

    if (!response.ok || (responseData && responseData.ok === false)) {
      const apiError = (responseData && responseData.description)
        ? responseData.description
        : (rawResponseText || `HTTP ${response.status}`);
      console.error('TELEGRAM ALERT FAILED');
      console.error('Status:', response.status);
      console.error('Error Body:', rawResponseText);
      throw new Error(formatSecurityAlertErrorArabic(apiError));
    } else {
      console.log('TELEGRAM ALERT SENT SUCCESSFULLY');
      console.log('Response Data:', responseData);
      await markIpAsSent(ip, { accountNumber, groupType });
      return responseData;
    }
  } catch (e) {
    console.error('EXCEPTION IN SEND TELEGRAM ALERT', e);
    throw new Error(formatSecurityAlertErrorArabic(e && e.message ? e.message : String(e)));
  }
}
let criticalAlertWindowId = null;
let criticalAlertTabId = null;
let lastCriticalPopupKey = '';
let lastCriticalPopupAt = 0;

try {
  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === criticalAlertWindowId) {
      criticalAlertWindowId = null;
      criticalAlertTabId = null;
    }
  });
} catch (e) {
  // ignore
}

function normalizeIPv4List(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const ip = raw.trim();
    if (!ip) continue;
    const octets = ip.split('.');
    if (octets.length !== 4) continue;
    if (!octets.every(o => o !== '' && /^\d+$/.test(o))) continue;
    const ok = octets.every(o => {
      const n = Number(o);
      return n >= 0 && n <= 255;
    });
    if (!ok) continue;
    normalized.push(ip);
  }
  return Array.from(new Set(normalized));
}

function normalizeSevenDigitAccounts(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const acc = raw.trim();
    if (!acc) continue;
    if (!/^\d{6,7}$/.test(acc)) continue;
    normalized.push(acc);
  }
  return Array.from(new Set(normalized));
}

async function loadCriticalWatchlistFromSync() {
  try {
    const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
    const watchlist = data[CRITICAL_WATCHLIST_STORAGE_KEY] || {};

    const rawIps = Array.isArray(watchlist.ips) ? watchlist.ips : [];
    const rawAccounts = Array.isArray(watchlist.accounts) ? watchlist.accounts : [];

    const userIps = [];
    const ipNotes = new Map();
    for (const item of rawIps) {
      if (typeof item === 'string') {
        const ips = normalizeIPv4List([item]);
        if (ips[0]) userIps.push(ips[0]);
        continue;
      }
      if (item && typeof item === 'object') {
        const ips = normalizeIPv4List([item.ip]);
        if (!ips[0]) continue;
        userIps.push(ips[0]);
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (note) ipNotes.set(ips[0], note);
      }
    }

    const userAccounts = [];
    const accountNotes = new Map();
    for (const item of rawAccounts) {
      if (typeof item === 'string') {
        const accounts = normalizeSevenDigitAccounts([item]);
        if (accounts[0]) userAccounts.push(accounts[0]);
        continue;
      }
      if (item && typeof item === 'object') {
        const accounts = normalizeSevenDigitAccounts([item.account]);
        if (!accounts[0]) continue;
        userAccounts.push(accounts[0]);
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (note) accountNotes.set(accounts[0], note);
      }
    }

    // Ensure default note for specific IP
    if (!ipNotes.has('77.76.9.250')) {
      ipNotes.set('77.76.9.250', 'ال IP ده خاص بسيرفر الشركة');
    }

    criticalIpNoteMap = ipNotes;
    criticalAccountNoteMap = accountNotes;
    criticalIpSet = new Set(DEFAULT_CRITICAL_IPS.concat(userIps));
    criticalAccountSet = new Set(userAccounts);
  } catch (e) {
    // Fall back to defaults
    criticalIpSet = new Set(DEFAULT_CRITICAL_IPS);
    criticalAccountSet = new Set();
    criticalIpNoteMap = new Map();
    criticalIpNoteMap.set('77.76.9.250', 'ال IP ده خاص بسيرفر الشركة');
    criticalAccountNoteMap = new Map();
  }
}

function enqueueToast(toast) {
  toastQueue.push(toast);
}

async function openSidePanelIfNeeded() {
  if (!isSidePanelOpen) {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tabs && tabs[0]) {
        await chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    } catch (e) {
      console.warn('Failed to auto-open side panel:', e);
    }
  }
}

function showToastMessage(title, message, toastType, buttons, notificationItems, config) {
  console.log('showToastMessage called with:', { title, message, toastType });

  const notificationText = {
    duplicateAlertTitle: getBackgroundText('duplicateAlertTitle'),
    duplicateAlertPrefix: getBackgroundText('duplicateAlertPrefix'),
    duplicateAlertSuffix: getBackgroundText('duplicateAlertSuffix'),
    duplicateAlertLastSentPrefix: getBackgroundText('duplicateAlertLastSentPrefix'),
    duplicateSentFooterPrefix: getBackgroundText('duplicateSentFooterPrefix'),
    alertPrefix: getBackgroundText('alertPrefix'),
    specialRegionTitle: getBackgroundText('specialRegionTitle'),
    urgentManagerNote: getBackgroundText('urgentManagerNote'),
    ukTitle: getBackgroundText('ukTitle'),
    nlTitle: getBackgroundText('nlTitle')
  };

  const toastPayload = { type: 'showToast', title, message, toastType };

  if (isSidePanelOpen) {
    try {
      chrome.runtime.sendMessage(toastPayload).catch((err) => {
        console.warn('Failed to send toast to sidepanel (promise):', err);
      });
    } catch (e) {
      console.warn('Toast send error (try-catch):', e);
    }
  } else {
    enqueueToast(toastPayload);
  }

  const skipSystemNotification = !!(config && config.skipSystemNotification);
  const bannedCountryTypes = Object.values(BANNED_COUNTRIES).map((country) => country.type);
  const tempToastType = toastType || '';
  const isBannedOrHighlightedToast = bannedCountryTypes.includes(tempToastType) || tempToastType === 'erbil';
  const isIpToast = tempToastType === 'ip' || isBannedOrHighlightedToast;

  const createSystemNotification = (baseTitle, baseMessage, baseToastType, baseButtons, baseNotificationItems, baseContextMessage) => {
    if (isSidePanelOpen || skipSystemNotification) {
      return;
    }

    if (lastNotificationId) {
      try {
        chrome.notifications.clear(lastNotificationId);
      } catch (e) {
        console.warn('Failed to clear notification:', e);
      }
    }

    const notificationId = `${baseToastType || 'note'}-${Date.now()}`;
    let enhancedTitle = baseTitle;
    let enhancedMessage = baseMessage;
    const options = {
      type: baseNotificationItems ? 'list' : 'basic',
      iconUrl: chrome.runtime.getURL('images/icon128.png'),
      title: enhancedTitle,
      message: baseNotificationItems ? '' : enhancedMessage,
      isClickable: true,
      priority: 2,
      eventTime: Date.now(),
      silent: false
    };

    if (baseContextMessage) {
      options.contextMessage = baseContextMessage;
    }

    if (baseNotificationItems) {
      options.items = baseNotificationItems;
    }

    if (baseToastType === 'erbil') {
      enhancedTitle = notificationText.specialRegionTitle;
      enhancedMessage = `${notificationText.alertPrefix}\n${baseMessage}\n${notificationText.urgentManagerNote}`;
      options.title = enhancedTitle;
      options.message = enhancedMessage;
      options.contextMessage = notificationText.urgentManagerNote;
      options.type = 'basic';
      delete options.items;
      options.requireInteraction = true;
      try {
        chrome.runtime.sendMessage({ type: 'playHighlightSound' }).catch((err) => {
          console.warn('Failed to play highlight sound:', err);
        });
      } catch (e) {
        console.warn('Sound error:', e);
      }
    }

    if (baseToastType === 'uk') {
      enhancedTitle = notificationText.ukTitle;
      enhancedMessage = `${notificationText.alertPrefix}\n${baseMessage}\n${notificationText.urgentManagerNote}`;
      options.title = enhancedTitle;
      options.message = enhancedMessage;
      options.contextMessage = notificationText.urgentManagerNote;
      options.type = 'basic';
      delete options.items;
      options.requireInteraction = true;
      try {
        chrome.runtime.sendMessage({ type: 'playUKSound' }).catch((err) => {
          console.warn('Failed to play UK sound:', err);
        });
      } catch (e) {
        console.warn('Sound error:', e);
      }
    }

    if (baseToastType === 'netherlands') {
      enhancedTitle = notificationText.nlTitle;
      enhancedMessage = `${notificationText.alertPrefix}\n${baseMessage}\n${notificationText.urgentManagerNote}`;
      options.title = enhancedTitle;
      options.message = enhancedMessage;
      options.contextMessage = notificationText.urgentManagerNote;
      options.type = 'basic';
      delete options.items;
      options.requireInteraction = true;
      try {
        chrome.runtime.sendMessage({ type: 'playNLSound' }).catch((err) => {
          console.warn('Failed to play NL sound:', err);
        });
      } catch (e) {
        console.warn('Sound error:', e);
      }
    }

    if (baseToastType === 'wallet-new') {
      options.requireInteraction = true;
    }

    if (Array.isArray(baseButtons) && baseButtons.length) {
      options.buttons = baseButtons.map((b) => ({ title: b.title }));
    }

    chrome.notifications.create(notificationId, options, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create notification:', chrome.runtime.lastError);
        console.error('Attempted to create notification with options:', JSON.stringify(options));
      } else {
        lastNotificationId = createdId;
      }
    });
  };

  if (isIpToast) {
    const ipMatch = message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    const ipToCheck = ipMatch ? ipMatch[0] : null;

    if (ipToCheck) {
      const openPopupIfNeeded = () => {
        if (!isBannedOrHighlightedToast) return;
        const countryMapping = Object.entries(BANNED_COUNTRIES).reduce(
          (acc, [code, data]) => {
            acc[data.type] = { name: data.name, code: code };
            return acc;
          },
          { erbil: { name: 'Iraq (Special Region)', code: 'IQ' } }
        );
        const countryInfo = countryMapping[tempToastType];
        if (countryInfo) {
          openSecurityAlertPopup(message, countryInfo.name, countryInfo.code);
        }
      };

      getIpSentRecord(ipToCheck)
        .then((sentRecord) => {
          let finalMessage = message;
          let footerContextMessage = '';
          if (sentRecord) {
            const lastSentAt = formatSentAtForNotification(sentRecord.lastSentAt);
            footerContextMessage = `${notificationText.duplicateSentFooterPrefix} ${lastSentAt}`;
          } else {
            openPopupIfNeeded();
          }
          createSystemNotification(title, finalMessage, toastType, buttons, notificationItems, footerContextMessage);
        })
        .catch((error) => {
          console.warn('getIpSentRecord failed:', error);
          openPopupIfNeeded();
          createSystemNotification(title, message, toastType, buttons, notificationItems);
        });

      return;
    }
  }

  createSystemNotification(title, message, toastType, buttons, notificationItems);
}
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    isSidePanelOpen = true;
    // Flush queued toasts
    if (toastQueue.length) {
      toastQueue.forEach(t => chrome.runtime.sendMessage({ type: 'showToast', ...t }));
      toastQueue = [];
    }
    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
    });
  }
});

// Function to clear old accounts
async function clearOldAccounts() {
  const syncData = await chrome.storage.sync.get(['clearHistoryEnabled', 'clearHistoryDays']);
  if (!syncData.clearHistoryEnabled) {
    return;
  }

  const daysToKeep = syncData.clearHistoryDays || 30;
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  const localData = await chrome.storage.local.get('copiedAccounts');
  let copiedAccounts = localData.copiedAccounts || [];

  const updatedAccounts = copiedAccounts.filter(account => account.timestamp > cutoffTime);

  if (updatedAccounts.length !== copiedAccounts.length) {
    await chrome.storage.local.set({ copiedAccounts: updatedAccounts });
  }
}

// Clear old accounts on startup
chrome.runtime.onStartup.addListener(() => {
  setupOffscreenDocument('offscreen.html');
  clearOldAccounts();
});

// Clear old accounts periodically (e.g., every hour)
setInterval(clearOldAccounts, 60 * 60 * 1000);

async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['CLIPBOARD'],
      justification: 'Clipboard access is required to track account numbers.',
    });
    await creating;
    creating = null;
  }
}

function parseTradesText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const trades = [];
  
  // Types to ignore (not real trades)
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  for (const line of lines) {
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) continue;

    const type = parts[2];

    // Skip system operations
    if (ignoreTypes.some(t => t.toLowerCase() === type.toLowerCase())) {
        continue;
    }

    if (type === 'Balance') {
        let amount = 0;
        let comment = '';
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
            profit: amount,
            comment: comment,
            isBalance: true
        });
    } else if (parts.length >= 10) {
      const lastCol = parts[parts.length - 1];
      const lastColValue = parseFloat(lastCol);
      if (isNaN(lastColValue) || !lastCol.match(/^-?\d+\.?\d*$/)) {
        continue;
      }
      const profit = lastColValue;
      if (profit !== null && !isNaN(profit)) {
        trades.push({
          date: parts[0] || '',
          ticket: parts[1] || '',
          type: parts[2] || '',
          volume: parts[3] || '',
          symbol: parts[4] || '',
          openPrice: parts[5] || '',
          sl: parts[6] || '',
          tp: parts[7] || '',
          closeTime: parts[8] || '',
          closePrice: parts[9] || '',
          openTime: `${parts[0]} ${parts[8]}` || '', // Combine date with close time as reference
          profit: profit,
          isBalance: false
        });
      }
    }
  }
  return trades;
}

function splitTradeColumns(line, options = {}) {
  const keepEmpty = !!(options && options.keepEmpty);
  const raw = typeof line === 'string' ? line : String(line || '');
  if (raw.includes('\t')) {
    const cols = raw.split('\t').map((p) => p.trim());
    return keepEmpty ? cols : cols.filter((p) => p);
  }
  const cols = raw.split(/\s{2,}/).map((p) => p.trim());
  return keepEmpty ? cols : cols.filter((p) => p);
}

function normalizeHeaderToken(token) {
  return String(token || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

function parseLooseNumber(value) {
  if (value === null || value === undefined) return NaN;
  let text = String(value).trim();
  if (!text) return NaN;

  // Keep only numeric symbols.
  text = text.replace(/[^\d.,+\-]/g, '');
  if (!text) return NaN;

  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    // Choose decimal separator based on rightmost symbol.
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 => 1234.56
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 => 1234.56
      text = text.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // 123,45 => 123.45
    text = text.replace(',', '.');
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseStrictNumberToken(value) {
  const text = String(value || '').trim();
  if (!/^[-+]?\d+(?:[.,]\d+)?$/.test(text)) return NaN;
  return parseLooseNumber(text);
}

function isCombinedDateTimeToken(token) {
  return /^\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}:\d{2}$/.test(String(token || '').trim());
}

function isDateToken(token) {
  return /^\d{4}\.\d{1,2}\.\d{1,2}$/.test(String(token || '').trim());
}

function isTimeToken(token) {
  return /^\d{1,2}:\d{2}:\d{2}$/.test(String(token || '').trim());
}

function extractPriceSlFromTradeLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;

  // Preferred parser: fixed MT layout
  // TIME TICKET TYPE VOLUME SYMBOL PRICE S/L T/P TIME PRICE REASON COMMISSION FEE SWAP PROFIT COMMENT
  const orderedLayoutMatch = raw.match(
    /^\s*(\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}:\d{2})[\t ]+(\d+)[\t ]+(buy|sell)[\t ]+([-+]?\d+(?:[.,]\d+)?)[\t ]+(\S+)[\t ]+([-+]?\d+(?:[.,]\d+)?)([\s\S]*?)[\t ]+(\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}:\d{2})[\t ]+([-+]?\d+(?:[.,]\d+)?)[\t ]+(\S+)[\t ]+([-+]?\d+(?:[.,]\d+)?)[\t ]+([-+]?\d+(?:[.,]\d+)?)[\t ]+([-+]?\d+(?:[.,]\d+)?)[\t ]+([-+]?\d+(?:[.,]\d+)?)(?:[\t ]+.*)?\s*$/i
  );

  if (orderedLayoutMatch) {
    const openPrice = parseLooseNumber(orderedLayoutMatch[6]);
    const betweenOpenAndClose = orderedLayoutMatch[7] || '';
    const betweenNumbers = betweenOpenAndClose.match(/[-+]?\d+(?:[.,]\d+)?/g) || [];
    const sl = betweenNumbers.length ? parseLooseNumber(betweenNumbers[0]) : NaN;
    return { price: openPrice, sl };
  }

  const cols = splitTradeColumns(raw, { keepEmpty: true });
  const typeIndex = cols.findIndex((col) => {
    const lower = String(col || '').trim().toLowerCase();
    return lower === 'buy' || lower === 'sell';
  });
  if (typeIndex === -1) return null;

  const priceStartIndex = typeIndex + 3; // after Type, Lot, Symbol
  if (priceStartIndex >= cols.length) return null;

  let closeDateTimeStart = -1;
  for (let i = priceStartIndex; i < cols.length; i++) {
    const current = String(cols[i] || '').trim();
    if (!current) continue;
    if (isCombinedDateTimeToken(current)) {
      closeDateTimeStart = i;
      break;
    }
    if (isDateToken(current) && i + 1 < cols.length && isTimeToken(cols[i + 1])) {
      closeDateTimeStart = i;
      break;
    }
  }

  if (closeDateTimeStart !== -1 && closeDateTimeStart > priceStartIndex) {
    const preCloseTokens = cols.slice(priceStartIndex, closeDateTimeStart);
    const numericCandidates = preCloseTokens
      .map((token) => parseStrictNumberToken(token))
      .filter((n) => Number.isFinite(n));

    if (numericCandidates.length >= 2) {
      return { price: numericCandidates[0], sl: numericCandidates[1] };
    }
    if (numericCandidates.length === 1) {
      return { price: numericCandidates[0], sl: NaN };
    }
  }

  // Regex fallback for rows with inconsistent spacing.
  const freeFormMatch = raw.match(
    /\b(?:buy|sell)\b\s+[-+]?\d+(?:[.,]\d+)?\s+\S+\s+(.+?)\s+\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}:\d{2}\s+[-+]?\d+(?:[.,]\d+)?\s+\S+/i
  );
  if (!freeFormMatch || !freeFormMatch[1]) return null;

  const numberTokens = freeFormMatch[1].match(/[-+]?\d+(?:[.,]\d+)?/g) || [];
  const numericCandidates = numberTokens
    .map((token) => parseLooseNumber(token))
    .filter((n) => Number.isFinite(n));

  if (numericCandidates.length >= 2) {
    return { price: numericCandidates[0], sl: numericCandidates[1] };
  }
  if (numericCandidates.length === 1) {
    return { price: numericCandidates[0], sl: NaN };
  }

  return null;
}

function countEqualPriceSlTrades(rawText, parsedTrades = []) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line);

  let headerIndex = -1;
  let typeIndex = -1;
  let slIndex = -1;
  let priceIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const cols = splitTradeColumns(lines[i], { keepEmpty: true });
    if (cols.length < 5) continue;

    const normalized = cols.map((col) => normalizeHeaderToken(col));
    const foundTypeIndex = normalized.indexOf('TYPE');
    const foundSlIndex = normalized.findIndex((col) => col === 'S/L' || col === 'SL');
    if (foundTypeIndex === -1 || foundSlIndex === -1) continue;

    let foundPriceIndex = -1;
    for (let j = 0; j < normalized.length; j++) {
      if (normalized[j] === 'PRICE' && j < foundSlIndex) {
        foundPriceIndex = j;
        break;
      }
    }
    if (foundPriceIndex === -1) {
      foundPriceIndex = normalized.indexOf('PRICE');
    }
    if (foundPriceIndex === -1) continue;

    headerIndex = i;
    typeIndex = foundTypeIndex;
    slIndex = foundSlIndex;
    priceIndex = foundPriceIndex;
    break;
  }

  if (headerIndex !== -1) {
    let count = 0;
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = splitTradeColumns(lines[i], { keepEmpty: true });
      if (cols.length <= Math.max(typeIndex, slIndex, priceIndex)) continue;

      const type = String(cols[typeIndex] || '').trim().toLowerCase();
      if (type !== 'buy' && type !== 'sell') continue;

      const price = parseLooseNumber(cols[priceIndex]);
      const sl = parseLooseNumber(cols[slIndex]);
      if (!Number.isFinite(price) || !Number.isFinite(sl)) continue;
      if (price <= 0 || sl <= 0) continue;

      if (Math.abs(price - sl) <= 0.00001) {
        count++;
      }
    }
    return count;
  }

  // Headerless fallback: infer positions from each line layout.
  let inferredCount = 0;
  let inferredAny = false;
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (!/\b(buy|sell)\b/.test(lowerLine)) continue;
    if (/\b(balance|bonus|deposit|withdrawal|credit|fee|compensation)\b/.test(lowerLine)) continue;

    const pair = extractPriceSlFromTradeLine(line);
    if (!pair) continue;
    inferredAny = true;

    const { price, sl } = pair;
    if (!Number.isFinite(price) || !Number.isFinite(sl)) continue;
    if (price <= 0 || sl <= 0) continue;
    if (Math.abs(price - sl) <= 0.00001) inferredCount++;
  }
  if (inferredAny) return inferredCount;

  // Fallback to parsed trades when headers are unavailable.
  let fallbackCount = 0;
  for (const t of Array.isArray(parsedTrades) ? parsedTrades : []) {
    if (!t || t.isBalance) continue;
    const price = parseLooseNumber(t.openPrice);
    const sl = parseLooseNumber(t.sl);
    if (!Number.isFinite(price) || !Number.isFinite(sl)) continue;
    if (price <= 0 || sl <= 0) continue;
    if (Math.abs(price - sl) <= 0.00001) fallbackCount++;
  }
  return fallbackCount;
}

/**
 * Parse combined datetime in formats: YYYY.MM.DD HH:MM:SS or DD/MM/YYYY HH:MM:SS
 */
function parseAnyCombinedDateTime(text) {
  if (!text) return null;
  
  text = text.trim();
  
  // Try YYYY.MM.DD HH:MM:SS format
  const dotRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const dotMatch = text.match(dotRegex);
  if (dotMatch) {
    const [, year, month, day, hour, min, sec] = dotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(min), parseInt(sec));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try DD/MM/YYYY HH:MM:SS format
  const slashRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const slashMatch = text.match(slashRegex);
  if (slashMatch) {
    const [, day, month, year, hour, min, sec] = slashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(min), parseInt(sec));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Find Buy/Sell pairs within 5 minutes (same logic as price-sl-checker)
 */
function findPairs(trades, minutes = 5) {
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  // Filter real trades only
  const realTrades = trades.filter(t => {
    if (t.isBalance) return false;
    if (ignoreTypes.some(type => t.type && t.type.toLowerCase() === type.toLowerCase())) return false;
    return t.volume && t.symbol && (t.type === 'Buy' || t.type === 'Sell');
  });
  
  if (realTrades.length === 0) return [];
  
  const pairs = [];
  const timeWindow = minutes * 60 * 1000; // Convert minutes to milliseconds (5 min = 300000 ms)
  const groups = {};
  
  // Group by symbol and lot
  realTrades.forEach(t => {
    const lot = Math.abs(parseFloat(t.volume || 0)).toFixed(4);
    const key = `${(t.symbol || '').toUpperCase()}-${lot}`;
    if (!groups[key]) groups[key] = { buys: [], sells: [] };
    
    // Parse date + closeTime to get full datetime timestamp
    let openTs = 0;
    if (t.date && t.closeTime) {
      try {
        const combinedDateTime = `${t.date} ${t.closeTime}`;
        const dt = parseAnyCombinedDateTime(combinedDateTime);
        if (dt) {
          openTs = dt.getTime();
        }
      } catch (e) {
        openTs = 0;
      }
    }
    
    if (t.type === 'Buy') {
      groups[key].buys.push({ ...t, openTs });
    } else if (t.type === 'Sell') {
      groups[key].sells.push({ ...t, openTs });
    }
  });
  
  // Find pairs within time window (5 minutes)
  Object.values(groups).forEach(group => {
    group.buys.forEach(buy => {
      group.sells.forEach(sell => {
        if (buy.openTs > 0 && sell.openTs > 0) {
          const diffMs = Math.abs(sell.openTs - buy.openTs);
          // cleaned comment
          if (diffMs >= 0 && diffMs <= timeWindow) {
            pairs.push({
              a: buy,
              b: sell,
              openTimeDiff: diffMs
            });
          }
        }
      });
    });
  });
  
  return pairs;
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
        // We found a withdrawal. Now look backwards for winning trades.
        const winningTrades = [];
        let k = i - 1;
        
        while (k >= 0) {
            const t = sortedTrades[k];
            if (t.isBalance) {
                k--;
                continue;
            }
            
            if (t.profit > 0) {
                winningTrades.unshift(t);
            } else {
                break;
            }
            k--;
        }

        if (winningTrades.length > 0) {
            let isMarketTest = false;
            let lossTradeCandidate = null;
            while (k >= 0) {
                const t = sortedTrades[k];
                if (!t.isBalance) {
                    lossTradeCandidate = t;
                    break;
                }
                k--;
            }

            if (lossTradeCandidate && lossTradeCandidate.profit < 0) {
                const firstWin = winningTrades[0];
                const isOpposite = (lossTradeCandidate.type === 'Buy' && firstWin.type === 'Sell') || 
                                 (lossTradeCandidate.type === 'Sell' && firstWin.type === 'Buy');
                
                if (isOpposite) {
                    patterns.push({
                        type: 'market_test',
                        lossTrade: lossTradeCandidate,
                        winTrades: winningTrades,
                        withdrawal: tWithdrawal
                    });
                    isMarketTest = true;
                }
            }

            if (!isMarketTest) {
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

async function handleWalletAddress(address) {
  const data = await chrome.storage.local.get('walletNotes');
  const walletNotes = data.walletNotes || {};

  if (walletNotes[address]) {
    const note = walletNotes[address];
    showToastMessage('عنوان محفظة مكرر', note, 'wallet-duplicate');
  } else {
    latestWalletAddress = address;
    const buttons = [
      { title: 'العنوان متطابق لا يحتاج للرفع' },
      { title: 'تم رفع بيانات العنوان مسبقا للتلجرام' }
    ];
    showToastMessage(
      'عنوان محفظة جديد',
      'اختر إجراء لهذا العنوان:',
      'wallet-new',
      buttons
    );

    // Wallet sync happens after user selects an action via notification button.
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'writeClipboardText') {
    justCopiedFromExtension = true;
    lastCopiedText = message.text || '';
    lastProcessedText = ''; // Reset to allow re-processing the same text
    setTimeout(() => justCopiedFromExtension = false, 5000); // Reset after 5 seconds
    // Continue to offscreen
  }
  if (message.type === 'clipboardContent' && typeof message.text === 'string') {
    const clipboardText = message.text.trim();
    console.log('Clipboard content received (len):', clipboardText.length);
    
    if (!clipboardText) {
      console.log('Clipboard text is empty');
      return false;
    }

    if (justCopiedFromExtension) {
      console.log('Ignoring clipboard content because it was just copied from extension');
      return false;
    }

    if (clipboardText === lastCopiedText) {
      console.log('Ignoring clipboard content because it matches the last copied text');
      return false;
    }

    // --- FIX: Bring Security Alert to Front if open ---
    if (securityAlertWindowId) {
        console.log('Security Alert is open - bringing to front on new copy');
        chrome.windows.update(securityAlertWindowId, { focused: true }).catch(() => {
            securityAlertWindowId = null;
        });
        
        // Optional: Send the copied text to the popup?
        // Check if it looks like an account number (numbers, 5-10 chars)
        if (/^\d{5,15}$/.test(clipboardText)) {
            // It's likely an account number, we could potentially auto-fill it via messaging
            // but for now, just focusing handles the user's issue of "window closing".
        }
        
        // We do NOT stop propagation here, because the user might have copied a NEW IP.
        // We verify below if it is a new IP.
    }
    // ------------------------------------------------_

    const criticalHits = getCriticalMatchesFromText(clipboardText);
    if (criticalHits.ips.length || criticalHits.accounts.length) {
      // Check for Special Corporate IP to trigger TTS
      if (criticalHits.ips.includes('77.76.9.250')) {
        chrome.runtime.sendMessage({
          type: 'playTTS',
          text: 'تنبيه. هذا الآي بي خاص بسيرفر الشركة'
        }).catch(err => console.warn('Failed to trigger TTS:', err));
      }

      setCriticalAlertBadge(criticalHits).catch(err => {
        console.warn('Failed to set critical alert badge:', err);
      });
      openCriticalAlertPopup(criticalHits).catch(err => {
        console.warn('Failed to open critical alert popup:', err);
      });
    }

    if (trackingPaused) {
      return false;
    }

    if (clipboardText === lastProcessedText) {
      console.log('Clipboard text is duplicate (len):', clipboardText.length);
      return false;
    }
    if (clipboardText.includes('IP:') && clipboardText.includes('Account:') && clipboardText.includes('Email:')) {
      lastProcessedText = clipboardText;
      return false;
    }
    const ipCandidate = extractIPv4(clipboardText);
    const emailMatch = clipboardText.match(emailRegex);
    const emailCandidate = emailMatch ? emailMatch[0] : null;

    if (walletRegex.test(clipboardText)) {
      lastProcessedText = clipboardText;
      console.log('Wallet detected:', clipboardText);
      handleWalletAddress(clipboardText);
    } else if (accountNumberRegex.test(clipboardText)) {
      lastProcessedText = clipboardText;
      console.log('Account number detected:', clipboardText);
      console.log('About to call updateStorageWithNewAccount');
      updateStorageWithNewAccount(clipboardText).then(() => {
        console.log('updateStorageWithNewAccount completed');
      }).catch(err => {
        console.error('updateStorageWithNewAccount error:', err);
      });
    } else if (ipCandidate) {
      lastProcessedText = ipCandidate;
      console.log('IP detected:', ipCandidate);
      console.log('About to call handleNewIP');
      handleNewIP(ipCandidate).then(() => {
        console.log('handleNewIP completed');
      }).catch(err => {
        console.error('handleNewIP error:', err);
      });
    } else {
      // Check for trades
      const trades = parseTradesText(clipboardText);
      if (trades.length > 0) {
        lastProcessedText = clipboardText;
        const patterns = detectSuspiciousPatterns(trades);
        
        // Count different types of anomalies
        const pairedTradesArray = findPairs(trades, 5);
        const pairedTrades = pairedTradesArray.length; // Number of close buy/sell pairs.
        const equalPriceTrades = countEqualPriceSlTrades(clipboardText, trades);
        let zeroProfitTrades = 0;
        
        console.log('Paired trades found:', pairedTrades, 'Array:', pairedTradesArray);
        
        trades.forEach(t => {
          // Check for zero profit
          if (Math.abs(t.profit || 0) < 1e-5) {
            zeroProfitTrades++;
          }
        });
        
        // Show notification only if at least one anomaly found
        const hasAnomalies = pairedTrades > 0 || equalPriceTrades > 0 || zeroProfitTrades > 0;
        
        if (hasAnomalies) {
          // Save patterns to storage for the report page
          chrome.storage.local.set({ suspiciousReportData: patterns });
          
          // Save trades for price-sl-checker
          chrome.storage.local.set({ priceSLCheckerInput: clipboardText });
          
          // Sum total lot size from real trades (number that follows BUY/SELL)
          const totalLots = trades.reduce((sum, t) => {
            const vol = parseFloat(t.volume);
            if (!t.isBalance && (t.type === 'Buy' || t.type === 'Sell') && !isNaN(vol)) {
              return sum + Math.abs(vol);
            }
            return sum;
          }, 0);
          const formattedTotalLots = totalLots.toFixed(2);
          
          // Build detailed message - show all counts even if 0
          let messageLines = [];
          messageLines.push(`• إجمالي حجم اللوت: ${formattedTotalLots}`);
          messageLines.push(`• ${pairedTrades} أزواج متقاربة`);
          messageLines.push(`• ${equalPriceTrades} صفقة Price = S/L`);
          messageLines.push(`• ${zeroProfitTrades} صفقة ربح صفري`);
          
          // Show a colored toast (sidepanel / in-app) so the highlight is visible
          try {
            showToastMessage('تحذير صفقات مريبة', messageLines.join('\n'), 'warning', null, null, { skipSystemNotification: true });
          } catch (e) {
            console.warn('Toast warning failed', e);
          }

          const notificationId = `trades-anomaly-${Date.now()}`;
          const options = {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: '⚠️ تحذير: تم اكتشاف صفقات مريبة',
            message: messageLines.join('\n'),
            contextMessage: `إجمالي الحالات: ${pairedTrades + equalPriceTrades + zeroProfitTrades}`,
            // cleaned comment
            requireInteraction: equalPriceTrades > 0,
            isClickable: true,
            buttons: [
              { title: 'عرض التقرير' }
            ],
            priority: 2
          };
          
          chrome.notifications.create(notificationId, options, (notifId) => {
            // cleaned comment
            if (equalPriceTrades === 0) {
              setTimeout(() => {
                chrome.notifications.clear(notifId);
              }, 5000);
            }
          });
        }
      }
    }
    return false; // No asynchronous response for clipboardContent
  } else if (message.type === 'criticalIpPopupDismissed') {
    clearCriticalIpBadge().catch(() => {});
    if (criticalAlertWindowId) {
      const winId = criticalAlertWindowId;
      criticalAlertWindowId = null;
      criticalAlertTabId = null;
      try {
        chrome.windows.remove(winId).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
    return false;
  } else if (message.type === 'getLastProcessedText') {
    chrome.runtime.sendMessage({ type: 'lastProcessedText', text: lastProcessedText });
    return false; // No asynchronous response for getLastProcessedText
  } else if (message.type === 'lookupIp') {
    (async () => {
      try {
        const geoResult = await fetchIpGeolocation(message.ip, 'ar', {
          forceRefresh: !!message.forceRefresh
        });
        if (geoResult.success) {
          console.log('IP lookup response:', { ip: message.ip, provider: geoResult.provider });
          sendResponse({ data: geoResult.data });
        } else {
          console.error('IP lookup error:', geoResult.error);
          sendResponse({ error: geoResult.error || 'تعذر استرداد معلومات IP.' });
        }
      } catch (error) {
        console.error('Error fetching IP geolocation in background:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Crucial for asynchronous response
  } else if (message.type === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab ? sender.tab.windowId : chrome.windows.WINDOW_ID_CURRENT }).catch(() => {});
    return false;
  }
});

// Listen for changes to pause state in storage
chrome.storage.sync.get(['trackingPaused']).then(data => {
  trackingPaused = !!data.trackingPaused;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.trackingPaused) {
      trackingPaused = !!changes.trackingPaused.newValue;
    }
    if (changes[CRITICAL_WATCHLIST_STORAGE_KEY]) {
      loadCriticalWatchlistFromSync().catch(() => {});
    }
    return;
  }

  if (area === 'local') {
    const hasUserSettingsChange = !!changes.userSettings;

    if (hasUserSettingsChange) {
      ipGeoCache.clear();
    }
  }
});

const BANNED_COUNTRIES = {
  'GB': { name: 'United Kingdom', type: 'uk', emoji: '' },
  'NL': { name: 'Netherlands', type: 'netherlands', emoji: '' },
  'SG': { name: 'Singapore', type: 'singapore', emoji: '' },
  'FR': { name: 'France', type: 'france', emoji: '' },
  'DE': { name: 'Germany', type: 'germany', emoji: '' },
  'CA': { name: 'Canada', type: 'canada', emoji: '' },
  'US': { name: 'United States', type: 'usa', emoji: '' },
  'TR': { name: 'Turkey', type: 'turkey', emoji: '' },
  'IT': { name: 'Italy', type: 'italy', emoji: '' },
  'AT': { name: 'Austria', type: 'austria', emoji: '' },
  'RO': { name: 'Romania', type: 'romania', emoji: '' },
  'FI': { name: 'Finland', type: 'finland', emoji: '' },
  'PT': { name: 'Portugal', type: 'portugal', emoji: '' },
  'CH': { name: 'Switzerland', type: 'switzerland', emoji: '' },
  'PK': { name: 'Pakistan', type: 'pakistan', emoji: '' },
  'BE': { name: 'Belgium', type: 'belgium', emoji: '' },
  'DJ': { name: 'Djibouti', type: 'djibouti', emoji: '' },
  'HU': { name: 'Hungary', type: 'hungary', emoji: '' },
  'KE': { name: 'Kenya', type: 'kenya', emoji: '' },
  'BG': { name: 'Bulgaria', type: 'bulgaria', emoji: '' },
  'CN': { name: 'China', type: 'china', emoji: '' },
  'RS': { name: 'Serbia', type: 'serbia', emoji: '' },
  'BJ': { name: 'Benin', type: 'benin', emoji: '' },
  'BW': { name: 'Botswana', type: 'botswana', emoji: '' },
  'BF': { name: 'Burkina Faso', type: 'burkinafaso', emoji: '' },
  'BI': { name: 'Burundi', type: 'burundi', emoji: '' },
  'CM': { name: 'Cameroon', type: 'cameroon', emoji: '' },
  'CF': { name: 'Central African Republic', type: 'centralafricanrepublic', emoji: '' },
  'TD': { name: 'Chad', type: 'chad', emoji: '' },
  'KM': { name: 'Comoros', type: 'comoros', emoji: '' },
  'CG': { name: 'Republic of the Congo', type: 'congo', emoji: '' },
  'CD': { name: 'Democratic Republic of the Congo', type: 'drcongo', emoji: '' },
  'GQ': { name: 'Equatorial Guinea', type: 'equatorialguinea', emoji: '' },
  'ER': { name: 'Eritrea', type: 'eritrea', emoji: '' },
  'SZ': { name: 'Eswatini', type: 'eswatini', emoji: '' },
  'ET': { name: 'Ethiopia', type: 'ethiopia', emoji: '' },
  'GA': { name: 'Gabon', type: 'gabon', emoji: '' },
  'GM': { name: 'Gambia', type: 'gambia', emoji: '' },
  'GH': { name: 'Ghana', type: 'ghana', emoji: '' },
  'GN': { name: 'Guinea', type: 'guinea', emoji: '' },
  'GW': { name: 'Guinea-Bissau', type: 'guineabissau', emoji: '' },
  'CI': { name: 'Ivory Coast', type: 'ivorycoast', emoji: '' },
  'LS': { name: 'Lesotho', type: 'lesotho', emoji: '' },
  'LR': { name: 'Liberia', type: 'liberia', emoji: '' },
  'MG': { name: 'Madagascar', type: 'madagascar', emoji: '' },
  'MW': { name: 'Malawi', type: 'malawi', emoji: '' },
  'ML': { name: 'Mali', type: 'mali', emoji: '' },
  'MU': { name: 'Mauritius', type: 'mauritius', emoji: '' },
  'MZ': { name: 'Mozambique', type: 'mozambique', emoji: '' },
  'NA': { name: 'Namibia', type: 'namibia', emoji: '' },
  'NE': { name: 'Niger', type: 'niger', emoji: '' },
  'NG': { name: 'Nigeria', type: 'nigeria', emoji: '' },
  'RW': { name: 'Rwanda', type: 'rwanda', emoji: '' },
  'ST': { name: 'Sao Tome and Principe', type: 'saotome', emoji: '' },
  'SN': { name: 'Senegal', type: 'senegal', emoji: '' },
  'SC': { name: 'Seychelles', type: 'seychelles', emoji: '' },
  'SL': { name: 'Sierra Leone', type: 'sierraleone', emoji: '' },
  'SO': { name: 'Somalia', type: 'somalia', emoji: '' },
  'ZA': { name: 'South Africa', type: 'southafrica', emoji: '' },
  'SS': { name: 'South Sudan', type: 'southsudan', emoji: '' },
  'TZ': { name: 'Tanzania', type: 'tanzania', emoji: '' },
  'TG': { name: 'Togo', type: 'togo', emoji: '' },
  'UG': { name: 'Uganda', type: 'uganda', emoji: '' },
  'ZM': { name: 'Zambia', type: 'zambia', emoji: '' },
  'ZW': { name: 'Zimbabwe', type: 'zimbabwe', emoji: '' },
  'AL': { name: 'Albania', type: 'albania', emoji: '' },
  'AD': { name: 'Andorra', type: 'andorra', emoji: '' },
  'BY': { name: 'Belarus', type: 'belarus', emoji: '' },
  'BA': { name: 'Bosnia and Herzegovina', type: 'bosnia', emoji: '' },
  'HR': { name: 'Croatia', type: 'croatia', emoji: '' },
  'CY': { name: 'Cyprus', type: 'cyprus', emoji: '' },
  'CZ': { name: 'Czech Republic', type: 'czechrepublic', emoji: '' },
  'DK': { name: 'Denmark', type: 'denmark', emoji: '' },
  'EE': { name: 'Estonia', type: 'estonia', emoji: '' },
  'GR': { name: 'Greece', type: 'greece', emoji: '' },
  'IS': { name: 'Iceland', type: 'iceland', emoji: '' },
  'IE': { name: 'Ireland', type: 'ireland', emoji: '' },
  'XK': { name: 'Kosovo', type: 'kosovo', emoji: '' },
  'LV': { name: 'Latvia', type: 'latvia', emoji: '' },
  'LI': { name: 'Liechtenstein', type: 'liechtenstein', emoji: '' },
  'LT': { name: 'Lithuania', type: 'lithuania', emoji: '' },
  'LU': { name: 'Luxembourg', type: 'luxembourg', emoji: '' },
  'MT': { name: 'Malta', type: 'malta', emoji: '' },
  'MD': { name: 'Moldova', type: 'moldova', emoji: '' },
  'MC': { name: 'Monaco', type: 'monaco', emoji: '' },
  'ME': { name: 'Montenegro', type: 'montenegro', emoji: '' },
  'MK': { name: 'North Macedonia', type: 'northmacedonia', emoji: '' },
  'NO': { name: 'Norway', type: 'norway', emoji: '' },
  'PL': { name: 'Poland', type: 'poland', emoji: '' },
  'SM': { name: 'San Marino', type: 'sanmarino', emoji: '' },
  'SK': { name: 'Slovakia', type: 'slovakia', emoji: '' },
  'SI': { name: 'Slovenia', type: 'slovenia', emoji: '' },
  'ES': { name: 'Spain', type: 'spain', emoji: '' },
  'SE': { name: 'Sweden', type: 'sweden', emoji: '' },
  'UA': { name: 'Ukraine', type: 'ukraine', emoji: '' },
  'VA': { name: 'Vatican City', type: 'vaticancity', emoji: '' },
  'AF': { name: 'Afghanistan', type: 'afghanistan', emoji: '' },
  'AM': { name: 'Armenia', type: 'armenia', emoji: '' },
  'AZ': { name: 'Azerbaijan', type: 'azerbaijan', emoji: '' },
  'BD': { name: 'Bangladesh', type: 'bangladesh', emoji: '' },
  'BT': { name: 'Bhutan', type: 'bhutan', emoji: '' },
  'BN': { name: 'Brunei', type: 'brunei', emoji: '' },
  'KH': { name: 'Cambodia', type: 'cambodia', emoji: '' },
  'GE': { name: 'Georgia', type: 'georgia', emoji: '' },
  'IN': { name: 'India', type: 'india', emoji: '' },
  'ID': { name: 'Indonesia', type: 'indonesia', emoji: '' },
  'IR': { name: 'Iran', type: 'iran', emoji: '' },
  'JP': { name: 'Japan', type: 'japan', emoji: '' },
  'KZ': { name: 'Kazakhstan', type: 'kazakhstan', emoji: '' },
  'KG': { name: 'Kyrgyzstan', type: 'kyrgyzstan', emoji: '' },
  'LA': { name: 'Laos', type: 'laos', emoji: '' },
  'MY': { name: 'Malaysia', type: 'malaysia', emoji: '' },
  'MV': { name: 'Maldives', type: 'maldives', emoji: '' },
  'MN': { name: 'Mongolia', type: 'mongolia', emoji: '' },
  'MM': { name: 'Myanmar', type: 'myanmar', emoji: '' },
  'NP': { name: 'Nepal', type: 'nepal', emoji: '' },
  'KP': { name: 'North Korea', type: 'northkorea', emoji: '' },
  'PH': { name: 'Philippines', type: 'philippines', emoji: '' },
  'KR': { name: 'South Korea', type: 'southkorea', emoji: '' },
  'LK': { name: 'Sri Lanka', type: 'srilanka', emoji: '' },
  'TJ': { name: 'Tajikistan', type: 'tajikistan', emoji: '' },
  'TH': { name: 'Thailand', type: 'thailand', emoji: '' },
  'TL': { name: 'Timor-Leste', type: 'timorleste', emoji: '' },
  'TM': { name: 'Turkmenistan', type: 'turkmenistan', emoji: '' },
  'UZ': { name: 'Uzbekistan', type: 'uzbekistan', emoji: '' },
  'VN': { name: 'Vietnam', type: 'vietnam', emoji: '' },
  'AG': { name: 'Antigua and Barbuda', type: 'antiguaandbarbuda', emoji: '' },
  'BS': { name: 'Bahamas', type: 'bahamas', emoji: '' },
  'BB': { name: 'Barbados', type: 'barbados', emoji: '' },
  'BZ': { name: 'Belize', type: 'belize', emoji: '' },
  'CR': { name: 'Costa Rica', type: 'costarica', emoji: '' },
  'CU': { name: 'Cuba', type: 'cuba', emoji: '' },
  'DM': { name: 'Dominica', type: 'dominica', emoji: '' },
  'DO': { name: 'Dominican Republic', type: 'dominicanrepublic', emoji: '' },
  'SV': { name: 'El Salvador', type: 'elsalvador', emoji: '' },
  'GD': { name: 'Grenada', type: 'grenada', emoji: '' },
  'GT': { name: 'Guatemala', type: 'guatemala', emoji: '' },
  'HT': { name: 'Haiti', type: 'haiti', emoji: '' },
  'HN': { name: 'Honduras', type: 'honduras', emoji: '' },
  'JM': { name: 'Jamaica', type: 'jamaica', emoji: '' },
  'MX': { name: 'Mexico', type: 'mexico', emoji: '' },
  'NI': { name: 'Nicaragua', type: 'nicaragua', emoji: '' },
  'PA': { name: 'Panama', type: 'panama', emoji: '' },
  'KN': { name: 'Saint Kitts and Nevis', type: 'saintkittsandnevis', emoji: '' },
  'LC': { name: 'Saint Lucia', type: 'saintlucia', emoji: '' },
  'VC': { name: 'Saint Vincent and the Grenadines', type: 'saintvincentandthegrenadines', emoji: '' },
  'TT': { name: 'Trinidad and Tobago', type: 'trinidadandtobago', emoji: '' },
  'AR': { name: 'Argentina', type: 'argentina', emoji: '' },
  'BO': { name: 'Bolivia', type: 'bolivia', emoji: '' },
  'BR': { name: 'Brazil', type: 'brazil', emoji: '' },
  'CL': { name: 'Chile', type: 'chile', emoji: '' },
  'CO': { name: 'Colombia', type: 'colombia', emoji: '' },
  'EC': { name: 'Ecuador', type: 'ecuador', emoji: '' },
  'GY': { name: 'Guyana', type: 'guyana', emoji: '' },
  'PY': { name: 'Paraguay', type: 'paraguay', emoji: '' },
  'PE': { name: 'Peru', type: 'peru', emoji: '' },
  'SR': { name: 'Suriname', type: 'suriname', emoji: '' },
  'UY': { name: 'Uruguay', type: 'uruguay', emoji: '' },
  'VE': { name: 'Venezuela', type: 'venezuela', emoji: '' },
  'AU': { name: 'Australia', type: 'australia', emoji: '' },
  'FJ': { name: 'Fiji', type: 'fiji', emoji: '' },
  'KI': { name: 'Kiribati', type: 'kiribati', emoji: '' },
  'MH': { name: 'Marshall Islands', type: 'marshallislands', emoji: '' },
  'FM': { name: 'Micronesia', type: 'micronesia', emoji: '' },
  'NR': { name: 'Nauru', type: 'nauru', emoji: '' },
  'NZ': { name: 'New Zealand', type: 'newzealand', emoji: '' },
  'PW': { name: 'Palau', type: 'palau', emoji: '' },
  'PG': { name: 'Papua New Guinea', type: 'papuanewguinea', emoji: '' },
  'WS': { name: 'Samoa', type: 'samoa', emoji: '' },
  'SB': { name: 'Solomon Islands', type: 'solomonislands', emoji: '' },
  'TO': { name: 'Tonga', type: 'tonga', emoji: '' },
  'TV': { name: 'Tuvalu', type: 'tuvalu', emoji: '' },
  'VU': { name: 'Vanuatu', type: 'vanuatu', emoji: '' }
};

async function handleNewIP(ip) {
  const isCriticalIp = criticalIpSet.has(ip);
  try {
    const storageData = await chrome.storage.local.get('copiedIPs');
    const copiedIPs = storageData.copiedIPs || [];
    const isDuplicate = copiedIPs.some((item) => item.ip === ip);

    const geoResult = await fetchIpGeolocation(ip, 'ar');

    if (geoResult.success) {
      const geoData = geoResult.data;
      const country = geoData.country || 'N/A';
      const region = geoData.region || geoData.city || '';
      const city = geoData.city || '';

      console.log('Geolocation API Response:', { ip, country, region, city, provider: geoResult.provider, fullGeoData: geoData });
      const lowerRegion = (region || '').toLowerCase();
      const lowerCity = (city || '').toLowerCase();

      const bannedCountry = BANNED_COUNTRIES[(geoData.country_code || '').toUpperCase()];
      const isBannedCountry = !!bannedCountry;

      const kirkukPatterns = ['kirkuk', 'كركوك'];
      const sulaymaniyahPatterns = ['sulaymaniyah', 'sulaimani', 'slemani', 'السليمانية', 'السليمانيه', 'sulaimaniyah', 'sulaimaniah', 'iraqi kurdistan'];
      const erbilPatterns = ['erbil', 'arbil', 'أربيل', 'hewler', 'hawler'];

      const isKirkuk = [lowerRegion, lowerCity].some((val) => kirkukPatterns.some((p) => val.includes(p)));
      const isSulaymaniyah = [lowerRegion, lowerCity].some((val) => sulaymaniyahPatterns.some((p) => val.includes(p)));
      const isErbil = [lowerRegion, lowerCity].some((val) => erbilPatterns.some((p) => val.includes(p)));

      console.log('IP Region Detection:', { ip, region, lowerRegion, isKirkuk, isSulaymaniyah, isErbil });

      const isHighlighted = isKirkuk || isSulaymaniyah || isErbil;
      let highlightType = '';
      if (isHighlighted) {
        if (isKirkuk) {
          highlightType = 'kirkuk';
        } else if (isSulaymaniyah) {
          highlightType = 'sulaymaniyah';
        } else if (isErbil) {
          highlightType = 'erbil';
        }
      } else if (bannedCountry) {
        highlightType = bannedCountry.type;
      }

      const baseTitle = isDuplicate ? IP_UI_TEXT.duplicateIpTitle : IP_UI_TEXT.newIpTitle;
      let notificationTitle = baseTitle;
      let displayGovernorate = region || city || '';

      if (isHighlighted) {
        if (isKirkuk) {
          notificationTitle = IP_UI_TEXT.kirkukTitle;
          displayGovernorate = 'Kirkuk';
        } else if (isSulaymaniyah) {
          notificationTitle = IP_UI_TEXT.sulaymaniyahTitle;
          displayGovernorate = 'Sulaymaniyah';
        } else if (isErbil) {
          notificationTitle = IP_UI_TEXT.erbilTitle;
          displayGovernorate = 'Erbil';
        }
      }

      const displayCity = city || displayGovernorate || 'N/A';
      const notificationMessage = `${ip}\n${IP_UI_TEXT.countryLabel}: ${country}\n${IP_UI_TEXT.regionLabel}: ${displayGovernorate}\n${IP_UI_TEXT.cityLabel}: ${displayCity}`;

      const buttons = [];
      if (country && country !== 'N/A' && region && region !== 'N/A') {
        buttons.push({ key: 'copy_country_region', title: IP_UI_TEXT.countryRegionButton });
      } else {
        if (country && country !== 'N/A') buttons.push({ key: 'copy_country', title: IP_UI_TEXT.countryButton });
        if (region && region !== 'N/A') buttons.push({ key: 'copy_region', title: IP_UI_TEXT.regionButton });
      }

      latestIpPayload = { ip, country, region, city };

      let toastType = 'ip';
      if (isBannedCountry) {
        toastType = highlightType;
      } else if (isHighlighted) {
        toastType = 'erbil';
      }

      showToastMessage(notificationTitle, notificationMessage, toastType, buttons, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);

      copiedIPs.unshift({
        ip: ip,
        country: country,
        region: region || 'N/A',
        city: city || 'N/A',
        isErbil: false,
        isHighlighted: isHighlighted || isBannedCountry,
        highlightType: highlightType,
        timestamp: new Date().getTime(),
        isDuplicate: isDuplicate
      });
      await chrome.storage.local.set({ copiedIPs });
    } else {
      console.log('Geolocation failed for IP: ' + ip + '. Reason: ' + geoResult.error);
      const title = isDuplicate ? IP_UI_TEXT.duplicateIpTitle : IP_UI_TEXT.newIpTitle;
      const message = buildGeoUnavailableMessage(ip, geoResult.error);
      showToastMessage(title, message, 'ip', undefined, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);
      copiedIPs.unshift({
        ip: ip,
        country: 'N/A',
        region: 'N/A',
        city: 'N/A',
        isErbil: false,
        isHighlighted: false,
        timestamp: new Date().getTime(),
        isDuplicate: isDuplicate
      });
      await chrome.storage.local.set({ copiedIPs });
    }
  } catch (error) {
    console.error('Error fetching IP geolocation:', error);
    const title = IP_UI_TEXT.genericIpTitle;
    const message = buildGeoUnavailableMessage(ip, error && error.message ? error.message : String(error));
    showToastMessage(title, message, 'ip', undefined, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);
    try {
      const storageData = await chrome.storage.local.get('copiedIPs');
      const copiedIPs = storageData.copiedIPs || [];
      copiedIPs.unshift({
        ip: ip,
        country: 'N/A',
        region: 'N/A',
        city: 'N/A',
        isErbil: false,
        isHighlighted: false,
        timestamp: new Date().getTime(),
        isDuplicate: false
      });
      await chrome.storage.local.set({ copiedIPs });
    } catch (e) {
      // ignore storage failure
    }
  }
}

// Map notificationId to payload for button actions
const notificationPayloads = {};

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Handle Suspicious Report Button
  if (notificationId.startsWith('warning-')) {
      // Disabled per user request
      // if (buttonIndex === 0) {
      //     chrome.tabs.create({ url: 'report.html' });
      // }
      return;
  }
  
  // Handle Trade Anomalies Button
  if (notificationId.startsWith('trades-anomaly-')) {
      if (buttonIndex === 0) {
          chrome.tabs.create({ url: 'price-sl-checker.html' });
      }
      return;
  }
  // Handle Wallet Address Buttons
  if (notificationId.startsWith('wallet-new-')) {
      const note = buttonIndex === 0
        ? 'العنوان متطابق لا يحتاج للرفع'
        : 'تم رفع بيانات العنوان مسبقا للتلجرام';
      if (latestWalletAddress) {
          chrome.storage.local.get('walletNotes').then(data => {
              const walletNotes = data.walletNotes || {};
              walletNotes[latestWalletAddress] = note;
              chrome.storage.local.set({ walletNotes });
          });
      }
      return;
  }
  // We didn't store by id earlier; instead derive via lastNotificationId or fallback to message mapping.
  // Fetch the notification payload using the last created id if matches, else do nothing.
  const isCurrent = notificationId === lastNotificationId;
  if (!isCurrent) return;
  // We cannot retrieve the original message via API, so keep the latest payload separately
  const payload = latestIpPayload;
  if (!payload) return;
  let textToCopy = '';
  const availableButtons = [];
  if (
    payload.copyMode === 'country_city' &&
    payload.country && payload.country !== 'N/A' &&
    payload.city && payload.city !== 'N/A'
  ) {
    availableButtons.push('country_city');
  } else if (payload.country && payload.country !== 'N/A' && payload.region && payload.region !== 'N/A') {
    availableButtons.push('country_region');
  } else {
    if (payload.country && payload.country !== 'N/A') availableButtons.push('country');
    if (payload.region && payload.region !== 'N/A') availableButtons.push('region');
  }
  const selected = availableButtons[buttonIndex];
  if (selected === 'country_city') textToCopy = `${payload.country} - (${payload.city})`;
  else if (selected === 'country_region') textToCopy = `${payload.country} - (${payload.region})`;
  else if (selected === 'country') textToCopy = payload.country;
  else if (selected === 'region') textToCopy = payload.region;
  // no city button in this mode
  if (!textToCopy) return;
  chrome.runtime.sendMessage({ type: 'writeClipboardText', text: textToCopy });
  // Removed post-copy confirmation notification per request
});

// Keep track of the latest IP payload shown in notification
let latestIpPayload = null;

function extractAllIPv4(text) {
  if (!text) return [];
  const ipv4RegexGlobal = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = text.match(ipv4RegexGlobal);
  if (!matches) return [];
  const valid = [];
  for (const candidate of matches) {
    const octets = candidate.split('.');
    if (octets.every(o => { const n = Number(o); return n >= 0 && n <= 255; })) {
      valid.push(candidate);
    }
  }
  return valid;
}

function getCriticalIpsFromText(text) {
  const ips = extractAllIPv4(text);
  if (!ips.length) return [];
  const found = [];
  for (const ip of ips) {
    if (criticalIpSet.has(ip)) found.push(ip);
  }
  return Array.from(new Set(found));
}

function extractAllSevenDigitAccounts(text) {
  if (!text) return [];
  const matches = text.match(/\b\d{6,7}\b/g);
  return matches ? matches : [];
}

function getCriticalAccountsFromText(text) {
  const accounts = extractAllSevenDigitAccounts(text);
  if (!accounts.length) return [];
  const found = [];
  for (const acc of accounts) {
    if (criticalAccountSet.has(acc)) found.push(acc);
  }
  return Array.from(new Set(found));
}

function getCriticalMatchesFromText(text) {
  const ips = getCriticalIpsFromText(text);
  const accounts = getCriticalAccountsFromText(text);

  const items = [];
  for (const ip of ips) {
    items.push({ type: 'IP', value: ip, note: criticalIpNoteMap.get(ip) || '' });
  }
  for (const acc of accounts) {
    items.push({ type: 'AC', value: acc, note: criticalAccountNoteMap.get(acc) || '' });
  }

  return { ips, accounts, items };
}

async function setCriticalAlertBadge(matches) {
  const input = matches && typeof matches === 'object' && !Array.isArray(matches)
    ? matches
    : { ips: matches, accounts: [] };

  const cleanedNextIps = normalizeIPv4List(input.ips).filter(ip => criticalIpSet.has(ip));
  const cleanedNextAccounts = normalizeSevenDigitAccounts(input.accounts).filter(acc => criticalAccountSet.has(acc));

  if (!cleanedNextIps.length && !cleanedNextAccounts.length) return;

  let existingIps = [];
  let existingAccounts = [];
  try {
    const data = await chrome.storage.local.get(CRITICAL_IP_ALERT_STORAGE_KEY);
    const payload = data[CRITICAL_IP_ALERT_STORAGE_KEY];
    if (payload && Array.isArray(payload.ips)) existingIps = normalizeIPv4List(payload.ips);
    if (payload && Array.isArray(payload.accounts)) existingAccounts = normalizeSevenDigitAccounts(payload.accounts);
  } catch (e) {
    // ignore
  }

  const mergedIps = Array.from(new Set(existingIps.concat(cleanedNextIps))).sort();
  const mergedAccounts = Array.from(new Set(existingAccounts.concat(cleanedNextAccounts))).sort();
  const total = mergedIps.length + mergedAccounts.length;
  if (!total) return;

  // User requested: no numeric badge on the extension icon.
  const badgeText = '!';

  try {
    await chrome.storage.local.set({
      [CRITICAL_IP_ALERT_STORAGE_KEY]: { ips: mergedIps, accounts: mergedAccounts, timestamp: Date.now() }
    });
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ color: CRITICAL_BADGE_COLOR });
  } catch (e) {
    // ignore
  }

  try {
    if (chrome.action && typeof chrome.action.setBadgeTextColor === 'function') {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeText({ text: badgeText });
  } catch (e) {
    // ignore
  }

  try {
    const parts = [];
    if (mergedIps.length) parts.push(`IPs: ${mergedIps.join(', ')}`);
    if (mergedAccounts.length) parts.push(`Accounts: ${mergedAccounts.join(', ')}`);
    await chrome.action.setTitle({ title: `CRITICAL COPIED: ${parts.join(' | ')}` });
  } catch (e) {
    // ignore
  }
}

async function clearCriticalIpBadge() {
  try {
    await chrome.storage.local.remove(CRITICAL_IP_ALERT_STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE });
  } catch (e) {
    // ignore
  }
}

async function restoreCriticalIpBadge() {
  try {
    // Always clear any previously-stuck numeric badge text first.
    await chrome.action.setBadgeText({ text: '' });

    const data = await chrome.storage.local.get(CRITICAL_IP_ALERT_STORAGE_KEY);
    const payload = data[CRITICAL_IP_ALERT_STORAGE_KEY];
    if (!payload) return;

    const ips = payload && Array.isArray(payload.ips) ? normalizeIPv4List(payload.ips) : [];
    const accounts = payload && Array.isArray(payload.accounts) ? normalizeSevenDigitAccounts(payload.accounts) : [];
    const total = ips.length + accounts.length;
    if (!total) return;

    // User requested: no numeric badge on the extension icon.
    const badgeText = '!';

    await chrome.action.setBadgeBackgroundColor({ color: CRITICAL_BADGE_COLOR });
    if (chrome.action && typeof chrome.action.setBadgeTextColor === 'function') {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }
    await chrome.action.setBadgeText({ text: badgeText });

    const parts = [];
    if (ips.length) parts.push(`IPs: ${ips.join(', ')}`);
    if (accounts.length) parts.push(`Accounts: ${accounts.join(', ')}`);
    await chrome.action.setTitle({ title: `CRITICAL COPIED: ${parts.join(' | ')}` });
  } catch (e) {
    // ignore
  }
}

function normalizeCriticalHitsForPopup(hits) {
  const input = hits && typeof hits === 'object' && !Array.isArray(hits)
    ? hits
    : { ips: hits, accounts: [] };

  const ips = normalizeIPv4List(input.ips).filter(ip => criticalIpSet.has(ip)).sort();
  const accounts = normalizeSevenDigitAccounts(input.accounts).filter(acc => criticalAccountSet.has(acc)).sort();

  return { ips, accounts };
}

function buildCriticalAlertPopupUrl(hits) {
  const normalized = normalizeCriticalHitsForPopup(hits);
  const params = [];
  if (normalized.ips.length) params.push(`ips=${encodeURIComponent(normalized.ips.join(','))}`);
  if (normalized.accounts.length) params.push(`accounts=${encodeURIComponent(normalized.accounts.join(','))}`);
  params.push(`t=${Date.now()}`);
  return chrome.runtime.getURL(`critical-alert.html?${params.join('&')}`);
}

async function openCriticalAlertPopup(hits) {
  const normalized = normalizeCriticalHitsForPopup(hits);
  if (!normalized.ips.length && !normalized.accounts.length) return;

  const now = Date.now();
  const key = `${normalized.ips.join(',')}|${normalized.accounts.join(',')}`;
  if (key === lastCriticalPopupKey && now - lastCriticalPopupAt < 800) return;
  lastCriticalPopupKey = key;
  lastCriticalPopupAt = now;

  // Store the latest alert payload so the popup can render notes reliably (without long URLs)
  try {
    const items = [];
    if (hits && hits.items && Array.isArray(hits.items)) {
      for (const item of hits.items) {
        if (!item || typeof item !== 'object') continue;
        const type = item.type === 'AC' ? 'AC' : 'IP';
        const value = typeof item.value === 'string' ? item.value.trim() : '';
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (!value) continue;
        items.push({ type, value, note });
      }
    } else {
      normalized.ips.forEach(ip => items.push({ type: 'IP', value: ip, note: criticalIpNoteMap.get(ip) || '' }));
      normalized.accounts.forEach(acc => items.push({ type: 'AC', value: acc, note: criticalAccountNoteMap.get(acc) || '' }));
    }
    await chrome.storage.local.set({ criticalAlertPayload: { items, timestamp: Date.now() } });
  } catch (e) {
    // ignore
  }

  const url = chrome.runtime.getURL(`critical-alert.html?t=${Date.now()}`);

  if (criticalAlertTabId) {
    try {
      await chrome.tabs.update(criticalAlertTabId, { url, active: true });
      if (criticalAlertWindowId) {
        await chrome.windows.update(criticalAlertWindowId, { focused: true });
      }
      return;
    } catch (e) {
      criticalAlertTabId = null;
      criticalAlertWindowId = null;
    }
  }

  let top;
  let left;
  try {
    const lastFocused = await chrome.windows.getLastFocused({ populate: false });
    if (lastFocused && typeof lastFocused.left === 'number' && typeof lastFocused.top === 'number' && typeof lastFocused.width === 'number') {
      left = lastFocused.left + Math.max(lastFocused.width - CRITICAL_POPUP_WIDTH - CRITICAL_POPUP_MARGIN, 0);
      top = lastFocused.top + CRITICAL_POPUP_MARGIN;
    }
  } catch (e) {
    // ignore
  }

  const createData = {
    url,
    type: 'popup',
    focused: true,
    width: CRITICAL_POPUP_WIDTH,
    height: CRITICAL_POPUP_HEIGHT
  };
  if (typeof left === 'number') createData.left = left;
  if (typeof top === 'number') createData.top = top;

  try {
    console.log('Creating critical alert popup with data:', createData);
    const win = await chrome.windows.create(createData);
    console.log('Critical alert popup created:', win);
    criticalAlertWindowId = win && typeof win.id === 'number' ? win.id : null;
    criticalAlertTabId = win && Array.isArray(win.tabs) && win.tabs[0] && typeof win.tabs[0].id === 'number' ? win.tabs[0].id : null;
  } catch (e) {
    console.warn('Failed to open critical alert popup:', e);
  }
}

function extractIPv4(text) {
  if (!text) return null;
  const ipv4RegexGlobal = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = text.match(ipv4RegexGlobal);
  if (!matches) return null;
  for (const candidate of matches) {
    const octets = candidate.split('.');
    if (octets.every(o => { const n = Number(o); return n >= 0 && n <= 255; })) {
      return candidate;
    }
  }
  return null;
}

async function updateStorageWithNewAccount(text) {
  const data = await chrome.storage.local.get('copiedAccounts');
  let copiedAccounts = data.copiedAccounts || [];
  const now = new Date();

  // Find the most recent entry for this account (regardless of pinned status)
  const mostRecentAccountEntry = copiedAccounts
    .filter(item => item.account === text)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const isDuplicate = !!mostRecentAccountEntry;
  
  // Get the notes from any entry of this account (they should all have the same notes)
  const accountNotes = mostRecentAccountEntry && mostRecentAccountEntry.notes 
    ? mostRecentAccountEntry.notes.trim() 
    : '';

  if (isDuplicate) {
    const lastCopiedDate = new Date(mostRecentAccountEntry.timestamp);
    const dateString = lastCopiedDate.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeString = lastCopiedDate.toLocaleTimeString('ar-EG', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    showToastMessage(
      'تم نسخ حساب مكرر',
      `${text}\nآخر نسخ: ${dateString} - ${timeString}${accountNotes ? `\n📝 ${accountNotes}` : ''}`,
      'duplicate'
    );
  }

  copiedAccounts.unshift({
    account: text,
    timestamp: now.getTime(),
    isDuplicate: isDuplicate,
    notes: accountNotes, // Inherit notes
    isPinned: mostRecentAccountEntry ? mostRecentAccountEntry.isPinned : false // Inherit pinned status
  });

  await chrome.storage.local.set({ copiedAccounts });
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Ensure the offscreen document is created when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(async (details) => {
  await setupOffscreenDocument('offscreen.html');
  if (details.reason === 'install') {
      chrome.storage.local.set({ copiedAccounts: [], copiedIPs: [] });
      await clearCriticalIpBadge();
      // Initialize Critical Watchlist storage (custom items only; defaults are always active)
      try {
        const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
        if (!data || !data[CRITICAL_WATCHLIST_STORAGE_KEY]) {
          await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ips: [], accounts: [] } });
        }
      } catch (e) {
        // ignore
      }
      // First run defaults
      await chrome.storage.sync.set({ onboardingCompleted: false, tooltipsEnabled: true, filters: { accounts: { status:'all', date:'all' }, ips: { status:'all', date:'all' } } });
      // Open options page to show onboarding
      try { chrome.runtime.openOptionsPage(); } catch (e) { /* ignore */ }
  }
});

setupOffscreenDocument('offscreen.html');
restoreCriticalIpBadge();
loadCriticalWatchlistFromSync().catch(() => {});

// Strip Origin header from ipwhois.app requests to avoid free-plan CORS rejection
chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [9999],
  addRules: [{
    id: 9999,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'Origin', operation: 'remove' }]
    },
    condition: {
      urlFilter: '||ipwhois.app',
      resourceTypes: ['xmlhttprequest', 'other']
    }
  }]
}).catch(() => {});

// Notification click handlers
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('trades-anomaly-')) {
    // Open price-sl-checker page on notification click
    chrome.tabs.create({ url: chrome.runtime.getURL('price-sl-checker.html') });
  }
});

// --- Handle Security Alert Submission ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendSecurityAlert') {
      console.log('Received Security Alert Request:', message);
      sendTelegramAlert(message.ipMessage, message.country, message.type, message.accountNumber, message.groupType)
        .then(() => sendResponse({ success: true }))
        .catch(err => {
            console.error('Security Alert Error:', err);
            const errorMessage = err && err.message ? err.message : String(err);
            sendResponse({ success: false, error: errorMessage });
        });
      return true; // Keep channel open
  }
});

// --- Handle Background Report Submission ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'submitReport') {
    handleReportSubmission(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
  }
});

async function handleReportSubmission(data) {
  const { 
    gfSettings, 
    payload, 
    telegramToken, 
    telegramChatId, 
    telegramMessage, 
    telegramImages
  } = data;

  console.log('Background: Starting report submission...');

  let formSubmissionSuccess = true; // Assume success if form is disabled
  
  // 1. Send to Google Form / Apps Script FIRST
  if (gfSettings && gfSettings.enabled && gfSettings.url) {
    console.log('Background: Sending to Google Form...');
    formSubmissionSuccess = false; // Must prove success since it is enabled

    try {
      // Legacy Google Form (no-cors)
      if (gfSettings.url.includes('docs.google.com/forms')) {
        const params = new URLSearchParams();
        // Map payload keys to entry IDs
        if (gfSettings.entryIp) params.append(gfSettings.entryIp, payload.ip);
        if (gfSettings.entryCountry) params.append(gfSettings.entryCountry, payload.country);
        if (gfSettings.entryAccount) params.append(gfSettings.entryAccount, payload.account);
        if (gfSettings.entryEmail) params.append(gfSettings.entryEmail, payload.email);
        if (gfSettings.entrySource) params.append(gfSettings.entrySource, payload.source);
        if (gfSettings.entryProfits) params.append(gfSettings.entryProfits, payload.profits);
        if (gfSettings.entryOldGroup) params.append(gfSettings.entryOldGroup, payload.oldGroup);
        if (gfSettings.entryNewGroup) params.append(gfSettings.entryNewGroup, payload.newGroup);
        if (gfSettings.entryNotes) params.append(gfSettings.entryNotes, payload.notes);
        if (gfSettings.entryEmployee) params.append(gfSettings.entryEmployee, payload.employeeName);
        if (gfSettings.entryShift) params.append(gfSettings.entryShift, payload.shift);

        await fetch(gfSettings.url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        console.log('Background: Legacy Google Form request sent');
        formSubmissionSuccess = true; // Assume success for no-cors
      } 
      // Apps Script
      else if (gfSettings.url.includes('script.google.com')) {
        const formResponse = await fetch(gfSettings.url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        if (!formResponse.ok) {
          console.error(`Background: Google Script Error: ${formResponse.status}`);
        } else {
          const result = await formResponse.json();
          if (result.status !== 'success') {
            console.error(`Background: Google Script Failed: ${result.message}`);
          } else {
            console.log('Background: Google Form request sent successfully');
            formSubmissionSuccess = true;
          }
        }
      } else {
        // Unknown URL type but enabled? Default to true or false?
        // Let's assume if we can't handle it, we shouldn't block telegram unless strictly necessary.
        // But for safety, let's just log and allow it if it's some other URL? 
        // Actually, previous code only handled these two. Let's assume failure if no match.
        console.warn('Background: Unknown Google Form URL type');
      }
    } catch (error) {
      console.error('Background: Google Form Submission Error:', error);
    }
  }

  if (!formSubmissionSuccess) {
    console.error('Background: Google Form submission failed. Aborting Telegram submission.');
    chrome.runtime.sendMessage({ 
      type: 'showToast', 
      title: 'فشل الإرسال', 
      message: 'فشل إرسال النموذج. لم يتم إرسال التقرير إلى تيليجرام.', 
      toastType: 'error' 
    }).catch(() => {});
    return; // STOP HERE
  }

  // 2. Send to Telegram (Only if Form Success or Form Disabled)
  try {
    console.log('Background: Sending to Telegram...');
    let response;

    if (telegramImages && telegramImages.length > 0) {
      if (telegramImages.length === 1) {
        // Send Single Photo
        const imgData = telegramImages[0];
        const byteString = atob(imgData.data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: imgData.type });

        const formData = new FormData();
        formData.append('chat_id', telegramChatId);
        formData.append('photo', blob, 'image.png');
        formData.append('caption', telegramMessage);
        formData.append('parse_mode', 'HTML');

        response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
      } else {
        // Send Media Group
        const formData = new FormData();
        formData.append('chat_id', telegramChatId);
        
        const mediaArray = telegramImages.map((imgData, index) => {
          // Convert base64 to Blob
          const byteString = atob(imgData.data.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: imgData.type });
          
          const attachName = `file${index}`;
          formData.append(attachName, blob, `image${index}.png`);
          
          return {
            type: 'photo',
            media: `attach://${attachName}`,
            caption: index === 0 ? telegramMessage : '',
            parse_mode: 'HTML'
          };
        });
        
        formData.append('media', JSON.stringify(mediaArray));
        
        response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMediaGroup`, {
          method: 'POST',
          body: formData
        });
      }

    } else {
      // Send Text Only
      response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
          parse_mode: 'HTML'
        })
      });
    }

    const data = await response.json();
    if (data.ok) {
      console.log('Background: Telegram sent successfully');
      // Notify sidepanel if open, or show system notification
      chrome.runtime.sendMessage({ type: 'showToast', title: 'تم الإرسال', message: 'تم إرسال التقرير بنجاح', toastType: 'default' }).catch(() => {});
    } else {
      console.error('Background: Telegram Error:', data);
      chrome.runtime.sendMessage({ type: 'showToast', title: 'فشل الإرسال', message: `Telegram Error: ${data.description}`, toastType: 'warning' }).catch(() => {});
    }

  } catch (error) {
    console.error('Background: Telegram Submission Error:', error);
  }
}
