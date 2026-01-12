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
    accountInput.focus();

    const sendReport = () => {
        const accountNumber = accountInput.value.trim();
        const btn = document.getElementById('sendBtn');
        btn.disabled = true;
        btn.textContent = '...';
        
        chrome.runtime.sendMessage({
            action: 'sendSecurityAlert',
            ipMessage: ipMessage,
            country: country,
            type: type,
            accountNumber: accountNumber
        }, (response) => {
            // Close immediately without showing success screen
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

    // Auto-submit on Paste
    accountInput.addEventListener('paste', (e) => {
        // Allow the paste to happen first, then submit
        setTimeout(() => {
             const val = accountInput.value.trim();
             if (val.length >= 5) { // Basic sanity check
                 sendReport();
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
