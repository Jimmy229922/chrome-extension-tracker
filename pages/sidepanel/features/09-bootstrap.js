// --- Lazy Tab Initializers (run once when tab opens) ---
function registerLazyTabInit(tabName, initializer) {
  if (typeof initializer !== 'function') return;
  if (typeof window.registerTabInitializer === 'function') {
    window.registerTabInitializer(tabName, initializer);
    return;
  }

  // Fallback for environments where tabs module isn't loaded yet.
  try {
    initializer();
  } catch (err) {
    console.warn(`Lazy init fallback failed for "${tabName}"`, err);
  }
}

function initTransferReportFeature(_deps) {
  if (typeof autoDetectShift === 'function') {
    autoDetectShift();
  }
  if (typeof convertToCustomSelect === 'function') {
    convertToCustomSelect('report-old-group');
    convertToCustomSelect('report-new-group');
  }
  if (typeof restoreNativeSelect === 'function') {
    restoreNativeSelect('employee-name-select');
  }
}

function initDepositPercentageFeature(_deps) {
  if (!depositReportShiftInput || !depositReportShiftInput.value) {
    const now = new Date();
    const hour = now.getHours();
    let shift = 'الخفر';
    if (hour >= 7 && hour < 15) shift = 'الصباحي';
    else if (hour >= 15 && hour < 23) shift = 'المسائي';
    setDepositShift(shift);
  }
}

function initWithdrawalReportFeature(_deps) {
  if (window.__withdrawalDraftLoaded) return;
  window.__withdrawalDraftLoaded = true;
  void loadWithdrawalDraft();
}

function initCreditOutFeature(_deps) {
  if (typeof window.creditOutAutoDetectShift === 'function') {
    window.creditOutAutoDetectShift();
  }
}

const sidepanelApp = window.SidepanelApp;
if (sidepanelApp && typeof sidepanelApp.registerFeature === 'function') {
  sidepanelApp.registerFeature('transfer-report', initTransferReportFeature);
  sidepanelApp.registerFeature('deposit-percentage', initDepositPercentageFeature);
  sidepanelApp.registerFeature('withdrawal-report', initWithdrawalReportFeature);
  sidepanelApp.registerFeature('credit-out', initCreditOutFeature);
}

registerLazyTabInit('transfer-report', () => {
  if (sidepanelApp && typeof sidepanelApp.initFeature === 'function') {
    sidepanelApp.initFeature('transfer-report');
    return;
  }
  initTransferReportFeature();
});

registerLazyTabInit('deposit-percentage', () => {
  if (sidepanelApp && typeof sidepanelApp.initFeature === 'function') {
    sidepanelApp.initFeature('deposit-percentage');
    return;
  }
  initDepositPercentageFeature();
});

registerLazyTabInit('withdrawal-report', () => {
  if (sidepanelApp && typeof sidepanelApp.initFeature === 'function') {
    sidepanelApp.initFeature('withdrawal-report');
    return;
  }
  initWithdrawalReportFeature();
});

registerLazyTabInit('credit-out', () => {
  if (sidepanelApp && typeof sidepanelApp.initFeature === 'function') {
    sidepanelApp.initFeature('credit-out');
    return;
  }
  initCreditOutFeature();
});

// --- Initial Load ---
switchTab('accounts');

