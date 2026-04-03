// Generate and Copy Report
if (generateReportBtn) {
  generateReportBtn.addEventListener('click', async () => {
    const ipGeoService = getTransferIpGeoService();
    const hasIpBeforeCopy = !!reportIpInput.value.trim();
    if (hasIpBeforeCopy) {
      const countryReady = await ensureCountryForInputs(
        reportIpInput,
        reportCountryInput,
        fetchIpInfo,
        ipGeoService && typeof ipGeoService.normalizeIPv4 === 'function'
          ? ipGeoService.normalizeIPv4
          : null
      );
      if (!countryReady) {
        showToast('تنبيه', 'تعذر تحديد الدولة لهذا الـ IP. تحقق من صحة العنوان ثم حاول مرة أخرى.', 'warning');
        return;
      }
    }

    const ip = reportIpInput.value.trim();
    const country = reportCountryInput.value.trim();
    const account = reportAccountInput.value.trim();
    const email = reportEmailInput.value.trim();
    let source = reportSourceInput.value;
    if (source === 'Other' && reportSourceCustomInput) {
      source = reportSourceCustomInput.value.trim() || 'Other';
    }
    let profits = reportProfitsInput.value;
    if (profits === 'Other' && reportProfitsCustomInput) {
      profits = reportProfitsCustomInput.value.trim() || 'Other';
    }
    const notes = reportNotesInput.value.trim();

    const report = `تقرير تحويل الحسابات

ip country: ${country}
IP: ${ip}
الإيميل: ${email}
رقم الحساب: ${account}
مصدر التحويل: ${source}
الارباح: ${profits}
الملاحظات: ${notes}

#account_transfer`;

    try {
      await navigator.clipboard.writeText(report);
      showToast('تم النسخ', 'تم نسخ التقرير إلى الحافظة', 'default');
    } catch (err) {
      console.error('Failed to copy report:', err);
      showToast('خطأ', 'فشل نسخ التقرير', 'warning');
    }
  });
}

// Reset Report Form
if (resetReportBtn) {
  resetReportBtn.addEventListener('click', () => {
    if (reportIpInput) reportIpInput.value = '';
    if (reportCountryInput) reportCountryInput.value = '';
    if (reportAccountInput) reportAccountInput.value = '';
    if (reportEmailInput) reportEmailInput.value = '';
    if (reportSourceInput) reportSourceInput.value = 'suspicious traders';
    if (reportProfitsInput) reportProfitsInput.value = 'ارباح بالسالب';
    if (reportProfitsCustomInput) {
        reportProfitsCustomInput.value = '';
        reportProfitsCustomInput.style.display = 'none';
    }
    if (document.getElementById('report-old-group')) document.getElementById('report-old-group').value = '';
    if (document.getElementById('report-new-group')) document.getElementById('report-new-group').value = '';
    if (reportNotesInput) reportNotesInput.value = '';
    
    // Reset Shift (Auto Detect)
    if (typeof autoDetectShift === 'function') {
      autoDetectShift();
    } else {
      // Fallback if function not ready
      const reportShiftInput = document.getElementById('report-shift');
      const shiftBtns = document.querySelectorAll('#transfer-report-section .shift-btn:not(.deposit-shift-btn):not(.credit-out-shift-btn)');
      if (reportShiftInput) reportShiftInput.value = '';
      if (shiftBtns) shiftBtns.forEach(b => b.classList.remove('active'));
    }
    
    // Reset Mentions
    const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
    const mentionBatoulBtn = document.getElementById('mention-batoul-btn');
    if (mentionAhmedBtn) mentionAhmedBtn.classList.remove('active');
    if (mentionBatoulBtn) mentionBatoulBtn.classList.remove('active');

    // Reset Images
    selectedImages = [];
    renderImagePreviews();
    
    showToast('تم إعادة التعيين', 'تم مسح جميع الحقول', 'default');
  });
}
