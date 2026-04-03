// --- Deposit Percentage Report Logic ---

function getDepositStorageService() {
  return typeof getStorageService === 'function' ? getStorageService() : null;
}

function getDepositIpGeoService() {
  return typeof getIpGeoService === 'function' ? getIpGeoService() : null;
}

function getDepositReportSubmitService() {
  return typeof getReportSubmitService === 'function' ? getReportSubmitService() : null;
}

function getDepositConfig() {
  return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
}

function getDepositInputUtils() {
  return typeof getInputUtilsService === 'function' ? getInputUtilsService() : (window.InputUtilsService || null);
}

function getDepositMention(key, fallbackValue) {
  const cfg = getDepositConfig();
  if (cfg && cfg.mentions && typeof cfg.mentions[key] === 'string' && cfg.mentions[key].trim()) {
    return cfg.mentions[key].trim();
  }
  return fallbackValue;
}

const __depositConfig = getDepositConfig();
const DEPOSIT_TELEGRAM_TOKEN = (__depositConfig && __depositConfig.telegram && __depositConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
const DEPOSIT_TELEGRAM_CHAT_ID = (__depositConfig && __depositConfig.telegram && __depositConfig.telegram.chatId) || '-1003692121203';
const DEPOSIT_MENTION_AHMED = getDepositMention('ahmed', '@ahmedelgma');
const DEPOSIT_MENTION_BATOUL = getDepositMention('batoul', '@batoulhassan');
async function fetchDepositIpInfo(ip) {
  if (!ip) return false;
  try {
    const ipGeoService = getDepositIpGeoService();
    const result = ipGeoService
      ? await ipGeoService.lookupCountryDisplay(ip, { fallback: 'Unknown' })
      : { success: false, country: 'Unknown', error: 'IPGeoService unavailable' };

    if (result.success) {
      if (depositReportCountryInput) depositReportCountryInput.value = result.country;
      if (depositReportCountryInput) applyFieldCompletionState(depositReportCountryInput);
      return !!result.resolved;
    }

    console.warn('Deposit IP lookup failed:', result.error);
    if (depositReportCountryInput) depositReportCountryInput.value = result.country || 'Unknown';
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
    const ipGeoService = getDepositIpGeoService();
    const hasIpBeforeCopy = !!depositReportIpInput.value.trim();
    if (hasIpBeforeCopy) {
      const countryReady = await ensureCountryForInputs(
        depositReportIpInput,
        depositReportCountryInput,
        fetchDepositIpInfo,
        ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function'
          ? ipGeoService.normalizeIPv4
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
      mentions.push(DEPOSIT_MENTION_AHMED);
    }
    if (depositMentionBatoulBtn && depositMentionBatoulBtn.classList.contains('active')) {
      mentions.push(DEPOSIT_MENTION_BATOUL);
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
    const storageService = getDepositStorageService();
    const reportSubmitService = getDepositReportSubmitService();
    const ipGeoService = getDepositIpGeoService();
    const userSettings = storageService
      ? await storageService.local.get(['userSettings'])
      : await chrome.storage.local.get(['userSettings']);
    const employeeName = userSettings.userSettings?.employeeName;

    if (!employeeName) {
      showToast('تنبيه', 'الرجاء اختيار اسم الموظف من الإعدادات (⚙️)', 'warning');
      if (depositTelegramSettingsBtn) depositTelegramSettingsBtn.click();
      return;
    }

    const token = DEPOSIT_TELEGRAM_TOKEN;
    const chatId = DEPOSIT_TELEGRAM_CHAT_ID;

    const hasIpBeforeSend = !!depositReportIpInput.value.trim();
    if (hasIpBeforeSend) {
      const countryReady = await ensureCountryForInputs(
        depositReportIpInput,
        depositReportCountryInput,
        fetchDepositIpInfo,
        ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function'
          ? ipGeoService.normalizeIPv4
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

    const inputUtils = getDepositInputUtils();
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
      mentions.push(DEPOSIT_MENTION_AHMED);
    }
    if (depositMentionBatoulBtn && depositMentionBatoulBtn.classList.contains('active')) {
      mentions.push(DEPOSIT_MENTION_BATOUL);
    }

    if (mentions.length > 0) {
      message += '\n\n' + mentions.join(' ');
    }

    depositSendTelegramBtn.disabled = true;
    depositSendTelegramBtn.textContent = 'جاري الإرسال...';

    try {
      const telegramImages = reportSubmitService
        ? await reportSubmitService.filesToTelegramImages(depositSelectedImages)
        : [];

      const submitData = {
        gfSettings: null,
        payload: {},
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
        // Reset UI
        depositResetReportBtn.click();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

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






