(function (global) {
  'use strict';

  const config = Object.freeze({
    telegram: Object.freeze({
      token: '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA',
      chatId: '-1003692121203'
    }),
    mentions: Object.freeze({
      ahmed: '@ahmedelgma',
      batoul: '@batoulhassan'
    }),
    storageKeys: Object.freeze({
      criticalWatchlist: 'criticalWatchlist',
      withdrawalDraft: 'withdrawalReportDraft'
    })
  });

  global.SidepanelConfig = config;
  global.getSidepanelConfig = function getSidepanelConfig() {
    return config;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
