// --- Transfer Report Logic ---

function getTransferStorageService() {
  return typeof getStorageService === 'function' ? getStorageService() : null;
}

function getTransferIpGeoService() {
  return typeof getIpGeoService === 'function' ? getIpGeoService() : null;
}

function getTransferReportSubmitService() {
  return typeof getReportSubmitService === 'function' ? getReportSubmitService() : null;
}

function getTransferConfig() {
  return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
}

function getTransferInputUtils() {
  return typeof getInputUtilsService === 'function' ? getInputUtilsService() : (window.InputUtilsService || null);
}

function getTransferMention(key, fallbackValue) {
  const cfg = getTransferConfig();
  if (cfg && cfg.mentions && typeof cfg.mentions[key] === 'string' && cfg.mentions[key].trim()) {
    return cfg.mentions[key].trim();
  }
  return fallbackValue;
}
async function fetchIpInfo(ip) {
  if (!ip) return false;
  try {
    const ipGeoService = getTransferIpGeoService();
    const result = ipGeoService
      ? await ipGeoService.lookupCountryDisplay(ip, { fallback: 'Unknown' })
      : { success: false, country: 'Unknown', error: 'IPGeoService unavailable' };

    if (result.success) {
      const display = result.country;
      reportCountryInput.value = display;
      if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
      return !!result.resolved;
    }

    console.warn('IP lookup failed:', result.error);
    reportCountryInput.value = result.country || 'Unknown';
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

  const ipGeoService = getTransferIpGeoService();
  let cleanIp = rawIp;
  const extracted = rawIp.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (extracted && extracted[0]) cleanIp = extracted[0];

  if (typeof normalizeIpFn === 'function') {
    const normalized = normalizeIpFn(rawIp);
    if (!normalized) return false;
    cleanIp = normalized;
  } else if (ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function') {
    const normalized = ipGeoService.normalizeIPv4(rawIp);
    if (normalized) cleanIp = normalized;
  }

  if (cleanIp !== rawIp) ipInputEl.value = cleanIp;

  const currentCountry = (countryInputEl.value || '').trim();
  if (ipGeoService && typeof ipGeoService.isCountryResolved === 'function' && ipGeoService.isCountryResolved(currentCountry)) {
    return true;
  }

  const ok = await fetcherFn(cleanIp);
  if (ok) return true;

  const finalCountry = (countryInputEl.value || '').trim();
  if (ipGeoService && typeof ipGeoService.isCountryResolved === 'function') {
    return ipGeoService.isCountryResolved(finalCountry);
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
    const ipGeoService = getTransferIpGeoService();
    const hasIpBeforeCopy = !!reportIpInput.value.trim();
    if (hasIpBeforeCopy) {
      const countryReady = await ensureCountryForInputs(
        reportIpInput,
        reportCountryInput,
        fetchIpInfo,
        ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function'
          ? ipGeoService.normalizeIPv4
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
const __transferConfig = getTransferConfig();
const DEFAULT_TELEGRAM_TOKEN = (__transferConfig && __transferConfig.telegram && __transferConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
const DEFAULT_TELEGRAM_CHAT_ID = (__transferConfig && __transferConfig.telegram && __transferConfig.telegram.chatId) || '-1003692121203';
const TRANSFER_MENTION_AHMED = getTransferMention('ahmed', '@ahmedelgma');
const TRANSFER_MENTION_BATOUL = getTransferMention('batoul', '@batoulhassan');

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
    const storageService = getTransferStorageService();
    const reportSubmitService = getTransferReportSubmitService();
    const ipGeoService = getTransferIpGeoService();
    const userSettings = storageService
      ? await storageService.local.get(['userSettings'])
      : await chrome.storage.local.get(['userSettings']);
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
        ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function'
          ? ipGeoService.normalizeIPv4
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
    const inputUtils = getTransferInputUtils();
    const escapeHtml = (text) => {
      if (inputUtils && typeof inputUtils.escapeHtml === 'function') {
        return inputUtils.escapeHtml(text);
      }
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
      mentions.push(TRANSFER_MENTION_AHMED);
    }
    if (mentionBatoulBtn && mentionBatoulBtn.classList.contains('active')) {
      mentions.push(TRANSFER_MENTION_BATOUL);
    }

    if (mentions.length > 0) {
      message += '\n\n' + mentions.join(' ');
    }

    sendTelegramBtn.disabled = true;
    sendTelegramBtn.textContent = 'جاري الإرسال...';

    // --- Google Form & Telegram Submission Logic (Delegated to Background) ---
    try {
      // 1. Get Google Form Settings
      const result = storageService
        ? await storageService.local.get(['googleFormSettings'])
        : await chrome.storage.local.get(['googleFormSettings']);
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

      // Prepare Images for Background
      const telegramImages = reportSubmitService
        ? await reportSubmitService.filesToTelegramImages(selectedImages)
        : [];

      const submitData = {
        gfSettings,
        payload,
        telegramToken: token,
        telegramChatId: chatId,
        telegramMessage: message,
        telegramImages
      };

      if (reportSubmitService) {
        await reportSubmitService.submitReport(submitData);
      } else {
        const response = await chrome.runtime.sendMessage({
          type: 'submitReport',
          data: submitData
        });
        if (!response || !response.success) {
          throw new Error((response && response.error) || 'Unknown error from background');
        }
      }
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

    } catch (error) {
      console.error('Submission Error:', error);
      showToast('فشل الإرسال', `حدث خطأ: ${error.message}`, 'warning');
    } finally {
      sendTelegramBtn.disabled = false;
      sendTelegramBtn.textContent = 'إرسال Telegram';
    }
  });
}












