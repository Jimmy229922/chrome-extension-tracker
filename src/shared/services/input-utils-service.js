(function (global) {
  'use strict';

  function extractIPv4(text) {
    const source = (text || '').toString();
    const match = source.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '';
  }

  function isEmail(text) {
    return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test((text || '').toString());
  }

  function isAccountId(text) {
    return /^\d{6,7}$/.test(((text || '').toString()).trim());
  }

  function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.InputUtilsService = Object.freeze({
    extractIPv4,
    isEmail,
    isAccountId,
    escapeHtml
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
