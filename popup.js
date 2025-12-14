document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggle-switch');

  // Load the saved state
  chrome.storage.local.get('isTrackingEnabled', (data) => {
    toggleSwitch.checked = data.isTrackingEnabled !== false; // default to true
  });

  // Save the state when the switch is toggled
  toggleSwitch.addEventListener('change', () => {
    chrome.storage.local.set({ isTrackingEnabled: toggleSwitch.checked });
  });

  const openWalletsBtn = document.getElementById('open-wallets');
  if (openWalletsBtn) {
    openWalletsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'wallets.html' });
    });
  }
});