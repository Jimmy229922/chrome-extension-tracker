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

// --- Telegram Integration ---
// Constants for Telegram
const __transferConfig = getTransferConfig();
const DEFAULT_TELEGRAM_TOKEN = '';
const DEFAULT_TELEGRAM_CHAT_ID = '';
