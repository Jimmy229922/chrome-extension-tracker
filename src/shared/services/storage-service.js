(function (global) {
  'use strict';

  function normalizeKeys(keys) {
    if (typeof keys === 'undefined' || keys === null) return null;
    if (Array.isArray(keys)) return keys;
    if (typeof keys === 'string') return [keys];
    return keys;
  }

  function createArea(areaName) {
    const area = chrome && chrome.storage ? chrome.storage[areaName] : null;

    async function get(keys) {
      if (!area || typeof area.get !== 'function') return {};
      const normalized = normalizeKeys(keys);
      return area.get(normalized);
    }

    async function getOne(key, fallbackValue) {
      if (!key) return fallbackValue;
      const data = await get([key]);
      if (!data || !Object.prototype.hasOwnProperty.call(data, key)) return fallbackValue;
      return data[key];
    }

    async function set(data) {
      if (!area || typeof area.set !== 'function') return;
      return area.set(data || {});
    }

    async function remove(keys) {
      if (!area || typeof area.remove !== 'function') return;
      const normalized = normalizeKeys(keys);
      if (!normalized) return;
      return area.remove(normalized);
    }

    return Object.freeze({
      get,
      getOne,
      set,
      remove
    });
  }

  global.StorageService = Object.freeze({
    local: createArea('local'),
    sync: createArea('sync')
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);

