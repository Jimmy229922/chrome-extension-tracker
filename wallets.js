document.addEventListener('DOMContentLoaded', loadWallets);

document.getElementById('clear-wallets').addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من مسح جميع سجلات المحافظ؟')) {
        await chrome.storage.local.remove('walletNotes');
        loadWallets();
    }
});

async function loadWallets() {
    const data = await chrome.storage.local.get('walletNotes');
    const walletNotes = data.walletNotes || {};
    const container = document.getElementById('wallets-list');
    
    container.innerHTML = '';

    const addresses = Object.keys(walletNotes);

    if (addresses.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد محافظ محفوظة حالياً</div>';
        return;
    }

    // Sort addresses? Maybe not needed, but consistent order is nice. 
    // Since it's an object, order isn't guaranteed, but we can just list them.
    
    addresses.forEach(address => {
        const note = walletNotes[address];
        const item = document.createElement('div');
        item.className = 'wallet-item';
        
        item.innerHTML = `
            <div class="wallet-info">
                <div class="wallet-address">${address}</div>
                <div class="wallet-note">📝 ${note}</div>
            </div>
        `;
        
        container.appendChild(item);
    });
}