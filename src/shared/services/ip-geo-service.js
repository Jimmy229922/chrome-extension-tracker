(function (global) {
  'use strict';

  function getClient() {
    return global.IPGeoClient || null;
  }

  function normalizeIPv4(raw) {
    const client = getClient();
    if (client && typeof client.normalizeIPv4 === 'function') {
      return client.normalizeIPv4(raw);
    }

    if (typeof raw !== 'string') return '';
    const value = raw.trim();
    if (!value) return '';
    const parts = value.split('.');
    if (parts.length !== 4) return '';
    for (const part of parts) {
      if (!/^\d+$/.test(part)) return '';
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return '';
    }
    return value;
  }

  function isCountryResolved(countryText) {
    const value = (countryText || '').toString().trim();
    const client = getClient();
    if (client && typeof client.isCountryTextResolved === 'function') {
      return client.isCountryTextResolved(value);
    }
    return !!value && value !== 'Unknown' && value !== 'Error';
  }

  async function lookupCountryDisplay(ip, options) {
    const fallback = (options && options.fallback) || 'Unknown';
    const normalized = normalizeIPv4(ip);
    if (!normalized) {
      return {
        success: false,
        country: fallback,
        resolved: false,
        error: 'Invalid IP format'
      };
    }

    const client = getClient();
    if (!client) {
      return {
        success: false,
        country: fallback,
        resolved: false,
        error: 'IPGeoClient unavailable'
      };
    }

    try {
      const result = client.lookupWithRetry
        ? await client.lookupWithRetry(normalized, { attempts: 3, retryDelayMs: 120 })
        : await client.lookup(normalized);

      if (!result || !result.success) {
        return {
          success: false,
          country: fallback,
          resolved: false,
          error: (result && result.error) || 'Lookup failed'
        };
      }

      const country = client.toCountryDisplay(result.data, fallback);
      return {
        success: true,
        country,
        resolved: isCountryResolved(country),
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        country: 'Error',
        resolved: false,
        error: error && error.message ? error.message : String(error)
      };
    }
  }

  global.IPGeoService = Object.freeze({
    getClient,
    normalizeIPv4,
    isCountryResolved,
    lookupCountryDisplay
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
