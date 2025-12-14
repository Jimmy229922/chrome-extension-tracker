/**
 * Price & Stop Loss Checker
 * Analyzes trading data to detect anomalies and suspicious patterns
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
 * Parse split datetime (separate date and time strings)
 */
function parseAnySplitDateTime(dateStr, timeStr) {
  const combined = `${dateStr} ${timeStr}`;
  return parseAnyCombinedDateTime(combined);
}

/**
 * Find datetime and its starting index in parts array
 */
function findFirstDateTime(parts, startIdx = 0) {
  for (let i = startIdx; i < parts.length; i++) {
    const dt = parseAnyCombinedDateTime(parts[i]);
    if (dt) {
      return { index: i, dt, text: parts[i] };
    }
    
    // Try split format
    if (i + 1 < parts.length) {
      const combined = parseAnySplitDateTime(parts[i], parts[i + 1]);
      if (combined) {
        return { index: i, dt: combined, text: `${parts[i]} ${parts[i + 1]}` };
      }
    }
  }
  return null;
}

/**
 * Normalize symbol (remove dots and spaces)
 */
function normalizeSymbol(symbol) {
  return (symbol || '').toUpperCase().replace(/\s+/g, '');
}

/**
 * Generate lot key for pairing
 */
function lotKey(lot) {
  return Math.abs(parseFloat(lot) || 0).toFixed(4);
}

// Show parsing status (spinner + text)
function startParseStatus(isAuto = false) {
  const statusEl = document.getElementById('parse-status');
  const textEl = document.getElementById('parse-status-text');
  const durationEl = document.getElementById('parse-duration');
  if (!statusEl || !textEl || !durationEl) return;
  statusEl.classList.remove('hidden');
  textEl.textContent = isAuto ? 'جاري التحليل (تلقائي)...' : 'جاري التحليل...';
  durationEl.textContent = '';
}

// Hide parsing status and show duration
function endParseStatus(durationMs = null, success = true) {
  const statusEl = document.getElementById('parse-status');
  const textEl = document.getElementById('parse-status-text');
  const durationEl = document.getElementById('parse-duration');
  if (!statusEl || !textEl || !durationEl) return;

  if (durationMs !== null) {
    const ms = Math.max(0, Math.round(durationMs));
    durationEl.textContent = `المدة: ${ms} مللي ثانية`;
    textEl.textContent = success ? 'تم التحليل' : 'فشل التحليل';
  }

  // Hide the spinner row after a short delay to reduce flicker
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 600);
}

/**
 * Parse trades from raw text
 */
function parseTrades(rawText) {
  if (!rawText || !rawText.trim()) return [];
  
  const lines = rawText.split('\n').filter(line => line.trim());
  const trades = [];
  
  // Types to ignore (not real trades)
  const ignoreTypes = ['Balance', 'Bonus', 'So_Compensation', 'Compensation', 'Deposit', 'Withdrawal', 'Fee', 'Credit'];
  
  lines.forEach((line, lineNum) => {
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 7) {
      trades.push({
        lineNumber: lineNum + 1,
        raw: line,
        valid: false,
        reason: 'عدد الأعمدة غير كافي'
      });
      return;
    }
    
    try {
      // Parse structure: DateTime Ticket Type Lot Symbol Price SL ...
      let idx = 0;
      
      // Find and parse datetime (might be 1 or 2 columns)
      let dt = null;
      let dtText = '';
      let ticket = '';
      let type = '';
      let lot = 0;
      let symbol = '';
      let price = 0;
      let sl = 0;
      let profit = 0;
      
      // Check if first part looks like date
      if (/^\d{4}[./]\d{1,2}[./]\d{1,2}/.test(parts[0])) {
        // Combined datetime or date only
        dtText = parts[0];
        if (/\d{1,2}:\d{2}:\d{2}/.test(parts[0])) {
          // Combined format
          dt = parseAnyCombinedDateTime(parts[0]);
          idx = 1;
        } else if (idx + 1 < parts.length && /^\d{1,2}:\d{2}:\d{2}/.test(parts[1])) {
          // Split format
          dtText = `${parts[0]} ${parts[1]}`;
          dt = parseAnySplitDateTime(parts[0], parts[1]);
          idx = 2;
        } else {
          trades.push({
            lineNumber: lineNum + 1,
            raw: line,
            valid: false,
            reason: 'تنسيق التاريخ غير صحيح'
          });
          return;
        }
      } else {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: 'لم يتم العثور على التاريخ'
        });
        return;
      }
      
      if (!dt) {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: 'فشل تحليل التاريخ'
        });
        return;
      }
      
      // Extract ticket (next numeric)
      const ticketVal = parseFloat(parts[idx]);
      if (!isNaN(ticketVal) && /^\d+$/.test(parts[idx])) {
        ticket = parts[idx];
        idx++;
      }
      
      // Extract type (Buy/Sell or other types)
      if (idx < parts.length) {
        type = parts[idx];
        idx++;
      } else {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: 'لم يتم العثور على نوع'
        });
        return;
      }
      
      // Check if this is a trade or system operation
      const isRealTrade = /^buy$/i.test(type) || /^sell$/i.test(type);
      const isSystemOp = ignoreTypes.some(t => t.toLowerCase() === type.toLowerCase());
      
      if (isSystemOp) {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: `عملية نظام وليست صفقة (${type})`
        });
        return;
      }
      
      if (!isRealTrade) {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: 'نوع غير معروف (يجب أن يكون Buy أو Sell فقط)'
        });
        return;
      }
      
      type = type.toUpperCase();
      
      // Extract lot (numeric)
      const lotVal = parseFloat(parts[idx]);
      if (!isNaN(lotVal) && idx < parts.length) {
        lot = lotVal;
        idx++;
      }
      
      // Extract symbol (3+ chars)
      if (idx < parts.length && /^[A-Z]{3,}[A-Z0-9.]*$/i.test(parts[idx])) {
        symbol = normalizeSymbol(parts[idx]);
        idx++;
      } else {
        trades.push({
          lineNumber: lineNum + 1,
          raw: line,
          valid: false,
          reason: 'لم يتم العثور على رمز العملة'
        });
        return;
      }
      
      // Extract price (numeric after symbol)
      const priceVal = parseFloat(parts[idx]);
      if (!isNaN(priceVal) && idx < parts.length) {
        price = priceVal;
        idx++;
      }
      
      // Extract S/L (numeric after price)
      const slVal = parseFloat(parts[idx]);
      if (!isNaN(slVal) && idx < parts.length) {
        sl = slVal;
        idx++;
      }
      
      // Find profit (last numeric value)
      for (let i = parts.length - 1; i >= 0; i--) {
        const val = parseFloat(parts[i]);
        if (!isNaN(val)) {
          profit = val;
          break;
        }
      }
      
      // Check for anomalies
      const equal = price.toFixed(5) === sl.toFixed(5); // Strict match, no tolerance
      const zeroProfit = Math.abs(profit) < 1e-5;
      
      trades.push({
        lineNumber: lineNum + 1,
        raw: line,
        valid: true,
        dt: dtText,
        ticket,
        type,
        lot,
        symbol,
        price,
        sl,
        equal,
        profit,
        zeroProfit,
        openTs: dt.getTime()
      });
    } catch (e) {
      trades.push({
        lineNumber: lineNum + 1,
        raw: line,
        valid: false,
        reason: 'خطأ في تحليل الصف'
      });
    }
  });
  
  return trades;
}

/**
 * Find Buy/Sell pairs
 */
function findOpenTimePairs(trades, minutes = 5) {
  const validTrades = trades.filter(t => t.valid);
  const pairs = [];
  const timeWindow = minutes * 60 * 1000;
  
  // Group by symbol and lot
  const groups = {};
  validTrades.forEach(t => {
    const key = `${t.symbol}-${lotKey(t.lot)}`;
    if (!groups[key]) groups[key] = { buys: [], sells: [] };
    
    if (t.type === 'BUY') {
      groups[key].buys.push(t);
    } else {
      groups[key].sells.push(t);
    }
  });
  
  // Find pairs within time window
  Object.values(groups).forEach(group => {
    group.buys.forEach(buy => {
      group.sells.forEach(sell => {
        const diffMs = Math.abs(sell.openTs - buy.openTs);
        if (diffMs <= timeWindow) {
          const diffSeconds = Math.round(diffMs / 1000);
          const diffMinutes = (diffSeconds / 60).toFixed(1);
          const timeDiffDisplay = diffSeconds < 60 
            ? `${diffSeconds} ث` 
            : `${diffMinutes} د`;
          
          pairs.push({
            a: buy,
            b: sell,
            diffSeconds,
            diffMinutes: parseFloat(diffMinutes),
            openTimeDiff: diffMs,
            latestOpenTime: Math.max(buy.openTs, sell.openTs),
            timeDiffDisplay
          });
        }
      });
    });
  });
  
  // Sort by latest open time (newest first)
  pairs.sort((a, b) => b.latestOpenTime - a.latestOpenTime);
  
  return pairs;
}

/**
 * Check if date is today
 */
function isToday(dt) {
  const today = new Date();
  return dt.getDate() === today.getDate() &&
         dt.getMonth() === today.getMonth() &&
         dt.getFullYear() === today.getFullYear();
}

/**
 * Render results
 */
function renderResults(trades, pairs) {
  const container = document.getElementById('results-container');
  const statsGrid = document.getElementById('stats-grid');
  const filtersDiv = document.getElementById('filters');
  const statsSection = document.getElementById('stats-section');
  const copyAllBtn = document.getElementById('copy-all-btn');
  const timeWindowControl = document.getElementById('time-window-control');
  
  // Store for re-analysis
  currentTrades = trades;
  currentPairs = pairs;
  
  container.innerHTML = '';
  statsGrid.innerHTML = '';
  filtersDiv.innerHTML = '';
  
  // Calculate stats
  const validTrades = trades.filter(t => t.valid);
  const equalTrades = validTrades.filter(t => t.equal).sort((a, b) => b.openTs - a.openTs);
  const zeroProfitTrades = validTrades.filter(t => t.zeroProfit).sort((a, b) => b.openTs - a.openTs);
  
  // Render stats cards
  const stats = [
    { label: 'إجمالي الصفقات', value: validTrades.length, icon: 'fa-list-ol', class: 'default' },
    { label: 'Price = S/L', value: equalTrades.length, icon: 'fa-equals', class: 'equal' },
    { label: 'الربح = 0.00', value: zeroProfitTrades.length, icon: 'fa-coins', class: 'zero-profit' },
    { label: 'الأزواج المقترنة', value: pairs.length, icon: 'fa-link', class: 'paired' }
  ];
  
  stats.forEach(stat => {
    const card = document.createElement('div');
    card.className = `stat-card ${stat.class}`;
    card.innerHTML = `
      <div class="stat-icon"><i class="fas ${stat.icon}"></i></div>
      <div class="stat-number">${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
    `;
    statsGrid.appendChild(card);
  });
  
  // Render filters
  const filterOptions = [
    { id: 'all', label: 'جميع الصفقات' },
    { id: 'equal', label: 'Price = S/L فقط' },
    { id: 'zero-profit', label: 'الربح = 0 فقط' },
    { id: 'pairs', label: 'الأزواج المقترنة فقط' }
  ];
  
  filterOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${opt.id === 'all' ? 'active' : ''}`;
    btn.textContent = opt.label;
    btn.dataset.filter = opt.id;
    btn.addEventListener('click', () => applyFilter(opt.id, trades, pairs));
    filtersDiv.appendChild(btn);
  });
  
  // Render tables
  if (equalTrades.length > 0) {
    renderTable(container, 'equal-highlight', equalTrades, 
                `صفقات Price = S/L (${equalTrades.length})`, 'fa-equals', 'equal');
  }
  
  if (zeroProfitTrades.length > 0) {
    renderTable(container, 'zero-profit-highlight', zeroProfitTrades, 
                `الربح = 0.00 (${zeroProfitTrades.length})`, 'fa-coins', 'zero-profit');
  }
  
  if (pairs.length > 0) {
    renderPairsTable(container, pairs);
  }
  
  // Show invalid rows if any
  const invalidTrades = trades.filter(t => !t.valid);
  if (invalidTrades.length > 0) {
    renderInvalidRows(container, invalidTrades);
  }
  
  // Setup copy button
  copyAllBtn.style.display = 'block';
  copyAllBtn.onclick = () => copyFilteredData(trades, pairs);
  
  // Show time window control if there are trades
  if (validTrades.length > 0) {
    timeWindowControl.style.display = 'block';
  }
  
  statsSection.classList.remove('hidden');
  
  // Setup filter persistence
  setupFilterState(trades, pairs);
}

/**
 * Render table
 */
function renderTable(container, highlightClass, trades, title, icon, sectionClass) {
  const section = document.createElement('div');
  section.className = 'results-section';
  
  const header = document.createElement('div');
  header.className = `section-header ${sectionClass}`;
  header.innerHTML = `
    <i class="fas ${icon} section-icon"></i>
    <h2>${title}</h2>
    <i class="fas fa-chevron-down toggle-icon"></i>
  `;
  
  const content = document.createElement('div');
  content.className = 'section-content';
  
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrapper';
  
  let tableHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>التاريخ والوقت</th>
          <th>الرقم</th>
          <th>النوع</th>
          <th>الرمز</th>
          <th>الحجم</th>
          <th>السعر</th>
          <th>S/L</th>
          <th>الربح</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  trades.forEach((t, idx) => {
    const typeClass = t.type === 'BUY' ? 'type-buy' : 'type-sell';
    const isTodayTrade = isToday(new Date(t.openTs));
    const todayBadge = isTodayTrade ? '<span class="badge-today">اليوم</span>' : '';
    tableHTML += `
      <tr class="${highlightClass}">
        <td>${idx + 1}</td>
        <td>${t.dt} ${todayBadge}</td>
        <td>${t.ticket || '-'}</td>
        <td><span class="${typeClass}">${t.type}</span></td>
        <td>${t.symbol}</td>
        <td>${t.lot.toFixed(2)}</td>
        <td>${t.price.toFixed(5)}</td>
        <td>${t.sl.toFixed(5)}</td>
        <td>${t.profit.toFixed(2)}</td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  tableWrapper.innerHTML = tableHTML;
  content.appendChild(tableWrapper);
  
  section.appendChild(header);
  section.appendChild(content);
  container.appendChild(section);
  
  // Toggle collapse
  header.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    header.querySelector('.toggle-icon').classList.toggle('closed');
  });
}

/**
 * Render pairs table
 */
function renderPairsTable(container, pairs) {
  const section = document.createElement('div');
  section.className = 'results-section';
  section.id = 'pairs-section'; // Add ID for easy scrolling
  
  const header = document.createElement('div');
  header.className = 'section-header paired';
  header.innerHTML = `
    <i class="fas fa-link section-icon"></i>
    <h2>الأزواج المقترنة (${pairs.length})</h2>
    <i class="fas fa-chevron-down toggle-icon"></i>
  `;
  
  const content = document.createElement('div');
  content.className = 'section-content';
  
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrapper';
  
  let tableHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>التاريخ والوقت</th>
          <th>الرقم</th>
          <th>النوع</th>
          <th>الرمز</th>
          <th>الحجم</th>
          <th>السعر</th>
          <th>S/L</th>
          <th>الربح</th>
          <th>فرق الوقت</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Color palette for pairs
  const pairColors = [
    { bg: 'rgba(52, 152, 219, 0.15)', border: '#3498db', rowClass: 'pair-blue' },
    { bg: 'rgba(155, 89, 182, 0.15)', border: '#9b59b6', rowClass: 'pair-purple' },
    { bg: 'rgba(46, 204, 113, 0.15)', border: '#2ecc71', rowClass: 'pair-green' },
    { bg: 'rgba(230, 126, 34, 0.15)', border: '#e67e22', rowClass: 'pair-orange' },
    { bg: 'rgba(231, 76, 60, 0.15)', border: '#e74c3c', rowClass: 'pair-red' },
    { bg: 'rgba(26, 188, 156, 0.15)', border: '#1abc9c', rowClass: 'pair-teal' }
  ];
  
  pairs.forEach((pair, pairIdx) => {
    const colorIdx = pairIdx % pairColors.length;
    const color = pairColors[colorIdx];
    
    const isTodayA = isToday(new Date(pair.a.openTs));
    const isTodayB = isToday(new Date(pair.b.openTs));
    const todayBadgeA = isTodayA ? '<span class="badge-today">اليوم</span>' : '';
    const todayBadgeB = isTodayB ? '<span class="badge-today">اليوم</span>' : '';
    
    // Buy row
    const buyTypeClass = 'type-buy';
    tableHTML += `
      <tr class="pair-row pair-a" style="background-color: ${color.bg}; border-left: 4px solid ${color.border};">
        <td rowspan="2" style="font-weight: bold; vertical-align: middle; font-size: 16px; color: ${color.border};">${pairIdx + 1}</td>
        <td>${pair.a.dt} ${todayBadgeA}</td>
        <td>${pair.a.ticket || '-'}</td>
        <td><span class="${buyTypeClass}">${pair.a.type}</span></td>
        <td><strong>${pair.a.symbol}</strong></td>
        <td>${pair.a.lot.toFixed(2)}</td>
        <td>${pair.a.price.toFixed(5)}</td>
        <td>${pair.a.sl.toFixed(5)}</td>
        <td>${pair.a.profit.toFixed(2)}</td>
        <td rowspan="2" style="vertical-align: middle; text-align: center;">
          <div class="time-diff" style="color: ${color.border}; font-size: 14px; font-weight: 600;">${pair.timeDiffDisplay}</div>
          ${isTodayA || isTodayB ? '<div style="margin-top: 6px;"><span class="badge-today">اليوم</span></div>' : ''}
        </td>
      </tr>
    `;
    
    // Sell row
    const sellTypeClass = 'type-sell';
    tableHTML += `
      <tr class="pair-row pair-b" style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; border-bottom: 12px solid #fff;">
        <td>${pair.b.dt} ${todayBadgeB}</td>
        <td>${pair.b.ticket || '-'}</td>
        <td><span class="${sellTypeClass}">${pair.b.type}</span></td>
        <td><strong>${pair.b.symbol}</strong></td>
        <td>${pair.b.lot.toFixed(2)}</td>
        <td>${pair.b.price.toFixed(5)}</td>
        <td>${pair.b.sl.toFixed(5)}</td>
        <td>${pair.b.profit.toFixed(2)}</td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  tableWrapper.innerHTML = tableHTML;
  content.appendChild(tableWrapper);
  
  section.appendChild(header);
  section.appendChild(content);
  container.appendChild(section);
  
  // Toggle collapse
  header.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    header.querySelector('.toggle-icon').classList.toggle('closed');
  });
}

/**
 * Render invalid rows
 */
function renderInvalidRows(container, trades) {
  const section = document.createElement('div');
  section.className = 'results-section';
  
  const header = document.createElement('div');
  header.className = 'section-header validation';
  header.innerHTML = `
    <i class="fas fa-exclamation-triangle section-icon"></i>
    <h2>تحقق من الشكل - أسطر غير مطابقة (${trades.length})</h2>
    <i class="fas fa-chevron-down toggle-icon"></i>
  `;
  
  const content = document.createElement('div');
  content.className = 'section-content';
  
  let html = '';
  trades.forEach(t => {
    html += `
      <div style="padding: 10px; margin: 5px 0; background: #ffe0e0; border-left: 4px solid #e74c3c; border-radius: 4px;">
        <span style="background:#e74c3c; color:white; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:700;">غير مطابق</span>
        <strong style="margin-right:6px;">سطر ${t.lineNumber}:</strong> ${t.reason}<br>
        <small style="color: #666;">${t.raw}</small>
      </div>
    `;
  });
  
  content.innerHTML = html;
  
  section.appendChild(header);
  section.appendChild(content);
  container.appendChild(section);
  
  // Toggle collapse
  header.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    header.querySelector('.toggle-icon').classList.toggle('closed');
  });
}

/**
 * Apply filter
 */
function applyFilter(filterId, trades, pairs) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-filter="${filterId}"]`).classList.add('active');
  
  // Update table visibility
  const tables = document.querySelectorAll('.results-section');
  tables.forEach(table => {
    const header = table.querySelector('.section-header');
    const content = table.querySelector('.section-content');
    
    if (!header || !content) return;
    
    let show = false;
    
    if (filterId === 'all') {
      show = true;
    } else if (filterId === 'equal' && header.classList.contains('equal')) {
      show = true;
    } else if (filterId === 'zero-profit' && header.classList.contains('zero-profit')) {
      show = true;
    } else if (filterId === 'pairs' && header.classList.contains('paired')) {
      show = true;
    }
    
    table.style.display = show ? 'block' : 'none';
  });
  
  // Scroll to pairs section when pairs filter is selected
  if (filterId === 'pairs') {
    setTimeout(() => {
      const pairsSection = document.getElementById('pairs-section');
      if (pairsSection) {
        pairsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
}

/**
 * Setup filter state persistence
 */
function setupFilterState(trades, pairs) {
  // Filter buttons already setup in renderResults
}

/**
 * Copy filtered data
 */
function copyFilteredData(trades, pairs) {
  const validTrades = trades.filter(t => t.valid);
  let copyText = '';
  
  validTrades.forEach(t => {
    copyText += t.raw + '\n';
  });
  
  navigator.clipboard.writeText(copyText).then(() => {
    showToast('تم نسخ البيانات بنجاح ✓', 'تم نسخ جميع الصفقات الصحيحة');
  }).catch(() => {
    showToast('خطأ في النسخ', true);
  });
}

/**
 * Show toast notification
 */
function showToast(message, isError = false) {
  // Simple toast - can be enhanced with actual toast system
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: ${isError ? '#e74c3c' : '#27ae60'};
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    z-index: 9999;
    animation: slideUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Unified parse runner (manual/auto with debounce)
 */
function performParse(isAuto = false) {
  const textarea = document.getElementById('trades-textarea');
  if (!textarea) return;

  const text = textarea.value;

  if (!text.trim()) {
    if (!isAuto) {
      showToast('الرجاء إدخال بيانات الصفقات', true);
    }
    endParseStatus(null, false);
    return;
  }

  if (parseInProgress) return;
  parseInProgress = true;
  const start = performance.now();
  startParseStatus(isAuto);
  let success = true;

  try {
    const trades = parseTrades(text);
    const pairs = findOpenTimePairs(trades, 5); // Always use 5 minutes

    if (trades.length === 0) {
      showToast('لم يتم العثور على أي صفقات', true);
      success = false;
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, text);

    // Render results
    renderResults(trades, pairs);
  } finally {
    const duration = performance.now() - start;
    endParseStatus(duration, success);
    parseInProgress = false;
  }
}

// Manual trigger
document.getElementById('parse-btn').addEventListener('click', () => performParse(false));

/**
 * Clear button
 */
document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('trades-textarea').value = '';
  document.getElementById('stats-section').classList.add('hidden');
  document.getElementById('results-container').innerHTML = '';
  localStorage.removeItem(STORAGE_KEY);
  updateCharCount();
});

/**
 * Update character count
 */
function updateCharCount() {
  const count = document.getElementById('trades-textarea').value.length;
  document.getElementById('char-count').textContent = count;
}

/**
 * Restore from localStorage or chrome storage
 */
window.addEventListener('load', () => {
  // Try chrome storage first (if running as extension)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['priceSLCheckerInput'], (result) => {
      let text = result.priceSLCheckerInput || localStorage.getItem(STORAGE_KEY) || '';
      
      if (text) {
        document.getElementById('trades-textarea').value = text;
        updateCharCount();
        
        // Auto-parse when page loads
        setTimeout(() => {
          document.getElementById('parse-btn').click();
          
          // Auto-select "جميع الصفقات" filter after parse completes
          setTimeout(() => {
            const allFilterBtn = document.querySelector('[data-filter="all"]');
            if (allFilterBtn) {
              allFilterBtn.click();
            }
          }, 200);
        }, 100);
        
        // Clear storage after loading to prevent duplicate data
        chrome.storage.local.remove(['priceSLCheckerInput']);
      }
    });
  } else {
    // Fallback to localStorage only
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      document.getElementById('trades-textarea').value = saved;
      updateCharCount();
      
      // Auto-parse
      setTimeout(() => {
        document.getElementById('parse-btn').click();
        
        // Auto-select "جميع الصفقات" filter after parse completes
        setTimeout(() => {
          const allFilterBtn = document.querySelector('[data-filter="all"]');
          if (allFilterBtn) {
            allFilterBtn.click();
          }
        }, 200);
      }, 100);
    }
  }
});

/**
 * Update char count on input
 */
function scheduleDebouncedParse() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => performParse(true), DEBOUNCE_MS);
}

const tradesTextarea = document.getElementById('trades-textarea');
tradesTextarea.addEventListener('input', () => {
  updateCharCount();
  scheduleDebouncedParse();
});

tradesTextarea.addEventListener('paste', () => {
  // Allow paste to complete, then schedule
  setTimeout(() => {
    updateCharCount();
    scheduleDebouncedParse();
  }, 0);
});

/**
 * Update pairs when time window changes
 */
document.getElementById('update-pairs-btn').addEventListener('click', () => {
  const timeWindow = parseInt(document.getElementById('time-window-input').value) || 10;
  
  if (timeWindow < 1 || timeWindow > 1440) {
    showToast('المدة يجب أن تكون بين 1 و 1440 دقيقة', true);
    return;
  }
  
  // Re-calculate pairs with new time window
  const newPairs = findOpenTimePairs(currentTrades, timeWindow);
  
  // Update stats
  const statsCards = document.querySelectorAll('.stat-card');
  if (statsCards.length >= 4) {
    const pairCard = statsCards[3];
    const countSpan = pairCard.querySelector('.stat-number');
    if (countSpan) {
      countSpan.textContent = newPairs.length;
    }
  }
  
  // Re-render pairs table
  const container = document.getElementById('results-container');
  
  // Remove old pairs section
  const oldPairsSection = container.querySelector('.section-header.paired')?.closest('.results-section');
  if (oldPairsSection) {
    oldPairsSection.remove();
  }
  
  // Render new pairs table if exists
  if (newPairs.length > 0) {
    renderPairsTable(container, newPairs);
  } else {
    showToast('لم يتم العثور على أزواج متقاربة بهذه المدة', false);
  }
  
  // Update current pairs
  currentPairs = newPairs;
});