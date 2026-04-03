async function fetchIpInfo(ip) {
  if (!ip) return false;
  try {
    const ipGeoService = getTransferIpGeoService();
    const result = ipGeoService
      ? await ipGeoService.lookupCountryDisplay(ip, { fallback: 'Unknown' })
      : { success: false, country: 'Unknown', error: 'IPGeoService unavailable' };

    if (result.success) {
      const display = result.country;
      reportCountryInput.value = display;
      if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
      return !!result.resolved;
    }

    console.warn('IP lookup failed:', result.error);
    reportCountryInput.value = result.country || 'Unknown';
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
    return false;
  } catch (error) {
    console.error('Error fetching IP info:', error);
    reportCountryInput.value = 'Error';
    if (reportCountryInput) applyFieldCompletionState(reportCountryInput);
    return false;
  }
}
async function ensureCountryForInputs(ipInputEl, countryInputEl, fetcherFn, normalizeIpFn) {
  if (!ipInputEl || !countryInputEl || typeof fetcherFn !== 'function') return false;

  const rawIp = (ipInputEl.value || '').trim();
  if (!rawIp) return false;

  const ipGeoService = getTransferIpGeoService();
  let cleanIp = rawIp;
  const extracted = rawIp.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (extracted && extracted[0]) cleanIp = extracted[0];

  if (typeof normalizeIpFn === 'function') {
    const normalized = normalizeIpFn(rawIp);
    if (!normalized) return false;
    cleanIp = normalized;
  } else if (ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function') {
    const normalized = ipGeoService.normalizeIPv4(rawIp);
    if (normalized) cleanIp = normalized;
  }

  if (cleanIp !== rawIp) ipInputEl.value = cleanIp;

  const currentCountry = (countryInputEl.value || '').trim();
  if (ipGeoService && typeof ipGeoService.isCountryResolved === 'function' && ipGeoService.isCountryResolved(currentCountry)) {
    return true;
  }

  const ok = await fetcherFn(cleanIp);
  if (ok) return true;

  const finalCountry = (countryInputEl.value || '').trim();
  if (ipGeoService && typeof ipGeoService.isCountryResolved === 'function') {
    return ipGeoService.isCountryResolved(finalCountry);
  }

  return !!finalCountry && finalCountry !== 'Unknown' && finalCountry !== 'Error';
}
// Auto-fill IP Country & Navigation
if (reportIpInput) {
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  // Fetch on blur (manual typing)
  reportIpInput.addEventListener('blur', () => {
    const val = reportIpInput.value.trim();
    const cleanIp = extractIp(val);
    
    if (cleanIp) {
      if (cleanIp !== val) reportIpInput.value = cleanIp;
      fetchIpInfo(cleanIp);
    } else if (val !== '') {
      // Check if it's Account or Email
      if (isAccount(val)) {
        reportAccountInput.value = val;
        reportIpInput.value = '';
        showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        reportAccountInput.focus();
      } else if (isEmail(val)) {
        reportEmailInput.value = val;
        reportIpInput.value = '';
        showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
        reportEmailInput.focus();
      } else {
        showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
      }
    }
  });

  // Fetch and Auto-advance on paste
  reportIpInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      const val = reportIpInput.value.trim();
      const cleanIp = extractIp(val);
      
      if (cleanIp) {
        reportIpInput.value = cleanIp;
        fetchIpInfo(cleanIp);
        reportAccountInput.focus();
      } else if (val !== '') {
        if (isAccount(val)) {
          reportAccountInput.value = val;
          reportIpInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
          reportAccountInput.focus();
        } else if (isEmail(val)) {
          reportEmailInput.value = val;
          reportIpInput.value = '';
          showToast('تنبيه', 'تم نقل الإيميل للحقل المخصص', 'warning');
          reportEmailInput.focus();
        } else {
          reportIpInput.value = '';
          showToast('تنبيه', 'حقل IP يقبل عناوين IP فقط', 'warning');
        }
      }
    }, 10);
  });

  // Enter key navigation
  reportIpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportAccountInput.focus();
    }
  });
}

// Email Filtering
if (reportEmailInput) {
  const extractEmail = (text) => {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  };
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());

  reportEmailInput.addEventListener('blur', () => {
    const val = reportEmailInput.value.trim();
    const cleanEmail = extractEmail(val);
    
    if (cleanEmail) {
      if (cleanEmail !== val) reportEmailInput.value = cleanEmail;
    } else if (val !== '') {
      if (isAccount(val)) {
        reportAccountInput.value = val;
        reportEmailInput.value = '';
        showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
        reportAccountInput.focus();
      } else if (extractIp(val)) {
        const ip = extractIp(val);
        reportIpInput.value = ip;
        reportEmailInput.value = '';
        fetchIpInfo(ip);
        showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
        reportIpInput.focus();
      } else {
        showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
      }
    }
  });

  reportEmailInput.addEventListener('paste', () => {
    setTimeout(() => {
      const val = reportEmailInput.value.trim();
      const cleanEmail = extractEmail(val);
      
      if (cleanEmail) {
        reportEmailInput.value = cleanEmail;
        // Auto advance logic if needed
      } else if (val !== '') {
        if (isAccount(val)) {
          reportAccountInput.value = val;
          reportEmailInput.value = '';
          showToast('تنبيه', 'تم نقل رقم الحساب للحقل المخصص', 'warning');
          reportAccountInput.focus();
        } else if (extractIp(val)) {
          const ip = extractIp(val);
          reportIpInput.value = ip;
          reportEmailInput.value = '';
          fetchIpInfo(ip);
          showToast('تنبيه', 'تم نقل IP للحقل المخصص', 'warning');
          reportIpInput.focus();
        } else {
          reportEmailInput.value = '';
          showToast('تنبيه', 'حقل الإيميل يقبل إيميلات فقط', 'warning');
        }
      }
    }, 10);
  });
}
