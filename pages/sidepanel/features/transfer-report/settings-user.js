// --- User Settings (Employee Name) ---
const employeeNameSelect = document.getElementById('employee-name-select');
const saveUserSettingsBtn = document.getElementById('save-user-settings-btn');
const employeeDirectory = window.EmployeeDirectory;

if (employeeDirectory) {
  employeeDirectory.populateEmployeeSelect(employeeNameSelect);
}

// Debug (User Settings)
const DEBUG_USER_SETTINGS = false;
function dbgUserSettings(...args) {
  if (!DEBUG_USER_SETTINGS) return;
  console.log('[UserSettings]', ...args);
}

let isEmployeeNameLocked = false;

function lockEmployeeNameUI(employeeName) {
  if (!employeeNameSelect) return;
  employeeNameSelect.value = employeeName || employeeNameSelect.value;
  employeeNameSelect.disabled = true;
  employeeNameSelect.title = 'تم حفظ الاسم ولا يمكن تغييره';
  isEmployeeNameLocked = true;
  dbgUserSettings('lockEmployeeNameUI: locked with', employeeNameSelect.value);
}

function unlockEmployeeNameUI() {
  if (!employeeNameSelect) return;
  employeeNameSelect.disabled = false;
  employeeNameSelect.title = '';
  isEmployeeNameLocked = false;
  dbgUserSettings('unlockEmployeeNameUI: unlocked');
}

function getStoredEmployeeNameFromData(data) {
  const fromUserSettings = (
    data &&
    data.userSettings &&
    typeof data.userSettings.employeeName === 'string'
  ) ? data.userSettings.employeeName.trim() : '';

  const fromCreditOut = (
    data &&
    typeof data.creditOutEmployeeName === 'string'
  ) ? data.creditOutEmployeeName.trim() : '';

  const storedName = fromUserSettings || fromCreditOut || '';
  return employeeDirectory ? employeeDirectory.normalizeEmployeeName(storedName) : storedName;
}

function persistEmployeeNameOnce(name, onDone) {
  const selectedName = employeeDirectory
    ? employeeDirectory.normalizeEmployeeName(name)
    : (typeof name === 'string' ? name.trim() : '');
  if (!selectedName) {
    if (typeof onDone === 'function') onDone(false, '', 'empty');
    return;
  }

  chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (localData) => {
    const existingName = getStoredEmployeeNameFromData(localData);
    if (existingName && existingName !== selectedName) {
      if (typeof onDone === 'function') onDone(false, existingName, 'locked');
      return;
    }

    const finalName = existingName || selectedName;
    const nextUserSettings = {
      ...(localData.userSettings || {}),
      employeeName: finalName
    };

    chrome.storage.local.set({
      userSettings: nextUserSettings,
      creditOutEmployeeName: finalName
    }, () => {
      if (typeof onDone === 'function') onDone(true, finalName, existingName ? 'existing' : 'saved');
    });
  });
}

function restoreNativeSelect(selectId) {
  const originalSelect = document.getElementById(selectId);
  if (!originalSelect) return;

  const wrapper = document.querySelector('.wrapper-' + selectId);
  if (wrapper) {
    wrapper.remove();
    dbgUserSettings('restoreNativeSelect: removed custom wrapper for', selectId);
  }

  if (originalSelect.style.display === 'none') {
    originalSelect.style.display = '';
    dbgUserSettings('restoreNativeSelect: restored native select display for', selectId);
  }
}

// Load User Settings
function loadUserSettings() {
  chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (result) => {
    dbgUserSettings('loadUserSettings() -> storage result:', result);
    const savedName = getStoredEmployeeNameFromData(result);
    if (savedName) {
      if (employeeDirectory) employeeDirectory.ensureEmployeeOption(employeeNameSelect, savedName);
      employeeNameSelect.value = savedName;
      if (employeeNameSelect) employeeNameSelect.dispatchEvent(new Event('change'));
      lockEmployeeNameUI(savedName);
      const userSettingsName = (
        result &&
        result.userSettings &&
        typeof result.userSettings.employeeName === 'string'
      ) ? result.userSettings.employeeName.trim() : '';
      if (userSettingsName !== savedName) {
        const nextUserSettings = {
          ...(result.userSettings || {}),
          employeeName: savedName
        };
        chrome.storage.local.set({ userSettings: nextUserSettings, creditOutEmployeeName: savedName });
      }
      dbgUserSettings('Applied+locked employeeName:', employeeNameSelect.value);
    } else {
      unlockEmployeeNameUI();
    }
  });
}

// Save User Settings
if (saveUserSettingsBtn) {
  saveUserSettingsBtn.addEventListener('click', () => {
    if (isEmployeeNameLocked) {
      showToast('تنبيه', 'تم حفظ اسم الموظف ولا يمكن تغييره', 'warning');
      telegramSettingsModal.style.display = 'none';
      dbgUserSettings('Save clicked while locked -> closing modal');
      return;
    }

    const name = employeeNameSelect.value;

    dbgUserSettings('Save clicked. Current select value:', name);

    if (!name) {
      showToast('تنبيه', 'الرجاء اختيار اسم الموظف', 'warning');
      dbgUserSettings('Save blocked: no name selected');
      return;
    }

    persistEmployeeNameOnce(name, (saved, resolvedName, reason) => {
      if (!saved) {
        if (reason === 'locked' && resolvedName) {
          lockEmployeeNameUI(resolvedName);
          showToast('تنبيه', 'تم حفظ اسم الموظف مسبقًا ولا يمكن تغييره', 'warning');
          telegramSettingsModal.style.display = 'none';
          dbgUserSettings('Blocked overwrite attempt. Locked on existing name:', resolvedName);
          return;
        }
        showToast('تنبيه', 'الرجاء اختيار اسم الموظف', 'warning');
        return;
      }

      dbgUserSettings('Saved. Now verifying storage...');
      chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (verify) => {
        dbgUserSettings('Verify after save ->', verify);
      });

      // Lock immediately after first save
      lockEmployeeNameUI(resolvedName || name);

      showToast('تم الحفظ', 'تم حفظ الإعدادات بنجاح', 'default');
      telegramSettingsModal.style.display = 'none';
      dbgUserSettings('Modal closed after save.');
    });
  });
}

// Open Settings (Load saved name)
if (telegramSettingsBtn) {
  telegramSettingsBtn.addEventListener('click', () => {
    dbgUserSettings('Settings (gear) clicked. Opening modal...');
    // Critical reliability: keep Employee Name as native select
    restoreNativeSelect('employee-name-select');
    loadUserSettings();
    telegramSettingsModal.style.display = 'block';
    // Defer to allow custom select to render
    setTimeout(() => {
      const wrapper = document.querySelector('.wrapper-employee-name-select');
      const trigger = wrapper?.querySelector('.custom-select-trigger');
      dbgUserSettings('Modal opened. Wrapper exists?', !!wrapper, 'Trigger exists?', !!trigger);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        dbgUserSettings('Trigger rect:', { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
      }
    }, 0);
  });
}

// Open Google Form Settings
if (googleFormSettingsBtn) {
  googleFormSettingsBtn.addEventListener('click', () => {
    loadGoogleFormSettings();
    googleFormSettingsModal.style.display = 'block';
  });
}

// Close Google Form Settings
if (googleFormSettingsClose) {
  googleFormSettingsClose.addEventListener('click', () => {
    googleFormSettingsModal.style.display = 'none';
  });
}


// Open Settings
if (telegramSettingsBtn) {
  telegramSettingsBtn.addEventListener('click', () => {
    telegramSettingsModal.style.display = 'block';
  });
}

// Close Settings
if (telegramSettingsClose) {
  telegramSettingsClose.addEventListener('click', () => {
    telegramSettingsModal.style.display = 'none';
  });
}
