// DOM Elements
const reportIpInput = document.getElementById('report-ip');
const reportCountryInput = document.getElementById('report-country');
const reportAccountInput = document.getElementById('report-account');
const reportEmailInput = document.getElementById('report-email');
const reportDateRawInput = document.getElementById('report-date-raw');
const reportDateInput = document.getElementById('report-date');
const reportAmountInput = document.getElementById('report-amount');
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
const employeeDirectory = window.EmployeeDirectory;

if (employeeDirectory) {
  employeeDirectory.populateEmployeeSelect(employeeNameSelect);
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

const CREDIT_OUT_LAST_SENT_KEY = 'creditOutLastTelegramSent';

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

let currentToast = null;
let isEmployeeNameLocked = false;

function lockEmployeeNameUI(employeeName) {
  if (employeeNameSelect) {
    employeeNameSelect.value = employeeName || employeeNameSelect.value;
    employeeNameSelect.disabled = true;
    employeeNameSelect.title = 'تم حفظ الاسم ولا يمكن تغييره';
  }
  if (saveUserSettingsBtn) {
    saveUserSettingsBtn.disabled = true;
    saveUserSettingsBtn.title = 'تم حفظ الاسم ولا يمكن تغييره';
  }
  isEmployeeNameLocked = true;
}

function unlockEmployeeNameUI() {
  if (employeeNameSelect) {
    employeeNameSelect.disabled = false;
    employeeNameSelect.title = '';
  }
  if (saveUserSettingsBtn) {
    saveUserSettingsBtn.disabled = false;
    saveUserSettingsBtn.title = '';
  }
  isEmployeeNameLocked = false;
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
      creditOutEmployeeName: finalName,
      userSettings: nextUserSettings
    }, () => {
      if (typeof onDone === 'function') onDone(true, finalName, existingName ? 'existing' : 'saved');
    });
  });
}

// --- Toast Notification System ---
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

// --- Helper Functions ---
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

// --- Date/Time Extraction ---
// Extracts date and time from raw data like: "2026.01.20 20:35:07	146018923	Balance..."
function extractDateTime(rawText) {
  // Pattern to match date and time in format: YYYY.MM.DD HH:MM:SS
  const dateTimePattern = /(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})/;
  const match = rawText.match(dateTimePattern);
  return match ? match[1] : '';
}

// --- IP Info Fetch ---
async function fetchIpInfo(ip) {
  if (!ip) return false;
  try {
    reportCountryInput.value = 'جاري البحث...';
    const geoClient = window.IPGeoClient;
    const result = geoClient
      ? await (geoClient.lookupWithRetry
        ? geoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120 })
        : geoClient.lookup(ip))
      : { success: false, error: 'IPGeoClient unavailable' };
    if (result.success) {
      const display = geoClient.toCountryDisplay(result.data, 'Unknown');
      reportCountryInput.value = display;
      if (geoClient && typeof geoClient.isCountryTextResolved === 'function') {
        return geoClient.isCountryTextResolved(display);
      }
      return !!display && display !== 'Unknown' && display !== 'Error';
    }

    console.warn('Credit-out report IP lookup failed:', result.error);
    reportCountryInput.value = 'Unknown';
    return false;
  } catch (error) {
    console.error('Error fetching IP info:', error);
    reportCountryInput.value = 'Error';
    return false;
  }
}

async function ensureCreditOutCountry() {
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

reportAmountInput.addEventListener('blur', () => {
  const raw = reportAmountInput.value;
  const formatted = formatCreditOutAmountWithDollar(raw);
  reportAmountInput.value = formatted;
});

// Date Raw Input - Extract date/time on paste or blur
reportDateRawInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = reportDateRawInput.value.trim();
    const extracted = extractDateTime(val);
    if (extracted) {
      reportDateInput.value = extracted;
      showToast('تم', 'تم استخراج التاريخ والوقت بنجاح', 'success');
    } else {
      reportDateInput.value = '';
      showToast('تنبيه', 'لم يتم العثور على تاريخ ووقت في البيانات', 'warning');
    }
  }, 10);
});

reportDateRawInput.addEventListener('blur', () => {
  const val = reportDateRawInput.value.trim();
  if (val) {
    const extracted = extractDateTime(val);
    if (extracted) {
      reportDateInput.value = extracted;
    }
  }
});

// IP Input
reportIpInput.addEventListener('blur', () => {
  const val = reportIpInput.value.trim();
  const cleanIp = extractIp(val);
  
  if (cleanIp) {
    if (cleanIp !== val) reportIpInput.value = cleanIp;
    fetchIpInfo(cleanIp);
  } else if (val !== '') {
    // Check if it contains IP//Country format
    if (val.includes('//')) {
      const parts = val.split('//');
      const ip = extractIp(parts[0]);
      if (ip) {
        reportIpInput.value = ip;
        reportCountryInput.value = parts[1]?.trim() || '';
        fetchIpInfo(ip);
        return;
      }
    }
    
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
    
    // Check if it contains IP//Country format
    if (val.includes('//')) {
      const parts = val.split('//');
      const ip = extractIp(parts[0]);
      if (ip) {
        reportIpInput.value = ip;
        reportCountryInput.value = parts[1]?.trim() || '';
        fetchIpInfo(ip);
        reportAccountInput.focus();
        return;
      }
    }
    
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
      reportDateRawInput.focus();
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
        reportAccountInput.focus();
      } else {
        reportEmailInput.value = '';
        showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
      }
    }
  }, 10);
});


reportIpInput.addEventListener('blur', () => {
  const val = reportIpInput.value.trim();
  const candidate = val.includes('//') ? val.split('//')[0] : val;
  if (extractIp(candidate)) {
    reportAccountInput.focus();
  }
});

reportAccountInput.addEventListener('blur', () => {
  const val = reportAccountInput.value.trim();
  if (isAccount(val)) {
    reportEmailInput.focus();
  }
});

reportEmailInput.addEventListener('blur', () => {
  const val = reportEmailInput.value.trim();
  if (isEmail(val)) {
    reportDateRawInput.focus();
  }
});

reportAccountInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = reportAccountInput.value.trim();
    if (isAccount(val)) {
      reportEmailInput.focus();
    }
  }, 10);
});

reportEmailInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = reportEmailInput.value.trim();
    if (isEmail(val)) {
      reportDateRawInput.focus();
    }
  }, 10);
});

reportDateRawInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = reportDateRawInput.value.trim();
    if (extractDateTime(val)) {
      reportAmountInput.focus();
    }
  }, 10);
});

reportDateRawInput.addEventListener('blur', () => {
  const val = reportDateRawInput.value.trim();
  if (extractDateTime(val)) {
    reportAmountInput.focus();
  }
});

reportAmountInput.addEventListener('blur', () => {
  if (reportAmountInput.value.trim()) {
    reportNotesInput.focus();
  }
});

// --- Shift Selection ---
shiftBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    shiftBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reportShiftInput.value = btn.dataset.value;
  });
});

// --- Mentions ---
function toggleMention(targetBtn, ...otherBtns) {
  const wasActive = targetBtn.classList.contains('active');
  otherBtns.forEach(b => b.classList.remove('active'));
  
  if (wasActive) {
    targetBtn.classList.remove('active');
  } else {
    targetBtn.classList.add('active');
  }
}

mentionAhmedBtn.addEventListener('click', (e) => {
  e.preventDefault();
  toggleMention(mentionAhmedBtn, mentionBatoulBtn);
});

mentionBatoulBtn.addEventListener('click', (e) => {
  e.preventDefault();
  toggleMention(mentionBatoulBtn, mentionAhmedBtn);
});

// --- Image Handling ---
reportImagesInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedImages.push({
          name: file.name,
          data: event.target.result,
          file: file
        });
        renderImagePreviews();
      };
      reader.readAsDataURL(file);
    }
  });
  e.target.value = '';
});

function renderImagePreviews() {
  imagePreviewContainer.innerHTML = '';
  selectedImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${img.data}" alt="${img.name}">
      <button class="remove-image-btn" data-index="${index}">×</button>
    `;
    imagePreviewContainer.appendChild(item);
  });

  document.querySelectorAll('.remove-image-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      selectedImages.splice(index, 1);
      renderImagePreviews();
    });
  });
}

// Drag and Drop
const fileUploadContainer = document.querySelector('.file-upload-container');

fileUploadContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadContainer.style.borderColor = '#3498db';
  fileUploadContainer.style.background = 'rgba(52, 152, 219, 0.1)';
});

fileUploadContainer.addEventListener('dragleave', () => {
  fileUploadContainer.style.borderColor = '#b2bec3';
  fileUploadContainer.style.background = 'rgba(245, 247, 250, 0.5)';
});

fileUploadContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadContainer.style.borderColor = '#b2bec3';
  fileUploadContainer.style.background = 'rgba(245, 247, 250, 0.5)';

  const files = Array.from(e.dataTransfer.files);
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedImages.push({
          name: file.name,
          data: event.target.result,
          file: file
        });
        renderImagePreviews();
      };
      reader.readAsDataURL(file);
    }
  });
});

// --- Generate Report ---
function generateReportText() {
  const shift = reportShiftInput.value || 'غير محدد';
  const email = reportEmailInput.value.trim() || 'غير محدد';
  const account = reportAccountInput.value.trim() || 'غير محدد';
  const ip = reportIpInput.value.trim() || 'غير محدد';
  const country = reportCountryInput.value.trim() || 'غير محدد';
  const dateTime = reportDateInput.value.trim() || 'غير محدد';
  const rawAmount = reportAmountInput.value.trim() || '';
  const amount = rawAmount ? formatCreditOutAmountWithDollar(rawAmount) : 'غير محدد';
  const notes = reportNotesInput.value.trim() || 'لا توجد';

  let employeeName = 'غير محدد';
  if (chrome?.storage?.local) {
    // Will be set async
  }

  let reportText = `📋 *تقرير Credit Out*\n`;
  reportText += `━━━━━━━━━━━━━━━━━━━━━\n`;
  reportText += `⏰ *فترة الشفت:* ${shift}\n`;
  reportText += `📧 *الإيميل:* ${email}\n`;
  reportText += `🔢 *رقم الحساب:* ${account}\n`;
  reportText += `🌐 *IP:* ${ip}\n`;
  reportText += `🌍 *الدولة:* ${country}\n`;
  reportText += `📅 *التاريخ والوقت:* ${dateTime}\n`;
  reportText += `💰 *المبلغ:* ${amount}\n`;
  reportText += `📝 *الملاحظة:* ${notes}\n`;
  reportText += `━━━━━━━━━━━━━━━━━━━━━\n`;

  // Mentions
  if (mentionAhmedBtn.classList.contains('active')) {
    reportText += `\n@ahmedelgma`;
  }
  if (mentionBatoulBtn.classList.contains('active')) {
    reportText += `\n@batoulhassan`;
  }

  return reportText;
}

generateReportBtn.addEventListener('click', async () => {
  const hasIpBeforeCopy = !!reportIpInput.value.trim();
  if (hasIpBeforeCopy) {
    const countryReady = await ensureCreditOutCountry();
    if (!countryReady) {
      showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
      return;
    }
  }

  const reportText = generateReportText();
  
  try {
    await navigator.clipboard.writeText(reportText);
    showToast('تم النسخ', 'تم نسخ التقرير بنجاح', 'success');
  } catch (err) {
    showToast('خطأ', 'فشل في نسخ التقرير', 'error');
  }
});

// --- Send to Telegram ---
async function sendToTelegram() {
  const token = DEFAULT_TELEGRAM_TOKEN;
  const chatId = DEFAULT_TELEGRAM_CHAT_ID;

  const hasIpBeforeSend = !!reportIpInput.value.trim();
  if (hasIpBeforeSend) {
    const countryReady = await ensureCreditOutCountry();
    if (!countryReady) {
      showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
      return;
    }
  }
  
  sendTelegramBtn.disabled = true;
  sendTelegramBtn.textContent = 'جاري الإرسال...';

  try {
    const reportText = generateReportText();
    const messageIds = [];

    // Send text message
    const textResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reportText,
        parse_mode: 'Markdown'
      })
    });

    const textData = await textResponse.json();
    if (!textResponse.ok || !textData.ok) {
      throw new Error(textData.description || 'Failed to send message');
    }
    messageIds.push(textData.result.message_id);

    // Send images if any
    for (const img of selectedImages) {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      
      // Convert base64 to blob
      const response = await fetch(img.data);
      const blob = await response.blob();
      formData.append('photo', blob, img.name);

      const photoResponse = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      const photoData = await photoResponse.json();
      if (photoResponse.ok && photoData.ok) {
        messageIds.push(photoData.result.message_id);
      }
    }

    // Save message IDs for deletion
    if (chrome?.storage?.local) {
      chrome.storage.local.set({
        [CREDIT_OUT_LAST_SENT_KEY]: { messageIds, timestamp: Date.now() }
      });
      setDeleteLastSentEnabled(true);
    }

    showToast('تم الإرسال', 'تم إرسال التقرير بنجاح إلى Telegram', 'success');
  } catch (error) {
    console.error('Telegram send error:', error);
    showToast('خطأ', `فشل في الإرسال: ${error.message}`, 'error');
  } finally {
    sendTelegramBtn.disabled = false;
    sendTelegramBtn.textContent = 'إرسال';
  }
}

sendTelegramBtn.addEventListener('click', sendToTelegram);

// --- Delete Last Sent ---
function setDeleteLastSentEnabled(enabled) {
  if (!deleteLastSentBtn) return;
  deleteLastSentBtn.disabled = !enabled;
}

function loadLastSentState() {
  if (!deleteLastSentBtn || !chrome?.storage?.local) return;
  chrome.storage.local.get([CREDIT_OUT_LAST_SENT_KEY], (data) => {
    const last = data?.[CREDIT_OUT_LAST_SENT_KEY];
    const hasIds = Array.isArray(last?.messageIds) && last.messageIds.length > 0;
    setDeleteLastSentEnabled(hasIds);
  });
}

async function deleteLastSentFromTelegram() {
  if (!chrome?.storage?.local) return;
  const token = DEFAULT_TELEGRAM_TOKEN;
  const chatId = DEFAULT_TELEGRAM_CHAT_ID;

  const stored = await new Promise((resolve) => {
    chrome.storage.local.get([CREDIT_OUT_LAST_SENT_KEY], resolve);
  });

  const last = stored?.[CREDIT_OUT_LAST_SENT_KEY];
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
      showToast('فشل الحذف', 'تأكد أن البوت لديه صلاحية حذف الرسائل', 'error');
      setDeleteLastSentEnabled(true);
      return;
    }

    await new Promise((resolve) => {
      chrome.storage.local.remove([CREDIT_OUT_LAST_SENT_KEY], resolve);
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

// --- Reset Form ---
resetReportBtn.addEventListener('click', () => {
  reportEmailInput.value = '';
  reportAccountInput.value = '';
  reportIpInput.value = '';
  reportCountryInput.value = '';
  reportDateRawInput.value = '';
  reportDateInput.value = '';
  reportAmountInput.value = '';
  reportNotesInput.value = '';
  reportShiftInput.value = '';
  
  shiftBtns.forEach(btn => btn.classList.remove('active'));
  mentionAhmedBtn.classList.remove('active');
  mentionBatoulBtn.classList.remove('active');
  
  selectedImages = [];
  renderImagePreviews();
  
  showToast('تم', 'تم إعادة تعيين النموذج', 'success');
});

// --- Settings Modal ---
telegramSettingsBtn.addEventListener('click', () => {
  telegramSettingsModal.style.display = 'block';
  loadUserSettings();
});

telegramSettingsClose.addEventListener('click', () => {
  telegramSettingsModal.style.display = 'none';
});

telegramSettingsModal.addEventListener('click', (e) => {
  if (e.target === telegramSettingsModal) {
    telegramSettingsModal.style.display = 'none';
  }
});

function loadUserSettings() {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get(['creditOutEmployeeName', 'userSettings'], (data) => {
    const savedName = getStoredEmployeeNameFromData(data);
    if (savedName) {
      if (employeeDirectory) employeeDirectory.ensureEmployeeOption(employeeNameSelect, savedName);
      employeeNameSelect.value = savedName;
      lockEmployeeNameUI(savedName);
      const userSettingsName = (
        data &&
        data.userSettings &&
        typeof data.userSettings.employeeName === 'string'
      ) ? data.userSettings.employeeName.trim() : '';
      if (userSettingsName !== savedName) {
        const nextUserSettings = {
          ...(data.userSettings || {}),
          employeeName: savedName
        };
        chrome.storage.local.set({
          userSettings: nextUserSettings,
          creditOutEmployeeName: savedName
        });
      }
    } else {
      unlockEmployeeNameUI();
    }
  });
}

saveUserSettingsBtn.addEventListener('click', () => {
  if (!chrome?.storage?.local) return;
  if (isEmployeeNameLocked) {
    showToast('تنبيه', 'تم حفظ الاسم مسبقًا ولا يمكن تغييره.', 'warning');
    telegramSettingsModal.style.display = 'none';
    return;
  }
  const employeeName = employeeDirectory
    ? employeeDirectory.normalizeEmployeeName(employeeNameSelect.value)
    : employeeNameSelect.value;
  if (!employeeName) {
    showToast('تنبيه', 'اختر اسم الموظف أولًا.', 'warning');
    return;
  }

  persistEmployeeNameOnce(employeeName, (saved, resolvedName, reason) => {
    if (!saved) {
      if (reason === 'locked' && resolvedName) {
        lockEmployeeNameUI(resolvedName);
        showToast('تنبيه', 'تم حفظ الاسم مسبقًا ولا يمكن تغييره.', 'warning');
        telegramSettingsModal.style.display = 'none';
        return;
      }
      showToast('تنبيه', 'اختر اسم الموظف أولًا.', 'warning');
      return;
    }

    lockEmployeeNameUI(resolvedName || employeeName);
      showToast('تم الحفظ', 'تم حفظ الإعدادات بنجاح', 'success');
      telegramSettingsModal.style.display = 'none';
  });
});

// --- Notes Modal ---
openNotesModalBtn.addEventListener('click', () => {
  savedNotesModal.style.display = 'block';
  loadSavedNotes();
});

savedNotesCloseBtn.addEventListener('click', () => {
  savedNotesModal.style.display = 'none';
});

savedNotesModal.addEventListener('click', (e) => {
  if (e.target === savedNotesModal) {
    savedNotesModal.style.display = 'none';
  }
});

function loadSavedNotes() {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get(['creditOutSavedNotes'], (data) => {
    const storedNotes = Array.isArray(data.creditOutSavedNotes) ? data.creditOutSavedNotes : [];
    savedNotes = storedNotes.length ? storedNotes : [...DEFAULT_REPORT_NOTE_TEMPLATES];
    if (!storedNotes.length) {
      chrome.storage.local.set({ creditOutSavedNotes: savedNotes }, () => {
        renderSavedNotes();
      });
      return;
    }
    renderSavedNotes();
  });
}

function renderSavedNotes() {
  savedNotesList.innerHTML = '';

  savedNotes.forEach((note, index) => {
    const li = document.createElement('li');
    li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;';
    li.innerHTML = `
      <span style="flex: 1;">${note}</span>
      <div style="display:flex; gap:6px;">
        <button class="saved-note-btn edit" data-index="${index}" style="background: none; border: none; cursor: pointer;">✏️</button>
        <button class="saved-note-btn delete" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #e74c3c;">🗑️</button>
      </div>
    `;

    li.querySelector('span').addEventListener('click', () => {
      reportNotesInput.value = note;
      savedNotesModal.style.display = 'none';
      showToast('تم', 'تم إضافة الملاحظة', 'success');
    });

    li.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      const next = prompt('تعديل الملاحظة:', savedNotes[idx] || '');
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        showToast('تنبيه', 'لا يمكن حفظ ملاحظة فارغة', 'warning');
        return;
      }
      savedNotes[idx] = trimmed;
      chrome.storage.local.set({ creditOutSavedNotes: savedNotes }, () => renderSavedNotes());
    });

    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
      savedNotes.splice(idx, 1);
      chrome.storage.local.set({ creditOutSavedNotes: savedNotes }, () => renderSavedNotes());
    });

    savedNotesList.appendChild(li);
  });
}

addNoteBtn.addEventListener('click', () => {
  const newNote = newNoteInput.value.trim();
  if (!newNote) {
    showToast('تنبيه', 'الرجاء إدخال ملاحظة', 'warning');
    return;
  }
  savedNotes.push(newNote);
  chrome.storage.local.set({ creditOutSavedNotes: savedNotes }, () => {
    newNoteInput.value = '';
    renderSavedNotes();
    showToast('تم', 'تم إضافة الملاحظة', 'success');
  });
});

// Initialize
loadUserSettings();
