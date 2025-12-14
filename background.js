let creating;
let lastProcessedText = '';
let isSidePanelOpen = false;
let lastNotificationId = null; // Track the last notification ID
let toastQueue = []; // Queue toast messages when side panel not open
let trackingPaused = false; // Pause clipboard tracking state
let latestWalletAddress = null; // Track the last detected wallet address
let disableCriticalAlerts = true; // Always disable critical alerts for VIP items
const accountNumberRegex = /^\d{6,7}$/;
const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const walletRegex = /^\s*T[a-zA-Z0-9]{33}\s*$/;

const DEFAULT_CRITICAL_IPS = ['166.88.54.203', '166.88.167.40'];
const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';
const CRITICAL_BADGE_COLOR = '#dc2626';
const CRITICAL_IP_ALERT_STORAGE_KEY = 'criticalIpAlert';
const DEFAULT_ACTION_TITLE = (() => {
  try {
    const manifest = chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest() : null;
    return manifest && manifest.name ? manifest.name : 'Extension';
  } catch (e) {
    return 'Extension';
  }
})();

let criticalIpSet = new Set(DEFAULT_CRITICAL_IPS);
let criticalAccountSet = new Set();
let criticalIpNoteMap = new Map(); // ip -> note
let criticalAccountNoteMap = new Map(); // account -> note

const CRITICAL_POPUP_WIDTH = 560;
const CRITICAL_POPUP_HEIGHT = 340;
const CRITICAL_POPUP_MARGIN = 16;

let criticalAlertWindowId = null;
let criticalAlertTabId = null;
let lastCriticalPopupKey = '';
let lastCriticalPopupAt = 0;

try {
  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === criticalAlertWindowId) {
      criticalAlertWindowId = null;
      criticalAlertTabId = null;
    }
  });
} catch (e) {
  // ignore
}

function normalizeIPv4List(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const ip = raw.trim();
    if (!ip) continue;
    const octets = ip.split('.');
    if (octets.length !== 4) continue;
    if (!octets.every(o => o !== '' && /^\d+$/.test(o))) continue;
    const ok = octets.every(o => {
      const n = Number(o);
      return n >= 0 && n <= 255;
    });
    if (!ok) continue;
    normalized.push(ip);
  }
  return Array.from(new Set(normalized));
}

function normalizeSevenDigitAccounts(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const acc = raw.trim();
    if (!acc) continue;
    if (!/^\d{6,7}$/.test(acc)) continue;
    normalized.push(acc);
  }
  return Array.from(new Set(normalized));
}

async function loadCriticalWatchlistFromSync() {
  try {
    const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
    const watchlist = data[CRITICAL_WATCHLIST_STORAGE_KEY] || {};

    const rawIps = Array.isArray(watchlist.ips) ? watchlist.ips : [];
    const rawAccounts = Array.isArray(watchlist.accounts) ? watchlist.accounts : [];

    const userIps = [];
    const ipNotes = new Map();
    for (const item of rawIps) {
      if (typeof item === 'string') {
        const ips = normalizeIPv4List([item]);
        if (ips[0]) userIps.push(ips[0]);
        continue;
      }
      if (item && typeof item === 'object') {
        const ips = normalizeIPv4List([item.ip]);
        if (!ips[0]) continue;
        userIps.push(ips[0]);
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (note) ipNotes.set(ips[0], note);
      }
    }

    const userAccounts = [];
    const accountNotes = new Map();
    for (const item of rawAccounts) {
      if (typeof item === 'string') {
        const accounts = normalizeSevenDigitAccounts([item]);
        if (accounts[0]) userAccounts.push(accounts[0]);
        continue;
      }
      if (item && typeof item === 'object') {
        const accounts = normalizeSevenDigitAccounts([item.account]);
        if (!accounts[0]) continue;
        userAccounts.push(accounts[0]);
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (note) accountNotes.set(accounts[0], note);
      }
    }

    criticalIpNoteMap = ipNotes;
    criticalAccountNoteMap = accountNotes;
    criticalIpSet = new Set(DEFAULT_CRITICAL_IPS.concat(userIps));
    criticalAccountSet = new Set(userAccounts);
  } catch (e) {
    // Fall back to defaults
    criticalIpSet = new Set(DEFAULT_CRITICAL_IPS);
    criticalAccountSet = new Set();
    criticalIpNoteMap = new Map();
    criticalAccountNoteMap = new Map();
  }
}

function enqueueToast(toast) {
  toastQueue.push(toast);
}

async function openSidePanelIfNeeded() {
  if (!isSidePanelOpen) {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tabs && tabs[0]) {
        await chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    } catch (e) {
      console.warn('Failed to auto-open side panel:', e);
    }
  }
}

function showToastMessage(title, message, toastType, buttons, notificationItems, config) {
  console.log('showToastMessage called with:', { title, message, toastType });
  
  const toastPayload = { type: 'showToast', title, message, toastType };

  // Always ensure sidepanel gets toast: directly if open, else queue.
  if (isSidePanelOpen) {
    try {
      chrome.runtime.sendMessage(toastPayload).catch(err => {
        console.warn('Failed to send toast to sidepanel (promise):', err);
      });
    } catch (e) {
      console.warn('Toast send error (try-catch):', e);
    }
  } else {
    console.log('SidePanel not open, enqueueing toast');
    enqueueToast(toastPayload);
  }

  const skipSystemNotification = !!(config && config.skipSystemNotification);
  if (skipSystemNotification) {
    return;
  }

  // Always create a system notification (even if sidepanel open)
  if (lastNotificationId) {
    try {
      chrome.notifications.clear(lastNotificationId);
    } catch (e) {
      console.warn('Failed to clear notification:', e);
    }
  }
  const notificationId = `${toastType || 'note'}-${Date.now()}`;
  let enhancedTitle = title;
  let enhancedMessage = message;
  
  // استخدام نوع list إذا كانت هناك عناصر منفصلة
  const options = {
    type: notificationItems ? 'list' : 'basic',
    iconUrl: chrome.runtime.getURL('images/icon128.png'),
    title: enhancedTitle,
    message: notificationItems ? '' : enhancedMessage,
    isClickable: true,
    priority: 2,
    eventTime: Date.now(),
    silent: false
  };
  
  if (notificationItems) {
    options.items = notificationItems;
  }
  
  if (toastType === 'erbil') {
    enhancedTitle = '⭐⭐⭐ محافظة مميزة جداً';
    enhancedMessage = `🚨\n${message}`;
    options.title = enhancedTitle;
    options.message = enhancedMessage;
    options.type = 'basic';
    delete options.items;
    options.requireInteraction = true;
    // Trigger distinct sound via offscreen
    try {
      chrome.runtime.sendMessage({ type: 'playHighlightSound' }).catch(err => {
        console.warn('Failed to play highlight sound:', err);
      });
    } catch (e) {
      console.warn('Sound error:', e);
    }
  }
  
  if (toastType === 'uk') {
    enhancedTitle = '🇬🇧 United Kingdom IP';
    const ukNote = '🟥 ملاحظة هامة: يجب تحويل الحساب إلى الفئة الثالثة';
    enhancedMessage = `🚨\n${message}\n${ukNote}`;
    options.title = enhancedTitle;
    options.message = enhancedMessage;
    options.contextMessage = '⚠️ ملاحظة هامة: يجب تحويل الحساب إلى الفئة الثالثة';
    options.type = 'basic';
    delete options.items;
    options.requireInteraction = true;
    // Trigger UK sound via offscreen
    try {
      chrome.runtime.sendMessage({ type: 'playUKSound' }).catch(err => {
        console.warn('Failed to play UK sound:', err);
      });
    } catch (e) {
      console.warn('Sound error:', e);
    }
  }
  
  if (toastType === 'netherlands') {
    enhancedTitle = '🇳🇱 Netherlands IP';
    enhancedMessage = `🚨\n${message}`;
    options.title = enhancedTitle;
    options.message = enhancedMessage;
    options.type = 'basic';
    delete options.items;
    options.requireInteraction = true;
    // Trigger Netherlands sound via offscreen
    try {
      chrome.runtime.sendMessage({ type: 'playNLSound' }).catch(err => {
        console.warn('Failed to play NL sound:', err);
      });
    } catch (e) {
      console.warn('Sound error:', e);
    }
  }
  
  if (toastType === 'wallet-new') {
    options.requireInteraction = true;
  }

  if (Array.isArray(buttons) && buttons.length) {
    options.buttons = buttons.map(b => ({ title: b.title }));
  }
  
  chrome.notifications.create(notificationId, options, (createdId) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create notification:', chrome.runtime.lastError);
      console.error('Attempted to create notification with options:', JSON.stringify(options));
    } else {
      console.log('Notification created successfully:', createdId, 'Title:', title, 'Message:', message);
      lastNotificationId = createdId;
    }
  });

}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    isSidePanelOpen = true;
    // Flush queued toasts
    if (toastQueue.length) {
      toastQueue.forEach(t => chrome.runtime.sendMessage({ type: 'showToast', ...t }));
      toastQueue = [];
    }
    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
    });
  }
});

// Function to clear old accounts
async function clearOldAccounts() {
  const syncData = await chrome.storage.sync.get(['clearHistoryEnabled', 'clearHistoryDays']);
  if (!syncData.clearHistoryEnabled) {
    return;
  }

  const daysToKeep = syncData.clearHistoryDays || 30;
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  const localData = await chrome.storage.local.get('copiedAccounts');
  let copiedAccounts = localData.copiedAccounts || [];

  const updatedAccounts = copiedAccounts.filter(account => account.timestamp > cutoffTime);

  if (updatedAccounts.length !== copiedAccounts.length) {
    await chrome.storage.local.set({ copiedAccounts: updatedAccounts });
  }
}

// Clear old accounts on startup
chrome.runtime.onStartup.addListener(() => {
  setupOffscreenDocument('offscreen.html');
  clearOldAccounts();
});

// Clear old accounts periodically (e.g., every hour)
setInterval(clearOldAccounts, 60 * 60 * 1000);

async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['CLIPBOARD'],
      justification: 'Clipboard access is required to track account numbers.',
    });
    await creating;
    creating = null;
  }
}

function parseTradesText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const trades = [];
  
  // Types to ignore (not real trades)
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  for (const line of lines) {
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) continue;

    const type = parts[2];

    // Skip system operations
    if (ignoreTypes.some(t => t.toLowerCase() === type.toLowerCase())) {
        continue;
    }

    if (type === 'Balance') {
        let amount = 0;
        let comment = '';
        for (let i = parts.length - 1; i >= 3; i--) {
            const val = parseFloat(parts[i]);
            if (!isNaN(val) && parts[i].match(/^-?\d+\.?\d*$/)) {
                amount = val;
                comment = parts.slice(i + 1).join(' ');
                break;
            }
        }
        trades.push({
            date: parts[0] || '',
            ticket: parts[1] || '',
            type: 'Balance',
            volume: '',
            symbol: '',
            openPrice: '',
            closePrice: '',
            profit: amount,
            comment: comment,
            isBalance: true
        });
    } else if (parts.length >= 10) {
      const lastCol = parts[parts.length - 1];
      const lastColValue = parseFloat(lastCol);
      if (isNaN(lastColValue) || !lastCol.match(/^-?\d+\.?\d*$/)) {
        continue;
      }
      const profit = lastColValue;
      if (profit !== null && !isNaN(profit)) {
        trades.push({
          date: parts[0] || '',
          ticket: parts[1] || '',
          type: parts[2] || '',
          volume: parts[3] || '',
          symbol: parts[4] || '',
          openPrice: parts[5] || '',
          sl: parts[6] || '',
          tp: parts[7] || '',
          closeTime: parts[8] || '',
          closePrice: parts[9] || '',
          openTime: `${parts[0]} ${parts[8]}` || '', // Combine date with close time as reference
          profit: profit,
          isBalance: false
        });
      }
    }
  }
  return trades;
}

/**
 * Parse combined datetime in formats: YYYY.MM.DD HH:MM:SS or DD/MM/YYYY HH:MM:SS
 */
function parseAnyCombinedDateTime(text) {
  if (!text) return null;
  
  text = text.trim();
  
  // Try YYYY.MM.DD HH:MM:SS format
  const dotRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const dotMatch = text.match(dotRegex);
  if (dotMatch) {
    const [, year, month, day, hour, min, sec] = dotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(min), parseInt(sec));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try DD/MM/YYYY HH:MM:SS format
  const slashRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const slashMatch = text.match(slashRegex);
  if (slashMatch) {
    const [, day, month, year, hour, min, sec] = slashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(min), parseInt(sec));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Find Buy/Sell pairs within 5 minutes (same logic as price-sl-checker)
 */
function findPairs(trades, minutes = 5) {
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  // Filter real trades only
  const realTrades = trades.filter(t => {
    if (t.isBalance) return false;
    if (ignoreTypes.some(type => t.type && t.type.toLowerCase() === type.toLowerCase())) return false;
    return t.volume && t.symbol && (t.type === 'Buy' || t.type === 'Sell');
  });
  
  if (realTrades.length === 0) return [];
  
  const pairs = [];
  const timeWindow = minutes * 60 * 1000; // Convert minutes to milliseconds (5 min = 300000 ms)
  const groups = {};
  
  // Group by symbol and lot
  realTrades.forEach(t => {
    const lot = Math.abs(parseFloat(t.volume || 0)).toFixed(4);
    const key = `${(t.symbol || '').toUpperCase()}-${lot}`;
    if (!groups[key]) groups[key] = { buys: [], sells: [] };
    
    // Parse date + closeTime to get full datetime timestamp
    let openTs = 0;
    if (t.date && t.closeTime) {
      try {
        const combinedDateTime = `${t.date} ${t.closeTime}`;
        const dt = parseAnyCombinedDateTime(combinedDateTime);
        if (dt) {
          openTs = dt.getTime();
        }
      } catch (e) {
        openTs = 0;
      }
    }
    
    if (t.type === 'Buy') {
      groups[key].buys.push({ ...t, openTs });
    } else if (t.type === 'Sell') {
      groups[key].sells.push({ ...t, openTs });
    }
  });
  
  // Find pairs within time window (5 minutes)
  Object.values(groups).forEach(group => {
    group.buys.forEach(buy => {
      group.sells.forEach(sell => {
        if (buy.openTs > 0 && sell.openTs > 0) {
          const diffMs = Math.abs(sell.openTs - buy.openTs);
          // عد فقط الأزواج التي فرقها 5 دقائق أو أقل
          if (diffMs >= 0 && diffMs <= timeWindow) {
            pairs.push({
              a: buy,
              b: sell,
              openTimeDiff: diffMs
            });
          }
        }
      });
    });
  });
  
  return pairs;
}

function detectSuspiciousPatterns(trades) {
  const patterns = [];
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.date.replace(/\./g, '-'));
    const dateB = new Date(b.date.replace(/\./g, '-'));
    return dateA - dateB;
  });

  for (let i = 0; i < sortedTrades.length; i++) {
    const tWithdrawal = sortedTrades[i];
    
    if (tWithdrawal.isBalance && tWithdrawal.profit < 0) {
        // We found a withdrawal. Now look backwards for winning trades.
        const winningTrades = [];
        let k = i - 1;
        
        while (k >= 0) {
            const t = sortedTrades[k];
            if (t.isBalance) {
                k--;
                continue;
            }
            
            if (t.profit > 0) {
                winningTrades.unshift(t);
            } else {
                break;
            }
            k--;
        }

        if (winningTrades.length > 0) {
            let isMarketTest = false;
            let lossTradeCandidate = null;
            while (k >= 0) {
                const t = sortedTrades[k];
                if (!t.isBalance) {
                    lossTradeCandidate = t;
                    break;
                }
                k--;
            }

            if (lossTradeCandidate && lossTradeCandidate.profit < 0) {
                const firstWin = winningTrades[0];
                const isOpposite = (lossTradeCandidate.type === 'Buy' && firstWin.type === 'Sell') || 
                                 (lossTradeCandidate.type === 'Sell' && firstWin.type === 'Buy');
                
                if (isOpposite) {
                    patterns.push({
                        type: 'market_test',
                        lossTrade: lossTradeCandidate,
                        winTrades: winningTrades,
                        withdrawal: tWithdrawal
                    });
                    isMarketTest = true;
                }
            }

            if (!isMarketTest) {
                patterns.push({
                    type: 'quick_profit',
                    trades: winningTrades,
                    withdrawal: tWithdrawal
                });
            }
        }
    }
  }
  return patterns;
}

async function handleWalletAddress(address) {
  const data = await chrome.storage.local.get('walletNotes');
  const walletNotes = data.walletNotes || {};
  
  if (walletNotes[address]) {
      // Duplicate
      const note = walletNotes[address];
      showToastMessage('عنوان محفظة مكرر', note, 'wallet-duplicate');
  } else {
      // New
      latestWalletAddress = address;
      const buttons = [
          { title: 'العنوان متطابق لا يحتاج للرفع' },
          { title: 'تم رفع بيانات العنوان مسبقا للتلجرام' }
      ];
      showToastMessage('عنوان محفظة جديد', 'اختر إجراء لهذا العنوان:', 'wallet-new', buttons);
      
      // Note: Wallet sync happens after user selects an action via notification button
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'clipboardContent' && typeof message.text === 'string') {
    const clipboardText = message.text.trim();
    console.log('Clipboard content received (len):', clipboardText.length);
    
    if (!clipboardText) {
      console.log('Clipboard text is empty');
      return false;
    }

    const criticalHits = getCriticalMatchesFromText(clipboardText);
    if ((criticalHits.ips.length || criticalHits.accounts.length) && !disableCriticalAlerts) {
      setCriticalAlertBadge(criticalHits).catch(err => {
        console.warn('Failed to set critical alert badge:', err);
      });
      openCriticalAlertPopup(criticalHits).catch(err => {
        console.warn('Failed to open critical alert popup:', err);
      });
    }

    if (trackingPaused) {
      return false;
    }

    if (clipboardText === lastProcessedText) {
      console.log('Clipboard text is duplicate (len):', clipboardText.length);
      return false;
    }
    if (clipboardText.includes('IP:') && clipboardText.includes('Account:') && clipboardText.includes('Email:')) {
      lastProcessedText = clipboardText;
      return false;
    }
    const ipCandidate = extractIPv4(clipboardText);
    const emailMatch = clipboardText.match(emailRegex);
    const emailCandidate = emailMatch ? emailMatch[0] : null;

    if (walletRegex.test(clipboardText)) {
      lastProcessedText = clipboardText;
      console.log('Wallet detected:', clipboardText);
      handleWalletAddress(clipboardText);
    } else if (accountNumberRegex.test(clipboardText)) {
      lastProcessedText = clipboardText;
      console.log('Account number detected:', clipboardText);
      console.log('About to call updateStorageWithNewAccount');
      updateStorageWithNewAccount(clipboardText).then(() => {
        console.log('updateStorageWithNewAccount completed');
      }).catch(err => {
        console.error('updateStorageWithNewAccount error:', err);
      });
    } else if (ipCandidate) {
      lastProcessedText = ipCandidate;
      console.log('IP detected:', ipCandidate);
      console.log('About to call handleNewIP');
      handleNewIP(ipCandidate).then(() => {
        console.log('handleNewIP completed');
      }).catch(err => {
        console.error('handleNewIP error:', err);
      });
    } else {
      // Check for trades
      const trades = parseTradesText(clipboardText);
      if (trades.length > 0) {
        lastProcessedText = clipboardText;
        const patterns = detectSuspiciousPatterns(trades);
        
        // Count different types of anomalies
        const pairedTradesArray = findPairs(trades, 5);
        const pairedTrades = pairedTradesArray.length; // عدد الأزواج المتقاربة
        let equalPriceTrades = 0;
        let zeroProfitTrades = 0;
        
        console.log('Paired trades found:', pairedTrades, 'Array:', pairedTradesArray);
        
        trades.forEach(t => {
          // Check if trade has price and SL fields (not Balance)
          if (!t.isBalance && t.openPrice && t.sl) {
            const openPrice = parseFloat(t.openPrice);
            const sl = parseFloat(t.sl);
            // Strict check: Price must equal SL exactly (formatted to 5 decimals)
            if (!isNaN(openPrice) && !isNaN(sl) && openPrice.toFixed(5) === sl.toFixed(5)) {
              equalPriceTrades++;
            }
          }
          // Check for zero profit
          if (Math.abs(t.profit || 0) < 1e-5) {
            zeroProfitTrades++;
          }
        });
        
        // Show notification only if at least one anomaly found
        const hasAnomalies = pairedTrades > 0 || equalPriceTrades > 0 || zeroProfitTrades > 0;
        
        if (hasAnomalies) {
          // Save patterns to storage for the report page
          chrome.storage.local.set({ suspiciousReportData: patterns });
          
          // Save trades for price-sl-checker
          chrome.storage.local.set({ priceSLCheckerInput: clipboardText });
          
          // Sum total lot size from real trades (number that follows BUY/SELL)
          const totalLots = trades.reduce((sum, t) => {
            const vol = parseFloat(t.volume);
            if (!t.isBalance && (t.type === 'Buy' || t.type === 'Sell') && !isNaN(vol)) {
              return sum + Math.abs(vol);
            }
            return sum;
          }, 0);
          const formattedTotalLots = totalLots.toFixed(2);
          
          // Build detailed message - show all counts even if 0
          let messageLines = [];
          messageLines.push(`• إجمالي حجم اللوت: ${formattedTotalLots}`);
          messageLines.push(`• ${pairedTrades} أزواج متقاربة`);
          messageLines.push(`• ${equalPriceTrades} صفقة Price = S/L`);
          messageLines.push(`• ${zeroProfitTrades} صفقة ربح صفري`);
          
          // Show a colored toast (sidepanel / in-app) so the highlight is visible
          try {
            showToastMessage('تحذير صفقات مريبة', messageLines.join('\n'), 'warning');
          } catch (e) {
            console.warn('Toast warning failed', e);
          }

          const notificationId = `trades-anomaly-${Date.now()}`;
          const options = {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: '⚠️ تحذير: تم اكتشاف صفقات مريبة',
            message: messageLines.join('\n'),
            contextMessage: `إجمالي الحالات: ${pairedTrades + equalPriceTrades + zeroProfitTrades}`,
            // إذا Price=S/L كان 0، الإشعار يختفي تلقائياً بعد ثواني
            requireInteraction: equalPriceTrades > 0,
            isClickable: true,
            buttons: [
              { title: 'عرض التقرير' }
            ],
            priority: 2
          };
          
          chrome.notifications.create(notificationId, options, (notifId) => {
            // إذا Price=S/L = 0، إخفاء الإشعار تلقائياً بعد 5 ثواني
            if (equalPriceTrades === 0) {
              setTimeout(() => {
                chrome.notifications.clear(notifId);
              }, 5000);
            }
          });
        }
      }
    }
    return false; // No asynchronous response for clipboardContent
  } else if (message.type === 'criticalIpPopupDismissed') {
    clearCriticalIpBadge().catch(() => {});
    if (criticalAlertWindowId) {
      const winId = criticalAlertWindowId;
      criticalAlertWindowId = null;
      criticalAlertTabId = null;
      try {
        chrome.windows.remove(winId).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
    return false;
  } else if (message.type === 'getLastProcessedText') {
    chrome.runtime.sendMessage({ type: 'lastProcessedText', text: lastProcessedText });
    return false; // No asynchronous response for getLastProcessedText
  } else if (message.type === 'lookupIp') {
    (async () => {
      try {
        const response = await fetch(`https://ipwhois.app/json/${message.ip}?lang=ar`);
        const geoData = await response.json();
        console.log('IPWhois API Response:', geoData);
        if (geoData.success === true) {
          sendResponse({ data: geoData });
        } else {
          console.error('IPWhois API Error:', geoData.message);
          sendResponse({ error: geoData.message });
        }
      } catch (error) {
        console.error('Error fetching IP geolocation in background:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Crucial for asynchronous response
  }
});

// Listen for changes to pause state in storage
chrome.storage.sync.get(['trackingPaused']).then(data => {
  trackingPaused = !!data.trackingPaused;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.trackingPaused) {
      trackingPaused = !!changes.trackingPaused.newValue;
    }
    if (changes[CRITICAL_WATCHLIST_STORAGE_KEY]) {
      loadCriticalWatchlistFromSync().catch(() => {});
    }
  }
});

async function handleNewIP(ip) {
    const isCriticalIp = criticalIpSet.has(ip);
  try {
    const storageData = await chrome.storage.local.get('copiedIPs');
    const copiedIPs = storageData.copiedIPs || [];
    const isDuplicate = copiedIPs.some(item => item.ip === ip);

    const response = await fetch(`https://ipwhois.app/json/${ip}?lang=ar`);
    const geoData = await response.json();

    if (geoData.success === true) {
      const country = geoData.country;
      const region = geoData.region || geoData.city || '';
      const city = geoData.city || '';
      
      console.log('Geolocation API Response:', { ip, country, region, city, fullGeoData: geoData });
      const lowerRegion = (region || '').toLowerCase();
      const lowerCity = (city || '').toLowerCase();
      const lowerCountry = (country || '').toLowerCase();
      
      // Check for UK / Netherlands
      const isUK = lowerCountry.includes('united kingdom') || lowerCountry.includes('uk') || geoData.country_code === 'GB';
      const isNetherlands = lowerCountry.includes('netherlands') || geoData.country_code === 'NL';
      
      // Check for highlighted Iraqi regions
      const kirkukPatterns = ['kirkuk', 'كركوك'];
      const sulaymaniyahPatterns = ['sulaymaniyah', 'sulaimani', 'slemani', 'السليمانية', 'السليمانيه', 'sulaimaniyah', 'sulaimaniah', 'iraqi kurdistan'];
      const erbilPatterns = ['erbil', 'arbil', 'أربيل', 'hewler', 'hawler'];
      
      const isKirkuk = [lowerRegion, lowerCity].some(val => kirkukPatterns.some(p => val.includes(p)));
      const isSulaymaniyah = [lowerRegion, lowerCity].some(val => sulaymaniyahPatterns.some(p => val.includes(p)));
      const isErbil = [lowerRegion, lowerCity].some(val => erbilPatterns.some(p => val.includes(p)));
      
      console.log('IP Region Detection:', { ip, region, lowerRegion, isKirkuk, isSulaymaniyah, isErbil });
      
      const isHighlighted = isKirkuk || isSulaymaniyah || isErbil;
      let highlightDisplay = '';
      let highlightType = '';
      if (isHighlighted) {
        if (isKirkuk) {
          highlightDisplay = '⭐ محافظة كركوك';
          highlightType = 'kirkuk';
        } else if (isSulaymaniyah) {
          highlightDisplay = '⭐ محافظة السليمانية';
          highlightType = 'sulaymaniyah';
        } else if (isErbil) {
          highlightDisplay = '⭐ محافظة أربيل';
          highlightType = 'erbil';
        }
      }

      if (isNetherlands) {
        highlightType = 'netherlands';
      }
      
      const title = isDuplicate ? 'تم نسخ IP مكرر' : 'تم نسخ عنوان IP جديد';
      
      // Build a clear message for notifications
      let notificationTitle = '';
      let notificationMessage = '';
      let displayGovernorate = region || city || ''; // For display purposes
      
      if (isUK) {
        notificationTitle = '🇬🇧 United Kingdom IP';
      } else if (isNetherlands) {
        notificationTitle = '🇳🇱 Netherlands IP';
      } else if (isHighlighted) {
        if (isKirkuk) {
          notificationTitle = '⭐ محافظة كركوك';
          displayGovernorate = 'Kirkuk';
        } else if (isSulaymaniyah) {
          notificationTitle = '⭐ محافظة السليمانية';
          displayGovernorate = 'Sulaymaniyah';
        } else if (isErbil) {
          notificationTitle = '⭐ محافظة أربيل';
          displayGovernorate = 'Erbil';
        }
      } else {
        notificationTitle = isDuplicate ? 'تم نسخ IP مكرر' : 'تم نسخ عنوان IP جديد';
      }
      
      // Message with full details for all IPs
      notificationMessage = `${ip}\nالدولة: ${country}\nالمحافظة: ${displayGovernorate}${city && displayGovernorate !== city ? `\nالمدينة: ${city}` : ''}`;
      
      
      // Show only Country and Region buttons (max 2 supported)
      const buttons = [];
      if (country && country !== 'N/A') buttons.push({ key: 'copy_country', title: 'نسخ الدولة' });
      if (region && region !== 'N/A') buttons.push({ key: 'copy_region', title: 'نسخ المحافظة' });
      // Store latest payload for notification button handling
      latestIpPayload = { ip, country, region, city };
      
      // Determine toast type
      let toastType = 'ip';
      if (isUK) {
        toastType = 'uk';
      } else if (isNetherlands) {
        toastType = 'netherlands';
      } else if (isHighlighted) {
        toastType = 'erbil';
      }
      
      showToastMessage(notificationTitle, notificationMessage, toastType, buttons, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);

      copiedIPs.unshift({
        ip: ip,
        country: country,
        region: region || 'N/A',
        city: city || 'N/A',
        isErbil: false, // legacy field kept
        isHighlighted: isHighlighted || isUK || isNetherlands,
        highlightType: isUK ? 'uk' : (isNetherlands ? 'netherlands' : highlightType),
        timestamp: new Date().getTime(),
        isDuplicate: isDuplicate
      });
      await chrome.storage.local.set({ copiedIPs });
    } else {
      console.log(`Geolocation failed for IP: ${ip}. Reason: ${geoData.message}`);
      const title = isDuplicate ? 'تم نسخ IP مكرر' : 'تم نسخ عنوان IP جديد';
      const message = `العنوان: ${ip}\nالدولة: غير متوفرة`;
      showToastMessage(title, message, 'ip', undefined, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);
      copiedIPs.unshift({
        ip: ip,
        country: 'N/A',
        region: 'N/A',
        city: 'N/A',
        isErbil: false,
        isHighlighted: false,
        timestamp: new Date().getTime(),
        isDuplicate: isDuplicate
      });
      await chrome.storage.local.set({ copiedIPs });
    }
  } catch (error) {
    console.error('Error fetching IP geolocation:', error);
    const title = 'تم نسخ عنوان IP';
    const message = `العنوان: ${ip}\nالدولة: غير متوفرة`;
    showToastMessage(title, message, 'ip', undefined, undefined, isCriticalIp ? { skipSystemNotification: true } : undefined);
    try {
      const storageData = await chrome.storage.local.get('copiedIPs');
      const copiedIPs = storageData.copiedIPs || [];
      copiedIPs.unshift({
        ip: ip,
        country: 'N/A',
        region: 'N/A',
        city: 'N/A',
        isErbil: false,
        isHighlighted: false,
        timestamp: new Date().getTime(),
        isDuplicate: false
      });
      await chrome.storage.local.set({ copiedIPs });
    } catch(e) { /* ignore storage failure */ }
  }
}

// Map notificationId to payload for button actions
const notificationPayloads = {};

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Handle Suspicious Report Button
  if (notificationId.startsWith('warning-')) {
      if (buttonIndex === 0) {
          chrome.tabs.create({ url: 'report.html' });
      }
      return;
  }
  
  // Handle Trade Anomalies Button
  if (notificationId.startsWith('trades-anomaly-')) {
      if (buttonIndex === 0) {
          chrome.tabs.create({ url: 'price-sl-checker.html' });
      }
      return;
  }
  // Handle Wallet Address Buttons
  if (notificationId.startsWith('wallet-new-')) {
      const note = buttonIndex === 0 ? 'العنوان متطابق لا يحتاج للرفع' : 'تم رفع بيانات العنوان مسبقا للتلجرام';
      if (latestWalletAddress) {
          chrome.storage.local.get('walletNotes').then(data => {
              const walletNotes = data.walletNotes || {};
              walletNotes[latestWalletAddress] = note;
              chrome.storage.local.set({ walletNotes });
          });
      }
      return;
  }

  // We didn't store by id earlier; instead derive via lastNotificationId or fallback to message mapping.
  // Fetch the notification payload using the last created id if matches, else do nothing.
  const isCurrent = notificationId === lastNotificationId;
  if (!isCurrent) return;
  // We cannot retrieve the original message via API, so keep the latest payload separately
  const payload = latestIpPayload;
  if (!payload) return;
  let textToCopy = '';
  const availableButtons = [];
  if (payload.country && payload.country !== 'N/A') availableButtons.push('country');
  if (payload.region && payload.region !== 'N/A') availableButtons.push('region');
  const selected = availableButtons[buttonIndex];
  if (selected === 'country') textToCopy = payload.country;
  else if (selected === 'region') textToCopy = payload.region;
  // no city button in this mode
  if (!textToCopy) return;
  chrome.runtime.sendMessage({ type: 'writeClipboardText', text: textToCopy });
  // Removed post-copy confirmation notification per request
});

// Keep track of the latest IP payload shown in notification
let latestIpPayload = null;

function extractAllIPv4(text) {
  if (!text) return [];
  const ipv4RegexGlobal = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = text.match(ipv4RegexGlobal);
  if (!matches) return [];
  const valid = [];
  for (const candidate of matches) {
    const octets = candidate.split('.');
    if (octets.every(o => { const n = Number(o); return n >= 0 && n <= 255; })) {
      valid.push(candidate);
    }
  }
  return valid;
}

function getCriticalIpsFromText(text) {
  const ips = extractAllIPv4(text);
  if (!ips.length) return [];
  const found = [];
  for (const ip of ips) {
    if (criticalIpSet.has(ip)) found.push(ip);
  }
  return Array.from(new Set(found));
}

function extractAllSevenDigitAccounts(text) {
  if (!text) return [];
  const matches = text.match(/\b\d{6,7}\b/g);
  return matches ? matches : [];
}

function getCriticalAccountsFromText(text) {
  const accounts = extractAllSevenDigitAccounts(text);
  if (!accounts.length) return [];
  const found = [];
  for (const acc of accounts) {
    if (criticalAccountSet.has(acc)) found.push(acc);
  }
  return Array.from(new Set(found));
}

function getCriticalMatchesFromText(text) {
  const ips = getCriticalIpsFromText(text);
  const accounts = getCriticalAccountsFromText(text);

  const items = [];
  for (const ip of ips) {
    items.push({ type: 'IP', value: ip, note: criticalIpNoteMap.get(ip) || '' });
  }
  for (const acc of accounts) {
    items.push({ type: 'AC', value: acc, note: criticalAccountNoteMap.get(acc) || '' });
  }

  return { ips, accounts, items };
}

async function setCriticalAlertBadge(matches) {
  const input = matches && typeof matches === 'object' && !Array.isArray(matches)
    ? matches
    : { ips: matches, accounts: [] };

  const cleanedNextIps = normalizeIPv4List(input.ips).filter(ip => criticalIpSet.has(ip));
  const cleanedNextAccounts = normalizeSevenDigitAccounts(input.accounts).filter(acc => criticalAccountSet.has(acc));

  if (!cleanedNextIps.length && !cleanedNextAccounts.length) return;

  let existingIps = [];
  let existingAccounts = [];
  try {
    const data = await chrome.storage.local.get(CRITICAL_IP_ALERT_STORAGE_KEY);
    const payload = data[CRITICAL_IP_ALERT_STORAGE_KEY];
    if (payload && Array.isArray(payload.ips)) existingIps = normalizeIPv4List(payload.ips);
    if (payload && Array.isArray(payload.accounts)) existingAccounts = normalizeSevenDigitAccounts(payload.accounts);
  } catch (e) {
    // ignore
  }

  const mergedIps = Array.from(new Set(existingIps.concat(cleanedNextIps))).sort();
  const mergedAccounts = Array.from(new Set(existingAccounts.concat(cleanedNextAccounts))).sort();
  const total = mergedIps.length + mergedAccounts.length;
  if (!total) return;

  // User requested: no numeric badge on the extension icon.
  const badgeText = '!';

  try {
    await chrome.storage.local.set({
      [CRITICAL_IP_ALERT_STORAGE_KEY]: { ips: mergedIps, accounts: mergedAccounts, timestamp: Date.now() }
    });
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ color: CRITICAL_BADGE_COLOR });
  } catch (e) {
    // ignore
  }

  try {
    if (chrome.action && typeof chrome.action.setBadgeTextColor === 'function') {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeText({ text: badgeText });
  } catch (e) {
    // ignore
  }

  try {
    const parts = [];
    if (mergedIps.length) parts.push(`IPs: ${mergedIps.join(', ')}`);
    if (mergedAccounts.length) parts.push(`Accounts: ${mergedAccounts.join(', ')}`);
    await chrome.action.setTitle({ title: `CRITICAL COPIED: ${parts.join(' | ')}` });
  } catch (e) {
    // ignore
  }
}

async function clearCriticalIpBadge() {
  try {
    await chrome.storage.local.remove(CRITICAL_IP_ALERT_STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (e) {
    // ignore
  }

  try {
    await chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE });
  } catch (e) {
    // ignore
  }
}

async function restoreCriticalIpBadge() {
  try {
    // Always clear any previously-stuck numeric badge text first.
    await chrome.action.setBadgeText({ text: '' });

    const data = await chrome.storage.local.get(CRITICAL_IP_ALERT_STORAGE_KEY);
    const payload = data[CRITICAL_IP_ALERT_STORAGE_KEY];
    if (!payload) return;

    const ips = payload && Array.isArray(payload.ips) ? normalizeIPv4List(payload.ips) : [];
    const accounts = payload && Array.isArray(payload.accounts) ? normalizeSevenDigitAccounts(payload.accounts) : [];
    const total = ips.length + accounts.length;
    if (!total) return;

    // User requested: no numeric badge on the extension icon.
    const badgeText = '!';

    await chrome.action.setBadgeBackgroundColor({ color: CRITICAL_BADGE_COLOR });
    if (chrome.action && typeof chrome.action.setBadgeTextColor === 'function') {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }
    await chrome.action.setBadgeText({ text: badgeText });

    const parts = [];
    if (ips.length) parts.push(`IPs: ${ips.join(', ')}`);
    if (accounts.length) parts.push(`Accounts: ${accounts.join(', ')}`);
    await chrome.action.setTitle({ title: `CRITICAL COPIED: ${parts.join(' | ')}` });
  } catch (e) {
    // ignore
  }
}

function normalizeCriticalHitsForPopup(hits) {
  const input = hits && typeof hits === 'object' && !Array.isArray(hits)
    ? hits
    : { ips: hits, accounts: [] };

  const ips = normalizeIPv4List(input.ips).filter(ip => criticalIpSet.has(ip)).sort();
  const accounts = normalizeSevenDigitAccounts(input.accounts).filter(acc => criticalAccountSet.has(acc)).sort();

  return { ips, accounts };
}

function buildCriticalAlertPopupUrl(hits) {
  const normalized = normalizeCriticalHitsForPopup(hits);
  const params = [];
  if (normalized.ips.length) params.push(`ips=${encodeURIComponent(normalized.ips.join(','))}`);
  if (normalized.accounts.length) params.push(`accounts=${encodeURIComponent(normalized.accounts.join(','))}`);
  params.push(`t=${Date.now()}`);
  return chrome.runtime.getURL(`critical-alert.html?${params.join('&')}`);
}

async function openCriticalAlertPopup(hits) {
  const normalized = normalizeCriticalHitsForPopup(hits);
  if (!normalized.ips.length && !normalized.accounts.length) return;

  const now = Date.now();
  const key = `${normalized.ips.join(',')}|${normalized.accounts.join(',')}`;
  if (key === lastCriticalPopupKey && now - lastCriticalPopupAt < 800) return;
  lastCriticalPopupKey = key;
  lastCriticalPopupAt = now;

  // Store the latest alert payload so the popup can render notes reliably (without long URLs)
  try {
    const items = [];
    if (hits && hits.items && Array.isArray(hits.items)) {
      for (const item of hits.items) {
        if (!item || typeof item !== 'object') continue;
        const type = item.type === 'AC' ? 'AC' : 'IP';
        const value = typeof item.value === 'string' ? item.value.trim() : '';
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        if (!value) continue;
        items.push({ type, value, note });
      }
    } else {
      normalized.ips.forEach(ip => items.push({ type: 'IP', value: ip, note: criticalIpNoteMap.get(ip) || '' }));
      normalized.accounts.forEach(acc => items.push({ type: 'AC', value: acc, note: criticalAccountNoteMap.get(acc) || '' }));
    }
    await chrome.storage.local.set({ criticalAlertPayload: { items, timestamp: Date.now() } });
  } catch (e) {
    // ignore
  }

  const url = chrome.runtime.getURL(`critical-alert.html?t=${Date.now()}`);

  if (criticalAlertTabId) {
    try {
      await chrome.tabs.update(criticalAlertTabId, { url, active: true });
      if (criticalAlertWindowId) {
        await chrome.windows.update(criticalAlertWindowId, { focused: true });
      }
      return;
    } catch (e) {
      criticalAlertTabId = null;
      criticalAlertWindowId = null;
    }
  }

  let top;
  let left;
  try {
    const lastFocused = await chrome.windows.getLastFocused({ populate: false });
    if (lastFocused && typeof lastFocused.left === 'number' && typeof lastFocused.top === 'number' && typeof lastFocused.width === 'number') {
      left = lastFocused.left + Math.max(lastFocused.width - CRITICAL_POPUP_WIDTH - CRITICAL_POPUP_MARGIN, 0);
      top = lastFocused.top + CRITICAL_POPUP_MARGIN;
    }
  } catch (e) {
    // ignore
  }

  const createData = {
    url,
    type: 'popup',
    focused: true,
    width: CRITICAL_POPUP_WIDTH,
    height: CRITICAL_POPUP_HEIGHT
  };
  if (typeof left === 'number') createData.left = left;
  if (typeof top === 'number') createData.top = top;

  try {
    const win = await chrome.windows.create(createData);
    criticalAlertWindowId = win && typeof win.id === 'number' ? win.id : null;
    criticalAlertTabId = win && Array.isArray(win.tabs) && win.tabs[0] && typeof win.tabs[0].id === 'number' ? win.tabs[0].id : null;
  } catch (e) {
    console.warn('Failed to open critical alert popup:', e);
  }
}

function extractIPv4(text) {
  if (!text) return null;
  const ipv4RegexGlobal = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = text.match(ipv4RegexGlobal);
  if (!matches) return null;
  for (const candidate of matches) {
    const octets = candidate.split('.');
    if (octets.every(o => { const n = Number(o); return n >= 0 && n <= 255; })) {
      return candidate;
    }
  }
  return null;
}

async function updateStorageWithNewAccount(text) {
  const data = await chrome.storage.local.get('copiedAccounts');
  let copiedAccounts = data.copiedAccounts || [];
  const now = new Date();

  // Find the most recent entry for this account (regardless of pinned status)
  const mostRecentAccountEntry = copiedAccounts
    .filter(item => item.account === text)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const isDuplicate = !!mostRecentAccountEntry;
  
  // Get the notes from any entry of this account (they should all have the same notes)
  const accountNotes = mostRecentAccountEntry && mostRecentAccountEntry.notes 
    ? mostRecentAccountEntry.notes.trim() 
    : '';

  if (isDuplicate) {
    const lastCopiedDate = new Date(mostRecentAccountEntry.timestamp);
    const dateString = lastCopiedDate.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeString = lastCopiedDate.toLocaleTimeString('ar-EG', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    showToastMessage('تم نسخ حساب مكرر', `${text}\nآخر نسخ: ${dateString} - ${timeString}${accountNotes ? `\n📝 ${accountNotes}` : ''}`, 'duplicate');
  }

  copiedAccounts.unshift({
    account: text,
    timestamp: now.getTime(),
    isDuplicate: isDuplicate,
    notes: accountNotes, // Inherit notes
    isPinned: mostRecentAccountEntry ? mostRecentAccountEntry.isPinned : false // Inherit pinned status
  });

  await chrome.storage.local.set({ copiedAccounts });
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Ensure the offscreen document is created when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(async (details) => {
  await setupOffscreenDocument('offscreen.html');
  if (details.reason === 'install') {
      chrome.storage.local.set({ copiedAccounts: [], copiedIPs: [] });
      await clearCriticalIpBadge();
      // Initialize Critical Watchlist storage (custom items only; defaults are always active)
      try {
        const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
        if (!data || !data[CRITICAL_WATCHLIST_STORAGE_KEY]) {
          await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ips: [], accounts: [] } });
        }
      } catch (e) {
        // ignore
      }
      // First run defaults
      await chrome.storage.sync.set({ onboardingCompleted: false, tooltipsEnabled: true, filters: { accounts: { status:'all', date:'all' }, ips: { status:'all', date:'all' } } });
      // Open options page to show onboarding
      try { chrome.runtime.openOptionsPage(); } catch (e) { /* ignore */ }
  }
});

setupOffscreenDocument('offscreen.html');
restoreCriticalIpBadge();
loadCriticalWatchlistFromSync().catch(() => {});
