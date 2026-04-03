/**
 * Price & Stop Loss Checker
 * Analyzes trading data to detect anomalies and suspicious patterns
 * Updated with Smart Parsing & Pagination
 */

const STORAGE_KEY = 'priceSLCheckerInput';
const DEBOUNCE_MS = 700;

// Store current trades and pairs for re-analysis
let currentTrades = [];
let currentPairs = [];
let debounceTimer = null;
let parseInProgress = false;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Parse combined datetime in formats: YYYY.MM.DD HH:MM:SS or DD/MM/YYYY HH:MM:SS
 */
function parseAnyCombinedDateTime(text) {
  if (!text) return null;
  text = text.trim();
  
  // Try YYYY.MM.DD HH:MM:SS
  const dotRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const dotMatch = text.match(dotRegex);
  if (dotMatch) {
    const [, year, month, day, hour, min, sec] = dotMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
  }
  
  // Try DD/MM/YYYY HH:MM:SS
  const slashRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;
  const slashMatch = text.match(slashRegex);
  if (slashMatch) {
    const [, day, month, year, hour, min, sec] = slashMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
  }
  
  return null;
}

/**
 * Parse split datetime (separate date and time strings)
 */
function parseAnySplitDateTime(dateStr, timeStr) {
  const combined = `${dateStr} ${timeStr}`;
  return parseAnyCombinedDateTime(combined);
}

/**
 * Normalize symbol (remove dots, spaces, lower case)
 */
function normalizeSymbol(symbol) {
  return (symbol || '').toUpperCase().replace(/\s+/g, '').replace(/\.$/, '');
}

/**
 * Generate lot key for pairing
 */
function lotKey(lot) {
  return Math.abs(parseFloat(lot) || 0).toFixed(4);
}

// Show parsing status
function startParseStatus(isAuto = false) {
  const statusEl = document.getElementById('parse-status');
  const textEl = document.getElementById('parse-status-text');
  const durationEl = document.getElementById('parse-duration');
  if (statusEl) statusEl.classList.remove('hidden');
  if (textEl) textEl.textContent = isAuto ? 'جاري التحليل (تلقائي)...' : 'جاري التحليل...';
  if (durationEl) durationEl.textContent = '';
}

// Hide parsing status
function endParseStatus(durationMs = null, success = true) {
  const statusEl = document.getElementById('parse-status');
  const textEl = document.getElementById('parse-status-text');
  const durationEl = document.getElementById('parse-duration');

  if (durationMs !== null && durationEl) {
    durationEl.textContent = `المدة: ${Math.round(durationMs)} ms`;
  }
  if (textEl) textEl.textContent = success ? 'تم' : 'فشل';

  setTimeout(() => { if (statusEl) statusEl.classList.add('hidden'); }, 600);
}

// ==================== SMART PARSER ====================

function parseTrades(rawText) {
  if (!rawText || !rawText.trim()) return [];
  
  const lines = rawText.split('\n').filter(line => line.trim());
  const trades = [];
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  lines.forEach((line, lineNum) => {
    // Normalize spaces to single tabs or spaces for splitting
    const parts = line.split(/\t+|\s{2,}|(?<=\d)\s+(?=[a-zA-Z])|(?<=[a-zA-Z])\s+(?=\d)/).map(p => p.trim()).filter(p => p);
    
    // Safety check for very short lines
    if (parts.length < 5) {
      trades.push({ lineNumber: lineNum + 1, raw: line, valid: false, reason: 'بيانات غير كافية' });
      return;
    }

    try {
      let dt = null;
      let ticket = '';
      let type = '';
      let lot = 0;
      let symbol = '';
      let price = 0;
      let sl = 0;
      let profit = 0;
      
      let typeIdx = -1;

      // 1. Locate "Type" (Buy/Sell) serves as the ANCHOR
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].toLowerCase();
        if (p === 'buy' || p === 'sell') {
          typeIdx = i;
          type = parts[i].toUpperCase();
          break;
        }
      }

      // If no valid type, check if system op
      if (typeIdx === -1) {
        const isSystem = ignoreTypes.some(ign => parts.some(p => p.toLowerCase() === ign.toLowerCase()));
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: isSystem ? 'عملية نظام' : 'لم يتم العثور على نوع (Buy/Sell)'
        });
        return;
      }

      // 2. Locate Date - Logic: Look for date pattern anywhere in line
      // Try finding date string in parts excluding Type index
      // Priority: Look at start or end of line
      
      // Helper to find date match in string
      const findDateInPart = (str) => {
        if (!str) return null;
        return parseAnyCombinedDateTime(str) || null;
      };

      // Scan all parts for a date
      for (let i = 0; i < parts.length; i++) {
        if (i === typeIdx) continue;
        // Try combined first
        let d = findDateInPart(parts[i]);
        if (!d && i + 1 < parts.length && i !== typeIdx && i + 1 !== typeIdx) {
            // Try split
            d = parseAnySplitDateTime(parts[i], parts[i+1]);
        }
        
        if (d) {
            dt = d;
            break;
        }
      }

      if (!dt) {
        // Last resort regex search on raw line
        const dateMatch = line.match(/\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}(:\d{2})?/) || line.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?/);
        if (dateMatch) {
            dt = parseAnyCombinedDateTime(dateMatch[0]);
        }
      }

      if (!dt) {
          trades.push({ lineNumber: lineNum + 1, raw: line, valid: false, reason: 'التاريخ مفقود' });
          return;
      }

      // 3. Locate Ticket (Usually numeric, often before Type or at start)
      // Strategy: Find largest integer in line that is NOT date parts
      // But safe bet: look around Type
      if (typeIdx > 0 && /^\d+$/.test(parts[typeIdx - 1])) {
          ticket = parts[typeIdx - 1];
      } else if (typeIdx > 1 && /^\d+$/.test(parts[1])) { // Common: Symbol Ticket Type
          ticket = parts[1];
      } else {
           // Fallback scan?
           const potentialTicket = parts.find(p => /^\d{7,12}$/.test(p));
           if (potentialTicket) ticket = potentialTicket;
      }

      // 4. Locate Lot (Usually immediately after Type)
      if (typeIdx + 1 < parts.length) {
          lot = parseFloat(parts[typeIdx + 1]);
      }

      // 5. Locate Symbol, Price, SL
      // Two main formats:
      // A) Type Lot Symbol Price SL ... (Standard)
      // B) Symbol Ticket Type Lot Price SL ... (Mobile/Reports)

      let colAfterLot = parts[typeIdx + 2];
      let colAfterLotVal = parseFloat(colAfterLot);
      let isColAfterLotNumeric = !isNaN(colAfterLotVal);

      if (!isColAfterLotNumeric && /^[A-Z]{3,}/i.test(colAfterLot)) {
          // Format A: Symbol is after Lot
          symbol = normalizeSymbol(colAfterLot);
          price = parseFloat(parts[typeIdx + 3]);
          sl = parseFloat(parts[typeIdx + 4]);
      } else {
          // Format B: Symbol is likely BEFORE Type (or we missed it)
          // Look backwards from Type for Symbol
          for (let i = typeIdx - 1; i >= 0; i--) {
              if (parts[i] === ticket) continue;
              // Skip date parts (loose check)
              if (parts[i].includes('.') || parts[i].includes(':')) continue; 
              
              if (/^[A-Z]{3,}/i.test(parts[i])) {
                  symbol = normalizeSymbol(parts[i]);
                  break;
              }
          }
          
          // In Format B, Price is likely immediately after Lot
          if (isColAfterLotNumeric) {
             price = colAfterLotVal;
             sl = parseFloat(parts[typeIdx + 3]);
          }
      }

      // 6. Locate Profit (Always the last numeric value in the line)
      for (let i = parts.length - 1; i >= 0; i--) {
        const val = parseFloat(parts[i]);
        if (!isNaN(val)) {
            profit = val;
            break;
        }
      }

      // Defaults
      lot = lot || 0;
      price = price || 0;
      sl = sl || 0;
      symbol = symbol || 'UNKNOWN';

      const equal = price > 0 && sl > 0 && price.toFixed(5) === sl.toFixed(5);
      const zeroProfit = Math.abs(profit) < 1e-5;

      trades.push({
        lineNumber: lineNum + 1,
        raw: line,
        valid: true,
        dt: dt.toLocaleString('en-GB', { hour12: false }),
        openTs: dt.getTime(),
        ticket,
        type,
        lot,
        symbol,
        price,
        sl,
        profit,
        equal,
        zeroProfit
      });

    } catch (e) {
      trades.push({ lineNumber: lineNum + 1, raw: line, valid: false, reason: 'خطأ: ' + e.message });
    }
  });

  return trades;
}

// ==================== PAIRING LOGIC ====================

function findOpenTimePairs(trades, minutes = 5) {
  const validTrades = trades.filter(t => t.valid);
  const pairs = [];
  const timeWindow = minutes * 60 * 1000;
  
  // Group by "Symbol + Lot" to avoid O(N^2) on everything
  const groups = {};
  validTrades.forEach(t => {
    const key = `${t.symbol}-${lotKey(t.lot)}`;
    if (!groups[key]) groups[key] = { buys: [], sells: [] };
    if (t.type === 'BUY') groups[key].buys.push(t);
    else groups[key].sells.push(t);
  });
  
  // Compare inside groups only
  Object.values(groups).forEach(group => {
    group.buys.forEach(buy => {
      group.sells.forEach(sell => {
        const diffMs = Math.abs(sell.openTs - buy.openTs);
        if (diffMs <= timeWindow) {
            const diffSec = Math.round(diffMs / 1000);
            pairs.push({
                a: buy,
                b: sell,
                diffSeconds: diffSec,
                timeDiffDisplay: diffSec < 60 ? `${diffSec} ث` : `${(diffSec/60).toFixed(1)} د`,
                latestOpenTime: Math.max(buy.openTs, sell.openTs)
            });
        }
      });
    });
  });
  
  // Sort newest pairs first
  return pairs.sort((a, b) => b.latestOpenTime - a.latestOpenTime);
}

function isToday(dt) {
    const t = new Date();
    const d = new Date(dt);
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// ==================== RENDERING & PAGINATION ====================

// Pagination State
const PAGINATION = {
    equal: { page: 1, pageSize: 50 },
    zero: { page: 1, pageSize: 50 },
    pairs: { page: 1, pageSize: 50 },
    invalid: { page: 1, pageSize: 50 }
};

function renderPaginationControls(container, sectionKey, totalItems, onPageChange) {
    const state = PAGINATION[sectionKey];
    const totalPages = Math.ceil(totalItems / state.pageSize);
    
    if (totalPages <= 1) return;

    const nav = document.createElement('div');
    nav.className = 'pagination-nav';
    nav.style.cssText = 'display: flex; gap: 10px; justify-content: center; margin-top: 10px; align-items: center; direction: ltr;';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '< السابق';
    prevBtn.className = 'btn-secondary';
    prevBtn.disabled = state.page === 1;
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        if (state.page > 1) {
            state.page--;
            onPageChange();
        }
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'التالي >';
    nextBtn.className = 'btn-secondary';
    nextBtn.disabled = state.page === totalPages;
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (state.page < totalPages) {
            state.page++;
            onPageChange();
        }
    };

    const info = document.createElement('span');
    info.textContent = `صفحة ${state.page} من ${totalPages}`;
    info.style.fontWeight = 'bold';

    nav.appendChild(prevBtn);
    nav.appendChild(info);
    nav.appendChild(nextBtn);
    container.appendChild(nav);
}

function renderResults(trades, pairs) {
  const container = document.getElementById('results-container');
  const statsGrid = document.getElementById('stats-grid');
  const filtersDiv = document.getElementById('filters');
  const statsSection = document.getElementById('stats-section');
  const copyAllBtn = document.getElementById('copy-all-btn');
  const timeWindowControl = document.getElementById('time-window-control');

  currentTrades = trades;
  currentPairs = pairs;
  
  container.innerHTML = '';
  statsGrid.innerHTML = '';
  filtersDiv.innerHTML = '';
  
  // Filter subsets
  const validTrades = trades.filter(t => t.valid);
  const equalTrades = validTrades.filter(t => t.equal).sort((a,b) => b.openTs - a.openTs);
  const zeroTrades = validTrades.filter(t => t.zeroProfit).sort((a,b) => b.openTs - a.openTs);
  const invalidTrades = trades.filter(t => !t.valid);

  // Stats Cards
  const stats = [
    { label: 'إجمالي الصفقات', value: validTrades.length, icon: 'fa-list-ol', c: 'default' },
    { label: 'Price = S/L', value: equalTrades.length, icon: 'fa-equals', c: 'equal' },
    { label: 'الربح = 0.00', value: zeroTrades.length, icon: 'fa-coins', c: 'zero-profit' },
    { label: 'الأزواج المقترنة', value: pairs.length, icon: 'fa-link', c: 'paired' }
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = `stat-card ${s.c}`;
    card.innerHTML = `<div class="stat-icon"><i class="fas ${s.icon}"></i></div><div class="stat-number">${s.value}</div><div class="stat-label">${s.label}</div>`;
    statsGrid.appendChild(card);
  });

  // Filter Buttons
  const createFilterBtn = (id, label) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (id === 'all' ? ' active' : '');
      btn.textContent = label;
      btn.dataset.filter = id;
      btn.onclick = () => applyFilter(id);
      filtersDiv.appendChild(btn);
  };
  createFilterBtn('all', 'جميع الصفقات');
  if (equalTrades.length) createFilterBtn('equal', 'Price = S/L');
  if (zeroTrades.length) createFilterBtn('zero-profit', 'الربح صفري');
  if (pairs.length) createFilterBtn('pairs', 'أزواج متقاربة');

  // Render Sections (Passed as closures to handle pagination re-renders)
  
  // 1. Equal Trades
  if (equalTrades.length) {
      const wrapper = createSectionWrapper(container, 'equal', `صفقات Price = S/L (${equalTrades.length})`, 'fa-equals', 'equal');
      const renderPage = () => {
          wrapper.content.innerHTML = '';
          const start = (PAGINATION.equal.page - 1) * PAGINATION.equal.pageSize;
          const end = start + PAGINATION.equal.pageSize;
          const pageItems = equalTrades.slice(start, end);
          renderStandardTable(wrapper.content, pageItems, 'equal-highlight', start);
          renderPaginationControls(wrapper.content, 'equal', equalTrades.length, renderPage);
      };
      renderPage();
  }

  // 2. Zero Profit
  if (zeroTrades.length) {
      const wrapper = createSectionWrapper(container, 'zero-profit', `الربح = 0.00 (${zeroTrades.length})`, 'fa-coins', 'zero-profit');
      const renderPage = () => {
          wrapper.content.innerHTML = '';
          const start = (PAGINATION.zero.page - 1) * PAGINATION.zero.pageSize;
          const end = start + PAGINATION.zero.pageSize;
          const pageItems = zeroTrades.slice(start, end);
          renderStandardTable(wrapper.content, pageItems, 'zero-profit-highlight', start);
          renderPaginationControls(wrapper.content, 'zero', zeroTrades.length, renderPage);
      };
      renderPage();
  }

  // 3. Pairs
  if (pairs.length) {
      const wrapper = createSectionWrapper(container, 'pairs', `الأزواج المقترنة (${pairs.length})`, 'fa-link', 'paired');
      wrapper.section.id = 'pairs-section';
      const renderPage = () => {
          wrapper.content.innerHTML = '';
          const start = (PAGINATION.pairs.page - 1) * PAGINATION.pairs.pageSize;
          const end = start + PAGINATION.pairs.pageSize;
          const pageItems = pairs.slice(start, end);
          renderPairsTableContent(wrapper.content, pageItems, start);
          renderPaginationControls(wrapper.content, 'pairs', pairs.length, renderPage);
      };
      renderPage();
  }

  // 4. Invalid Lines
  if (invalidTrades.length) {
      const wrapper = createSectionWrapper(container, 'invalid', `تحقق من الشكل (${invalidTrades.length})`, 'fa-exclamation-triangle', 'validation');
      const renderPage = () => {
          wrapper.content.innerHTML = '';
          const start = (PAGINATION.invalid.page - 1) * PAGINATION.invalid.pageSize;
          const end = start + PAGINATION.invalid.pageSize;
          const pageItems = invalidTrades.slice(start, end);
          renderInvalidContent(wrapper.content, pageItems);
          renderPaginationControls(wrapper.content, 'invalid', invalidTrades.length, renderPage);
      };
      renderPage();
  }

  copyAllBtn.style.display = 'block';
  copyAllBtn.onclick = () => copyFilteredData(trades);
  
  if (validTrades.length) timeWindowControl.style.display = 'block';
  statsSection.classList.remove('hidden');
}

// Helper to create collapsible section shell
function createSectionWrapper(container, id, title, icon, colorClass) {
    const section = document.createElement('div');
    section.className = 'results-section';
    section.dataset.type = id;

    const header = document.createElement('div');
    header.className = `section-header ${colorClass}`;
    header.innerHTML = `<i class="fas ${icon} section-icon"></i><h2>${title}</h2><i class="fas fa-chevron-down toggle-icon"></i>`;
    
    const content = document.createElement('div');
    content.className = 'section-content';

    header.onclick = () => {
        content.classList.toggle('collapsed');
        header.querySelector('.toggle-icon').classList.toggle('closed');
    };

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
    return { section, content };
}

function renderStandardTable(container, items, rowClass, startIndex) {
    const tableHTML = `
      <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>#</th><th>الوقت</th><th>رقم</th><th>نوع</th><th>رمز</th><th>حجم</th><th>سعر</th><th>S/L</th><th>ربح</th></tr>
        </thead>
        <tbody>
          ${items.map((t, i) => `
            <tr class="${rowClass}">
                <td>${startIndex + i + 1}</td>
                <td>${t.dt} ${isToday(new Date(t.openTs)) ? '<span class="badge-today">اليوم</span>' : ''}</td>
                <td>${t.ticket}</td>
                <td class="${t.type === 'BUY' ? 'type-buy' : 'type-sell'}">${t.type}</td>
                <td>${t.symbol}</td>
                <td>${t.lot}</td>
                <td>${t.price}</td>
                <td>${t.sl}</td>
                <td>${t.profit}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
    container.innerHTML += tableHTML;
}

function renderPairsTableContent(container, pairs, startIndex) {
    const pairColors = ['#3498db', '#9b59b6', '#2ecc71', '#e67e22', '#e74c3c', '#1abc9c'];
    
    let rows = '';
    pairs.forEach((p, i) => {
        const color = pairColors[i % pairColors.length];
        const dimmedColor = color + '20'; // Hex + alpha roughly
        rows += `
        <tr style="background:${dimmedColor}; border-left:4px solid ${color}">
            <td rowspan="2" style="font-weight:bold; color:${color}">${startIndex + i + 1}</td>
            <td>${p.a.dt}</td><td>${p.a.ticket}</td>
            <td><span class="type-buy">BUY</span></td>
            <td><b>${p.a.symbol}</b></td>
            <td>${p.a.lot}</td><td>${p.a.price}</td><td>${p.a.sl}</td><td>${p.a.profit}</td>
            <td rowspan="2" style="text-align:center; font-weight:bold; color:${color}">${p.timeDiffDisplay}</td>
        </tr>
        <tr style="background:${dimmedColor}; border-left:4px solid ${color}; border-bottom:10px solid #fff">
            <td>${p.b.dt}</td><td>${p.b.ticket}</td>
            <td><span class="type-sell">SELL</span></td>
            <td><b>${p.b.symbol}</b></td>
            <td>${p.b.lot}</td><td>${p.b.price}</td><td>${p.b.sl}</td><td>${p.b.profit}</td>
        </tr>`;
    });

    const tableHTML = `
      <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>#</th><th>الوقت</th><th>رقم</th><th>نوع</th><th>رمز</th><th>حجم</th><th>سعر</th><th>S/L</th><th>ربح</th><th>فرق</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      </div>`;
    container.innerHTML += tableHTML;
}

function renderInvalidContent(container, items) {
    const html = items.map(t => `
      <div style="padding: 10px; margin: 5px 0; background: #ffe0e0; border-left: 4px solid #e74c3c; border-radius: 4px;">
        <span style="background:#e74c3c; color:white; padding:2px 6px; border-radius:4px; font-size:12px;">غير مطابق</span>
        <strong>سطر ${t.lineNumber}:</strong> ${t.reason}<br>
        <small style="color: #666; font-family: monospace;">${t.raw.substring(0, 150)}</small>
      </div>`).join('');
    container.innerHTML += html;
}

function applyFilter(filterId) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-filter="${filterId}"]`)?.classList.add('active');
    
    const sections = document.querySelectorAll('.results-section');
    sections.forEach(sec => {
        if (filterId === 'all') sec.style.display = 'block';
        else sec.style.display = (sec.dataset.type === filterId) ? 'block' : 'none';
    });
}

function copyFilteredData(trades) {
    const text = trades.filter(t => t.valid).map(t => t.raw).join('\n');
    chrome.runtime.sendMessage({ type: 'writeClipboardText', text });
    showToast('تم نسخ الصفقات الصحيحة');
}

function showToast(msg, isError = false) {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed; bottom:20px; left:20px; background:${isError?'#e74c3c':'#27ae60'}; color:white; padding:15px; border-radius:6px; z-index:9999; animation: slideUp 0.3s ease;`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => { div.remove(); }, 3000);
}

// ==================== MAIN EXECUTION ====================

function performParse(isAuto = false) {
    const ta = document.getElementById('trades-textarea');
    if (!ta || parseInProgress) return;
    
    const text = ta.value;
    if (!text.trim()) {
        if (!isAuto) showToast('الرجاء إدخال بيانات', true);
        return;
    }

    parseInProgress = true;
    startParseStatus(isAuto);
    
    // Use setTimeout to allow UI to update (show spinner) before heavy lifting
    setTimeout(() => {
        const start = performance.now();
        const trades = parseTrades(text);
        const pairs = findOpenTimePairs(trades, 5);
        
        localStorage.setItem(STORAGE_KEY, text);
        renderResults(trades, pairs);
        
        // Reset paginations to 1
        Object.values(PAGINATION).forEach(p => p.page = 1);
        
        endParseStatus(performance.now() - start, true);
        parseInProgress = false;
        
        if (!isAuto && trades.length === 0) showToast('لا توجد صفقات', true);
        if (isAuto && document.querySelector('[data-filter="all"]')) document.querySelector('[data-filter="all"]').click();
    }, 50);
}

// Event Listeners
document.getElementById('parse-btn').addEventListener('click', () => performParse(false));
document.getElementById('clear-btn').addEventListener('click', () => {
    document.getElementById('trades-textarea').value = '';
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('stats-section').classList.add('hidden');
    document.getElementById('char-count').textContent = '0';
    localStorage.removeItem(STORAGE_KEY);
});

const ta = document.getElementById('trades-textarea');
ta.addEventListener('input', () => {
    document.getElementById('char-count').textContent = ta.value.length;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performParse(true), DEBOUNCE_MS);
});

// Update pairs button logic
document.getElementById('update-pairs-btn').addEventListener('click', () => {
    const mins = parseInt(document.getElementById('time-window-input').value) || 5;
    const newPairs = findOpenTimePairs(currentTrades, mins);
    // Force re-render just the pairs part or full re-render
    renderResults(currentTrades, newPairs);
    const btn = document.querySelector('[data-filter="pairs"]');
    if (btn) btn.click();
});

// Load saved
window.addEventListener('load', () => {
    // Try chrome storage first
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
            if (res[STORAGE_KEY]) {
                ta.value = res[STORAGE_KEY];
                performParse(true);
                chrome.storage.local.remove([STORAGE_KEY]); // Clear to avoid stuck data
            } else {
                const ls = localStorage.getItem(STORAGE_KEY);
                if (ls) {
                    ta.value = ls;
                    performParse(true);
                }
            }
        });
    }
});
