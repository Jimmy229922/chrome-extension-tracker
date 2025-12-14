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
  const checkUpdatesBtn = document.getElementById('check-updates');
  let onboardingStep = 1;
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

  // Function to apply dark mode to options page
  function applyDarkModeToOptions(isDarkMode) {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // Load saved settings
  chrome.storage.sync.get(['darkMode', 'clearHistoryEnabled', 'clearHistoryDays', 'maxAccounts', 'timestampFormat', 'filters', 'tooltipsEnabled', 'onboardingCompleted', 'onboardingStep'], (data) => {
    darkModeToggle.checked = data.darkMode || false;
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

    // Initial compute for result counter
    computeAndRenderOptionsCounter();

    // Show onboarding if not completed
    if (!data.onboardingCompleted && onboardingOverlay) {
      onboardingStep = data.onboardingStep || 1;
      showOnboarding();
    }
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
  if (reopenOnboarding) reopenOnboarding.addEventListener('click', () => { onboardingStep = 1; chrome.storage.sync.set({ onboardingCompleted: false, onboardingStep }); showOnboarding(); });

  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.textContent = 'جاري التحقق...';
      try {
        const response = await fetch('https://api.github.com/repos/Jimmy229922/chrome-extension-tracker/releases/latest');
        if (response.ok) {
          const release = await response.json();
          const latestVersion = release.tag_name;
          const currentVersion = chrome.runtime.getManifest().version;
          if (latestVersion !== currentVersion) {
            alert(`يوجد إصدار جديد: ${latestVersion}. اذهب إلى GitHub لتنزيل التحديث.`);
            window.open('https://github.com/Jimmy229922/chrome-extension-tracker', '_blank');
          } else {
            alert('أنت تستخدم أحدث إصدار.');
          }
        } else {
          alert('تعذر التحقق من التحديثات. تحقق من اتصال الإنترنت.');
        }
      } catch (error) {
        alert('خطأ في التحقق من التحديثات: ' + error.message);
      }
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.textContent = '🔄 التحقق من التحديثات';
    });
  }

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

  function translateValue(type, value) {
    if (!value) return 'N/A';
    const map = arabicMaps[type];
    if (map && map[value]) return map[value];
    return value; // Fallback to original if not found
  }

  function buildArabicDetailHTML(data) {
    // Translate individual pieces
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

  const ipInput = document.getElementById('ip-input');
  const lookupIpButton = document.getElementById('lookup-ip-button');
  const ipLookupResults = document.getElementById('ip-lookup-results');

  lookupIpButton.addEventListener('click', async () => {
    const ip = ipInput.value.trim();
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

  // Clear previous data on new search
  currentGeoData = null;

    if (!ipRegex.test(ip)) {
      ipLookupResults.textContent = 'الرجاء إدخال عنوان IP صالح.';
      ipLookupResults.style.color = 'red';
      return;
    }

    ipLookupResults.textContent = 'جاري البحث عن IP...';
    ipLookupResults.style.color = 'white';

    try {
      const response = await chrome.runtime.sendMessage({ type: 'lookupIp', ip: ip });
      console.log('Response from background:', response); // Added logging
      if (response && response.data) {
  currentGeoData = response.data; // Store the data
  ipLookupResults.innerHTML = buildArabicDetailHTML(response.data);
      } else if (response && response.error) {
        ipLookupResults.textContent = `خطأ: ${response.error}`;        ipLookupResults.style.color = 'white';
      } else {
        ipLookupResults.textContent = 'تعذر استرداد معلومات IP.';
        ipLookupResults.style.color = 'white';
      }
    } catch (error) {
      ipLookupResults.textContent = `Error: ${error.message}`;
      ipLookupResults.style.color = 'red';
    }
  });

  // Removed big magnifier feature; results are shown inline only
});