// Withdrawal Report Button Handler
if (withdrawalReportBtn) {
  withdrawalReportBtn.addEventListener('click', () => {
    switchTab('withdrawal-report');
  });
}

// --- Withdrawal Report Logic ---
let withdrawalSelectedImages = [];

function getWithdrawalStorageService() {
    return typeof getStorageService === 'function' ? getStorageService() : null;
}

function getWithdrawalReportSubmitService() {
    return typeof getReportSubmitService === 'function' ? getReportSubmitService() : null;
}

function getWithdrawalConfig() {
    return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
}

const __withdrawalConfig = getWithdrawalConfig();
const WITHDRAWAL_TELEGRAM_TOKEN = (__withdrawalConfig && __withdrawalConfig.telegram && __withdrawalConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
const WITHDRAWAL_TELEGRAM_CHAT_ID = (__withdrawalConfig && __withdrawalConfig.telegram && __withdrawalConfig.telegram.chatId) || '-1003692121203';

async function withdrawalLocalGet(keys) {
    const storageService = getWithdrawalStorageService();
    return storageService ? storageService.local.get(keys) : chrome.storage.local.get(keys);
}

async function withdrawalLocalSet(data) {
    const storageService = getWithdrawalStorageService();
    return storageService ? storageService.local.set(data) : chrome.storage.local.set(data);
}

async function withdrawalLocalRemove(keys) {
    const storageService = getWithdrawalStorageService();
    return storageService ? storageService.local.remove(keys) : chrome.storage.local.remove(keys);
}

// --- Persistence Logic ---
const WITHDRAWAL_DRAFT_KEY = (__withdrawalConfig && __withdrawalConfig.storageKeys && __withdrawalConfig.storageKeys.withdrawalDraft) || 'withdrawalReportDraft';

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
        await withdrawalLocalSet({ [WITHDRAWAL_DRAFT_KEY]: draft });
    } catch (e) {
        console.error('Failed to save draft:', e);
    }
}

async function loadWithdrawalDraft() {
    try {
        const data = await withdrawalLocalGet(WITHDRAWAL_DRAFT_KEY);
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
        await withdrawalLocalRemove(WITHDRAWAL_DRAFT_KEY);
    } catch (e) {
        console.error('Failed to clear draft:', e);
    }
}


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
    const data = await withdrawalLocalGet('withdrawalHistory');
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
    const data = await withdrawalLocalGet('withdrawalHistory');
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
        await withdrawalLocalSet({ withdrawalHistory: newHistory });
    } else {
        await withdrawalLocalSet({ withdrawalHistory: history });
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

        const reportSubmitService = getWithdrawalReportSubmitService();
        const userSettings = await withdrawalLocalGet(['userSettings']);
        const employeeName = userSettings.userSettings?.employeeName || 'Unknown';
        const token = WITHDRAWAL_TELEGRAM_TOKEN;
        const chatId = WITHDRAWAL_TELEGRAM_CHAT_ID;

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
            const telegramImages = reportSubmitService
                ? await reportSubmitService.filesToTelegramImages(withdrawalSelectedImages)
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
                    throw new Error((response && response.error) || 'Unknown error');
                }
            }
            await saveWithdrawalToHistory(wallet); // Save to history
                showToast('تم الإرسال', 'تم إرسال تقرير السحب بنجاح', 'default');
                withdrawalResetBtn.click();
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

    trigger.innerHTML = '<span>' + (originalSelect.options[originalSelect.selectedIndex]?.text || 'اختر...') + '</span>';
    
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






