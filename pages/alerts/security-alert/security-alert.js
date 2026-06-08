document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ipMessage = params.get('ipMessage') || '';
    const country = params.get('country') || '';
    const type = params.get('type') || '';

    // Parse IP for display
    let ip = 'Unknown';
    if (ipMessage) {
        const match = ipMessage.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        if (match) ip = match[0];
    } else {
        ip = 'N/A';
    }

    document.getElementById('ipDisplay').textContent = ip;
    
    // Better country display
    let displayCountry = country;
    if (type === 'IQ') {
        displayCountry = 'Iraq (Special Region) - ' + (ipMessage.match(/المحافظة:\s*(.+)/)?.[1] || 'Unknown');
    }
    document.getElementById('countryDisplay').textContent = displayCountry;

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

                const reportText = `رقم الحساب: ${accountNumber}\nالبريد الإلكتروني للعميل:${customerEmail}\nنوع الجروب: ${groupType}\nIP:${ip} // ${displayCountry}\n${employeeName}`;

                navigator.clipboard.writeText(reportText).then(() => {
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
