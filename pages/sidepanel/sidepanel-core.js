// =====================================================
// SIDEPANEL CORE - Variables, Toast, and Translations
// =====================================================

// --- DOM Element References ---
const accountList = document.getElementById('account-list');
const ipList = document.getElementById('ip-list');
const clearButton = document.getElementById('clear-history');
const searchBar = document.getElementById('search-bar');
const accountItemTemplate = document.getElementById('account-item-template');
const ipItemTemplate = document.getElementById('ip-item-template');
const accountsTab = document.getElementById('accounts-tab');
const ipsTab = document.getElementById('ips-tab');
const criticalTab = document.getElementById('critical-tab');
const profitTab = document.getElementById('profit-tab');
const profitSection = document.getElementById('profit-section');
const transferReportTab = document.getElementById('transfer-report-tab');
const transferReportSection = document.getElementById('transfer-report-section');
const depositPercentageSection = document.getElementById('deposit-percentage-section');
const depositReportIpInput = document.getElementById('deposit-report-ip');
const depositReportCountryInput = document.getElementById('deposit-report-country');
const depositReportAccountInput = document.getElementById('deposit-report-account');
const depositReportEmailInput = document.getElementById('deposit-report-email');
const depositReportMarginInput = document.getElementById('deposit-report-margin');
const depositReportProfitsStatusInput = document.getElementById('deposit-report-profits-status');
const depositReportIpStatusInput = document.getElementById('deposit-report-ip-status');
const depositReportBonusStatusInput = document.getElementById('deposit-report-bonus-status');
const depositReportNotesInput = document.getElementById('deposit-report-notes');
const depositGenerateReportBtn = document.getElementById('deposit-generate-report-btn');
const depositSendTelegramBtn = document.getElementById('deposit-send-telegram-btn');
const depositResetReportBtn = document.getElementById('deposit-reset-report-btn');
const depositTelegramSettingsBtn = document.getElementById('deposit-telegram-settings-btn');
const depositMentionAhmedBtn = document.getElementById('deposit-mention-ahmed-btn');
const depositMentionBatoulBtn = document.getElementById('deposit-mention-batoul-btn');
const depositImagePreviewContainer = document.getElementById('deposit-image-preview-container');
const depositReportImagesInput = document.getElementById('deposit-report-images');
const withdrawalSection = document.getElementById('withdrawal-report-section');
const withdrawalWalletInput = document.getElementById('withdrawal-wallet');
const withdrawalEmailInput = document.getElementById('withdrawal-email');
const withdrawalDropZone = document.getElementById('withdrawal-drop-zone');
const withdrawalFileInput = document.getElementById('withdrawal-file-input');
const withdrawalPreviewContainer = document.getElementById('withdrawal-preview-container');
const withdrawalResetBtn = document.getElementById('withdrawal-reset-btn');
const withdrawalSubmitBtn = document.getElementById('withdrawal-submit-btn');
const withdrawalReportBtn = document.getElementById('withdrawal-report-btn');

// Report Form Elements
const reportIpInput = document.getElementById('report-ip');
const reportCountryInput = document.getElementById('report-country');
const reportAccountInput = document.getElementById('report-account');
const reportEmailInput = document.getElementById('report-email');
const reportSourceInput = document.getElementById('report-source');
const reportSourceCustomInput = document.getElementById('report-source-custom');
const reportProfitsInput = document.getElementById('report-profits');
const reportProfitsCustomInput = document.getElementById('report-profits-custom');
const reportNotesInput = document.getElementById('report-notes');
const generateReportBtn = document.getElementById('generate-report-btn');
const resetReportBtn = document.getElementById('reset-report-btn');
const criticalSection = document.getElementById('critical-section');
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

// Telegram Integration Elements
const telegramSettingsBtn = document.getElementById('telegram-settings-btn');
const telegramSettingsModal = document.getElementById('telegram-settings-modal');
const telegramSettingsClose = document.getElementById('telegram-settings-close');
const saveTelegramSettingsBtn = document.getElementById('save-telegram-settings');
const telegramBotTokenInput = document.getElementById('telegram-bot-token');
const telegramChatIdInput = document.getElementById('telegram-chat-id');
const sendTelegramBtn = document.getElementById('send-telegram-btn');

// --- Global State Variables ---
let allAccounts = [];
let allIPs = [];
let maxAccounts = 50;
let timestampFormat = 'locale';
let activeTab = 'accounts';
const filterState = {
  accounts: { status: 'all', date: 'all' },
  ips: { status: 'all', date: 'all' }
};

// Tag filter state
let currentTagFilter = 'all';

// Filters removed from UI; will read from chrome.storage.sync
let statusFilterValue = 'all';
let dateFilterValue = 'all';

// Runtime connection
const port = chrome.runtime.connect({ name: 'sidepanel' });
port.onDisconnect.addListener(() => {
  void chrome.runtime.lastError;
});

// --- Toast Notification System ---
let currentToast = null;
let tooltipsEnabled = true;

function showToast(title, message, type = 'default', duration = 5000) {
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
    toast.classList.remove('hide', 'duplicate', 'ip', 'erbil', 'warning', 'uk', 'netherlands');
    
    // Set icon based on type
    if (type === 'duplicate') {
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
    
    // Auto hide after duration
    currentToast = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      currentToast = null;
    }, duration);
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

// --- Arabic Translation Maps ---
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

// --- Utility Functions ---
function applyDarkMode(isDarkMode) {
  document.body.classList.toggle('dark-mode', isDarkMode);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (timestampFormat === 'hide') return '';
  return date.toLocaleString();
}

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
    
    const now = ctx.currentTime;
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(440, now + 0.2);
    osc.frequency.setValueAtTime(880, now + 0.4);
    osc.frequency.setValueAtTime(440, now + 0.6);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  } catch (e) {
    console.error('Audio play failed', e);
  }
}
