// =====================================================
// SIDEPANEL TABS - Navigation, Filters, Search, Lazy Init
// =====================================================

window.__sidepanelTabsV2 = true;

// --- Lazy Tab Initializers (run once per tab) ---
const tabInitializers = new Map();
const tabInitPromises = new Map();
const tabInitDone = new Set();
const tabFirstPaintDone = new Set();

window.registerTabInitializer = function registerTabInitializer(tabName, initializer) {
  if (!tabName || typeof initializer !== 'function') return;
  tabInitializers.set(tabName, initializer);
};

window.isTabInitializerPending = function isTabInitializerPending(tabName) {
  return tabInitializers.has(tabName) && !tabInitDone.has(tabName);
};

window.runTabInitializer = async function runTabInitializer(tabName) {
  if (!tabInitializers.has(tabName)) return;
  if (tabInitDone.has(tabName)) return;
  if (tabInitPromises.has(tabName)) return tabInitPromises.get(tabName);

  const runPromise = Promise.resolve()
    .then(() => tabInitializers.get(tabName)())
    .catch((err) => {
      console.error(`Tab initializer failed for "${tabName}"`, err);
    })
    .finally(() => {
      tabInitDone.add(tabName);
      tabInitPromises.delete(tabName);
    });

  tabInitPromises.set(tabName, runPromise);
  return runPromise;
};

function ensureSectionSkeleton(sectionEl) {
  if (!sectionEl) return null;
  let skeleton = sectionEl.querySelector(':scope > .section-skeleton');
  if (skeleton) return skeleton;

  const skeletonTag = sectionEl.tagName === 'UL' ? 'li' : 'div';
  skeleton = document.createElement(skeletonTag);
  skeleton.className = 'section-skeleton hidden';
  skeleton.innerHTML = `
    <div class="section-skeleton-line w-90"></div>
    <div class="section-skeleton-line w-75"></div>
    <div class="section-skeleton-line w-60"></div>
    <div class="section-skeleton-line w-90"></div>
    <div class="section-skeleton-line w-45"></div>
  `;
  sectionEl.appendChild(skeleton);
  return skeleton;
}

function runWithSkeleton(sectionEl, tabName, taskFn, forceSkeleton = false) {
  const shouldShowSkeleton = forceSkeleton || !tabFirstPaintDone.has(tabName);
  if (!sectionEl || !shouldShowSkeleton) {
    Promise.resolve().then(taskFn).catch((err) => console.error(`Tab render failed for "${tabName}"`, err));
    tabFirstPaintDone.add(tabName);
    return;
  }

  const skeleton = ensureSectionSkeleton(sectionEl);
  sectionEl.classList.add('loading-state');
  if (skeleton) skeleton.classList.remove('hidden');

  window.requestAnimationFrame(() => {
    setTimeout(async () => {
      try {
        await taskFn();
      } catch (err) {
        console.error(`Tab render failed for "${tabName}"`, err);
      } finally {
        if (skeleton) skeleton.classList.add('hidden');
        sectionEl.classList.remove('loading-state');
        tabFirstPaintDone.add(tabName);
      }
    }, 0);
  });
}

// --- Tab Switching Logic ---
accountsTab.addEventListener('click', () => switchTab('accounts'));
ipsTab.addEventListener('click', () => switchTab('ips'));
criticalTab.addEventListener('click', () => switchTab('critical'));
walletsTab.addEventListener('click', () => switchTab('wallets'));
profitTab.addEventListener('click', () => switchTab('profit'));
transferReportTab.addEventListener('click', () => switchTab('transfer-report'));

const hedgeCheckerBtn = document.getElementById('hedge-checker-btn');
if (hedgeCheckerBtn) hedgeCheckerBtn.addEventListener('click', () => chrome.tabs.create({ url: 'hedge-checker.html' }));

const depositPercentageBtn = document.getElementById('deposit-percentage-btn');
if (depositPercentageBtn) depositPercentageBtn.addEventListener('click', () => switchTab('deposit-percentage'));

const classificationHelperBtn = document.getElementById('classification-helper-btn');
if (classificationHelperBtn) classificationHelperBtn.addEventListener('click', () => chrome.tabs.create({ url: 'classification-helper.html' }));

const creditOutBtn = document.getElementById('credit-out-btn');
if (creditOutBtn) creditOutBtn.addEventListener('click', () => switchTab('credit-out'));

function switchTab(tabName) {
  activeTab = tabName;

  if (headerEl) headerEl.classList.remove('static-mode');

  accountsTab.classList.remove('active');
  ipsTab.classList.remove('active');
  criticalTab.classList.remove('active');
  walletsTab.classList.remove('active');
  profitTab.classList.remove('active');
  transferReportTab.classList.remove('active');
  if (depositPercentageBtn) depositPercentageBtn.classList.remove('active');
  if (creditOutBtn) creditOutBtn.classList.remove('active');

  accountList.classList.remove('active');
  ipList.classList.remove('active');
  walletsSection.style.display = 'none';
  profitSection.style.display = 'none';
  criticalSection.style.display = 'none';
  transferReportSection.style.display = 'none';
  if (depositPercentageSection) depositPercentageSection.style.display = 'none';
  if (withdrawalSection) withdrawalSection.style.display = 'none';
  if (withdrawalReportBtn) withdrawalReportBtn.classList.remove('active');

  const creditOutSection = document.getElementById('credit-out-section');
  if (creditOutSection) creditOutSection.style.display = 'none';

  document.getElementById('tag-filter-bar').style.display = 'none';
  searchBar.style.display = 'none';

  const initPending = window.isTabInitializerPending(tabName);

  if (tabName === 'accounts') {
    accountsTab.classList.add('active');
    accountList.classList.add('active');
    document.getElementById('tag-filter-bar').style.display = 'flex';
    searchBar.placeholder = 'Search accounts...';
    searchBar.style.display = 'block';

    runWithSkeleton(
      accountList,
      tabName,
      async () => {
        await window.runTabInitializer(tabName);
        renderAccounts();
      },
      initPending
    );
    return;
  }

  if (tabName === 'ips') {
    ipsTab.classList.add('active');
    ipList.classList.add('active');
    searchBar.placeholder = 'Search IP...';
    searchBar.style.display = 'block';

    runWithSkeleton(
      ipList,
      tabName,
      async () => {
        await window.runTabInitializer(tabName);
        renderIPs();
      },
      initPending
    );
    return;
  }

  if (tabName === 'critical') {
    criticalTab.classList.add('active');
    criticalSection.style.display = 'block';

    runWithSkeleton(
      criticalSection,
      tabName,
      async () => {
        await window.runTabInitializer(tabName);
        renderCriticalWatchlist();
      },
      initPending
    );
    return;
  }

  if (tabName === 'wallets') {
    walletsTab.classList.add('active');
    walletsSection.style.display = 'block';
    searchBar.placeholder = 'Search wallets...';
    searchBar.style.display = 'block';

    runWithSkeleton(
      walletsSection,
      tabName,
      async () => {
        await window.runTabInitializer(tabName);
        loadWallets();
      },
      initPending
    );
    return;
  }

  if (tabName === 'profit') {
    profitTab.classList.add('active');
    profitSection.style.display = 'block';
    void window.runTabInitializer(tabName);
    return;
  }

  if (tabName === 'deposit-percentage') {
    if (depositPercentageBtn) depositPercentageBtn.classList.add('active');
    if (depositPercentageSection) depositPercentageSection.style.display = 'block';

    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }

    runWithSkeleton(depositPercentageSection, tabName, () => window.runTabInitializer(tabName), initPending);
    return;
  }

  if (tabName === 'transfer-report') {
    transferReportTab.classList.add('active');
    transferReportSection.style.display = 'block';

    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }

    const backBtn = document.getElementById('report-back-btn');
    if (backBtn) backBtn.remove();

    runWithSkeleton(transferReportSection, tabName, () => window.runTabInitializer(tabName), initPending);
    return;
  }

  if (tabName === 'withdrawal-report') {
    if (withdrawalReportBtn) withdrawalReportBtn.classList.add('active');
    if (withdrawalSection) withdrawalSection.style.display = 'block';

    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }

    runWithSkeleton(withdrawalSection, tabName, () => window.runTabInitializer(tabName), initPending);
    return;
  }

  if (tabName === 'credit-out') {
    if (creditOutBtn) creditOutBtn.classList.add('active');
    if (creditOutSection) creditOutSection.style.display = 'block';

    if (headerEl) {
      headerEl.style.display = 'block';
      headerEl.classList.add('static-mode');
    }

    runWithSkeleton(creditOutSection, tabName, () => window.runTabInitializer(tabName), initPending);
    return;
  }

  if (headerEl) headerEl.style.display = 'block';
}

// --- Tag Filter Buttons ---
document.querySelectorAll('.tag-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTagFilter = btn.getAttribute('data-filter');
    renderAccounts();
  });
});

// --- Search Bar ---
searchBar.addEventListener('input', () => {
  if (activeTab === 'accounts') {
    renderAccounts(searchBar.value);
  } else if (activeTab === 'ips') {
    renderIPs(searchBar.value);
  } else if (activeTab === 'wallets') {
    renderWallets(searchBar.value);
  }
});

// --- Clear Button ---
clearButton.addEventListener('click', async () => {
  if (activeTab === 'accounts') {
    if (confirm('Are you sure you want to clear all account history?')) {
      await chrome.storage.local.set({ copiedAccounts: [] });
    }
  } else if (activeTab === 'ips') {
    if (confirm('Are you sure you want to clear all IP history?')) {
      await chrome.storage.local.set({ copiedIPs: [] });
    }
  } else if (activeTab === 'wallets') {
    if (confirm('Are you sure you want to clear all wallet history?')) {
      await chrome.storage.local.remove('walletNotes');
      loadWallets();
    }
  }
});

// --- Open Settings ---
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// --- Header Auto-Hide on Scroll ---
let lastScrollY = 0;
let ticking = false;
function handleScroll() {
  if (activeTab === 'transfer-report') {
    headerEl.classList.remove('hidden');
    ticking = false;
    return;
  }

  const currentY = window.scrollY;
  const goingDown = currentY > lastScrollY;
  if (goingDown && currentY > 40) {
    headerEl.classList.add('hidden');
  } else {
    headerEl.classList.remove('hidden');
  }
  lastScrollY = currentY;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(handleScroll);
    ticking = true;
  }
});

// --- Pause Tracking Logic ---
(async function initPauseToggle() {
  const syncData = await chrome.storage.sync.get(['trackingPaused']);
  const isPaused = !!syncData.trackingPaused;
  applyPauseUI(isPaused);
  pauseToggle.checked = !isPaused;
})();

pauseToggle.addEventListener('change', async () => {
  const isRunning = pauseToggle.checked;
  const isPaused = !isRunning;
  await chrome.storage.sync.set({ trackingPaused: isPaused });
  applyPauseUI(isPaused);
  if (isPaused) {
    showToast('تم إيقاف التتبع مؤقتاً', 'لن يتم تسجيل النسخ حتى إعادة التشغيل.', 'duplicate');
  } else {
    showToast('تم استئناف التتبع', 'سيتم تسجيل النسخ مرة أخرى.', 'ip');
  }
});

function applyPauseUI(isPaused) {
  if (isPaused) {
    pausedIndicator.style.display = 'inline-block';
    toggleLabelText.textContent = 'إيقاف التتبع مفعل';
  } else {
    pausedIndicator.style.display = 'none';
    toggleLabelText.textContent = 'تشغيل المراقبة';
  }
}
