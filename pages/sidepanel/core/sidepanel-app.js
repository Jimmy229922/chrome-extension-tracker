(function (global) {
  'use strict';

  const featureRegistry = new Map();
  const initializedFeatures = new Set();

  function resolveService(name, fallback) {
    const app = global.SidepanelApp;
    if (app && app.services && app.services[name]) return app.services[name];
    return fallback || null;
  }

  function resolveConfig() {
    return global.SidepanelConfig || null;
  }

  function createDeps() {
    return Object.freeze({
      services: Object.freeze({
        storage: resolveService('storage', global.StorageService),
        ipGeo: resolveService('ipGeo', global.IPGeoService),
        reportSubmit: resolveService('reportSubmit', global.ReportSubmitService),
        inputUtils: resolveService('inputUtils', global.InputUtilsService)
      }),
      config: resolveConfig(),
      utils: Object.freeze({
        showToast: typeof global.showToast === 'function' ? global.showToast : function () {}
      })
    });
  }

  function registerFeature(name, initializer) {
    if (!name || typeof initializer !== 'function') return;
    featureRegistry.set(name, initializer);
  }

  function initFeature(name) {
    if (!featureRegistry.has(name)) return;
    if (initializedFeatures.has(name)) return;

    const initializer = featureRegistry.get(name);
    initializedFeatures.add(name);
    initializer(createDeps());
  }

  function initAllFeatures() {
    for (const name of featureRegistry.keys()) {
      initFeature(name);
    }
  }

  function getService(name) {
    const deps = createDeps();
    return deps.services[name] || null;
  }

  function getConfig() {
    const deps = createDeps();
    return deps.config || null;
  }

  global.SidepanelApp = Object.freeze({
    services: Object.freeze({
      storage: global.StorageService || null,
      ipGeo: global.IPGeoService || null,
      reportSubmit: global.ReportSubmitService || null,
      inputUtils: global.InputUtilsService || null
    }),
    config: resolveConfig(),
    createDeps,
    registerFeature,
    initFeature,
    initAllFeatures,
    getService,
    getConfig
  });

  global.getStorageService = function getStorageService() {
    return getService('storage');
  };

  global.getIpGeoService = function getIpGeoService() {
    return getService('ipGeo');
  };

  global.getReportSubmitService = function getReportSubmitService() {
    return getService('reportSubmit');
  };

  global.getInputUtilsService = function getInputUtilsService() {
    return getService('inputUtils');
  };

  global.getSidepanelConfig = global.getSidepanelConfig || function getSidepanelConfig() {
    return getConfig();
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
