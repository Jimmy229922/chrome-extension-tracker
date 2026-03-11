// Shared client for IP geolocation lookup from UI pages.
// Uses background message `lookupIp` so provider fallback stays centralized.
(function (global) {
  'use strict';

  const I18N_FALLBACK = {
    invalidIpFormat: 'Invalid IP format',
    lookupFailed: 'Lookup failed',
    unknown: 'Unknown',
    searchingText: 'جاري البحث...',
    unavailableText: 'غير متوفرة',
    unspecifiedText: 'غير محدد'
  };

  let i18n = { ...I18N_FALLBACK };
  let i18nLoadPromise = null;

  function getPreferredLocaleCode() {
    try {
      const uiLang = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : '') || '';
      return uiLang.toLowerCase().startsWith('en') ? 'en' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(key) {
    if (!key) return '';
    if (Object.prototype.hasOwnProperty.call(i18n, key)) return i18n[key];
    if (Object.prototype.hasOwnProperty.call(I18N_FALLBACK, key)) return I18N_FALLBACK[key];
    return key;
  }

  async function loadI18n(forceReload) {
    if (!forceReload && i18nLoadPromise) return i18nLoadPromise;

    i18nLoadPromise = (async function () {
      const locale = getPreferredLocaleCode();
      const fileName = locale === 'en' ? 'en.json' : 'ar.json';
      try {
        const response = await fetch(chrome.runtime.getURL(fileName), { cache: 'no-cache' });
        if (!response.ok) throw new Error('i18n file not found');
        const data = await response.json();
        const section = data && data.ipGeoClient && typeof data.ipGeoClient === 'object' ? data.ipGeoClient : {};
        i18n = { ...I18N_FALLBACK, ...section };
      } catch (error) {
        i18n = { ...I18N_FALLBACK };
      }
    })();

    return i18nLoadPromise;
  }

  loadI18n(false).catch(function () {});

  const LOOKUP_CACHE_TTL_MS = 30 * 60 * 1000;
  const lookupCache = new Map(); // ip -> { data, expiresAt }
  const inflightRequests = new Map(); // ip -> Promise<result>

  function normalizeIPv4(ip) {
    if (typeof ip !== 'string') return '';
    const value = ip.trim();
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

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isCountryDataResolved(data) {
    if (!data || typeof data !== 'object') return false;
    const country = (data.country || '').toString().trim();
    const countryCode = (data.country_code || '').toString().trim();
    return !!(country && !isCountryTextResolved(country)) || !!countryCode;
  }

  async function lookup(ip, options) {
    const normalizedIp = normalizeIPv4(ip);
    if (!normalizedIp) return { success: false, error: t('invalidIpFormat') };

    const forceRefresh = !!(options && options.forceRefresh);
    if (!forceRefresh) {
      const cached = lookupCache.get(normalizedIp);
      if (cached && cached.expiresAt > Date.now() && cached.data) {
        return { success: true, data: cached.data, source: 'cache' };
      }
    }

    if (!forceRefresh && inflightRequests.has(normalizedIp)) {
      return inflightRequests.get(normalizedIp);
    }

    const requestPromise = (async function () {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'lookupIp',
          ip: normalizedIp,
          forceRefresh: forceRefresh
        });
        if (response && response.data) {
          lookupCache.set(normalizedIp, {
            data: response.data,
            expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS
          });
          return { success: true, data: response.data };
        }
        return { success: false, error: (response && response.error) || t('lookupFailed') };
      } catch (error) {
        return { success: false, error: error && error.message ? error.message : String(error) };
      } finally {
        inflightRequests.delete(normalizedIp);
      }
    })();

    inflightRequests.set(normalizedIp, requestPromise);
    return requestPromise;
  }

  async function lookupWithRetry(ip, options) {
    const attempts = Math.max(1, Number((options && options.attempts) || 3));
    const retryDelayMs = Math.max(0, Number((options && options.retryDelayMs) || 120));
    const initialForceRefresh = !!(options && options.forceRefresh);
    let lastResult = { success: false, error: t('lookupFailed') };

    for (let i = 0; i < attempts; i += 1) {
      const forceRefresh = initialForceRefresh || i > 0;
      const result = await lookup(ip, { forceRefresh: forceRefresh });
      if (result.success && isCountryDataResolved(result.data)) return result;
      lastResult = result;
      if (i < attempts - 1) await wait(retryDelayMs);
    }

    return lastResult;
  }

  function isCountryTextResolved(text) {
    if (typeof text !== 'string') return false;
    const v = text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!v) return false;
    if (['unknown', 'error', 'n/a', 'null', 'undefined'].includes(v)) return false;

    const localizedUnresolved = [
      t('searchingText'),
      t('unavailableText'),
      t('unspecifiedText')
    ]
      .map(function (value) { return (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' '); })
      .filter(Boolean);

    if (localizedUnresolved.includes(v)) return false;
    return true;
  }

  function toCountryDisplay(data, fallbackText) {
    const fallback = fallbackText || t('unknown');
    if (!data || typeof data !== 'object') return fallback;

    const countryRaw = (data.country || '').toString().trim();
    const country = isCountryTextResolved(countryRaw) ? countryRaw : fallback;
    const city = (data.city || data.region || data.region_name || '').toString().trim();
    return city ? (country + ' - (' + city + ')') : country;
  }

  async function ensureCountry(ip, fallbackText, options) {
    const lookupResult = await lookupWithRetry(ip, options);
    if (lookupResult.success) {
      const countryDisplay = toCountryDisplay(lookupResult.data, fallbackText || t('unknown'));
      if (isCountryTextResolved(countryDisplay)) {
        return { success: true, countryDisplay: countryDisplay, data: lookupResult.data };
      }
    }
    return {
      success: false,
      countryDisplay: fallbackText || t('unknown'),
      error: lookupResult.error || t('lookupFailed')
    };
  }

  function clearCache() {
    lookupCache.clear();
    inflightRequests.clear();
  }

  function getCacheStats() {
    return { cacheSize: lookupCache.size, inflightSize: inflightRequests.size };
  }

  global.IPGeoClient = {
    lookup: lookup,
    lookupWithRetry: lookupWithRetry,
    ensureCountry: ensureCountry,
    normalizeIPv4: normalizeIPv4,
    isCountryDataResolved: isCountryDataResolved,
    isCountryTextResolved: isCountryTextResolved,
    toCountryDisplay: toCountryDisplay,
    clearCache: clearCache,
    getCacheStats: getCacheStats
  };
})(window);
