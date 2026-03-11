
// DOM Elements
const reportIpInput = document.getElementById('report-ip');
const reportCountryInput = document.getElementById('report-country');
const reportAccountInput = document.getElementById('report-account');
const reportEmailInput = document.getElementById('report-email');
const reportSourceInput = document.getElementById('report-source');
const reportSourceCustomInput = document.getElementById('report-source-custom');
const reportProfitsInput = document.getElementById('report-profits');
const reportProfitsCustomInput = document.getElementById('report-profits-custom');
const reportOldGroupInput = document.getElementById('report-old-group');
const reportNewGroupInput = document.getElementById('report-new-group');
const reportNotesInput = document.getElementById('report-notes');
const reportShiftInput = document.getElementById('report-shift');
const shiftBtns = document.querySelectorAll('.shift-selector-container .shift-btn');
const generateReportBtn = document.getElementById('generate-report-btn');
const sendTelegramBtn = document.getElementById('send-telegram-btn');
const deleteLastSentBtn = document.getElementById('delete-last-sent-btn');
const resetReportBtn = document.getElementById('reset-report-btn');
const reportImagesInput = document.getElementById('report-images');
const imagePreviewContainer = document.getElementById('image-preview-container');
const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
const mentionBatoulBtn = document.getElementById('mention-batoul-btn');

// Settings Elements
const telegramSettingsBtn = document.getElementById('telegram-settings-btn');
const telegramSettingsModal = document.getElementById('telegram-settings-modal');
const telegramSettingsClose = document.getElementById('telegram-settings-close');
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

// Notes Modal Elements
const savedNotesModal = document.getElementById('saved-notes-modal');
const savedNotesList = document.getElementById('saved-notes-list');
const newNoteInput = document.getElementById('new-note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const savedNotesCloseBtn = document.getElementById('saved-notes-close');
const openNotesModalBtn = document.getElementById('open-notes-modal-btn');

// Constants
const DEFAULT_TELEGRAM_TOKEN = '8284290450:AAFFhQlAMWliCY0jGTAct50GTNtF5NzLIec';
const DEFAULT_TELEGRAM_CHAT_ID = '-1003692121203';

const TRANSFER_REPORT_LAST_SENT_KEY = 'transferReportLastTelegramSent';

function setDeleteLastSentEnabled(enabled) {
  if (!deleteLastSentBtn) return;
  deleteLastSentBtn.disabled = !enabled;
}

function extractTelegramMessageIds(apiResponse) {
  const result = apiResponse?.result;
  if (!result) return [];
  if (Array.isArray(result)) {
    return result.map(m => m?.message_id).filter(Boolean);
  }
  if (typeof result === 'object' && result.message_id) {
    return [result.message_id];
  }
  return [];
}

function loadLastSentState() {
  if (!deleteLastSentBtn || !chrome?.storage?.local) return;
  chrome.storage.local.get([TRANSFER_REPORT_LAST_SENT_KEY], (data) => {
    const last = data?.[TRANSFER_REPORT_LAST_SENT_KEY];
    const hasIds = Array.isArray(last?.messageIds) && last.messageIds.length > 0;
    setDeleteLastSentEnabled(hasIds);
  });
}

async function deleteLastSentFromTelegram() {
  if (!chrome?.storage?.local) return;
  const token = DEFAULT_TELEGRAM_TOKEN;
  const chatId = DEFAULT_TELEGRAM_CHAT_ID;

  const stored = await new Promise((resolve) => {
    chrome.storage.local.get([TRANSFER_REPORT_LAST_SENT_KEY], resolve);
  });

  const last = stored?.[TRANSFER_REPORT_LAST_SENT_KEY];
  const messageIds = Array.isArray(last?.messageIds) ? last.messageIds : [];

  if (!messageIds.length) {
    showToast('لا يوجد', 'لا يوجد إرسال سابق لحذفه', 'warning');
    setDeleteLastSentEnabled(false);
    return;
  }

  if (deleteLastSentBtn) {
    deleteLastSentBtn.disabled = true;
    deleteLastSentBtn.textContent = 'جاري الحذف...';
  }

  try {
    const failures = [];
    for (const messageId of messageIds) {
      const resp = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId })
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) {
        failures.push(data?.description || `message_id=${messageId}`);
      }
    }

    if (failures.length) {
      console.error('Delete Telegram failures:', failures);
      showToast('فشل الحذف', 'تأكد أن البوت لديه صلاحية حذف الرسائل في الجروب/القناة', 'error');
      setDeleteLastSentEnabled(true);
      return;
    }

    await new Promise((resolve) => {
      chrome.storage.local.remove([TRANSFER_REPORT_LAST_SENT_KEY], resolve);
    });
    showToast('تم الحذف', 'تم حذف آخر إرسال من Telegram', 'success');
    setDeleteLastSentEnabled(false);
  } catch (e) {
    console.error('Delete last sent error:', e);
    showToast('فشل الحذف', `حدث خطأ: ${e?.message || e}`, 'error');
    setDeleteLastSentEnabled(true);
  } finally {
    if (deleteLastSentBtn) deleteLastSentBtn.textContent = 'حذف آخر إرسال';
  }
}

if (deleteLastSentBtn) {
  deleteLastSentBtn.addEventListener('click', () => {
    void deleteLastSentFromTelegram();
  });
}

loadLastSentState();

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

let selectedImages = [];
let savedNotes = [];
const DEFAULT_REPORT_NOTE_TEMPLATES = [
  'تم تحويل الحساب تلقائيا من الاداة الى B1 Clients كون IP متغاير وتم مطابقته بالنظام ارباح العميل بالسالب',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان العميل يستخدم ip من كركوك وغير محظور',
  'تم تحويل الحساب الى   Standard Bonus كونه يعتمد اسلوب صفقات بسعر افتتاح مساوي  لسعر وقف الخسارة بالصفقات المغلقة من خلال اوامر معلقة',
  'تم تحويل الحساب الى Standard Bonus بسبب ان الارباح تجاوزت 100$',
  'تم اعادة الحساب الى B1 لانه مطابق اكثر من اسبوع',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان ارباح العميل خلال اخر اسبوع 1,821$ والكلية بالموجب'
];


// --- Toast Notification System ---
let currentToast = null;

function showToast(title, message, type = 'default') {
  const toast = document.getElementById('toast-notification');
  const toastIcon = toast.querySelector('.toast-icon');
  const toastTitle = toast.querySelector('.toast-title');
  const toastMessage = toast.querySelector('.toast-message');
  
  if (currentToast) {
    toast.classList.remove('show');
    clearTimeout(currentToast);
  }
  
  setTimeout(() => {
    toast.classList.remove('warning', 'error', 'success');
    
    if (type === 'warning') {
      toastIcon.textContent = '⚠️';
      toast.classList.add('warning');
    } else if (type === 'error') {
      toastIcon.textContent = '❌';
      toast.classList.add('error');
    } else if (type === 'success' || type === 'ip') {
      toastIcon.textContent = '✅';
      toast.classList.add('success');
    } else {
      toastIcon.textContent = 'ℹ️';
    }
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.classList.add('show');
    
    currentToast = setTimeout(() => {
      toast.classList.remove('show');
      currentToast = null;
    }, 5000);
  }, 100);
}

document.querySelector('.toast-close').addEventListener('click', () => {
  document.getElementById('toast-notification').classList.remove('show');
});

/* ======================================================================
   SMART AUTO-SCROLL (Keep active field visible while typing)
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

  // Avoid auto-scroll for non-text inputs
  if (el.tagName === 'INPUT') {
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(t)) return;
  }

  // If element is inside a hidden container, skip
  const cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;

  const margin = 24;
  const scrollParent = getScrollParent(el);
  const rect = el.getBoundingClientRect();

  // Window scroll
  if (scrollParent === document.scrollingElement || scrollParent === document.documentElement || scrollParent === document.body) {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top >= margin && rect.bottom <= (vh - margin)) return;

    const targetTop = window.scrollY + rect.top - Math.round(vh * 0.25);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    return;
  }

  // Scroll within container
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

// --- Helper Functions ---
const extractIp = (text) => {
  const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return match ? match[0] : '';
};
const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

async function fetchIpInfo(ip) {
  if (!ip) return false;
  try {
    reportCountryInput.value = 'جاري البحث...';
    applyFieldCompletionState(reportCountryInput);
    const geoClient = window.IPGeoClient;
    const result = geoClient
      ? await (geoClient.lookupWithRetry
        ? geoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120 })
        : geoClient.lookup(ip))
      : { success: false, error: 'IPGeoClient unavailable' };

    if (result.success) {
      const display = geoClient.toCountryDisplay(result.data, 'Unknown');
      reportCountryInput.value = display;
      applyFieldCompletionState(reportCountryInput);
      if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
        return geoClient.isCountryTextResolved(display);
      }
      return !!display && display !== 'Unknown' && display !== 'Error';
    }

    console.warn('Transfer report IP lookup failed:', result.error);
    reportCountryInput.value = 'Unknown';
    applyFieldCompletionState(reportCountryInput);
    return false;
  } catch (error) {
    console.error('Error fetching IP info:', error);
    reportCountryInput.value = 'Error';
    applyFieldCompletionState(reportCountryInput);
    return false;
  }
}

async function ensureTransferReportCountry() {
  const ipRaw = reportIpInput.value.trim();
  const ip = extractIp(ipRaw);
  if (!ip) return false;
  if (ip !== ipRaw) reportIpInput.value = ip;

  const geoClient = window.IPGeoClient;
  const currentCountry = (reportCountryInput.value || '').trim();
  if (geoClient && typeof geoClient.isCountryTextResolved === 'function' && geoClient.isCountryTextResolved(currentCountry)) {
    return true;
  }

  const ok = await fetchIpInfo(ip);
  if (ok) return true;

  const finalCountry = (reportCountryInput.value || '').trim();
  if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
    return geoClient.isCountryTextResolved(finalCountry);
  }
  return !!finalCountry && finalCountry !== 'Unknown' && finalCountry !== 'Error';
}

// --- Smart Input Logic ---

// IP Input
reportIpInput.addEventListener('blur', () => {
  const val = reportIpInput.value.trim();
  const cleanIp = extractIp(val);
  
  if (cleanIp) {
    if (cleanIp !== val) reportIpInput.value = cleanIp;
    fetchIpInfo(cleanIp);
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
      showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
    }
  }
});

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

reportIpInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    reportAccountInput.focus();
  }
});

// Account Input
reportAccountInput.addEventListener('paste', (e) => {
  setTimeout(() => {
    const val = reportAccountInput.value.trim();
    
    if (isEmail(val)) {
      reportEmailInput.value = val;
      reportAccountInput.value = '';
      showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل الإيميل لحقله المخصص', 'warning');
      reportEmailInput.focus();
    } else if (extractIp(val)) {
      const ip = extractIp(val);
      reportIpInput.value = ip;
      reportAccountInput.value = '';
      fetchIpInfo(ip);
      showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل IP لحقله المخصص', 'warning');
      reportIpInput.focus();
    } else if (isAccount(val)) {
      reportEmailInput.focus();
    } else {
      if (val !== '') {
         reportAccountInput.value = '';
         showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
      }
    }
  }, 10);
});

reportAccountInput.addEventListener('blur', () => {
    const val = reportAccountInput.value.trim();
    if (val !== '' && !isAccount(val)) {
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

// Email Input
reportEmailInput.addEventListener('blur', () => {
  const val = reportEmailInput.value.trim();
  
  if (val !== '') {
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
    } else if (!isEmail(val)) {
      showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
    }
  }
});

reportEmailInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = reportEmailInput.value.trim();
    
    if (val !== '') {
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
      } else if (isEmail(val)) {
        reportSourceInput.focus();
      } else {
        reportEmailInput.value = '';
        showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
      }
    }
  }, 10);
});

reportEmailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    reportSourceInput.focus();
  }
});

// --- Custom Inputs Toggle ---
reportSourceInput.addEventListener('change', () => {
  if (reportSourceInput.value === 'Other') {
    reportSourceCustomInput.style.display = 'block';
    reportSourceCustomInput.focus();
  } else {
    reportSourceCustomInput.style.display = 'none';
    // reportNotesInput.focus(); // Removed to prevent auto-opening notes modal
  }
});

reportProfitsInput.addEventListener('change', () => {
  if (reportProfitsInput.value === 'Other') {
    reportProfitsCustomInput.style.display = 'block';
    reportProfitsCustomInput.focus();
  } else {
    reportProfitsCustomInput.style.display = 'none';
  }
});

// --- Shift Selection ---
shiftBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('Shift button clicked:', btn.dataset.value);
    console.log('Button classes before:', btn.className);
    shiftBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    console.log('Button classes after:', btn.className);
    console.log('All buttons:', shiftBtns);
    reportShiftInput.value = btn.dataset.value;
  });
});

// --- Mentions ---
function toggleMention(targetBtn, ...otherBtns) {
  console.log('toggleMention called for:', targetBtn.id);
  // Toggle the target
  const wasActive = targetBtn.classList.contains('active');
  console.log('wasActive:', wasActive);
  
  // Reset others
  otherBtns.forEach(b => {
    console.log('Deactivating other:', b.id);
    b.classList.remove('active');
  });

  // Toggle target (if it was active, it becomes inactive. If it was inactive, it becomes active)
  if (wasActive) {
    console.log('Removing active class from target');
    targetBtn.classList.remove('active');
  } else {
    console.log('Adding active class to target');
    targetBtn.classList.add('active');
  }
}

mentionAhmedBtn.addEventListener('click', (e) => {
  console.log('Ahmed Mention Button Clicked');
  e.preventDefault();
  toggleMention(mentionAhmedBtn, mentionBatoulBtn);
});

mentionBatoulBtn.addEventListener('click', (e) => {
  console.log('Batoul Mention Button Clicked');
  e.preventDefault();
  toggleMention(mentionBatoulBtn, mentionAhmedBtn);
});

// --- Field Completion Indicator (Filled field marker) ---
function applyFieldCompletionState(el) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.classList || !el.classList.contains('report-input')) return;
  if (el.matches('input[type="hidden"]')) return;

  let isComplete = false;
  if (el instanceof HTMLSelectElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') isComplete = !!el.checked;
    else isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLTextAreaElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  }

  // Avoid treating temporary/loading text as "complete".
  const v = (el.value ?? '').toString();
  if (v.includes('جاري البحث')) isComplete = false;

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

  const root = document.querySelector('.report-container') || document;

  const shouldHandle = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    if (!root.contains(target)) return false;
    if (!target.classList || !target.classList.contains('report-input')) return false;
    if (target.matches('input[type="hidden"]')) return false;
    return true;
  };

  const onChangeOrBlur = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    applyFieldCompletionState(t);
  };

  const onInput = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    // Only remove completion while typing if user cleared the field.
    if ((t.value ?? '').toString().trim() === '') applyFieldCompletionState(t);
  };

  root.addEventListener('focusout', onChangeOrBlur, true);
  root.addEventListener('change', onChangeOrBlur, true);
  root.addEventListener('input', onInput, true);

  // Initial scan (useful for persisted values).
  root.querySelectorAll('input.report-input, select.report-input, textarea.report-input').forEach((node) => {
    applyFieldCompletionState(node);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFieldCompletionIndicators);
} else {
  setupFieldCompletionIndicators();
}

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

    // Ensure zoom handlers exist (modal is lazy-created).
    setupZoomHandlers();

    // Reset zoom state on open
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

  // Bind zoom handlers once the modal exists
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

// --- Image Handling ---
function isDuplicateFile(newFile, currentList) {
  return currentList.some(existingFile => 
    existingFile.name === newFile.name &&
    existingFile.size === newFile.size &&
    existingFile.lastModified === newFile.lastModified
  );
}

function renderImagePreviews() {
  console.log('renderImagePreviews called. Count:', selectedImages.length);
  imagePreviewContainer.innerHTML = '';
  
  selectedImages.forEach((file, index) => {
    console.log('Processing file index:', index, file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('FileReader loaded for index:', index);
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `
        <img src="${e.target.result}">
        <button type="button" class="remove-image-btn" data-index="${index}">×</button>
      `;
      imagePreviewContainer.appendChild(div);
      
      const removeBtn = div.querySelector('.remove-image-btn');
      if (removeBtn) {
          console.log('Remove button found for index:', index);
          removeBtn.addEventListener('click', (ev) => {
            console.log('Remove button clicked for index:', index);
            ev.stopPropagation(); // Stop bubbling to prevent image preview
            ev.preventDefault();
            
            selectedImages.splice(index, 1);
            renderImagePreviews();
          });
      } else {
          console.error('Remove button NOT found in DOM for index:', index);
      }
    };
    reader.readAsDataURL(file);
  });
}

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
  reportImagesInput.value = '';
});

document.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let hasImage = false;
  let duplicateCount = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') === 0) {
      console.log('Image paste detected');
      const blob = items[i].getAsFile();
      if (blob) {
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
    showToast('تم اللصق', 'تم إضافة الصورة من الحافظة', 'success');
    e.preventDefault();
  } else if (duplicateCount > 0) {
    showToast('تنبيه', 'الصورة موجودة بالفعل', 'warning');
    e.preventDefault();
  }
});

// --- Notes Modal ---
async function loadSavedNotes() {
  const result = await chrome.storage.local.get(['transferReportNotes']);
  const storedNotes = Array.isArray(result.transferReportNotes) ? result.transferReportNotes : [];
  savedNotes = storedNotes.length ? storedNotes : [...DEFAULT_REPORT_NOTE_TEMPLATES];
  if (!storedNotes.length) {
    await chrome.storage.local.set({ transferReportNotes: savedNotes });
  }
  renderSavedNotes();
}

function renderSavedNotes() {
  savedNotesList.innerHTML = '';
  savedNotes.forEach((note, index) => {
    const li = document.createElement('li');
    li.className = 'saved-note-item';
    li.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
    li.innerHTML = `
      <span class="saved-note-text" style="flex: 1;">${note}</span>
      <div class="saved-note-actions">
        <button class="saved-note-btn edit" style="background: none; border: none; cursor: pointer;">✏️</button>
        <button class="saved-note-btn delete" style="background: none; border: none; cursor: pointer; color: #e74c3c;">🗑️</button>
      </div>
    `;

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
      chrome.storage.local.set({ transferReportNotes: savedNotes });
      renderSavedNotes();
    });

    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
      savedNotes.splice(index, 1);
      chrome.storage.local.set({ transferReportNotes: savedNotes });
      renderSavedNotes();
    });

    savedNotesList.appendChild(li);
  });
}

addNoteBtn.addEventListener('click', () => {
  const text = newNoteInput.value.trim();
  if (!text) {
    showToast('تنبيه', 'الرجاء إدخال ملاحظة', 'warning');
    return;
  }
  savedNotes.push(text);
  chrome.storage.local.set({ transferReportNotes: savedNotes });
  renderSavedNotes();
  newNoteInput.value = '';
});

openNotesModalBtn.addEventListener('click', () => {
  loadSavedNotes();
  savedNotesModal.style.display = 'block';
});

savedNotesCloseBtn.addEventListener('click', () => {
  savedNotesModal.style.display = 'none';
});

reportNotesInput.addEventListener('focus', () => {
  if (reportNotesInput.value.trim() === '') {
    loadSavedNotes();
    savedNotesModal.style.display = 'block';
  }
});

window.addEventListener('click', (event) => {
  if (event.target === savedNotesModal) {
    savedNotesModal.style.display = 'none';
  }
  if (event.target === telegramSettingsModal) {
    telegramSettingsModal.style.display = 'none';
  }
});

// --- User Settings ---

function loadUserSettings() {
  chrome.storage.local.get(['userSettings'], (result) => {
    dbgUserSettings('loadUserSettings() -> storage result:', result);
    const savedName = result.userSettings?.employeeName;
    if (savedName) {
      employeeNameSelect.value = savedName;
      employeeNameSelect.dispatchEvent(new Event('change'));
      lockEmployeeNameUI(savedName);
      dbgUserSettings('Applied+locked employeeName:', employeeNameSelect.value);
    } else {
      unlockEmployeeNameUI();
    }
  });
}

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

    showToast('تم الحفظ', 'تم حفظ الإعدادات بنجاح', 'success');
    telegramSettingsModal.style.display = 'none';
    dbgUserSettings('Modal closed after save.');
  });
});

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

telegramSettingsClose.addEventListener('click', () => {
  telegramSettingsModal.style.display = 'none';
});

// --- Generate Report ---
generateReportBtn.addEventListener('click', async () => {
  const hasIpBeforeCopy = !!reportIpInput.value.trim();
  if (hasIpBeforeCopy) {
    const countryReady = await ensureTransferReportCountry();
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
  if (source === 'Other') source = reportSourceCustomInput.value.trim() || 'Other';
  let profits = reportProfitsInput.value;
  if (profits === 'Other') profits = reportProfitsCustomInput.value.trim() || 'Other';
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
    showToast('تم النسخ', 'تم نسخ التقرير إلى الحافظة', 'success');
  } catch (err) {
    console.error('Failed to copy report:', err);
    showToast('خطأ', 'فشل نسخ التقرير', 'error');
  }
});

// --- Reset Report ---
resetReportBtn.addEventListener('click', () => {
  reportIpInput.value = '';
  reportCountryInput.value = '';
  reportAccountInput.value = '';
  reportEmailInput.value = '';
  reportSourceInput.value = 'suspicious traders';
  reportProfitsInput.value = 'ارباح بالسالب';
  reportSourceCustomInput.style.display = 'none';
  reportProfitsCustomInput.style.display = 'none';
  reportOldGroupInput.value = '';
  reportNewGroupInput.value = '';
  reportNotesInput.value = '';
  reportShiftInput.value = '';
  shiftBtns.forEach(b => b.classList.remove('active'));
  
  // Reset Mentions
  mentionAhmedBtn.classList.remove('active');
  mentionBatoulBtn.classList.remove('active');

  selectedImages = [];
  renderImagePreviews();

  [
    reportIpInput,
    reportCountryInput,
    reportAccountInput,
    reportEmailInput,
    reportSourceInput,
    reportProfitsInput,
    reportSourceCustomInput,
    reportProfitsCustomInput,
    reportOldGroupInput,
    reportNewGroupInput,
    reportNotesInput
  ].forEach(applyFieldCompletionState);

  showToast('تم إعادة التعيين', 'تم مسح جميع الحقول', 'default');
});

// --- Send Telegram & Google Form ---
sendTelegramBtn.addEventListener('click', async () => {
  const userSettings = await chrome.storage.local.get(['userSettings']);
  const employeeName = userSettings.userSettings?.employeeName;

  if (!employeeName) {
    showToast('تنبيه', 'الرجاء اختيار اسم الموظف من الإعدادات (⚙️)', 'warning');
    telegramSettingsBtn.click();
    return;
  }

  const token = DEFAULT_TELEGRAM_TOKEN;
  const chatId = DEFAULT_TELEGRAM_CHAT_ID;

  const hasIpBeforeSend = !!reportIpInput.value.trim();
  if (hasIpBeforeSend) {
    const countryReady = await ensureTransferReportCountry();
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
  if (source === 'Other') source = reportSourceCustomInput.value.trim() || 'Other';
  let profits = reportProfitsInput.value;
  if (profits === 'Other') profits = reportProfitsCustomInput.value.trim() || 'Other';
  const oldGroup = reportOldGroupInput.value;
  const newGroup = reportNewGroupInput.value;
  const notes = reportNotesInput.value.trim();
  const shift = reportShiftInput.value;

  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

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

  let mentions = [];
  if (mentionAhmedBtn.classList.contains('active')) mentions.push('@ahmedelgma');
  if (mentionBatoulBtn.classList.contains('active')) mentions.push('@batoulhassan');

  if (mentions.length > 0) {
    message += '\n\n' + mentions.join(' ');
  }

  sendTelegramBtn.disabled = true;
  sendTelegramBtn.textContent = 'جاري الإرسال...';

  // Google Form & Telegram Submission
  try {
    // 1. Google Form Submission (via Apps Script)
    const payload = {
      ip: `${ip} || ${country}`,
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

    const formResponse = await fetch(DEFAULT_GF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!formResponse.ok) {
      throw new Error(`Google Script Error: ${formResponse.status}`);
    }

    const result = await formResponse.json();
    if (result.status !== 'success') {
      throw new Error(`Google Script Failed: ${result.message}`);
    }

    console.log('Google Form request sent successfully');

    // 2. Telegram Submission
    console.log('Sending to Telegram...');
    let response;
    
    if (selectedImages.length > 0) {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      
      const mediaArray = selectedImages.map((file, index) => {
        const attachName = `file${index}`;
        formData.append(attachName, file);
        return {
          type: 'photo',
          media: `attach://${attachName}`,
          caption: index === 0 ? message : '',
          parse_mode: 'HTML'
        };
      });
      
      formData.append('media', JSON.stringify(mediaArray));
      
      response = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      });

    } else {
      response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    }

    const data = await response.json();

    if (data.ok) {
      showToast('تم الإرسال', 'تم إرسال التقرير إلى Telegram و Google Form بنجاح', 'success');

      // Save last Telegram message ids so user can delete the sent images/messages if needed.
      const messageIds = extractTelegramMessageIds(data);
      if (chrome?.storage?.local && messageIds.length) {
        chrome.storage.local.set({
          [TRANSFER_REPORT_LAST_SENT_KEY]: {
            messageIds,
            sentAt: Date.now()
          }
        }, () => loadLastSentState());
      }

      resetReportBtn.click();

      // Start a fresh report from the top.
      const container = document.querySelector('.report-container');
      if (container && typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      console.error('Telegram Error:', data);
      showToast('فشل الإرسال', `خطأ من Telegram: ${data.description}`, 'error');
    }
  } catch (error) {
    console.error('Submission Error:', error);
    showToast('فشل الإرسال', `حدث خطأ: ${error.message}`, 'error');
  } finally {
    sendTelegramBtn.disabled = false;
    sendTelegramBtn.textContent = 'إرسال';
  }
});

// Initialize
loadUserSettings();

// --- Dark Mode ---
function applyDarkMode(isDarkMode) {
  document.body.classList.toggle('dark-mode', isDarkMode);
}

chrome.storage.sync.get(['darkMode'], (data) => {
  applyDarkMode(data.darkMode);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.darkMode) {
    applyDarkMode(changes.darkMode.newValue);
  }
});

/* ==========================================================================
   PERSISTENCE LAYER (Auto-Save Report Data)
   ========================================================================== */
(function() {
    const PREFIX = 'inzo_tr_';
    const PERSISTENT_FIELDS = [
        { el: reportIpInput, key: PREFIX + 'ip' },
        { el: reportCountryInput, key: PREFIX + 'country' }, // Read-only but we try to restore
        { el: reportAccountInput, key: PREFIX + 'account' },
        { el: reportEmailInput, key: PREFIX + 'email' },
        { el: reportSourceInput, key: PREFIX + 'source' },
        { el: reportSourceCustomInput, key: PREFIX + 'source_custom' },
        { el: reportProfitsInput, key: PREFIX + 'profits' },
        { el: reportProfitsCustomInput, key: PREFIX + 'profits_custom' },
        { el: reportOldGroupInput, key: PREFIX + 'old_group' },
        { el: reportNewGroupInput, key: PREFIX + 'new_group' },
        { el: reportNotesInput, key: PREFIX + 'notes' }
    ];

    // 1. Restore Data on Load
    PERSISTENT_FIELDS.forEach(item => {
        if (!item.el) return;
        const saved = localStorage.getItem(item.key);
        if (saved !== null) {
            item.el.value = saved;
            // Trigger visual logic
            item.el.dispatchEvent(new Event('change'));
            item.el.dispatchEvent(new Event('input'));
        }
    });

    // Restore Shift
    const savedShift = localStorage.getItem(PREFIX + 'shift');
    if (savedShift) {
        reportShiftInput.value = savedShift;
        shiftBtns.forEach(btn => {
            if (btn.dataset.value === savedShift) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    // Debournce Utility
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // 2. Save Data on Interaction (Optimized)
    PERSISTENT_FIELDS.forEach(item => {
        if (!item.el) return;
        
        const save = () => {
             localStorage.setItem(item.key, item.el.value);
        };

        // For standard inputs (Debounced 1000ms)
        if (item.el.tagName === 'INPUT' || item.el.tagName === 'TEXTAREA') {
            const debouncedSave = debounce(save, 1000);
            item.el.addEventListener('input', debouncedSave);
            // Also save on blur to be safe
            item.el.addEventListener('blur', save);
        } else {
            // Selects and others can be immediate
            item.el.addEventListener('change', save);
        }
    });

    // Special Case: Save Country after IP fetch (approximate)
    if (reportIpInput) {
        reportIpInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (reportCountryInput) localStorage.setItem(PREFIX + 'country', reportCountryInput.value);
            }, 2000); // Wait for fetch to likely complete
        });
    }

    // Save Shift
    shiftBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem(PREFIX + 'shift', btn.dataset.value);
        });
    });

    // 3. Clear Data on Reset
    if (resetReportBtn) {
        resetReportBtn.addEventListener('click', () => {
            PERSISTENT_FIELDS.forEach(f => localStorage.removeItem(f.key));
            localStorage.removeItem(PREFIX + 'shift');
        });
    }
})();


/* ==========================================================================
   CUSTOM DROPDOWN LOGIC (To Fix Separator Lines)
   ========================================================================== */
function convertToCustomSelect(selectId) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect || originalSelect.style.display === 'none') return; // Already converted or missing

  // Reliability: keep Employee Name as native select (custom dropdown caused click/overlay issues)
  if (selectId === 'employee-name-select') return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.classList.add('wrapper-' + selectId);
    
    // Critical Fix: Ensure z-index is higher than subsequent elements
    if (selectId === 'employee-name-select') {
        wrapper.style.zIndex = '1000'; // Increased to 1000
        wrapper.style.position = 'relative'; 
      dbgUserSettings('convertToCustomSelect(employee-name-select): created wrapper/trigger');
    }

    // Create trigger (the visible box)
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = '<span>' + (originalSelect.options[originalSelect.selectedIndex]?.text || 'اختر...') + '</span>';
    
    // Create options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';

    // Populate options
    // Handle Optgroups if present, otherwise just options
    if (originalSelect.querySelector('optgroup')) {
        originalSelect.querySelectorAll('optgroup').forEach(group => {
            // Category Header
            const catHeader = document.createElement('div');
            catHeader.className = 'custom-option-category';
            catHeader.textContent = group.label;
            optionsContainer.appendChild(catHeader);

            // Options inside Category
            group.querySelectorAll('option').forEach(opt => {
                const optDiv = createOptionDiv(opt, trigger, originalSelect, wrapper);
                optionsContainer.appendChild(optDiv);
            });
        });
    } else {
        // Flat list
        Array.from(originalSelect.options).forEach(opt => {
            if (opt.disabled) return;
            const optDiv = createOptionDiv(opt, trigger, originalSelect, wrapper);
            optionsContainer.appendChild(optDiv);
        });
    }

    // Helper to create option div
    function createOptionDiv(opt, trigger, originalSelect, wrapper) {
        const div = document.createElement('div');
        div.className = 'custom-option';
        if (opt.selected) div.classList.add('selected');
        div.textContent = opt.text;
        div.dataset.value = opt.value;
        
        div.addEventListener('click', () => {
             // Visual Update
             trigger.querySelector('span').textContent = opt.text;
             wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
             div.classList.add('selected');
             
             // Functional Update (Update hidden select & trigger change)
             originalSelect.value = opt.value;
             originalSelect.dispatchEvent(new Event('change')); // Critical for persistence
             
             // Close dropdown
             wrapper.classList.remove('open');
        });
        return div;
    }

    // Toggle Logic
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Stop any form submission or focus stealing

        if (selectId === 'employee-name-select') {
          dbgUserSettings('Trigger click: before toggle. wrapper.open?', wrapper.classList.contains('open'));
          dbgUserSettings('Trigger click target:', e.target);
        }

        // Close others
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });

        // Force z-index update when opening
        if (!wrapper.classList.contains('open') && selectId === 'employee-name-select') {
             wrapper.style.zIndex = '9999';
        } else if (selectId === 'employee-name-select') {
             setTimeout(() => wrapper.style.zIndex = '1000', 300);
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

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });

    // Sync from hidden select (if persistence loads data)
    originalSelect.addEventListener('change', () => {
         const selectedText = originalSelect.options[originalSelect.selectedIndex]?.text;
         if (selectedText) trigger.querySelector('span').textContent = selectedText;
    });

    // Insert into DOM
    originalSelect.parentNode.insertBefore(wrapper, originalSelect);
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    
    // Hide original
    originalSelect.style.display = 'none';
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    convertToCustomSelect('report-old-group');
    convertToCustomSelect('report-new-group');
  // Ensure employee select is native
  restoreNativeSelect('employee-name-select');
});

