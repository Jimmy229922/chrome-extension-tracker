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
