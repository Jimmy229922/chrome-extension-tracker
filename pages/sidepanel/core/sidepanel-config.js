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
    }),
    watchlist: Object.freeze({
      defaultIps: Object.freeze(['166.88.54.203', '166.88.167.40', '77.76.9.250'])
    })
  });

  global.SidepanelConfig = config;
  global.getSidepanelConfig = function getSidepanelConfig() {
    return config;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
