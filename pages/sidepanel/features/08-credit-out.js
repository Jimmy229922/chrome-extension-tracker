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

  function getCreditOutConfig() {
    return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
  }

  function getCreditOutIpGeoService() {
    return typeof getIpGeoService === 'function' ? getIpGeoService() : null;
  }

  function getCreditOutReportSubmitService() {
    return typeof getReportSubmitService === 'function' ? getReportSubmitService() : null;
  }

  function getCreditOutInputUtils() {
    return typeof getInputUtilsService === 'function' ? getInputUtilsService() : (window.InputUtilsService || null);
  }

  function getCreditOutMention(key, fallbackValue) {
    const cfg = getCreditOutConfig();
    if (cfg && cfg.mentions && typeof cfg.mentions[key] === 'string' && cfg.mentions[key].trim()) {
      return cfg.mentions[key].trim();
    }
    return fallbackValue;
  }

  const __creditOutConfig = getCreditOutConfig();
  const CREDIT_OUT_TELEGRAM_TOKEN = (__creditOutConfig && __creditOutConfig.telegram && __creditOutConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
  const CREDIT_OUT_TELEGRAM_CHAT_ID = (__creditOutConfig && __creditOutConfig.telegram && __creditOutConfig.telegram.chatId) || '-1003692121203';
  const CREDIT_OUT_MENTION_AHMED = getCreditOutMention('ahmed', '@ahmedelgma');
  const CREDIT_OUT_MENTION_BATOUL = getCreditOutMention('batoul', '@batoulhassan');

  let creditOutSelectedImages = [];
  let creditOutSavedNotes = [];
  const creditOutIpGeoService = getCreditOutIpGeoService();
  const creditOutReportSubmitService = getCreditOutReportSubmitService();
  const creditOutInputUtils = getCreditOutInputUtils();

  // Helper functions
  const extractIp = (text) => {
    if (creditOutInputUtils && typeof creditOutInputUtils.extractIPv4 === 'function') {
      return creditOutInputUtils.extractIPv4(text);
    }
    const match = (text || '').toString().match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isEmail = (text) => {
    if (creditOutInputUtils && typeof creditOutInputUtils.isEmail === 'function') {
      return creditOutInputUtils.isEmail(text);
    }
    return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test((text || '').toString());
  };
  const isAccount = (text) => {
    if (creditOutInputUtils && typeof creditOutInputUtils.isAccountId === 'function') {
      return creditOutInputUtils.isAccountId(text);
    }
    return /^\d{6,7}$/.test(((text || '').toString()).trim());
  };

  function escapeCreditOutHtml(text) {
    if (creditOutInputUtils && typeof creditOutInputUtils.escapeHtml === 'function') {
      return creditOutInputUtils.escapeHtml(text);
    }
    if (text === null || typeof text === 'undefined') return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
      const result = creditOutIpGeoService
        ? await creditOutIpGeoService.lookupCountryDisplay(ip, { fallback: 'Unknown' })
        : { success: false, country: 'Unknown', error: 'IPGeoService unavailable' };

      if (result.success) {
        creditOutCountryInput.value = result.country;
        return !!result.resolved;
      }

      console.warn('Credit-out IP lookup failed:', result.error);
      creditOutCountryInput.value = result.country || 'Unknown';
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

    const normalizedByService = creditOutIpGeoService && typeof creditOutIpGeoService.normalizeIPv4 === 'function' ? creditOutIpGeoService.normalizeIPv4(ipRaw) : '';
    const ip = normalizedByService || extractIp(ipRaw);
    if (!ip) return false;
    if (ip !== ipRaw) creditOutIpInput.value = ip;

    const currentCountry = (creditOutCountryInput.value || '').trim();
    if (creditOutIpGeoService && typeof creditOutIpGeoService.isCountryResolved === 'function' && creditOutIpGeoService.isCountryResolved(currentCountry)) {
      return true;
    }

    const ok = await creditOutFetchIpInfo(ip);
    if (ok) return true;

    const finalCountry = (creditOutCountryInput.value || '').trim();
    if (creditOutIpGeoService && typeof creditOutIpGeoService.isCountryResolved === 'function') {
      return creditOutIpGeoService.isCountryResolved(finalCountry);
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

  // Credit Out Auto Flow (No Enter)
  if (creditOutIpInput) {
    creditOutIpInput.addEventListener('blur', () => {
      const val = (creditOutIpInput.value || '').trim();
      const candidate = val.includes('//') ? val.split('//')[0] : val;
      if (extractIp(candidate) && creditOutAccountInput) {
        creditOutAccountInput.focus();
      }
    });

    creditOutIpInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = (creditOutIpInput.value || '').trim();
        const candidate = val.includes('//') ? val.split('//')[0] : val;
        if (extractIp(candidate) && creditOutAccountInput) {
          creditOutAccountInput.focus();
        }
      }, 20);
    });
  }

  if (creditOutAccountInput) {
    creditOutAccountInput.addEventListener('blur', () => {
      const val = (creditOutAccountInput.value || '').trim();
      if (isAccount(val) && creditOutEmailInput) {
        creditOutEmailInput.focus();
      }
    });

    creditOutAccountInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = (creditOutAccountInput.value || '').trim();
        if (isAccount(val) && creditOutEmailInput) {
          creditOutEmailInput.focus();
        }
      }, 20);
    });
  }

  if (creditOutEmailInput) {
    creditOutEmailInput.addEventListener('blur', () => {
      const val = (creditOutEmailInput.value || '').trim();
      if (isEmail(val) && creditOutDateInput) {
        creditOutDateInput.focus();
      }
    });

    creditOutEmailInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = (creditOutEmailInput.value || '').trim();
        if (isEmail(val) && creditOutDateInput) {
          creditOutDateInput.focus();
        }
      }, 20);
    });
  }

  if (creditOutDateInput) {
    creditOutDateInput.addEventListener('blur', () => {
      const val = (creditOutDateInput.value || '').trim();
      if (extractDateTime(val) && creditOutAmountInput) {
        creditOutAmountInput.focus();
      }
    });

    creditOutDateInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = (creditOutDateInput.value || '').trim();
        if (extractDateTime(val) && creditOutAmountInput) {
          creditOutAmountInput.focus();
        }
      }, 20);
    });
  }

  if (creditOutAmountInput) {
    creditOutAmountInput.addEventListener('blur', () => {
      if ((creditOutAmountInput.value || '').trim() && creditOutNotesInput) {
        creditOutNotesInput.focus();
      }
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
    reportText += `الموظف: ${employeeName}\n`;
    reportText += `فترة الشفت: ${shift}\n`;
    reportText += `ip country: ${country}\n`;
    reportText += `IP: ${ip}\n`;
    reportText += `الإيميل: ${email}\n`;
    reportText += `رقم الحساب: ${account}\n`;
    reportText += `التاريخ: ${dateTime}\n`;
    reportText += `المبلغ: ${amount}\n`;
    reportText += `الملاحظات: ${notes}\n\n`;
    reportText += `#credit-out`;

    const mentions = [];
    if (creditOutMentionAhmed?.classList.contains('active')) {
      mentions.push(CREDIT_OUT_MENTION_AHMED);
    }
    if (creditOutMentionBatoul?.classList.contains('active')) {
      mentions.push(CREDIT_OUT_MENTION_BATOUL);
    }
    if (mentions.length > 0) {
      reportText += `\n${mentions.join(' ')}`;
    }

    return reportText;
  }

  async function generateCreditOutTelegramHtmlAsync() {
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

    let message = `<b>تقرير Credit Out</b>\n\n`;
    message += `<b>الموظف:</b> ${escapeCreditOutHtml(employeeName)}\n`;
    message += `<b>فترة الشفت:</b> ${escapeCreditOutHtml(shift)}\n`;
    message += `<b>ip country:</b> <code>${escapeCreditOutHtml(country)}</code>\n`;
    message += `<b>IP:</b> <code>${escapeCreditOutHtml(ip)}</code>\n`;
    message += `<b>الإيميل:</b> <code>${escapeCreditOutHtml(email)}</code>\n`;
    message += `<b>رقم الحساب:</b> <code>${escapeCreditOutHtml(account)}</code>\n`;
    message += `<b>التاريخ:</b> <code>${escapeCreditOutHtml(dateTime)}</code>\n`;
    message += `<b>المبلغ:</b> <code>${escapeCreditOutHtml(amount)}</code>\n`;
    message += `<b>الملاحظات:</b> <code>${escapeCreditOutHtml(notes)}</code>\n\n`;
    message += `#credit-out`;

    const mentions = [];
    if (creditOutMentionAhmed?.classList.contains('active')) {
      mentions.push(CREDIT_OUT_MENTION_AHMED);
    }
    if (creditOutMentionBatoul?.classList.contains('active')) {
      mentions.push(CREDIT_OUT_MENTION_BATOUL);
    }

    if (mentions.length > 0) {
      message += `\n\n${mentions.join(' ')}`;
    }

    return message;
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
        const telegramMessage = await generateCreditOutTelegramHtmlAsync();
        const token = CREDIT_OUT_TELEGRAM_TOKEN;
        const chatId = CREDIT_OUT_TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
          throw new Error('إعدادات Telegram غير صحيحة');
        }

        const imageFiles = creditOutSelectedImages
          .map((img) => (img && img.file ? img.file : null))
          .filter(Boolean);

        let telegramImages = [];
        if (creditOutReportSubmitService) {
          telegramImages = await creditOutReportSubmitService.filesToTelegramImages(imageFiles);
        } else {
          telegramImages = creditOutSelectedImages
            .filter((img) => img && typeof img.data === 'string')
            .map((img) => ({
              data: img.data,
              type: (img.file && img.file.type) || 'image/png'
            }));
        }

        const submitData = {
          gfSettings: null,
          payload: {},
          telegramToken: token,
          telegramChatId: chatId,
          telegramMessage,
          telegramImages
        };

        if (creditOutReportSubmitService) {
          await creditOutReportSubmitService.submitReport(submitData);
        } else {
          const response = await chrome.runtime.sendMessage({
            type: 'submitReport',
            data: submitData
          });
          if (!response || !response.success) {
            throw new Error((response && response.error) || 'Unknown error from background');
          }
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








