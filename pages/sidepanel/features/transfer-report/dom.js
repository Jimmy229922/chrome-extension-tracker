// Source Custom Input Toggle
if (reportSourceInput && reportSourceCustomInput) {
  reportSourceInput.addEventListener('change', () => {
    if (reportSourceInput.value === 'Other') {
      reportSourceCustomInput.style.display = 'block';
      reportSourceCustomInput.focus();
    } else {
      reportSourceCustomInput.style.display = 'none';
    }
  });
}

// Profits Custom Input Toggle
if (reportProfitsInput && reportProfitsCustomInput) {
  reportProfitsInput.addEventListener('change', () => {
    if (reportProfitsInput.value === 'Other') {
      reportProfitsCustomInput.style.display = 'block';
      reportProfitsCustomInput.focus();
    } else {
      reportProfitsCustomInput.style.display = 'none';
    }
  });
}


if (reportAccountInput) {
  // Helper to check if text is email
  const isEmail = (text) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  // Helper to check if text is valid account (6 or 7 digits)
  const isAccount = (text) => /^\d{6,7}$/.test(text.trim());
  // Helper to check if text is IP
  const extractIp = (text) => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  };

  // Handle Paste
  reportAccountInput.addEventListener('paste', (e) => {
    // We use setTimeout to get the value AFTER paste
    setTimeout(() => {
      const val = reportAccountInput.value.trim();
      
      if (isEmail(val)) {
        // It's an email! Move it.
        reportEmailInput.value = val;
        reportAccountInput.value = '';
        showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل الإيميل لحقله المخصص', 'warning');
        reportEmailInput.focus(); // Focus email field
      } else if (extractIp(val)) {
        // It's an IP! Move it.
        const ip = extractIp(val);
        reportIpInput.value = ip;
        reportAccountInput.value = '';
        fetchIpInfo(ip);
        showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل IP لحقله المخصص', 'warning');
        reportIpInput.focus();
      } else if (isAccount(val)) {
        // Valid account, just auto-advance
        reportEmailInput.focus();
      } else {
        // Invalid account format
        if (val !== '') {
           reportAccountInput.value = '';
           showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
        }
      }
    }, 10);
  });

  // Handle Blur (Validation)
  reportAccountInput.addEventListener('blur', () => {
      const val = reportAccountInput.value.trim();
      if (val !== '' && !isAccount(val)) {
          // Check if it's an email that was typed manually?
          if (isEmail(val)) {
              reportEmailInput.value = val;
              reportAccountInput.value = '';
              showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل الإيميل لحقله المخصص', 'warning');
          } else if (extractIp(val)) {
              const ip = extractIp(val);
              reportIpInput.value = ip;
              reportAccountInput.value = '';
              fetchIpInfo(ip);
              showToast('تنبيه', 'هذا حقل رقم الحساب، تم نقل IP لحقله المخصص', 'warning');
          } else {
              reportAccountInput.value = '';
              showToast('تنبيه', 'رقم الحساب يجب أن يكون 6 أو 7 أرقام فقط', 'warning');
          }
      }
  });

  reportAccountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportEmailInput.focus();
    }
  });
}

if (reportEmailInput) {
  // Auto-advance on paste
  reportEmailInput.addEventListener('paste', () => {
    setTimeout(() => {
      reportSourceInput.focus();
    }, 10);
  });

  reportEmailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reportSourceInput.focus();
    }
  });
}

if (reportSourceInput) {
  reportSourceInput.addEventListener('change', () => {
    // reportNotesInput.focus(); // Removed to prevent auto-opening notes modal
  });
  // Also support Enter key to move to notes if user just tabs to it and presses Enter
  reportSourceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // reportNotesInput.focus(); // Removed to prevent auto-opening notes modal
    }
  });
}
