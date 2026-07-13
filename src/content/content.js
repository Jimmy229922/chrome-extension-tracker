(() => {
  'use strict';

  function readPortalToken() {
    try {
      const token = window.localStorage.getItem('token');
      return typeof token === 'string' ? token.trim() : '';
    } catch (e) {
      return '';
    }
  }

  let lastAuthenticatedState = null;

  function notifyPortalAuthState() {
    const authenticated = !!readPortalToken();
    if (authenticated === lastAuthenticatedState) return;
    lastAuthenticatedState = authenticated;
    chrome.runtime.sendMessage({ type: 'PORTAL_AUTH_STATE_CHANGED', authenticated }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'GET_PORTAL_TOKEN') return false;
    sendResponse({ token: readPortalToken() });
    return false;
  });

  window.addEventListener('storage', event => {
    if (event.key === 'token') notifyPortalAuthState();
  });
  window.addEventListener('pagehide', () => {
    chrome.runtime.sendMessage({ type: 'PORTAL_AUTH_STATE_CHANGED', authenticated: false }).catch(() => {});
  });

  notifyPortalAuthState();
  window.setInterval(notifyPortalAuthState, 1000);
})();
