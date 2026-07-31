document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ipMessage = params.get('ipMessage') || '';
    const country = params.get('country') || '';
    const type = params.get('type') || '';
    const isDuplicate = params.get('isDuplicate') === 'true';
    const lastSentAt = params.get('lastSentAt') || '';
    // Parse IP for display
    let ip = 'Unknown';
    if (ipMessage) {
        const match = ipMessage.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        if (match) ip = match[0];
    } else {
        ip = 'N/A';
    }

    // Show duplicate notice if previously sent/reported
    const duplicateNotice = document.getElementById('duplicateNotice');
    const updateDuplicateNotice = (sentTime) => {
        if (!duplicateNotice) return;
        duplicateNotice.classList.remove('hidden');
        if (sentTime) {
            duplicateNotice.textContent = `⚠️ تنبيه: تم إرسال تقرير لهذا الـ IP مسبقاً بتاريخ ${sentTime}`;
        } else {
            duplicateNotice.textContent = `⚠️ تنبيه: تم نسخ / إرسال تقرير لهذا الـ IP مسبقاً`;
        }
    };

    if (isDuplicate || lastSentAt) {
        updateDuplicateNotice(lastSentAt);
    } else if (ip && ip !== 'Unknown' && ip !== 'N/A') {
        chrome.storage.local.get(['sentSecurityAlerts'], (res) => {
            let foundSentTime = '';
            if (res.sentSecurityAlerts && res.sentSecurityAlerts.ips && res.sentSecurityAlerts.ips[ip]) {
                const rec = res.sentSecurityAlerts.ips[ip];
                if (rec.lastSentAt) {
                    try {
                        foundSentTime = new Date(rec.lastSentAt).toLocaleString('ar-EG', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', hour12: true
                        });
                    } catch (e) {
                        foundSentTime = new Date(rec.lastSentAt).toLocaleString();
                    }
                }
            }
            if (foundSentTime) {
                updateDuplicateNotice(foundSentTime);
            }
        });
    }

    const ipDisplay = document.getElementById('ipDisplay');
    ipDisplay.textContent = ip;

    // Make IP clickable for copying
    ipDisplay.style.cursor = 'pointer';
    ipDisplay.title = 'انقر لنسخ الـ IP';
    ipDisplay.addEventListener('click', () => {
        navigator.clipboard.writeText(ipDisplay.textContent).then(() => {
            const originalText = ipDisplay.textContent;
            ipDisplay.textContent = '✅ تم النسخ';
            setTimeout(() => { ipDisplay.textContent = originalText; }, 1000);
        });
    });
    
    // Better country display
    let displayCountry = country;
    const govMatch = ipMessage.match(/المحافظة:\s*([^\n\r]+)/);
    const gov = govMatch ? govMatch[1].trim() : '';

    if (gov && gov !== 'N/A' && gov !== 'Unknown') {
        if (type === 'IQ') {
            displayCountry = 'Iraq (Special Region) // ' + gov;
        } else {
            displayCountry = country + ' // ' + gov;
        }
    } else {
        if (type === 'IQ') {
            displayCountry = 'Iraq (Special Region)';
        } else {
            displayCountry = country;
        }
    }

    const countryDisplay = document.getElementById('countryDisplay');
    countryDisplay.textContent = displayCountry;

    // Make Country clickable for copying
    countryDisplay.style.cursor = 'pointer';
    countryDisplay.title = 'انقر لنسخ الدولة والمحافظة';
    countryDisplay.addEventListener('click', () => {
        navigator.clipboard.writeText(countryDisplay.textContent).then(() => {
            const originalText = countryDisplay.textContent;
            countryDisplay.textContent = '✅ تم النسخ';
            setTimeout(() => { countryDisplay.textContent = originalText; }, 1000);
        });
    });

    // Focus input
    const accountInput = document.getElementById('accountNumber');
    const customerEmailInput = document.getElementById('customerEmail');
    const errorMsg = document.getElementById('errorMsg');
    accountInput.focus();

    // Account number validation regex (6-7 digits only)
    const accountRegex = /^\d{6,7}$/;

    // Show/hide error message
    const showError = (msg) => {
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
        }
    };

    const hideError = () => {
        if (errorMsg) {
            errorMsg.classList.add('hidden');
        }
    };

    // Validate account number
    const validateAccount = (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return false; // Empty is NOT allowed (required field)
        }
        if (!accountRegex.test(trimmed)) {
            return false;
        }
        return true;
    };

    // Real-time validation on input
    accountInput.addEventListener('input', () => {
        const val = accountInput.value.trim();
        if (val && !accountRegex.test(val)) {
            showError('⚠️ رقم الحساب يجب أن يكون 6-7 أرقام فقط');
        } else {
            hideError();
        }
    });

    // Hide error when group type is selected
    const groupTypeSelect = document.getElementById('groupType');
    if (groupTypeSelect) {
        groupTypeSelect.addEventListener('change', () => {
            hideError();
        });
    }


    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const accountNumber = accountInput.value.trim();
            const groupType = groupTypeSelect ? groupTypeSelect.value.trim() : '';
            const customerEmail = customerEmailInput ? customerEmailInput.value.trim() : '';
            
            if (!accountNumber) {
                showError('⚠️ رقم الحساب مطلوب للنسخ!');
                accountInput.focus();
                return;
            }
            if (!groupType) {
                showError('⚠️ نوع الجروب مطلوب للنسخ!');
                if (groupTypeSelect) groupTypeSelect.focus();
                return;
            }
            if (!validateAccount(accountNumber)) {
                showError('⚠️ رقم الحساب غير صحيح! يجب أن يكون 6-7 أرقام فقط');
                accountInput.focus();
                return;
            }

            chrome.storage.local.get(['userSettings', 'creditOutEmployeeName'], (result) => {
                let employeeName = '';
                if (result.userSettings && typeof result.userSettings.employeeName === 'string') {
                    employeeName = result.userSettings.employeeName.trim();
                } else if (typeof result.creditOutEmployeeName === 'string') {
                    employeeName = result.creditOutEmployeeName.trim();
                }

                let telegramCountry = country;
                if (type === 'IQ') telegramCountry = 'Iraq (Special Region)';
                
                let telegramDisplayCountry = `\`${telegramCountry}\``;
                if (gov && gov !== 'N/A' && gov !== 'Unknown') {
                    telegramDisplayCountry += ` // \`${gov}\``;
                }
                
                const formattedEmail = customerEmail ? `\`${customerEmail}\`` : '';
                const reportText = `رقم الحساب: \`${accountNumber}\`\nالبريد الإلكتروني للعميل: ${formattedEmail}\nنوع الجروب: ${groupType}\nIP: \`${ip}\` // ${telegramDisplayCountry}\n${employeeName}`;

                navigator.clipboard.writeText(reportText).then(() => {
                    // Mark IP as sent in persistent storage
                    if (ip && ip !== 'Unknown' && ip !== 'N/A') {
                        try {
                            chrome.runtime.sendMessage({
                                type: 'MARK_IP_AS_SENT',
                                ip: ip,
                                accountNumber: accountNumber,
                                groupType: groupType
                            });
                        } catch (e) {
                            console.warn('Failed to send MARK_IP_AS_SENT message:', e);
                        }
                    }

                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ تم النسخ وسيتم الإغلاق';
                    setTimeout(() => {
                        window.close();
                    }, 800);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    showError('⚠️ فشل في نسخ التقرير');
                });
            });
        });
    }

    // Auto-submit on Enter
    accountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission if any
            if (copyBtn) copyBtn.click();
        }
    });

    // Auto-submit on Paste (only if valid account number)
    accountInput.addEventListener('paste', (e) => {
        // Allow the paste to happen first, then validate and submit
        setTimeout(() => {
             const val = accountInput.value.trim();
             if (val && accountRegex.test(val)) {
                 if (copyBtn) copyBtn.click();
             } else if (val) {
                 showError('⚠️ رقم الحساب غير صحيح! يجب أن يكون 6-7 أرقام فقط');
             }
        }, 100);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.close();
        }
    });
});
