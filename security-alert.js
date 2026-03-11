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

    const sendReport = () => {
        const accountNumber = accountInput.value.trim();
        const groupType = groupTypeSelect ? groupTypeSelect.value.trim() : '';
        
        // Check required fields
        if (!accountNumber) {
            showError('⚠️ رقم الحساب مطلوب!');
            accountInput.focus();
            return;
        }
        
        if (!groupType) {
            showError('⚠️ نوع الجروب مطلوب!');
            if (groupTypeSelect) groupTypeSelect.focus();
            return;
        }
        
        // Validate account number format
        if (!validateAccount(accountNumber)) {
            showError('⚠️ رقم الحساب غير صحيح! يجب أن يكون 6-7 أرقام فقط');
            accountInput.focus();
            return;
        }

        const btn = document.getElementById('sendBtn');
        btn.disabled = true;
        const defaultText = 'إرسال التقرير';
        btn.textContent = 'جاري الإرسال...';
        
        chrome.runtime.sendMessage({
            action: 'sendSecurityAlert',
            ipMessage: ipMessage,
            country: country,
            type: type,
            accountNumber: accountNumber,
            groupType: groupType
        }, (response) => {
            if (chrome.runtime.lastError) {
                showError(`⚠️ فشل الإرسال: ${chrome.runtime.lastError.message}`);
                btn.disabled = false;
                btn.textContent = defaultText;
                return;
            }

            if (!response || response.success !== true) {
                const reason = response && response.error ? response.error : 'سبب غير معروف';
                showError(`⚠️ لم يتم الإرسال إلى Telegram: ${reason}`);
                btn.disabled = false;
                btn.textContent = defaultText;
                return;
            }

            window.close();
        });
    };

    document.getElementById('sendBtn').addEventListener('click', sendReport);
    
    // Auto-submit on Enter
    accountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission if any
            sendReport();
        }
    });

    // Auto-submit on Paste (only if valid account number)
    accountInput.addEventListener('paste', (e) => {
        // Allow the paste to happen first, then validate and submit
        setTimeout(() => {
             const val = accountInput.value.trim();
             if (val && accountRegex.test(val)) {
                 sendReport();
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
