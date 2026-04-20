// =====================================================
// PROFIT TRACKER - Client Profit Analysis & Telegram
// =====================================================
// Data integrity: save-then-verify pattern with checksums
// Comparison: always last-two entries per account (FIFO)
// Auto-clear form after successful save
// =====================================================

(function () {
  'use strict';

  // --- Storage Keys ---
  const PT_STORAGE_KEY = 'profitTrackerClients';
  const PT_SETTINGS_KEY = 'profitTrackerSettings';

  // --- Telegram Config ---
  function getPtConfig() {
    return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
  }
  const __ptConfig = getPtConfig();
  const PT_TELEGRAM_TOKEN = (__ptConfig && __ptConfig.telegram && __ptConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';

  // --- DOM Elements ---
  const ptAccountInput = document.getElementById('pt-account');
  const ptAccountTypeInput = document.getElementById('pt-account-type');
  const ptEmailInput = document.getElementById('pt-email');
  const ptIpInput = document.getElementById('pt-ip');
  const ptCountryInput = document.getElementById('pt-country');
  const ptFloatingLossInput = document.getElementById('pt-floating-loss');
  const ptTotalProfitInput = document.getElementById('pt-total-profit');
  const ptWeeklyProfitInput = document.getElementById('pt-weekly-profit');
  const ptSubmitBtn = document.getElementById('pt-submit-btn');
  const ptSendTelegramBtn = document.getElementById('pt-send-telegram-btn');
  const ptResetBtn = document.getElementById('pt-reset-btn');
  const ptAnalysisResult = document.getElementById('pt-analysis-result');
  const ptAnalysisContent = document.getElementById('pt-analysis-content');
  const ptAnalysisTimeDiff = document.getElementById('pt-analysis-time-diff');
  const ptHistorySection = document.getElementById('pt-history-section');
  const ptHistoryList = document.getElementById('pt-history-list');
  const ptHistoryBtn = document.getElementById('profit-tracker-history-btn');
  const ptSettingsBtn = document.getElementById('profit-tracker-settings-btn');
  const ptSettingsModal = document.getElementById('profit-tracker-settings-modal');
  const ptSettingsClose = document.getElementById('pt-settings-close');
  const ptChatIdInput = document.getElementById('pt-telegram-chat-id');
  const ptSaveSettingsBtn = document.getElementById('pt-save-settings-btn');

  // --- State ---
  let lastAnalysisMessage = '';
  let lastAnalysisAccountNumber = '';
  let ptIpLookupTimer = null;
  let ptIpLookupSeq = 0;
  let ptCountryReadonlyHintShown = false;
  let ptAccountTypingTimer = null;

  function getPtIpGeoService() {
    return typeof getIpGeoService === 'function' ? getIpGeoService() : (window.IPGeoService || null);
  }

  // =====================================================
  // HELPERS - Number Parsing & Formatting
  // =====================================================

  /**
   * Parse a numeric value from any format.
   * Handles: "-2656", "-2,656$", "$16,985", "16985$", "+1369", etc.
   * Returns NaN only if input is truly empty/null.
   */
  function parseNumber(val) {
    if (val === null || val === undefined || String(val).trim() === '') return NaN;
    // Remove everything except digits, dot, minus, plus
    const cleaned = String(val).replace(/[^0-9.\-+]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '+') return NaN;
    const result = parseFloat(cleaned);
    return result;
  }

  function isValidNumber(val) {
    return !isNaN(parseNumber(val));
  }

  function formatMoney(val) {
    const num = typeof val === 'number' ? val : parseNumber(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatTimeDiff(ms) {
    if (ms < 0) ms = Math.abs(ms);
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (parts.length === 0) parts.push(`${seconds} ثانية`);
    return parts.join(' و ');
  }

  function getChangeIcon(diff) {
    if (diff > 0) return '📈';
    if (diff < 0) return '📉';
    return '➡️';
  }

  function getChangeColor(diff) {
    if (diff === 0) return '#a0aec0';
    return diff > 0 ? '#10b981' : '#ef4444';
  }

  function getChangeLabel(diff) {
    if (diff > 0) return `+${formatMoney(diff)}$`;
    if (diff < 0) return `${formatMoney(diff)}$`;
    return 'بدون تغيير';
  }

  function isPtAccountNumberValid(rawValue) {
    return /^\d{6,7}$/.test((rawValue || '').trim());
  }

  function applyPtFieldCompletionState(el) {
    if (el && typeof applyFieldCompletionState === 'function') {
      applyFieldCompletionState(el);
    }
  }

  function focusPtElement(targetEl) {
    if (!targetEl) return;

    try {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_err) {
      // Ignore scroll errors and continue with focus.
    }

    setTimeout(() => {
      try {
        targetEl.focus({ preventScroll: true });
      } catch (_focusErr) {
        targetEl.focus();
      }
    }, 140);
  }

  function setupPtAutoAdvance() {
    const fieldOrder = [
      ptAccountInput,
      ptAccountTypeInput,
      ptEmailInput,
      ptIpInput,
      ptFloatingLossInput,
      ptTotalProfitInput,
      ptWeeklyProfitInput,
      ptSubmitBtn
    ].filter(Boolean);

    for (let i = 0; i < fieldOrder.length - 1; i += 1) {
      const currentEl = fieldOrder[i];
      const nextEl = fieldOrder[i + 1];

      const goNext = (forceMove) => {
        const currentValue = (currentEl && 'value' in currentEl ? currentEl.value : '') || '';
        if (!forceMove && !String(currentValue).trim()) return;
        focusPtElement(nextEl);
      };

      currentEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        goNext(true);
      });

      if (currentEl !== ptAccountInput) {
        currentEl.addEventListener('change', () => {
          goNext(false);
        });
      }
    }
  }

  function setupPtAccountAutoAdvance() {
    if (!ptAccountInput) return;

    const nextEl = ptAccountTypeInput || ptEmailInput || ptIpInput || ptFloatingLossInput || ptSubmitBtn;
    if (!nextEl) return;

    const scheduleAdvance = () => {
      if (ptAccountTypingTimer) clearTimeout(ptAccountTypingTimer);

      if (!isPtAccountNumberValid(ptAccountInput.value)) {
        return;
      }

      ptAccountTypingTimer = setTimeout(() => {
        if (!isPtAccountNumberValid(ptAccountInput.value)) return;
        if (document.activeElement !== ptAccountInput) return;
        focusPtElement(nextEl);
      }, 420);
    };

    ptAccountInput.addEventListener('input', () => {
      const digitsOnly = (ptAccountInput.value || '').replace(/\D/g, '').slice(0, 7);
      if (ptAccountInput.value !== digitsOnly) {
        ptAccountInput.value = digitsOnly;
      }
      scheduleAdvance();
    });

    ptAccountInput.addEventListener('blur', () => {
      if (ptAccountTypingTimer) {
        clearTimeout(ptAccountTypingTimer);
        ptAccountTypingTimer = null;
      }
    });
  }

  function normalizePtIp(rawIp) {
    const value = (rawIp || '').trim();
    if (!value) return '';

    const ipGeoService = getPtIpGeoService();
    if (ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function') {
      const normalized = ipGeoService.normalizeIPv4(value);
      if (normalized) return normalized;
    }

    const extracted = value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return extracted && extracted[0] ? extracted[0] : '';
  }

  async function fetchPtCountryFromIp(rawIp, options = {}) {
    if (!ptCountryInput) return false;

    const normalizedIp = normalizePtIp(rawIp);
    if (!normalizedIp) return false;

    if (ptIpInput && ptIpInput.value.trim() !== normalizedIp) {
      ptIpInput.value = normalizedIp;
    }

    const currentSeq = ++ptIpLookupSeq;
    const ipGeoService = getPtIpGeoService();

    ptCountryInput.value = 'جاري البحث...';
    applyPtFieldCompletionState(ptCountryInput);

    try {
      const lookupResult = ipGeoService
        ? await ipGeoService.lookupCountryDisplay(normalizedIp, { fallback: 'Unknown' })
        : { success: false, country: 'Unknown', error: 'IPGeoService unavailable' };

      if (currentSeq !== ptIpLookupSeq) return false;

      if (lookupResult.success) {
        ptCountryInput.value = lookupResult.country || 'Unknown';
        applyPtFieldCompletionState(ptCountryInput);
        return !!lookupResult.resolved;
      }

      ptCountryInput.value = lookupResult.country || 'Unknown';
      applyPtFieldCompletionState(ptCountryInput);

      if (!options.silent) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP', 'warning');
      }
      return false;
    } catch (error) {
      if (currentSeq !== ptIpLookupSeq) return false;
      ptCountryInput.value = 'Error';
      applyPtFieldCompletionState(ptCountryInput);

      if (!options.silent) {
        showToast('خطأ', 'حدث خطأ أثناء جلب الدولة من الـ IP', 'warning');
      }
      return false;
    }
  }

  // =====================================================
  // STORAGE - Save / Load with Verification
  // =====================================================

  async function loadClients() {
    return new Promise((resolve) => {
      chrome.storage.local.get(PT_STORAGE_KEY, (data) => {
        const raw = data[PT_STORAGE_KEY];
        // Defensive: ensure we always get an object
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          resolve(raw);
        } else {
          resolve({});
        }
      });
    });
  }

  /**
   * Save clients with VERIFY-AFTER-WRITE pattern.
   * After writing, reads back and verifies the specific account data.
   * Returns { success: boolean, error?: string }
   */
  async function saveClientsVerified(clients, accountToVerify) {
    // 1. Write
    await new Promise((resolve) => {
      chrome.storage.local.set({ [PT_STORAGE_KEY]: clients }, resolve);
    });

    // 2. Read back and verify the specific account
    const readBack = await loadClients();

    // Check that the account exists in saved data
    if (!readBack[accountToVerify]) {
      console.error('[ProfitTracker] VERIFY FAIL: account not found after save:', accountToVerify);
      return { success: false, error: 'فشل التحقق: الحساب غير موجود بعد الحفظ!' };
    }

    // Check that the number of entries matches
    const expectedCount = clients[accountToVerify].length;
    const actualCount = readBack[accountToVerify].length;
    if (expectedCount !== actualCount) {
      console.error(`[ProfitTracker] VERIFY FAIL: entry count mismatch. Expected ${expectedCount}, got ${actualCount}`);
      return { success: false, error: 'فشل التحقق: عدد التسجيلات غير مطابق!' };
    }

    // Verify the last entry's critical fields match
    const expectedLast = clients[accountToVerify][expectedCount - 1];
    const actualLast = readBack[accountToVerify][actualCount - 1];

    if (expectedLast.account !== actualLast.account ||
        expectedLast.floatingLoss !== actualLast.floatingLoss ||
        expectedLast.totalProfit !== actualLast.totalProfit ||
        expectedLast.weeklyProfit !== actualLast.weeklyProfit ||
        expectedLast.timestamp !== actualLast.timestamp) {
      console.error('[ProfitTracker] VERIFY FAIL: last entry data mismatch');
      console.error('[ProfitTracker] Expected:', JSON.stringify(expectedLast));
      console.error('[ProfitTracker] Got:', JSON.stringify(actualLast));
      return { success: false, error: 'فشل التحقق: البيانات المحفوظة غير مطابقة!' };
    }

    return { success: true };
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(PT_SETTINGS_KEY, (data) => {
        resolve(data[PT_SETTINGS_KEY] || {});
      });
    });
  }

  async function saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [PT_SETTINGS_KEY]: settings }, resolve);
    });
  }

  // =====================================================
  // ENTRY CREATION - Build a clean, validated entry
  // =====================================================

  /**
   * Creates a validated entry object from the form inputs.
   * Returns { entry, errors } where errors is an array of error messages.
   */
  function buildEntryFromForm() {
    const errors = [];

    const account = (ptAccountInput.value || '').trim();
    if (!account) {
      errors.push('رقم الحساب مطلوب');
    } else if (!isPtAccountNumberValid(account)) {
      errors.push('رقم الحساب لازم يكون 6 أو 7 أرقام فقط');
    }

    const floatingRaw = ptFloatingLossInput.value;
    const totalRaw = ptTotalProfitInput.value;
    const weeklyRaw = ptWeeklyProfitInput.value;

    // At least one number field must have a value
    const hasFloating = floatingRaw && String(floatingRaw).trim() !== '';
    const hasTotal = totalRaw && String(totalRaw).trim() !== '';
    const hasWeekly = weeklyRaw && String(weeklyRaw).trim() !== '';

    if (!hasFloating && !hasTotal && !hasWeekly) {
      errors.push('أدخل قيمة واحدة على الأقل (صفقات عائمة / أرباح كلية / أرباح أسبوعية)');
    }

    // Validate numbers if provided
    if (hasFloating && !isValidNumber(floatingRaw)) {
      errors.push('قيمة الصفقات العائمة غير صالحة');
    }
    if (hasTotal && !isValidNumber(totalRaw)) {
      errors.push('قيمة الأرباح الكلية غير صالحة');
    }
    if (hasWeekly && !isValidNumber(weeklyRaw)) {
      errors.push('قيمة الأرباح الأسبوعية غير صالحة');
    }

    if (errors.length > 0) {
      return { entry: null, errors };
    }

    const entry = {
      account: account,
      accountType: (ptAccountTypeInput.value || '').trim(),
      email: (ptEmailInput.value || '').trim(),
      ip: (ptIpInput.value || '').trim(),
      country: (ptCountryInput.value || '').trim(),
      floatingLoss: hasFloating ? parseNumber(floatingRaw) : 0,
      totalProfit: hasTotal ? parseNumber(totalRaw) : 0,
      weeklyProfit: hasWeekly ? parseNumber(weeklyRaw) : 0,
      timestamp: Date.now()
    };

    return { entry, errors: [] };
  }

  // =====================================================
  // FORM CLEAR - Reset all fields after save
  // =====================================================

  function clearForm() {
    ptAccountInput.value = '';
    ptAccountTypeInput.value = '';
    ptEmailInput.value = '';
    ptIpInput.value = '';
    ptCountryInput.value = '';
    ptFloatingLossInput.value = '';
    ptTotalProfitInput.value = '';
    ptWeeklyProfitInput.value = '';
    ptAccountInput.focus();
  }

  // =====================================================
  // ANALYSIS LOGIC
  // =====================================================

  function analyzeChanges(prevEntry, currentEntry) {
    const timeDiff = currentEntry.timestamp - prevEntry.timestamp;

    const floatingDiff = currentEntry.floatingLoss - prevEntry.floatingLoss;
    const totalProfitDiff = currentEntry.totalProfit - prevEntry.totalProfit;
    const weeklyProfitDiff = currentEntry.weeklyProfit - prevEntry.weeklyProfit;

    // Safe percent change calculation
    function safePercent(diff, base) {
      if (base === 0) return '0.0';
      return ((diff / Math.abs(base)) * 100).toFixed(1);
    }

    return {
      timeDiff,
      timeFormatted: formatTimeDiff(timeDiff),
      prevTimestamp: prevEntry.timestamp,
      currentTimestamp: currentEntry.timestamp,
      floating: {
        prev: prevEntry.floatingLoss,
        current: currentEntry.floatingLoss,
        diff: floatingDiff,
        percentChange: safePercent(floatingDiff, prevEntry.floatingLoss)
      },
      totalProfit: {
        prev: prevEntry.totalProfit,
        current: currentEntry.totalProfit,
        diff: totalProfitDiff,
        percentChange: safePercent(totalProfitDiff, prevEntry.totalProfit)
      },
      weeklyProfit: {
        prev: prevEntry.weeklyProfit,
        current: currentEntry.weeklyProfit,
        diff: weeklyProfitDiff,
        percentChange: safePercent(weeklyProfitDiff, prevEntry.weeklyProfit)
      }
    };
  }

  function buildAnalysisHTML(analysis, accountNumber, accountType) {
    const { floating, totalProfit, weeklyProfit } = analysis;

    return `
      <div class="pt-analysis-card">
        <div class="pt-analysis-account-header">
          <span class="pt-account-badge">\u{1F3E6} ${accountNumber}</span>
          ${accountType ? `<span class="pt-account-type">${accountType}</span>` : ''}
        </div>

        <div class="pt-metric-row">
          <div class="pt-metric-label">\u{1F4C9} الصفقات العائمة الخاسرة</div>
          <div class="pt-metric-values">
            <span class="pt-prev-value">${formatMoney(floating.prev)}$</span>
            <span class="pt-arrow">\u2192</span>
            <span class="pt-curr-value">${formatMoney(floating.current)}$</span>
          </div>
          <div class="pt-metric-change" style="color: ${getChangeColor(floating.diff)}">
            ${getChangeIcon(floating.diff)} ${getChangeLabel(floating.diff)} (${floating.percentChange}%)
          </div>
        </div>

        <div class="pt-metric-row">
          <div class="pt-metric-label">\u{1F4B0} الأرباح الكلية</div>
          <div class="pt-metric-values">
            <span class="pt-prev-value">${formatMoney(totalProfit.prev)}$</span>
            <span class="pt-arrow">\u2192</span>
            <span class="pt-curr-value">${formatMoney(totalProfit.current)}$</span>
          </div>
          <div class="pt-metric-change" style="color: ${getChangeColor(totalProfit.diff)}">
            ${getChangeIcon(totalProfit.diff)} ${getChangeLabel(totalProfit.diff)} (${totalProfit.percentChange}%)
          </div>
        </div>

        <div class="pt-metric-row">
          <div class="pt-metric-label">\u{1F4CA} أرباح هذا الأسبوع</div>
          <div class="pt-metric-values">
            <span class="pt-prev-value">${formatMoney(weeklyProfit.prev)}$</span>
            <span class="pt-arrow">\u2192</span>
            <span class="pt-curr-value">${formatMoney(weeklyProfit.current)}$</span>
          </div>
          <div class="pt-metric-change" style="color: ${getChangeColor(weeklyProfit.diff)}">
            ${getChangeIcon(weeklyProfit.diff)} ${getChangeLabel(weeklyProfit.diff)} (${weeklyProfit.percentChange}%)
          </div>
        </div>

        <div class="pt-timestamps-footer">
          <div>\u{1F552} التسجيل السابق: ${new Date(analysis.prevTimestamp).toLocaleString('ar-EG')}</div>
          <div>\u{1F552} التسجيل الحالي: ${new Date(analysis.currentTimestamp).toLocaleString('ar-EG')}</div>
        </div>
      </div>
    `;
  }

  function buildTelegramMessage(analysis, entry, prevEntry) {
    const { floating, totalProfit, weeklyProfit } = analysis;

    const buildDiffLine = (metric) => {
      const diffText = `${getChangeLabel(metric.diff)} (${metric.percentChange}%)`;
      if (metric.diff > 0) return `⬆️ الفرق: ${diffText}`;
      if (metric.diff < 0) return `⬇️ الفرق: ${diffText}`;
      return `الفرق: ${diffText}`;
    };

    const accountLine = entry.accountType
      ? `الحساب: ${entry.account} | ${entry.accountType}`
      : `الحساب: ${entry.account}`;

    let ipCountryLine = '';
    if (entry.ip && entry.country) {
      ipCountryLine = `IP: ${entry.ip} - ${entry.country}`;
    } else if (entry.ip) {
      ipCountryLine = `IP: ${entry.ip}`;
    } else if (entry.country) {
      ipCountryLine = `IP: غير متوفر - ${entry.country}`;
    }

    let msg = `تحليل\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `${accountLine}\n`;
    if (entry.email) msg += `الإيميل: ${entry.email}\n`;
    if (ipCountryLine) msg += `${ipCountryLine}\n`;
    msg += `الفرق الزمني: ${analysis.timeFormatted}\n\n`;

    msg += `━━━  الصفقات العائمة الخاسرة ━━━\n`;
    msg += `السابق: ${formatMoney(floating.prev)}$ - الحالي: ${formatMoney(floating.current)}$\n\n`;
    msg += `${buildDiffLine(floating)}\n\n`;

    msg += `━━━ 💰 الأرباح الكلية ━━━\n`;
    msg += `السابق: ${formatMoney(totalProfit.prev)}$ - الحالي: ${formatMoney(totalProfit.current)}$\n\n`;
    msg += `${buildDiffLine(totalProfit)}\n\n`;

    msg += `━━━ 📊 أرباح الأسبوع ━━━\n`;
    msg += `السابق: ${formatMoney(weeklyProfit.prev)}$ - الحالي: ${formatMoney(weeklyProfit.current)}$\n\n`;
    msg += `${buildDiffLine(weeklyProfit)}`;

    return msg;
  }

  // =====================================================
  // SUBMIT LOGIC - Save + Verify + Analyze + Clear
  // =====================================================

  let isSubmitting = false; // Prevent double-clicks

  async function handleSubmit() {
    // Prevent double-click
    if (isSubmitting) return;
    isSubmitting = true;
    ptSubmitBtn.disabled = true;
    ptSubmitBtn.textContent = '\u23F3 جاري الحفظ...';

    try {
      // 1. Build and validate entry from form
      const { entry, errors } = buildEntryFromForm();

      if (errors.length > 0) {
        showToast('بيانات ناقصة', errors.join('\n'), 'warning');
        if (!entry) {
          // Focus first empty required field
          if (!(ptAccountInput.value || '').trim()) ptAccountInput.focus();
          else ptFloatingLossInput.focus();
        }
        return;
      }

      // 2. Load current clients data
      const clients = await loadClients();
      const account = entry.account;

      // 3. Initialize account array if new
      if (!clients[account]) {
        clients[account] = [];
      }

      // 4. Check for duplicate entry (same account submitted within 2 seconds)
      const existingEntries = clients[account];
      if (existingEntries.length > 0) {
        const lastEntry = existingEntries[existingEntries.length - 1];
        const timeSinceLastMs = entry.timestamp - lastEntry.timestamp;
        if (timeSinceLastMs < 2000 &&
            lastEntry.floatingLoss === entry.floatingLoss &&
            lastEntry.totalProfit === entry.totalProfit &&
            lastEntry.weeklyProfit === entry.weeklyProfit) {
          showToast('تكرار', 'هذه البيانات مسجلة بالفعل (نفس الأرقام خلال ثانيتين)', 'duplicate');
          return;
        }
      }

      // 5. Get previous entry BEFORE pushing new one
      const prevEntry = existingEntries.length > 0 ? existingEntries[existingEntries.length - 1] : null;

      // 6. Deep-copy the entry to avoid reference issues
      const entryCopy = JSON.parse(JSON.stringify(entry));
      clients[account].push(entryCopy);

      // 7. Save with verification
      const saveResult = await saveClientsVerified(clients, account);

      if (!saveResult.success) {
        showToast('خطأ في الحفظ', saveResult.error, 'warning');
        // Remove the entry we just pushed since save failed
        clients[account].pop();
        return;
      }

      // 8. SUCCESS - Data is verified saved. Now clear the form.
      clearForm();

      // Keep analysis area hidden in UI.
      ptAnalysisResult.style.display = 'none';
      ptSendTelegramBtn.style.display = 'none';

      // 9. If account has previous data, auto-send update to Telegram.
      if (prevEntry) {
        const analysis = analyzeChanges(prevEntry, entryCopy);

        // Store the telegram message for sending
        lastAnalysisMessage = buildTelegramMessage(analysis, entryCopy, prevEntry);
        lastAnalysisAccountNumber = account;

        const sendResult = await handleSendTelegram(lastAnalysisMessage, account, { isAutoSend: true });
        if (!sendResult || !sendResult.success) {
          showToast(
            '\u2705 تم التسجيل',
            `حساب ${account}: تم حفظ البيانات، لكن الإرسال التلقائي لم يكتمل`,
            'warning',
            6500
          );
        }
      } else {
        // First time for this account
        ptAnalysisResult.style.display = 'none';
        ptSendTelegramBtn.style.display = 'none';
        lastAnalysisMessage = '';
        lastAnalysisAccountNumber = '';

        showToast(
          '\u2705 تم التسجيل',
          `حساب ${account}: تم حفظ البيانات لأول مرة بنجاح.\nأدخل بيانات نفس الحساب لاحقاً لمقارنة التغيرات.`,
          'ip',
          6000
        );
      }

      // 10. Refresh history if visible
      if (ptHistorySection.style.display !== 'none') {
        await renderHistory();
      }

    } catch (err) {
      console.error('[ProfitTracker] Submit error:', err);
      showToast('خطأ غير متوقع', 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'warning');
    } finally {
      isSubmitting = false;
      ptSubmitBtn.disabled = false;
      ptSubmitBtn.textContent = '\u{1F4BE} تسجيل البيانات';
    }
  }

  // =====================================================
  // TELEGRAM SEND
  // =====================================================

  async function handleSendTelegram(customMessage, customAccountNumber, options = {}) {
    const messageToSend = customMessage || lastAnalysisMessage;
    const accountNumber = customAccountNumber || lastAnalysisAccountNumber;
    const isAutoSend = !!options.isAutoSend;

    if (!messageToSend) {
      showToast('لا يوجد تحليل', 'سجل بيانات العميل أولاً للحصول على تحليل', 'warning');
      return { success: false, reason: 'no-message' };
    }

    const settings = await loadSettings();
    const chatId = settings.chatId;

    if (!chatId) {
      const missingSettingsMsg = isAutoSend
        ? 'تم حفظ البيانات لكن لا يمكن الإرسال التلقائي بدون Chat ID. من فضلك حدث الإعدادات.'
        : 'من فضلك أدخل Chat ID الخاص بالجروب من الإعدادات \u2699\uFE0F';
      showToast('إعدادات ناقصة', missingSettingsMsg, 'warning', isAutoSend ? 7000 : 5000);
      if (!isAutoSend) {
        ptSettingsModal.style.display = 'flex';
      }
      return { success: false, reason: 'missing-chat-id' };
    }

    if (!isAutoSend && ptSendTelegramBtn) {
      ptSendTelegramBtn.disabled = true;
      ptSendTelegramBtn.textContent = '\u23F3 جاري الإرسال...';
    }

    try {
      const url = `https://api.telegram.org/bot${PT_TELEGRAM_TOKEN}/sendMessage`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageToSend
        })
      });

      const result = await resp.json();
      if (result.ok) {
        const successTitle = isAutoSend ? '\u2705 إرسال تلقائي' : '\u2705 تم الإرسال';
        const successMessage = isAutoSend
          ? `تم إرسال تحديث الحساب ${accountNumber} تلقائيًا إلى تليجرام`
          : `تم إرسال تحليل الحساب ${accountNumber} إلى التلجرام بنجاح`;
        showToast(successTitle, successMessage, 'ip');
        return { success: true };
      } else {
        console.error('[ProfitTracker] Telegram error:', result);
        showToast('خطأ في الإرسال', `فشل إرسال الرسالة: ${result.description || 'Unknown error'}`, 'warning');
        return { success: false, reason: 'telegram-api-failed', error: result.description || 'Unknown error' };
      }
    } catch (err) {
      console.error('[ProfitTracker] Telegram send failed:', err);
      showToast('خطأ في الإرسال', 'فشل الاتصال بـ Telegram. تأكد من الاتصال بالإنترنت.', 'warning');
      return { success: false, reason: 'network-error', error: err && err.message ? err.message : String(err) };
    } finally {
      if (!isAutoSend && ptSendTelegramBtn) {
        ptSendTelegramBtn.disabled = false;
        ptSendTelegramBtn.textContent = '\u{1F4E4} إرسال التحليل';
      }
    }
  }

  // =====================================================
  // RESET (manual)
  // =====================================================

  function handleReset() {
    clearForm();
    ptAnalysisResult.style.display = 'none';
    ptSendTelegramBtn.style.display = 'none';
    lastAnalysisMessage = '';
    lastAnalysisAccountNumber = '';
  }

  // =====================================================
  // HISTORY
  // =====================================================

  async function renderHistory() {
    const clients = await loadClients();
    const accounts = Object.keys(clients);

    if (accounts.length === 0) {
      ptHistoryList.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 20px;">لا يوجد عملاء محفوظين</p>';
      return;
    }

    // Sort by latest entry timestamp (most recent first)
    accounts.sort((a, b) => {
      const entriesA = clients[a];
      const entriesB = clients[b];
      const lastA = entriesA[entriesA.length - 1];
      const lastB = entriesB[entriesB.length - 1];
      return (lastB ? lastB.timestamp : 0) - (lastA ? lastA.timestamp : 0);
    });

    let html = '';
    for (const acc of accounts) {
      const entries = clients[acc];
      if (!entries || entries.length === 0) continue;

      const latest = entries[entries.length - 1];
      const entriesCount = entries.length;

      html += `
        <div class="pt-history-item" data-account="${acc}">
          <div class="pt-history-item-header">
            <span class="pt-account-badge">\u{1F3E6} ${acc}</span>
            <span class="pt-entries-count">${entriesCount} تسجيل</span>
            <button class="pt-delete-client-btn" data-account="${acc}" title="حذف العميل">\u{1F5D1}\uFE0F</button>
          </div>
          <div class="pt-history-item-details">
            ${latest.accountType ? `<div>\u{1F4CB} ${latest.accountType}</div>` : ''}
            ${latest.email ? `<div>\u{1F4E7} ${latest.email}</div>` : ''}
            <div>\u{1F4C9} عائمة: ${formatMoney(latest.floatingLoss)}$ | \u{1F4B0} كلية: ${formatMoney(latest.totalProfit)}$ | \u{1F4CA} أسبوعية: ${formatMoney(latest.weeklyProfit)}$</div>
            <div style="font-size: 0.8em; color: #666;">آخر تحديث: ${new Date(latest.timestamp).toLocaleString('ar-EG')}</div>
          </div>
        </div>
      `;
    }

    ptHistoryList.innerHTML = html;

    // Bind delete buttons
    ptHistoryList.querySelectorAll('.pt-delete-client-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const accountToDelete = btn.getAttribute('data-account');
        if (confirm(`هل أنت متأكد من حذف جميع بيانات الحساب ${accountToDelete}؟ (${clients[accountToDelete].length} تسجيل)`)) {
          const allClients = await loadClients();
          delete allClients[accountToDelete];
          // For delete, verify by checking that the account key no longer exists
          await new Promise((resolve) => {
            chrome.storage.local.set({ [PT_STORAGE_KEY]: allClients }, resolve);
          });
          const verifyDelete = await loadClients();
          const result = { success: !verifyDelete[accountToDelete] };
          if (result.success) {
            await renderHistory();
            showToast('تم الحذف', `تم حذف جميع بيانات الحساب ${accountToDelete} بنجاح`, 'duplicate');
          } else {
            showToast('خطأ', 'فشل حذف البيانات. حاول مرة أخرى.', 'warning');
          }
        }
      });
    });

    // Bind click to load account data into form
    ptHistoryList.querySelectorAll('.pt-history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.pt-delete-client-btn')) return;
        const acc = item.getAttribute('data-account');
        const entries = clients[acc];
        if (!entries || entries.length === 0) return;

        const latest = entries[entries.length - 1];

        // Fill info fields from latest entry
        ptAccountInput.value = latest.account || acc;
        ptAccountTypeInput.value = latest.accountType || '';
        ptEmailInput.value = latest.email || '';
        ptIpInput.value = latest.ip || '';
        ptCountryInput.value = latest.country || '';

        // Clear number fields - user must enter fresh values
        ptFloatingLossInput.value = '';
        ptTotalProfitInput.value = '';
        ptWeeklyProfitInput.value = '';

        // Hide history and analysis
        ptHistorySection.style.display = 'none';
        ptAnalysisResult.style.display = 'none';
        ptSendTelegramBtn.style.display = 'none';

        ptFloatingLossInput.focus();
        showToast(
          'تم تحميل الحساب',
          `${acc}: أدخل الأرقام الجديدة واضغط "تسجيل البيانات"`,
          'ip'
        );
      });
    });
  }

  // =====================================================
  // SETTINGS
  // =====================================================

  async function initSettings() {
    const settings = await loadSettings();
    if (ptChatIdInput && settings.chatId) {
      ptChatIdInput.value = settings.chatId;
    }
  }

  // =====================================================
  // EVENT BINDINGS
  // =====================================================

  if (ptSubmitBtn) {
    ptSubmitBtn.addEventListener('click', handleSubmit);
  }

  if (ptSendTelegramBtn) {
    ptSendTelegramBtn.addEventListener('click', () => {
      void handleSendTelegram();
    });
  }

  if (ptResetBtn) {
    ptResetBtn.addEventListener('click', handleReset);
  }

  if (ptHistoryBtn) {
    ptHistoryBtn.addEventListener('click', () => {
      if (ptHistorySection.style.display === 'none') {
        ptHistorySection.style.display = 'block';
        renderHistory();
      } else {
        ptHistorySection.style.display = 'none';
      }
    });
  }

  // Settings Modal
  if (ptSettingsBtn) {
    ptSettingsBtn.addEventListener('click', () => {
      ptSettingsModal.style.display = 'flex';
      initSettings();
    });
  }

  if (ptSettingsClose) {
    ptSettingsClose.addEventListener('click', () => {
      ptSettingsModal.style.display = 'none';
    });
  }

  if (ptSaveSettingsBtn) {
    ptSaveSettingsBtn.addEventListener('click', async () => {
      const chatId = (ptChatIdInput.value || '').trim();
      if (!chatId) {
        showToast('خطأ', 'من فضلك أدخل Chat ID', 'warning');
        return;
      }
      await saveSettings({ chatId });
      ptSettingsModal.style.display = 'none';
      showToast('\u2705 تم الحفظ', 'تم حفظ إعدادات Profit Tracker بنجاح', 'ip');
    });
  }

  if (ptCountryInput) {
    ptCountryInput.readOnly = true;
    ptCountryInput.classList.add('readonly-input');
    ptCountryInput.setAttribute('aria-readonly', 'true');
    ptCountryInput.setAttribute('title', 'الدولة تتحدد تلقائيًا من الـ IP ولا يمكن الكتابة فيها');

    ptCountryInput.addEventListener('focus', () => {
      if (ptCountryReadonlyHintShown) return;
      ptCountryReadonlyHintShown = true;
      showToast('معلومة', 'حقل الدولة يتعبى تلقائيًا من الـ IP ولا يمكن الكتابة فيه', 'warning', 3500);
    });
  }

  setupPtAutoAdvance();
  setupPtAccountAutoAdvance();

  if (ptIpInput && ptCountryInput) {
    ptIpInput.addEventListener('input', () => {
      if (ptIpLookupTimer) clearTimeout(ptIpLookupTimer);

      const rawIp = (ptIpInput.value || '').trim();
      if (!rawIp) {
        ptCountryInput.value = '';
        applyPtFieldCompletionState(ptCountryInput);
        return;
      }

      ptIpLookupTimer = setTimeout(() => {
        void fetchPtCountryFromIp(rawIp, { silent: true });
      }, 420);
    });

    ptIpInput.addEventListener('blur', () => {
      if (ptIpLookupTimer) clearTimeout(ptIpLookupTimer);
      void fetchPtCountryFromIp(ptIpInput.value, { silent: true });
    });

    ptIpInput.addEventListener('paste', () => {
      if (ptIpLookupTimer) clearTimeout(ptIpLookupTimer);
      setTimeout(() => {
        void fetchPtCountryFromIp(ptIpInput.value, { silent: true });
      }, 20);
    });
  }

  // Close modal on outside click
  if (ptSettingsModal) {
    ptSettingsModal.addEventListener('click', (e) => {
      if (e.target === ptSettingsModal) {
        ptSettingsModal.style.display = 'none';
      }
    });
  }

  // Register tab initializer
  if (typeof window.registerTabInitializer === 'function') {
    window.registerTabInitializer('profit-tracker', () => {
      initSettings();
    });
  }

})();
