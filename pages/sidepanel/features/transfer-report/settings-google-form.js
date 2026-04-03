// --- Google Form Integration ---
const googleFormSettingsBtn = document.getElementById('google-form-settings-btn');
const googleFormSettingsModal = document.getElementById('google-form-settings-modal');
const googleFormSettingsClose = document.getElementById('google-form-settings-close');
const saveGoogleFormSettingsBtn = document.getElementById('save-google-form-settings');
const googleFormEnableCheckbox = document.getElementById('google-form-enable');
const googleFormUrlInput = document.getElementById('google-form-url');
const entryIpInput = document.getElementById('entry-ip');
const entryCountryInput = document.getElementById('entry-country');
const entryAccountInput = document.getElementById('entry-account');
const entryEmailInput = document.getElementById('entry-email');
const entryEmployeeInput = document.getElementById('entry-employee');
const entryShiftInput = document.getElementById('entry-shift');
const entrySourceInput = document.getElementById('entry-source');
const entryProfitsInput = document.getElementById('entry-profits');
const entryOldGroupInput = document.getElementById('entry-old-group');
const entryNewGroupInput = document.getElementById('entry-new-group');
const entryNotesInput = document.getElementById('entry-notes');

// Constants for Google Form (Extracted from user link)
const DEFAULT_GF_URL = 'https://script.google.com/macros/s/AKfycbyBv0x_fzNTvgOQPD-CHlYPInx3L15Em22vKLhpS5MSVzz748DQRMGBtsQCURjTfvVn/exec';
const DEFAULT_GF_IP = 'entry.529442460';
const DEFAULT_GF_COUNTRY = ''; // Merged with IP
const DEFAULT_GF_ACCOUNT = 'entry.792356739';
const DEFAULT_GF_EMAIL = 'entry.1006175456';
const DEFAULT_GF_EMPLOYEE = 'entry.2019293497';
const DEFAULT_GF_SHIFT = 'entry.746348465';
const DEFAULT_GF_SOURCE = 'entry.1976260898';
const DEFAULT_GF_PROFITS = 'entry.153138902';
const DEFAULT_GF_OLD_GROUP = 'entry.1707443046';
const DEFAULT_GF_NEW_GROUP = 'entry.811495440';
const DEFAULT_GF_NOTES = 'entry.1364885040';

// Load Google Form Settings
function loadGoogleFormSettings() {
  // Always force defaults first to ensure correct IDs
  const currentSettings = {
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

  chrome.storage.local.get(['googleFormSettings'], (result) => {
    // If settings exist, we might want to respect user's enable/disable choice,
    // but we should FORCE the correct IDs and URL to prevent errors.
    if (result.googleFormSettings) {
      currentSettings.enabled = result.googleFormSettings.enabled !== undefined ? result.googleFormSettings.enabled : true;
      // Also load saved Shift/Profits/OldGroup/NewGroup ID if available
      if (result.googleFormSettings.entryShift) currentSettings.entryShift = result.googleFormSettings.entryShift;
      if (result.googleFormSettings.entryProfits) currentSettings.entryProfits = result.googleFormSettings.entryProfits;
      if (result.googleFormSettings.entryOldGroup) currentSettings.entryOldGroup = result.googleFormSettings.entryOldGroup;
      if (result.googleFormSettings.entryNewGroup) currentSettings.entryNewGroup = result.googleFormSettings.entryNewGroup;
    }
    
    // Update UI
    googleFormEnableCheckbox.checked = currentSettings.enabled;
    googleFormUrlInput.value = currentSettings.url;
    entryIpInput.value = currentSettings.entryIp;
    entryCountryInput.value = currentSettings.entryCountry;
    entryAccountInput.value = currentSettings.entryAccount;
    entryEmailInput.value = currentSettings.entryEmail;
    entryEmployeeInput.value = currentSettings.entryEmployee;
    if (entryShiftInput) entryShiftInput.value = currentSettings.entryShift || '';
    entrySourceInput.value = currentSettings.entrySource;
    if (entryProfitsInput) entryProfitsInput.value = currentSettings.entryProfits || '';
    if (entryOldGroupInput) entryOldGroupInput.value = currentSettings.entryOldGroup || '';
    if (entryNewGroupInput) entryNewGroupInput.value = currentSettings.entryNewGroup || '';
    entryNotesInput.value = currentSettings.entryNotes;
    
    // Save these correct settings back to storage to fix any old bad data
    chrome.storage.local.set({ googleFormSettings: currentSettings });
  });
}

// Restore Defaults Button
const restoreGoogleFormDefaultsBtn = document.getElementById('restore-google-form-defaults');
if (restoreGoogleFormDefaultsBtn) {
  restoreGoogleFormDefaultsBtn.addEventListener('click', () => {
    googleFormEnableCheckbox.checked = true;
    googleFormUrlInput.value = DEFAULT_GF_URL;
    entryIpInput.value = DEFAULT_GF_IP;
    entryCountryInput.value = DEFAULT_GF_COUNTRY;
    entryAccountInput.value = DEFAULT_GF_ACCOUNT;
    entryEmailInput.value = DEFAULT_GF_EMAIL;
    entryEmployeeInput.value = DEFAULT_GF_EMPLOYEE;
    if (entryShiftInput) entryShiftInput.value = DEFAULT_GF_SHIFT;
    entrySourceInput.value = DEFAULT_GF_SOURCE;
    if (entryProfitsInput) entryProfitsInput.value = DEFAULT_GF_PROFITS;
    if (entryOldGroupInput) entryOldGroupInput.value = DEFAULT_GF_OLD_GROUP;
    if (entryNewGroupInput) entryNewGroupInput.value = DEFAULT_GF_NEW_GROUP;
    entryNotesInput.value = DEFAULT_GF_NOTES;
    showToast('تم الاستعادة', 'تم استعادة الإعدادات الافتراضية (اضغط حفظ)', 'default');
  });
}

// Save Google Form Settings
if (saveGoogleFormSettingsBtn) {
  saveGoogleFormSettingsBtn.addEventListener('click', () => {
    const settings = {
      enabled: googleFormEnableCheckbox.checked,
      url: googleFormUrlInput.value.trim(),
      entryIp: entryIpInput.value.trim(),
      entryCountry: entryCountryInput.value.trim(),
      entryAccount: entryAccountInput.value.trim(),
      entryEmail: entryEmailInput.value.trim(),
      entryEmployee: entryEmployeeInput.value.trim(),
      entryShift: entryShiftInput ? entryShiftInput.value.trim() : '',
      entrySource: entrySourceInput.value.trim(),
      entryProfits: entryProfitsInput ? entryProfitsInput.value.trim() : '',
      entryOldGroup: entryOldGroupInput ? entryOldGroupInput.value.trim() : '',
      entryNewGroup: entryNewGroupInput ? entryNewGroupInput.value.trim() : '',
      entryNotes: entryNotesInput.value.trim()
    };

    chrome.storage.local.set({ googleFormSettings: settings }, () => {
      showToast('تم الحفظ', 'تم حفظ إعدادات Google Form', 'default');
      googleFormSettingsModal.style.display = 'none';
    });
  });
}
