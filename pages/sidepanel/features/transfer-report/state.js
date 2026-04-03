// --- Transfer Report Logic ---

function getTransferStorageService() {
  return typeof getStorageService === 'function' ? getStorageService() : null;
}

function getTransferIpGeoService() {
  return typeof getIpGeoService === 'function' ? getIpGeoService() : null;
}

function getTransferReportSubmitService() {
  return typeof getReportSubmitService === 'function' ? getReportSubmitService() : null;
}

function getTransferConfig() {
  return typeof getSidepanelConfig === 'function' ? getSidepanelConfig() : (window.SidepanelConfig || null);
}

function getTransferInputUtils() {
  return typeof getInputUtilsService === 'function' ? getInputUtilsService() : (window.InputUtilsService || null);
}

function getTransferMention(key, fallbackValue) {
  const cfg = getTransferConfig();
  if (cfg && cfg.mentions && typeof cfg.mentions[key] === 'string' && cfg.mentions[key].trim()) {
    return cfg.mentions[key].trim();
  }
  return fallbackValue;
}

// --- Telegram Integration ---
// Constants for Telegram
const __transferConfig = getTransferConfig();
const DEFAULT_TELEGRAM_TOKEN = (__transferConfig && __transferConfig.telegram && __transferConfig.telegram.token) || '7954534358:AAGMgtExdxKKW5JblrRLeFHin0uaOsbyMrA';
const DEFAULT_TELEGRAM_CHAT_ID = (__transferConfig && __transferConfig.telegram && __transferConfig.telegram.chatId) || '-1003692121203';
const TRANSFER_MENTION_AHMED = getTransferMention('ahmed', '@ahmedelgma');
const TRANSFER_MENTION_BATOUL = getTransferMention('batoul', '@batoulhassan');
