document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const clearHistoryToggle = document.getElementById('clear-history-toggle');
  const clearHistoryDays = document.getElementById('clear-history-days');
  const maxAccounts = document.getElementById('max-accounts');
  const timestampFormat = document.getElementById('timestamp-format');
  // Options page filter controls and counter
  const resultCounter = document.getElementById('result-counter');
  const optAccStatus = document.getElementById('opt-acc-status');
  const optAccDate = document.getElementById('opt-acc-date');
  const optIpStatus = document.getElementById('opt-ip-status');
  const optIpDate = document.getElementById('opt-ip-date');
  const optClearFilters = document.getElementById('opt-clear-filters');
  // Preferences
  const tooltipsToggle = document.getElementById('tooltips-toggle');
  const alertSoundText = document.getElementById('alert-sound-text');
  const globalEmployeeSelect = document.getElementById('global-employee-select');
  const saveGlobalEmployeeBtn = document.getElementById('save-global-employee');
  const globalEmployeeStatus = document.getElementById('global-employee-status');
  const initialEmployeeOverlay = document.getElementById('initial-employee-overlay');
  const initialEmployeeSelect = document.getElementById('initial-employee-select');
  const initialEmployeeSave = document.getElementById('initial-employee-save');
  const initialEmployeeError = document.getElementById('initial-employee-error');
  // Onboarding elements
  const onboardingOverlay = document.getElementById('onboarding-overlay');
  const onboardingNext = document.getElementById('onboarding-next');
  const onboardingTry = document.getElementById('onboarding-try');
  const onboardingSkip = document.getElementById('onboarding-skip');
  const onboardingPrev = document.getElementById('onboarding-prev');
  const onboardingClose = document.getElementById('onb-close');
  const onbStepTitle = document.getElementById('onb-step-title');
  const onbStepDesc = document.getElementById('onb-step-desc');
  const onbDots = document.querySelectorAll('.onb-dot');
  const onbProgressFill = document.querySelector('.onb-progress-fill');
  const reopenOnboarding = document.getElementById('reopen-onboarding');
  const employeeDirectory = window.EmployeeDirectory;
  let onboardingStep = 1;
  let shouldShowOnboardingAfterSetup = false;
  let shouldShowOnboardingStep = 1;
  let employeeSetupRequired = false;
  let employeeNameLocked = false;

  function populateEmployeeSelect(selectEl) {
    if (!selectEl || !employeeDirectory) return;
    employeeDirectory.populateEmployeeSelect(selectEl);
  }

  function ensureEmployeeOption(selectEl, name) {
    if (!selectEl || !name || !employeeDirectory) return;
    employeeDirectory.ensureEmployeeOption(selectEl, name);
  }

  function applyEmployeeLockState() {
    const locked = !!employeeNameLocked;
    if (globalEmployeeSelect) globalEmployeeSelect.disabled = locked;
    if (saveGlobalEmployeeBtn) saveGlobalEmployeeBtn.disabled = locked;
  }

  function setGlobalEmployeeStatus(message, color = '#166534') {
    if (!globalEmployeeStatus) return;
    globalEmployeeStatus.textContent = message || '';
    globalEmployeeStatus.style.color = color;
  }

  function setInitialEmployeeError(message) {
    if (!initialEmployeeError) return;
    initialEmployeeError.textContent = message || '';
  }

  function showInitialEmployeeOverlay() {
    if (!initialEmployeeOverlay) return;
    initialEmployeeOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setInitialEmployeeError('');
    setTimeout(() => {
      if (initialEmployeeSelect) initialEmployeeSelect.focus();
    }, 50);
  }

  function hideInitialEmployeeOverlay() {
    if (!initialEmployeeOverlay) return;
    initialEmployeeOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function persistEmployeeName(name, onDone, allowOverwrite = false) {
    const normalizedName = employeeDirectory ? employeeDirectory.normalizeEmployeeName(name) : (name || '').trim();
    if (!normalizedName) {
      if (typeof onDone === 'function') onDone(false, '');
      return;
    }

    chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (localData) => {
      const existingName = employeeDirectory ? employeeDirectory.normalizeEmployeeName(
        (localData?.userSettings?.employeeName || '').trim() ||
        (localData?.creditOutEmployeeName || '').trim()
      ) : (
        (localData?.userSettings?.employeeName || '').trim() ||
        (localData?.creditOutEmployeeName || '').trim()
      );
      if (existingName && !allowOverwrite) {
        if (typeof onDone === 'function') onDone(false, existingName);
        return;
      }

      const nextUserSettings = {
        ...(localData.userSettings || {}),
        employeeName: normalizedName
      };

      chrome.storage.local.set({
        userSettings: nextUserSettings,
        creditOutEmployeeName: normalizedName
      }, () => {
        ensureEmployeeOption(globalEmployeeSelect, normalizedName);
        ensureEmployeeOption(initialEmployeeSelect, normalizedName);
        if (globalEmployeeSelect) globalEmployeeSelect.value = normalizedName;
        if (initialEmployeeSelect) initialEmployeeSelect.value = normalizedName;
        if (typeof onDone === 'function') onDone(true, normalizedName);
      });
    });
  }

  function maybeShowOnboardingAfterEmployeeSetup() {
    if (employeeSetupRequired) return;
    if (!shouldShowOnboardingAfterSetup) return;
    onboardingStep = shouldShowOnboardingStep || 1;
    shouldShowOnboardingAfterSetup = false;
    showOnboarding();
  }
  const onboardingSteps = [
    {
      title: '🔍 ماذا تفعل الإضافة؟',
      desc: 'تقوم إضافة متتبع الحسابات بمراقبة النصوص التي تقوم بنسخها في المتصفح. إذا كان النص المُنسوخ يحتوي على رقم حساب مكون من 7 أرقام (مثل 1234567) أو عنوان IP (مثل 192.168.1.1)، فإن الإضافة تسجله تلقائيًا وتعرضه في الشريط الجانبي للمتصفح. هذا يساعدك في تتبع الحسابات والعناوين التي تقابلها أثناء تصفحك.'
    },
    {
      title: '⚙️ الإعدادات الأساسية',
      desc: 'في هذا القسم، يمكنك تخصيص الإضافة حسب احتياجاتك. فعّل الوضع الداكن لتوفير الطاقة وتقليل الإجهاد البصري على عينيك. حدد الحد الأقصى لعدد الحسابات المعروضة لتجنب الازدحام، مثل 50 حسابًا كحد أقصى. كما يمكنك اختيار تنسيق عرض الوقت والتاريخ، سواء كان افتراضيًا أو قصيرًا أو طويلًا، أو حتى إخفائه تمامًا.'
    },
    {
      title: '🔧 فلاتر البيانات',
      desc: 'استخدم فلاتر البيانات لتنظيم المعلومات المعروضة. يمكنك تصفية الحسابات حسب حالتها: المثبّتة (التي قمت بتثبيتها)، المكررة (التي تظهر أكثر من مرة)، أو تلك التي تحتوي على ملاحظات. كذلك، يمكنك تصفية حسب الزمن: كل الوقت، اليوم، آخر 24 ساعة، أو آخر 7 أيام. نفس الشيء ينطبق على عناوين IP. هذا يجعل البحث أسرع وأكثر كفاءة.'
    },
    {
      title: '🛠️ التفضيلات والأدوات',
      desc: 'فعّل التلميحات (Tooltips) للحصول على مساعدة سريعة عند التمرير فوق العناصر في الواجهة. كما توجد أداة بحث عن IP تسمح لك بإدخال عنوان IP والبحث عن معلومات إضافية حوله، مثل الموقع الجغرافي أو مزود الخدمة. هذه الأدوات تجعل الإضافة أكثر قوة ومرونة.'
    },
    {
      title: '⚡ الميزات السريعة',
      desc: 'استمتع بالميزات السريعة لإدارة الحسابات بسهولة. انقر على أيقونة النجمة لتثبيت حساب مهم، مما يضمن ظهوره دائمًا في الأعلى. أضف ملاحظات مخصصة للحسابات لتذكر التفاصيل المهمة. وبالنقر على أي حساب أو IP، يمكنك عرض السجل الكامل له، بما في ذلك التواريخ والأوقات التي تم تسجيله فيها. كل هذا بنقرة واحدة!'
    },
    {
      title: '🎉 جاهز للبدء!',
      desc: 'تهانينا! لقد أكملت الجولة التعريفية. الآن يمكنك البدء في استخدام الإضافة. جرب نسخ رقم حساب أو عنوان IP لترى كيف تعمل. إذا كان لديك أي أسئلة، يمكنك إعادة عرض هذه الجولة في أي وقت من خلال الزر أدناه. استمتع بتجربة تصفح أكثر أمانًا وكفاءة!'
    }
  ];

  populateEmployeeSelect(globalEmployeeSelect);
  populateEmployeeSelect(initialEmployeeSelect);

  // Function to apply dark mode to options page
  function applyDarkModeToOptions(isDarkMode) {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // Load saved settings
  chrome.storage.sync.get(['darkMode', 'clearHistoryEnabled', 'clearHistoryDays', 'maxAccounts', 'timestampFormat', 'filters', 'tooltipsEnabled', 'onboardingCompleted', 'onboardingStep', 'alertSoundText'], (data) => {
    darkModeToggle.checked = data.darkMode !== false;
    applyDarkModeToOptions(darkModeToggle.checked);

    clearHistoryToggle.checked = data.clearHistoryEnabled || false;
    clearHistoryDays.value = data.clearHistoryDays || 30;
    maxAccounts.value = data.maxAccounts || 50;
    timestampFormat.value = data.timestampFormat || 'locale';

    clearHistoryDays.disabled = !clearHistoryToggle.checked;

    // Initialize options filters from storage
    const filters = data.filters || { accounts: { status: 'all', date: 'all' }, ips: { status: 'all', date: 'all' } };
    if (optAccStatus) optAccStatus.value = filters.accounts?.status || 'all';
    if (optAccDate) optAccDate.value = filters.accounts?.date || 'all';
    if (optIpStatus) optIpStatus.value = filters.ips?.status || 'all';
    if (optIpDate) optIpDate.value = filters.ips?.date || 'all';

  // Preferences
  tooltipsToggle.checked = data.tooltipsEnabled !== false; // default true

  alertSoundText.value = data.alertSoundText || '';

    // Initial compute for result counter
    computeAndRenderOptionsCounter();

    // Defer onboarding until employee setup is verified
    shouldShowOnboardingAfterSetup = !data.onboardingCompleted && !!onboardingOverlay;
    shouldShowOnboardingStep = data.onboardingStep || 1;

    chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (localData) => {
      const savedName = employeeDirectory ? employeeDirectory.normalizeEmployeeName(
        localData?.userSettings?.employeeName || localData?.creditOutEmployeeName || ''
      ) : (localData?.userSettings?.employeeName || localData?.creditOutEmployeeName || '');
      if (savedName) {
        employeeSetupRequired = false;
        employeeNameLocked = true;
        applyEmployeeLockState();
        ensureEmployeeOption(globalEmployeeSelect, savedName);
        ensureEmployeeOption(initialEmployeeSelect, savedName);
        if (globalEmployeeSelect) globalEmployeeSelect.value = savedName;
        if (initialEmployeeSelect) initialEmployeeSelect.value = savedName;
        setGlobalEmployeeStatus(`الاسم الحالي (مقفل): ${savedName}`, '#1d4ed8');
        if (!localData?.userSettings?.employeeName) {
          const nextUserSettings = {
            ...(localData.userSettings || {}),
            employeeName: savedName
          };
          chrome.storage.local.set({
            userSettings: nextUserSettings,
            creditOutEmployeeName: savedName
          });
        }
        maybeShowOnboardingAfterEmployeeSetup();
      } else {
        employeeSetupRequired = true;
        employeeNameLocked = false;
        applyEmployeeLockState();
        setGlobalEmployeeStatus('لم يتم تحديد اسم الموظف بعد.', '#b91c1c');
        showInitialEmployeeOverlay();
      }
    });
  });

  // Save settings on change
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ darkMode: darkModeToggle.checked });
    applyDarkModeToOptions(darkModeToggle.checked);
  });

  clearHistoryToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ clearHistoryEnabled: clearHistoryToggle.checked });
    clearHistoryDays.disabled = !clearHistoryToggle.checked;
  });

  clearHistoryDays.addEventListener('change', () => {
    chrome.storage.sync.set({ clearHistoryDays: parseInt(clearHistoryDays.value) });
  });

  maxAccounts.addEventListener('change', () => {
    chrome.storage.sync.set({ maxAccounts: parseInt(maxAccounts.value) });
  });

  timestampFormat.addEventListener('change', () => {
    chrome.storage.sync.set({ timestampFormat: timestampFormat.value });
  });

  alertSoundText.addEventListener('input', () => {
    chrome.storage.sync.set({ alertSoundText: alertSoundText.value });
  });

  if (saveGlobalEmployeeBtn) {
    saveGlobalEmployeeBtn.addEventListener('click', () => {
      if (employeeNameLocked) {
        setGlobalEmployeeStatus('تم قفل اسم الموظف بعد أول حفظ ولا يمكن تغييره.', '#b91c1c');
        return;
      }
      const name = employeeDirectory ? employeeDirectory.normalizeEmployeeName(
        globalEmployeeSelect && globalEmployeeSelect.value || ''
      ) : ((globalEmployeeSelect && globalEmployeeSelect.value || '').trim());
      if (!name) {
        setGlobalEmployeeStatus('اختر اسم الموظف أولاً.', '#b91c1c');
        if (globalEmployeeSelect) globalEmployeeSelect.focus();
        return;
      }

      persistEmployeeName(name, (saved, resolvedName) => {
        if (!saved) {
          employeeNameLocked = true;
          applyEmployeeLockState();
          if (globalEmployeeSelect) globalEmployeeSelect.value = resolvedName || '';
          setGlobalEmployeeStatus(`تم تعيين الاسم مسبقًا (مقفل): ${resolvedName}`, '#1d4ed8');
          return;
        }
        employeeSetupRequired = false;
        employeeNameLocked = true;
        applyEmployeeLockState();
        setGlobalEmployeeStatus(`تم حفظ اسم الموظف نهائيًا: ${name}`, '#166534');
        hideInitialEmployeeOverlay();
        maybeShowOnboardingAfterEmployeeSetup();
      });
    });
  }

  if (initialEmployeeSave) {
    initialEmployeeSave.addEventListener('click', () => {
      const name = employeeDirectory ? employeeDirectory.normalizeEmployeeName(
        initialEmployeeSelect && initialEmployeeSelect.value || ''
      ) : ((initialEmployeeSelect && initialEmployeeSelect.value || '').trim());
      if (!name) {
        setInitialEmployeeError('من فضلك اختر اسم الموظف للمتابعة.');
        if (initialEmployeeSelect) initialEmployeeSelect.focus();
        return;
      }

      persistEmployeeName(name, (saved, resolvedName) => {
        if (!saved) {
          employeeNameLocked = true;
          applyEmployeeLockState();
          setInitialEmployeeError('الاسم تم تحديده مسبقًا ولا يمكن تغييره.');
          if (globalEmployeeSelect) globalEmployeeSelect.value = resolvedName || '';
          hideInitialEmployeeOverlay();
          maybeShowOnboardingAfterEmployeeSetup();
          return;
        }
        employeeSetupRequired = false;
        employeeNameLocked = true;
        applyEmployeeLockState();
        setGlobalEmployeeStatus(`تم حفظ اسم الموظف نهائيًا: ${name}`, '#166534');
        hideInitialEmployeeOverlay();
        maybeShowOnboardingAfterEmployeeSetup();
      });
    });
  }

  if (globalEmployeeSelect) {
    globalEmployeeSelect.addEventListener('change', () => {
      setGlobalEmployeeStatus('');
    });
  }

  if (initialEmployeeSelect) {
    initialEmployeeSelect.addEventListener('change', () => {
      setInitialEmployeeError('');
    });
  }

  if (initialEmployeeOverlay) {
    initialEmployeeOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' && initialEmployeeOverlay.style.display === 'flex') {
        e.preventDefault();
        if (initialEmployeeSave) initialEmployeeSave.click();
      }
    });
  }

  // --- Options Filters Logic (Settings page) ---
  function computeAndRenderOptionsCounter() {
    if (!resultCounter) return;
    const accStatus = optAccStatus ? optAccStatus.value : 'all';
    const accDatePreset = optAccDate ? optAccDate.value : 'all';
    const ipStatus = optIpStatus ? optIpStatus.value : 'all';
    const ipDatePreset = optIpDate ? optIpDate.value : 'all';

    chrome.storage.local.get(['copiedAccounts','copiedIPs']).then((res) => {
      const accounts = res.copiedAccounts || [];
      const ips = res.copiedIPs || [];

      // Date cutoff
      const now = Date.now();
      const cutoffs = {
        'today': new Date(new Date().toDateString()).getTime(),
        '24h': now - 24*60*60*1000,
        '7d': now - 7*24*60*60*1000
      };
      const accCutoff = accDatePreset === 'all' ? 0 : (cutoffs[accDatePreset] || 0);
      const ipCutoff = ipDatePreset === 'all' ? 0 : (cutoffs[ipDatePreset] || 0);

      // Filter by date first
      const accInWindow = accCutoff ? accounts.filter(a => a.timestamp >= accCutoff) : accounts;
      const ipInWindow = ipCutoff ? ips.filter(i => i.timestamp >= ipCutoff) : ips;

      // Build maps for uniqueness
      const accMap = new Map();
      for (const a of accInWindow) {
        const prev = accMap.get(a.account) || 0;
        accMap.set(a.account, prev + 1);
      }
      const ipMap = new Map();
      for (const i of ipInWindow) {
        const prev = ipMap.get(i.ip) || 0;
        ipMap.set(i.ip, prev + 1);
      }

      let accCount = 0, ipCount = 0;
      // Accounts count per status
      if (accStatus === 'pinned') {
        // Need to know pinned per account (latest entry wins for pin)
        const latestByAcc = new Map();
        for (const a of accInWindow) {
          const prev = latestByAcc.get(a.account);
          if (!prev || a.timestamp > prev.timestamp) latestByAcc.set(a.account, a);
        }
        accCount = Array.from(latestByAcc.values()).filter(v => v.isPinned).length;
      } else if (accStatus === 'duplicate') {
        accCount = Array.from(accMap.values()).filter(c => c > 1).length;
      } else if (accStatus === 'noted') {
        const latestByAcc = new Map();
        for (const a of accInWindow) {
          const prev = latestByAcc.get(a.account);
          if (!prev || a.timestamp > prev.timestamp) latestByAcc.set(a.account, a);
        }
        accCount = Array.from(latestByAcc.values()).filter(v => (v.notes||'').trim().length>0).length;
      } else {
        accCount = accMap.size;
      }

      // IPs count per status
      if (ipStatus === 'duplicate') {
        ipCount = Array.from(ipMap.values()).filter(c => c > 1).length;
      } else {
        ipCount = ipMap.size;
      }

      resultCounter.textContent = `النتائج بعد الفلترة — الحسابات: ${accCount} | عناوين IP: ${ipCount}`;
    });
  }
  function persistFilters() {
    const filters = {
      accounts: { status: optAccStatus?.value || 'all', date: optAccDate?.value || 'all' },
      ips: { status: optIpStatus?.value || 'all', date: optIpDate?.value || 'all' },
    };
    chrome.storage.sync.set({ filters });
  }

  if (optAccStatus) optAccStatus.addEventListener('change', () => { persistFilters(); computeAndRenderOptionsCounter(); });
  if (optAccDate) optAccDate.addEventListener('change', () => { persistFilters(); computeAndRenderOptionsCounter(); });
  if (optIpStatus) optIpStatus.addEventListener('change', () => { persistFilters(); computeAndRenderOptionsCounter(); });
  if (optIpDate) optIpDate.addEventListener('change', () => { persistFilters(); computeAndRenderOptionsCounter(); });
  if (optClearFilters) {
    optClearFilters.addEventListener('click', () => {
      if (optAccStatus) optAccStatus.value = 'all';
      if (optAccDate) optAccDate.value = 'all';
      if (optIpStatus) optIpStatus.value = 'all';
      if (optIpDate) optIpDate.value = 'all';
      persistFilters();
      computeAndRenderOptionsCounter();
    });
  }

  // Recompute when data changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.copiedAccounts || changes.copiedIPs)) {
      computeAndRenderOptionsCounter();
    }
  });

  // Preferences events
  tooltipsToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ tooltipsEnabled: tooltipsToggle.checked });
    // Also notify sidepanel immediately so the change is visible without reload
    try {
      chrome.runtime.sendMessage({ type: 'tooltipsToggled', enabled: !!tooltipsToggle.checked });
    } catch (e) {
      // ignore if cannot send
    }
  });
  // Removed sound option completely

  // Onboarding behavior
  function renderOnboardingStep() {
    if (!onboardingOverlay) return;
    const stepObj = onboardingSteps[onboardingStep - 1];
    // Add fade out effect
    const onbBody = document.querySelector('.onb-body');
    onbBody.classList.add('fade-out');
    setTimeout(() => {
      onbStepTitle.textContent = stepObj.title;
      onbStepDesc.textContent = stepObj.desc;
      onbBody.classList.remove('fade-out');
      onbBody.classList.add('fade-in');
      setTimeout(() => onbBody.classList.remove('fade-in'), 300);
    }, 150);
    onbDots.forEach(dot => {
      const s = parseInt(dot.getAttribute('data-step'), 10);
      dot.style.background = s === onboardingStep ? '#667eea' : '#d1d5db';
      dot.style.transform = s === onboardingStep ? 'scale(1.2)' : 'scale(1)';
    });
    if (onbProgressFill) {
      const progress = (onboardingStep / onboardingSteps.length) * 100;
      onbProgressFill.style.width = progress + '%';
    }
    // Buttons visibility
    if (onboardingStep === 1) {
      onboardingPrev.disabled = true;
      onboardingPrev.style.opacity = .5;
    } else {
      onboardingPrev.disabled = false;
      onboardingPrev.style.opacity = 1;
    }
    if (onboardingStep < onboardingSteps.length) {
      onboardingNext.style.display = 'inline-block';
      onboardingTry.style.display = 'none';
    } else {
      onboardingNext.style.display = 'none';
      onboardingTry.style.display = 'inline-block';
    }
    chrome.storage.sync.set({ onboardingStep });
  }
  function showOnboarding() {
    onboardingOverlay.style.display = 'flex';
    // Focus first actionable button for accessibility
    setTimeout(() => onboardingNext && onboardingNext.focus(), 50);
    renderOnboardingStep();
    trapFocus(onboardingOverlay);
    // Simple onboarding modal (no spotlight)
  }
  function finishOnboarding() {
    onboardingOverlay.style.display = 'none';
    chrome.storage.sync.set({ onboardingCompleted: true });
    releaseFocusTrap();
    // Onboarding finished
  }
  function skipOnboarding() {
    onboardingOverlay.style.display = 'none';
    chrome.storage.sync.set({ onboardingCompleted: true });
    releaseFocusTrap();
    // Onboarding skipped
  }
  if (onboardingNext) onboardingNext.addEventListener('click', () => { onboardingStep = Math.min(onboardingSteps.length, onboardingStep + 1); renderOnboardingStep(); });
  if (onboardingPrev) onboardingPrev.addEventListener('click', () => { onboardingStep = Math.max(1, onboardingStep - 1); renderOnboardingStep(); });
  if (onboardingTry) onboardingTry.addEventListener('click', () => {
    finishOnboarding();
    // Optionally, open the sidepanel or show a toast
    // For now, just finish
  });
  if (onboardingSkip) onboardingSkip.addEventListener('click', skipOnboarding);
  if (onboardingClose) onboardingClose.addEventListener('click', skipOnboarding);
  if (reopenOnboarding) reopenOnboarding.addEventListener('click', () => {
    if (employeeSetupRequired) {
      showInitialEmployeeOverlay();
      return;
    }
    onboardingStep = 1;
    chrome.storage.sync.set({ onboardingCompleted: false, onboardingStep });
    showOnboarding();
  });

  // Focus trap utilities
  let lastFocusedBeforeTrap = null;
  function trapFocus(container) {
    lastFocusedBeforeTrap = document.activeElement;
    const focusable = container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    container.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { skipOnboarding(); }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
  function releaseFocusTrap() {
    if (lastFocusedBeforeTrap) lastFocusedBeforeTrap.focus();
    lastFocusedBeforeTrap = null;
  }

  let currentGeoData = null; // Global variable to store IP data

  // Simple Arabic translation dictionaries for common geo terms / values.
  // These can be expanded or externalized later.
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
      'Syria': 'سوريا',
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

  // Use Intl.DisplayNames to get localized country name by ISO code when available
  const regionDisplayNames = (typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined')
    ? new Intl.DisplayNames(['ar'], { type: 'region' })
    : null;
  const regionDisplayNamesEnglish = (typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined')
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

  function translateValue(type, value) {
    if (!value) return 'N/A';
    const map = arabicMaps[type];
    if (map && map[value]) return map[value];
    return value; // Fallback to original if not found
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toDisplayValue(value, fallback) {
    const fallbackText = fallback || 'N/A';
    if (value == null) return fallbackText;
    const text = String(value).trim();
    if (!text) return fallbackText;
    return text;
  }

  function normalizeIpInput(rawIp) {
    const source = String(rawIp || '').trim();
    if (!source) return '';
    if (window.IPGeoClient && typeof window.IPGeoClient.normalizeIPv4 === 'function') {
      return window.IPGeoClient.normalizeIPv4(source);
    }
    const parts = source.split('.');
    if (parts.length !== 4) return '';
    for (const part of parts) {
      if (!/^\d+$/.test(part)) return '';
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return '';
    }
    return source;
  }

  function toCoordinateNumber(value, min, max) {
    const parsed = Number(String(value == null ? '' : value).trim());
    if (!Number.isFinite(parsed)) return null;
    if (parsed < min || parsed > max) return null;
    return parsed;
  }

  function ipToDecimal(ip) {
    const parts = String(ip || '').split('.');
    if (parts.length !== 4) return 'N/A';
    let total = 0;
    for (const part of parts) {
      if (!/^\d+$/.test(part)) return 'N/A';
      const value = Number(part);
      if (!Number.isInteger(value) || value < 0 || value > 255) return 'N/A';
      total = (total * 256) + value;
    }
    return String(total);
  }

  function getHostname(data) {
    const direct = toDisplayValue(data && data.hostname, '');
    if (direct) return direct;
    if (data && Array.isArray(data.hostnames) && data.hostnames.length > 0) {
      const first = toDisplayValue(data.hostnames[0], '');
      if (first) return first;
    }
    return 'N/A';
  }

  function formatAsnForDisplay(value) {
    const text = toDisplayValue(value, 'N/A');
    if (text === 'N/A') return text;
    const match = text.match(/^AS\s*([0-9]{1,10})$/i);
    if (match) return match[1];
    return text;
  }

  function normalizeServiceLabel(value, isp, organization) {
    const raw = toDisplayValue(value, '');
    const hints = `${raw} ${toDisplayValue(isp, '')} ${toDisplayValue(organization, '')}`.toLowerCase();

    if (/(hosting|data\s*center|datacenter|transit|colo|colocation|vps|server|cloud)/i.test(hints)) {
      return 'Data Center/Transit';
    }

    if (!raw) return 'N/A';
    if (/^residential$/i.test(raw)) return 'Residential';
    if (/^business$/i.test(raw)) return 'Business';
    if (/^mobile$/i.test(raw)) return 'Mobile';
    return raw;
  }

  function toDmsText(value, isLatitude) {
    const min = isLatitude ? -90 : -180;
    const max = isLatitude ? 90 : 180;
    const numeric = toCoordinateNumber(value, min, max);
    if (numeric === null) return '';

    const absolute = Math.abs(numeric);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    const direction = isLatitude ? (numeric >= 0 ? 'N' : 'S') : (numeric >= 0 ? 'E' : 'W');

    return `${degrees} deg ${minutes}' ${seconds}" ${direction}`;
  }

  function formatCoordinateForDisplay(value, isLatitude) {
    const min = isLatitude ? -90 : -180;
    const max = isLatitude ? 90 : 180;
    const numeric = toCoordinateNumber(value, min, max);
    if (numeric === null) return 'N/A';
    const decimalText = numeric.toFixed(4);
    const dmsText = toDmsText(numeric, isLatitude);
    if (!dmsText) return decimalText;
    return `${decimalText} (${dmsText})`;
  }

  function buildMapUrls(latitude, longitude) {
    const lat = toCoordinateNumber(latitude, -90, 90);
    const lon = toCoordinateNumber(longitude, -180, 180);
    if (lat === null || lon === null) return null;

    const latDelta = 0.25;
    const lonDelta = Math.max(0.25, 0.25 / Math.max(Math.cos(Math.abs(lat) * Math.PI / 180), 0.35));
    const minLat = Math.max(-90, lat - latDelta);
    const maxLat = Math.min(90, lat + latDelta);
    const minLon = Math.max(-180, lon - lonDelta);
    const maxLon = Math.min(180, lon + lonDelta);

    const bbox = [minLon, minLat, maxLon, maxLat].join(',');
    const marker = `${lat},${lon}`;
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
    const openUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(lat))}&mlon=${encodeURIComponent(String(lon))}#map=9/${encodeURIComponent(String(lat))}/${encodeURIComponent(String(lon))}`;

    return {
      lat,
      lon,
      embedUrl,
      openUrl
    };
  }

  function buildRowsMarkup(rows) {
    return rows.map((row) => {
      return `<li class="ip-lookup-row"><span class="ip-lookup-key">${escapeHtml(row.label)}:</span><span class="ip-lookup-value">${escapeHtml(row.value)}</span></li>`;
    }).join('');
  }

  function buildMapMarkup(latitude, longitude, locationTitle) {
    const mapUrls = buildMapUrls(latitude, longitude);
    if (!mapUrls) {
      return `
        <div class="ip-lookup-map-panel">
          <div class="ip-map-unavailable">لا توجد إحداثيات كافية لعرض الخريطة.</div>
        </div>
      `;
    }

    return `
      <div class="ip-lookup-map-panel">
        <iframe
          class="ip-map-frame"
          title="IP Map - ${escapeHtml(locationTitle)}"
          src="${escapeHtml(mapUrls.embedUrl)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"></iframe>
        <a class="ip-map-link" href="${escapeHtml(mapUrls.openUrl)}" target="_blank" rel="noopener noreferrer">Open full map</a>
      </div>
    `;
  }

  function buildArabicDetailHTML(data, searchedIp) {
    const normalizedData = data && typeof data === 'object' ? data : {};
    const ip = toDisplayValue(normalizedData.ip || searchedIp, searchedIp || 'N/A');
    const countryCode = toDisplayValue(normalizedData.country_code || normalizedData.countryCode, '');
    const country = toDisplayValue(
      (regionDisplayNamesEnglish && countryCode ? regionDisplayNamesEnglish.of(String(countryCode).toUpperCase()) : '') ||
      normalizedData.country ||
      normalizedData.country_name,
      'N/A'
    );
    const region = toDisplayValue(normalizedData.region || normalizedData.region_name, 'N/A');
    const city = toDisplayValue(normalizedData.city || normalizedData.city_name, 'N/A');
    const latitude = toDisplayValue(normalizedData.latitude || normalizedData.lat, 'N/A');
    const longitude = toDisplayValue(normalizedData.longitude || normalizedData.lon, 'N/A');
    const asn = formatAsnForDisplay(normalizedData.asn || normalizedData.as);
    const isp = toDisplayValue(
      normalizedData.isp ||
      (normalizedData.connection && normalizedData.connection.isp) ||
      normalizedData.org ||
      normalizedData.organization,
      'N/A'
    );
    const org = toDisplayValue(normalizedData.org || normalizedData.organization, 'N/A');
    const serviceType = normalizeServiceLabel(
      normalizedData.connection_type ||
      normalizedData.usage_type ||
      (normalizedData.connection && normalizedData.connection.type),
      isp,
      org
    );
    const ipVersion = toDisplayValue(normalizedData.type, 'IPv4');
    const decimalValue = ipToDecimal(ip);
    const timezone = toDisplayValue(normalizedData.timezone, 'N/A');
    const hostname = getHostname(normalizedData);
    const latitudeDisplay = formatCoordinateForDisplay(latitude, true);
    const longitudeDisplay = formatCoordinateForDisplay(longitude, false);

    const locationTitle = [city, region, country].filter((value) => value && value !== 'N/A').join(', ') || ip;
    const detailsRows = [
      { label: 'Decimal', value: decimalValue },
      { label: 'Hostname', value: hostname },
      { label: 'ASN', value: asn },
      { label: 'ISP', value: isp },
      { label: 'Services', value: serviceType },
      { label: 'Country', value: country },
      { label: 'State/Region', value: region },
      { label: 'City', value: city },
      { label: 'IP Version', value: ipVersion },
      { label: 'Latitude', value: latitudeDisplay },
      { label: 'Longitude', value: longitudeDisplay },
      { label: 'Timezone', value: timezone },
      { label: 'Organization', value: org }
    ];

    return `
      <section class="ip-lookup-card" dir="ltr">
        <div class="ip-lookup-head">
          <span class="ip-lookup-title">IP Details For:</span>
          <span class="ip-lookup-target">${escapeHtml(ip)}</span>
        </div>
        <div class="ip-lookup-grid">
          <ul class="ip-lookup-list">
            ${buildRowsMarkup(detailsRows)}
          </ul>
          ${buildMapMarkup(latitude, longitude, locationTitle)}
        </div>
      </section>
    `;
  }

  async function lookupIpData(ip) {
    if (window.IPGeoClient && typeof window.IPGeoClient.lookup === 'function') {
      return window.IPGeoClient.lookup(ip, { forceRefresh: true });
    }

    if (window.IPGeoClient && typeof window.IPGeoClient.lookupWithRetry === 'function') {
      return window.IPGeoClient.lookupWithRetry(ip, { attempts: 3, retryDelayMs: 120, forceRefresh: true });
    }

    const response = await chrome.runtime.sendMessage({ type: 'lookupIp', ip: ip, forceRefresh: true });
    if (response && response.data) return { success: true, data: response.data };
    return {
      success: false,
      error: (response && response.error) || 'تعذر استرداد معلومات IP.'
    };
  }

  function renderLookupStatus(message, tone) {
    if (!ipLookupResults) return;
    const safeMessage = escapeHtml(message || '');
    const statusClass = tone ? `ip-lookup-status ${tone}` : 'ip-lookup-status';
    ipLookupResults.innerHTML = `<div class="${statusClass}" dir="rtl">${safeMessage}</div>`;
  }

  const ipInput = document.getElementById('ip-input');
  const lookupIpButton = document.getElementById('lookup-ip-button');
  const ipLookupResults = document.getElementById('ip-lookup-results');
  let ipLookupInProgress = false;

  async function handleIpLookup() {
    if (!ipInput || !lookupIpButton || !ipLookupResults || ipLookupInProgress) return;

    const rawIp = String(ipInput.value || '').trim();
    const normalizedIp = normalizeIpInput(rawIp);
    currentGeoData = null;

    if (!normalizedIp) {
      renderLookupStatus('الرجاء إدخال عنوان IP صحيح.', 'error');
      return;
    }

    ipInput.value = normalizedIp;
    ipLookupInProgress = true;
    lookupIpButton.disabled = true;
    renderLookupStatus('جاري البحث عن IP...', 'loading');

    try {
      const result = await lookupIpData(normalizedIp);
      if (result && result.success && result.data) {
        currentGeoData = result.data;
        ipLookupResults.innerHTML = buildArabicDetailHTML(result.data, normalizedIp);
      } else {
        const errorMessage = result && result.error ? result.error : 'تعذر استرداد معلومات IP.';
        renderLookupStatus(`خطأ: ${errorMessage}`, 'error');
      }
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      renderLookupStatus(`خطأ: ${message}`, 'error');
    } finally {
      ipLookupInProgress = false;
      lookupIpButton.disabled = false;
    }
  }

  if (lookupIpButton) {
    lookupIpButton.addEventListener('click', handleIpLookup);
  }

  if (ipInput) {
    ipInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleIpLookup();
      }
    });
  }

  // Removed big magnifier feature; results are shown inline only
});

