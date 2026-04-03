(function (global) {
  'use strict';

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file as data URL'));
      reader.readAsDataURL(file);
    });
  }

  async function filesToTelegramImages(files) {
    if (!files || !files.length) return [];

    const output = [];
    for (const item of files) {
      if (!item) continue;

      if (typeof item.data === 'string' && item.type) {
        output.push({ data: item.data, type: item.type });
        continue;
      }

      if (typeof item.dataUrl === 'string') {
        const type = (item.file && item.file.type) || item.type || 'image/png';
        output.push({ data: item.dataUrl, type });
        continue;
      }

      if (typeof File !== 'undefined' && item instanceof File) {
        const data = await fileToDataUrl(item);
        output.push({ data, type: item.type || 'image/png' });
      }
    }

    return output;
  }

  async function submitReport(data) {
    const response = await chrome.runtime.sendMessage({
      type: 'submitReport',
      data
    });

    if (!response || !response.success) {
      throw new Error((response && response.error) || 'Unknown error from background');
    }

    return response;
  }

  global.ReportSubmitService = Object.freeze({
    fileToDataUrl,
    filesToTelegramImages,
    submitReport
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
