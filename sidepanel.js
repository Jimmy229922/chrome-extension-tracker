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

// --- Image Preview Modal (Click to Preview) ---
function setupImageClickPreviewModal() {
  if (window.__imagePreviewModalInitialized) return;
  window.__imagePreviewModalInitialized = true;

  function ensureModal() {
    let modal = document.getElementById('image-preview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-preview-modal';
      modal.className = 'modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close-button" role="button" aria-label="إغلاق">×</span>
          <div class="image-preview-zoom-wrap">
            <img class="image-preview-modal-img" alt="معاينة الصورة">
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    const closeBtn = modal.querySelector('.close-button');
    return { modal, wrap, img, closeBtn };
  }

  let previousBodyOverflow = '';

  function openPreview(src) {
    const { modal, wrap, img } = ensureModal();
    if (!src) return;
    img.src = src;

    setupZoomHandlers();

    if (wrap) wrap.classList.remove('is-zooming');
    if (img) {
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    }

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closePreview() {
    const modal = document.getElementById('image-preview-modal');
    if (!modal) return;
    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    if (wrap) wrap.classList.remove('is-zooming');
    if (img) {
      img.src = '';
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    }
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
  }

  function setupZoomHandlers() {
    const modal = document.getElementById('image-preview-modal');
    if (!modal) return;
    if (modal.__zoomHandlersBound) return;
    modal.__zoomHandlersBound = true;

    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    if (!wrap || !img) return;

    const ZOOM_SCALE = 4;
    let raf = 0;
    let lastX = 50;
    let lastY = 50;

    function applyZoomFrame() {
      raf = 0;
      wrap.classList.add('is-zooming');
      img.style.transformOrigin = `${lastX}% ${lastY}%`;
      img.style.transform = `scale(${ZOOM_SCALE})`;
    }

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      lastX = Math.max(0, Math.min(100, x));
      lastY = Math.max(0, Math.min(100, y));
      if (!raf) raf = requestAnimationFrame(applyZoomFrame);
    });

    wrap.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      wrap.classList.remove('is-zooming');
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    });
  }

  setupZoomHandlers();

  document.addEventListener('click', (e) => {
    const modal = document.getElementById('image-preview-modal');
    if (modal && modal.style.display === 'block') {
      if (e.target === modal) {
        closePreview();
        return;
      }
      const closeBtn = e.target.closest('.close-button');
      if (closeBtn && closeBtn.closest('#image-preview-modal')) {
        closePreview();
        return;
      }
    }

    const imgEl = e.target.closest('img');
    if (!imgEl) return;

    // Avoid hijacking UI icons/buttons/links.
    if (imgEl.closest('button') || imgEl.closest('a')) return;
    if (imgEl.closest('.custom-select-wrapper') || imgEl.closest('.custom-select-options')) return;
    if (imgEl.closest('#image-preview-modal')) return;

    const src = imgEl.currentSrc || imgEl.src;
    if (!src) return;
    openPreview(src);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('image-preview-modal');
    if (modal && modal.style.display === 'block') closePreview();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupImageClickPreviewModal);
} else {
  setupImageClickPreviewModal();
}

// --- Field Completion Indicator (Filled field marker) ---
function applyFieldCompletionState(el) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.classList || !el.classList.contains('report-input')) return;
  if (el.matches('input[type="hidden"]')) return;
  const container = el.closest('.report-container');
  if (!container) return;

  let isComplete = false;
  if (el instanceof HTMLSelectElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') isComplete = !!el.checked;
    else isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLTextAreaElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  }

  el.classList.toggle('field-complete', isComplete);
  const group = el.closest('.report-field-group');
  if (group) group.classList.toggle('field-complete', isComplete);

  // If this is a hidden select (custom dropdown), reflect the state on the visible wrapper.
  if (el instanceof HTMLSelectElement && el.style.display === 'none') {
    const wrapper = el.previousElementSibling;
    if (wrapper && wrapper.classList && wrapper.classList.contains('custom-select-wrapper')) {
      wrapper.classList.toggle('field-complete', isComplete);
      const trigger = wrapper.querySelector('.custom-select-trigger');
      if (trigger) trigger.classList.toggle('field-complete', isComplete);
    }
  }
}

function setupFieldCompletionIndicators() {
  if (window.__fieldCompletionIndicatorsInitialized) return;
  window.__fieldCompletionIndicatorsInitialized = true;

  const shouldHandle = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    if (!target.classList || !target.classList.contains('report-input')) return false;
    if (target.matches('input[type="hidden"]')) return false;
    return !!target.closest('.report-container');
  };

  const onChangeOrBlur = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    applyFieldCompletionState(t);
  };

  const onInput = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    if ((t.value ?? '').toString().trim() === '') applyFieldCompletionState(t);
  };

  document.addEventListener('focusout', onChangeOrBlur, true);
  document.addEventListener('change', onChangeOrBlur, true);
  document.addEventListener('input', onInput, true);

  // Initial scan
  document.querySelectorAll('.report-container input.report-input, .report-container select.report-input, .report-container textarea.report-input').forEach((node) => {
    applyFieldCompletionState(node);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFieldCompletionIndicators);
} else {
  setupFieldCompletionIndicators();
}

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
// Delete confirm modal elements
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const deleteConfirmCancel = document.getElementById('delete-confirm-cancel');
const deleteConfirmOk = document.getElementById('delete-confirm-ok');

// --- Telegram Integration Elements ---
const telegramSettingsBtn = document.getElementById('telegram-settings-btn');
const telegramSettingsModal = document.getElementById('telegram-settings-modal');
const telegramSettingsClose = document.getElementById('telegram-settings-close');
const saveTelegramSettingsBtn = document.getElementById('save-telegram-settings');
const telegramBotTokenInput = document.getElementById('telegram-bot-token');
const telegramChatIdInput = document.getElementById('telegram-chat-id');
const sendTelegramBtn = document.getElementById('send-telegram-btn');

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

/* ======================================================================
   SMART AUTO-SCROLL (Transfer Report) - Keep active field visible
   ====================================================================== */
const SMART_AUTO_SCROLL_ENABLED = true;

function getScrollParent(el) {
  let parent = el?.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll');
    if (isScrollable && parent.scrollHeight > parent.clientHeight + 4) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function smartRevealInView(el) {
  if (!el || !(el instanceof HTMLElement)) return;
  if (!transferReportSection || !transferReportSection.contains(el)) return;

  // Only when Transfer Report tab/section is visible
  const sectionStyle = window.getComputedStyle(transferReportSection);
  if (sectionStyle.display === 'none' || sectionStyle.visibility === 'hidden') return;

  // Avoid auto-scroll for non-text inputs
  if (el.tagName === 'INPUT') {
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(t)) return;
  }

  const cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;

  const margin = 20;
  const scrollParent = getScrollParent(el);
  const rect = el.getBoundingClientRect();

  if (scrollParent === document.scrollingElement || scrollParent === document.documentElement || scrollParent === document.body) {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top >= margin && rect.bottom <= (vh - margin)) return;
    const targetTop = window.scrollY + rect.top - Math.round(vh * 0.25);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const topWithin = rect.top - parentRect.top;
  const bottomWithin = rect.bottom - parentRect.top;
  const containerH = scrollParent.clientHeight;
  if (topWithin >= margin && bottomWithin <= (containerH - margin)) return;

  const targetTop = scrollParent.scrollTop + topWithin - Math.round(containerH * 0.25);
  scrollParent.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}

let smartScrollLastAt = 0;
let smartScrollRaf = 0;
function scheduleSmartReveal(el) {
  if (!SMART_AUTO_SCROLL_ENABLED) return;
  const now = Date.now();
  if (now - smartScrollLastAt < 120) return;
  smartScrollLastAt = now;
  cancelAnimationFrame(smartScrollRaf);
  smartScrollRaf = requestAnimationFrame(() => smartRevealInView(el));
}

document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (!el.matches('input, textarea, select')) return;
  scheduleSmartReveal(el);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (!el.matches('input, textarea')) return;
  scheduleSmartReveal(el);
});

// Delete confirm modal functions
let deleteCallback = null;

function showDeleteConfirm(message, callback) {
  deleteConfirmMessage.textContent = message;
  deleteCallback = callback;
  deleteConfirmModal.style.display = 'flex';
}

function hideDeleteConfirm() {
  deleteConfirmModal.style.display = 'none';
  deleteCallback = null;
}

// Modal event listeners
if (deleteConfirmCancel) {
  deleteConfirmCancel.addEventListener('click', hideDeleteConfirm);
}

if (deleteConfirmOk) {
  deleteConfirmOk.addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
    hideDeleteConfirm();
  });
}


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

transferReportTab.addEventListener('click', () => {
  switchTab('transfer-report');
});

const hedgeCheckerBtn = document.getElementById('hedge-checker-btn');
if (hedgeCheckerBtn) {
  hedgeCheckerBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'hedge-checker.html' });
  });
}

const depositPercentageBtn = document.getElementById('deposit-percentage-btn');
if (depositPercentageBtn) {
  depositPercentageBtn.addEventListener('click', () => {
    switchTab('deposit-percentage');
  });
}

const classificationHelperBtn = document.getElementById('classification-helper-btn');
if (classificationHelperBtn) {
  classificationHelperBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'classification-helper.html' });
  });
}

// Tag filter state
let currentTagFilter = 'all';

function switchTab(tabName) {
  activeTab = tabName;

  // Reset header static mode (default is sticky)
  if (headerEl) headerEl.classList.remove('static-mode');

  // Reset tab buttons
  accountsTab.classList.remove('active');
  ipsTab.classList.remove('active');
  criticalTab.classList.remove('active');
  walletsTab.classList.remove('active');
  profitTab.classList.remove('active');
  transferReportTab.classList.remove('active');
  if (depositPercentageBtn) depositPercentageBtn.classList.remove('active');

  // Hide all sections
  accountList.classList.remove('active');
  ipList.classList.remove('active');
  walletsSection.style.display = 'none';
  profitSection.style.display = 'none';
  criticalSection.style.display = 'none';
  transferReportSection.style.display = 'none';
  if (depositPercentageSection) depositPercentageSection.style.display = 'none';
  if (withdrawalSection) withdrawalSection.style.display = 'none';
  if (withdrawalReportBtn) withdrawalReportBtn.classList.remove('active');

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
    return;
  }

  if (tabName === 'deposit-percentage') {
    if (depositPercentageBtn) depositPercentageBtn.classList.add('active');
    if (depositPercentageSection) depositPercentageSection.style.display = 'block';
    
    // Make header static (scrolls with page)
    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }
    return;
  }

  if (tabName === 'transfer-report') {
    transferReportTab.classList.add('active');
    transferReportSection.style.display = 'block';
    
    // Make header static (scrolls with page)
    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }

    // Auto-detect shift when entering the tab
    if (typeof autoDetectShift === 'function') {
      autoDetectShift();
    }
    
    // Remove back button if exists
    const backBtn = document.getElementById('report-back-btn');
    if (backBtn) {
        backBtn.remove();
    }
    
    return;
  }

  if (tabName === 'withdrawal-report') {
    if (withdrawalReportBtn) withdrawalReportBtn.classList.add('active');
    if (withdrawalSection) withdrawalSection.style.display = 'block';
    
    // Make header static (scrolls with page)
    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }
    return;
  } else {
    // Show header for other tabs
    if (headerEl) {
      headerEl.style.display = 'block';
    }
  }
}

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

  // Suppress notifications if in Transfer Report
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
  // Keep header visible in Transfer Report
  if (activeTab === 'transfer-report') {
    headerEl.classList.remove('hidden');
    ticking = false;
    return;
  }

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
  if (!ip) return;
  try {
    const response = await fetch(`https://ipwhois.app/json/${ip}?lang=ar`);
    const data = await response.json();
    if (data.success) {
      reportCountryInput.value = `${data.country} - (${data.city})`;
    } else {
      reportCountryInput.value = 'Unknown';
    }
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
  } catch (error) {
    console.error('Error fetching IP info:', error);
    reportCountryInput.value = 'Error';
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
  }
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
      const shiftBtns = document.querySelectorAll('.shift-btn');
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

// Load notes from storage
async function loadSavedNotes() {
  const result = await chrome.storage.local.get(['transferReportNotes']);
  savedNotes = result.transferReportNotes || [
    'تم تحويل الحساب تلقائيا من الاداة الى B1 Clients كون IP متغاير وتم مطابقته بالنظام ارباح العميل بالسالب',
    'العميل يستخدم VPN',
    'حساب متعدد',
    'تداول مشبوه وقت الأخبار'
  ]; // Default notes if empty
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

    // Edit button
    li.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const newText = prompt('تعديل الملاحظة:', note);
      if (newText !== null && newText.trim() !== '') {
        savedNotes[index] = newText.trim();
        saveNotesToStorage();
        renderSavedNotes();
      }
    });

    // Delete button
    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
        savedNotes.splice(index, 1);
        saveNotesToStorage();
        renderSavedNotes();
      }
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
    const text = newNoteInput.value.trim();
    if (text) {
      savedNotes.push(text);
      saveNotesToStorage();
      renderSavedNotes();
      newNoteInput.value = '';
    }
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
  chrome.storage.local.get(['userSettings'], (result) => {
    dbgUserSettings('loadUserSettings() -> storage result:', result);
    const savedName = result.userSettings?.employeeName;
    if (savedName) {
      employeeNameSelect.value = savedName;
      if (employeeNameSelect) employeeNameSelect.dispatchEvent(new Event('change'));
      lockEmployeeNameUI(savedName);
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
    
    chrome.storage.local.set({ 
      userSettings: { 
        employeeName: name
      } 
    }, () => {
      dbgUserSettings('Saved. Now verifying storage...');
      chrome.storage.local.get(['userSettings'], (verify) => {
        dbgUserSettings('Verify after save ->', verify);
      });

      // Lock immediately after first save
      lockEmployeeNameUI(name);

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
const shiftBtns = document.querySelectorAll('.shift-btn');
const reportShiftInput = document.getElementById('report-shift');

function setShift(shiftValue) {
  console.log('setShift called with:', shiftValue);
  if (shiftBtns && shiftBtns.length > 0) {
    shiftBtns.forEach(b => {
      // console.log('Checking button:', b.dataset.value, 'against', shiftValue);
      if (b.dataset.value === shiftValue) {
        b.classList.add('active');
        console.log('Activated button:', b.dataset.value);
      } else {
        b.classList.remove('active');
      }
    });
  } else {
    console.warn('No shift buttons found in DOM');
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
if (shiftBtns.length > 0) {
  shiftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setShift(btn.dataset.value);
    });
  });
  
  // Auto-detect on load
  autoDetectShift();
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
  if (!ip) return;
  try {
    const response = await fetch(`https://ipwhois.app/json/${ip}?lang=ar`);
    const data = await response.json();
    if (data.success) {
      if (depositReportCountryInput) depositReportCountryInput.value = `${data.country} - (${data.city})`;
    } else {
      if (depositReportCountryInput) depositReportCountryInput.value = 'Unknown';
    }
    if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
  } catch (error) {
    console.error('Error fetching IP info:', error);
    if (depositReportCountryInput) depositReportCountryInput.value = 'Error';
    if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
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
  
  // Auto-detect on load (reuse existing logic)
  if (typeof autoDetectShift === 'function') {
    // We can't easily reuse autoDetectShift because it targets the other report's input
    // So we'll just run a quick detection here for this report too
    const now = new Date();
    const hour = now.getHours();
    let shift = 'الخفر';
    if (hour >= 7 && hour < 15) shift = 'الصباحي';
    else if (hour >= 15 && hour < 23) shift = 'المسائي';
    setDepositShift(shift);
  }
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

// Initialize Draft Loading
loadWithdrawalDraft();

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

    trigger.innerHTML = '<span>' + (originalSelect.options[originalSelect.selectedIndex]?.text || '????...') + '</span>';
    
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

// Initialize Custom Selects
document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure DOM is fully ready if script is early
    setTimeout(() => {
        convertToCustomSelect('report-old-group');
        convertToCustomSelect('report-new-group');
    // Ensure employee select is native
    restoreNativeSelect('employee-name-select');
    }, 100);
});

// Employee Evaluation Button Logic
document.addEventListener('DOMContentLoaded', async () => {
    const evaluationBtn = document.getElementById('evaluation-btn');
    if (evaluationBtn) {
        const authorizedUsers = ['Ahmed Gamal', 'Ahmed – Manager'];
        
        const checkUser = async () => {
             const { userSettings } = await chrome.storage.local.get(['userSettings']);
             const employeeName = userSettings?.employeeName;
             if (authorizedUsers.includes(employeeName)) {
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

