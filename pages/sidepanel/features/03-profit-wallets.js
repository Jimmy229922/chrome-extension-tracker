// --- Profit Calculator Functionality ---
calculateProfitBtn.addEventListener('click', () => {
  const tradesText = tradesInput.value.trim();
  
  if (!tradesText) {
    showToast('خطأ', 'الرجاء إدخال الصفقات أولاً', 'duplicate');
    return;
  }
  
  try {
    const trades = parseTradesText(tradesText);
    
    // Filter trades for profit calculation (exclude Balance transfers)
    const tradingTrades = trades.filter(t => !t.isBalance);
    displayProfitResults(tradingTrades);
    
    // Check for suspicious pattern using ALL trades (including Balance)
    const patterns = detectSuspiciousPatterns(trades);
    if (patterns.length > 0) {
      playWarningSound();
      showToast('تحذير أمني', `تم اكتشاف ${patterns.length} حالات تداول مشبوهة!`, 'warning');
      
      // Show the report modal
      showSuspiciousReport(patterns);
    }

  } catch (error) {
    showToast('خطأ', 'حدث خطأ في تحليل الصفقات. تأكد من صحة التنسيق', 'duplicate');
    console.error('Error parsing trades:', error);
  }
});

// Paste from clipboard button
pasteFromClipboardBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      tradesInput.value = text;
      showToast('نجح!', 'تم لصق الصفقات من Clipboard', 'default');
    } else {
      showToast('تنبيه', 'الـ Clipboard فارغ', 'duplicate');
    }
  } catch (error) {
    showToast('خطأ', 'لا يمكن الوصول إلى Clipboard', 'duplicate');
    console.error('Clipboard error:', error);
  }
});

// Clear input button
clearInputBtn.addEventListener('click', () => {
  tradesInput.value = '';
  profitResults.style.display = 'none';
  showToast('تم', 'تم مسح المحتوى', 'default');
});

function parseTradesText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const trades = [];
  
  for (const line of lines) {
    // Split by tabs or multiple spaces
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) continue;

    const type = parts[2];

    if (type === 'Balance') {
        // Handle Balance transaction
        let amount = 0;
        let comment = '';
        
        // Iterate backwards to find the first number which is likely the amount
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
            profit: amount, // Using profit field for amount
            comment: comment,
            isBalance: true
        });

    } else if (parts.length >= 10) {
      // Check if last column is a number (profit) or text (comment)
      const lastCol = parts[parts.length - 1];
      const lastColValue = parseFloat(lastCol);
      
      // If last column is NOT a valid number, it's a comment (deposit/withdrawal/transfer)
      // Skip these lines completely
      if (isNaN(lastColValue) || !lastCol.match(/^-?\d+\.?\d*$/)) {
        continue; // Skip this line - it's not a real trade
      }
      
      // If last column IS a number, it's the profit
      const profit = lastColValue;
      
      if (profit !== null && !isNaN(profit)) {
        trades.push({
          date: parts[0] || '',
          ticket: parts[1] || '',
          type: parts[2] || '',
          volume: parts[3] || '',
          symbol: parts[4] || '',
          openPrice: parts[5] || '',
          closePrice: parts[9] || '',
          profit: profit,
          isBalance: false
        });
      }
    }
  }
  
  return trades;
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
        let patternFound = false;

        // Check Pattern 1: Market Test (Loss -> Win Opposite -> Withdrawal)
        if (i >= 2) {
            const tWin = sortedTrades[i-1];
            const tLoss = sortedTrades[i-2];
            
            if (!tWin.isBalance && tWin.profit > 0 && 
                !tLoss.isBalance && tLoss.profit < 0) {
                 
                 const isOpposite = (tLoss.type === 'Buy' && tWin.type === 'Sell') || (tLoss.type === 'Sell' && tWin.type === 'Buy');
                 if (isOpposite) {
                     patterns.push({
                         type: 'market_test',
                         lossTrade: tLoss,
                         winTrade: tWin,
                         withdrawal: tWithdrawal
                     });
                     patternFound = true;
                 }
            }
        }
        
        if (patternFound) continue;

        // Check Pattern 2: Quick Profit (Win(s) -> Withdrawal)
        if (i >= 1) {
            const tPrev = sortedTrades[i-1];
            if (!tPrev.isBalance && tPrev.profit > 0) {
                const winningTrades = [];
                let k = i - 1;
                while (k >= 0) {
                    const t = sortedTrades[k];
                    if (!t.isBalance && t.profit > 0) {
                        winningTrades.unshift(t);
                    } else {
                        break;
                    }
                    k--;
                }
                
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

function showSuspiciousReport(patterns) {
  const modal = document.getElementById('suspicious-modal');
  const list = document.getElementById('suspicious-list');
  const closeBtn = document.getElementById('suspicious-close');
  
  list.innerHTML = '';
  
  patterns.forEach((p, index) => {
    const item = document.createElement('div');
    item.className = 'suspicious-item';
    
    if (p.type === 'market_test') {
        item.innerHTML = `
          <div class="suspicious-header">
            <span class="suspicious-badge">حالة #${index + 1} (اختبار السوق)</span>
            <span class="timestamp">${p.lossTrade.date.split(' ')[0]}</span>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">📉</div>
            <div class="step-details">
              <span class="step-title">1. اختبار السوق (خسارة)</span>
              <div class="step-info">
                ${p.lossTrade.type} ${p.lossTrade.volume} | ${p.lossTrade.symbol}<br>
                <span class="suspicious-profit-loss loss-text">${p.lossTrade.profit}</span>
              </div>
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">📈</div>
            <div class="step-details">
              <span class="step-title">2. صفقة عكسية (ربح)</span>
              <div class="step-info">
                ${p.winTrade.type} ${p.winTrade.volume} | ${p.winTrade.symbol}<br>
                <span class="suspicious-profit-loss win-text">+${p.winTrade.profit}</span>
              </div>
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💸</div>
            <div class="step-details">
              <span class="step-title">3. سحب الأرباح</span>
              <div class="step-info">
                ${p.withdrawal.date}<br>
                <span class="suspicious-profit-loss withdraw-text">${p.withdrawal.profit}</span><br>
                <small>${p.withdrawal.comment || ''}</small>
              </div>
            </div>
          </div>
        `;
    } else if (p.type === 'quick_profit') {
        const tradesHtml = p.trades.map(t => `
            <div class="step-info" style="margin-bottom: 4px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                ${t.date.split(' ')[1]} | ${t.type} ${t.volume} | ${t.symbol}<br>
                <span class="suspicious-profit-loss win-text">+${t.profit}</span>
            </div>
        `).join('');

        item.innerHTML = `
          <div class="suspicious-header">
            <span class="suspicious-badge" style="background: #f39c12;">حالة #${index + 1} (سحب أرباح سريع)</span>
            <span class="timestamp">${p.withdrawal.date.split(' ')[0]}</span>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💰</div>
            <div class="step-details">
              <span class="step-title">1. صفقات رابحة (${p.trades.length})</span>
              ${tradesHtml}
            </div>
          </div>
          
          <div class="suspicious-step">
            <div class="step-icon">💸</div>
            <div class="step-details">
              <span class="step-title">2. سحب الأرباح</span>
              <div class="step-info">
                ${p.withdrawal.date}<br>
                <span class="suspicious-profit-loss withdraw-text">${p.withdrawal.profit}</span><br>
                <small>${p.withdrawal.comment || ''}</small>
              </div>
            </div>
          </div>
        `;
    }
    
    list.appendChild(item);
  });
  
  modal.style.display = 'block';
  
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  }
  
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  }
}

function displayProfitResults(trades) {
  if (trades.length === 0) {
    showToast('تنبيه', 'لم يتم العثور على صفقات صحيحة', 'duplicate');
    return;
  }

  // 1. Setup Filters
  const filterContainer = document.getElementById('symbol-filter-buttons');
  if (filterContainer) {
    filterContainer.innerHTML = '';
    
    // Get unique symbols
    const symbols = [...new Set(trades.map(t => t.symbol).filter(s => s))].sort();
    
    // Create Select Dropdown
    const select = document.createElement('select');
    select.className = 'profit-filter-select';
    
    // "All" Option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'عرض الكل';
    select.appendChild(allOption);
    
    // Symbol Options
    symbols.forEach(sym => {
      const option = document.createElement('option');
      option.value = sym;
      option.textContent = sym;
      select.appendChild(option);
    });
    
    // Handle Change
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'all') {
        renderProfitView(trades);
      } else {
        const filtered = trades.filter(t => t.symbol === val);
        renderProfitView(filtered);
      }
    });
    
    filterContainer.appendChild(select);
  }

  // 2. Initial Render
  renderProfitView(trades);
  
  // Show results
  profitResults.style.display = 'block';
  
  // Smooth scroll to results
  setTimeout(() => {
    profitResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
  
  showToast('نجح!', `تم حساب profit لـ ${trades.length} صفقة`, 'default');
}

function renderProfitView(trades) {
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalLots = trades.reduce((sum, trade) => sum + (parseFloat(trade.volume) || 0), 0);
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const losingTrades = trades.filter(t => t.profit < 0).length;
  
  // Update summary
  document.getElementById('trades-count').textContent = trades.length;
  document.getElementById('total-lots').textContent = totalLots.toFixed(2);
  document.getElementById('winning-trades').textContent = winningTrades;
  document.getElementById('losing-trades').textContent = losingTrades;
  document.getElementById('total-profit').textContent = totalProfit.toFixed(2);
  
  // Update profit display color based on value
  const totalProfitElement = document.querySelector('.total-profit .stat-value');
  if (totalProfit > 0) {
    totalProfitElement.style.color = '#10b981';
  } else if (totalProfit < 0) {
    totalProfitElement.style.color = '#ef4444';
  } else {
    totalProfitElement.style.color = '#6b7280';
  }
  
  // Display trades details (newest first)
  const tradesList = document.getElementById('trades-list');
  tradesList.innerHTML = '';
  
  // Get today's date in YYYY.MM.DD format
  const today = new Date();
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  
  // Separate trades into today's trades and other trades
  const todayTrades = trades.filter(t => t.date.startsWith(todayStr));
  const otherTrades = trades.filter(t => !t.date.startsWith(todayStr));
  
  // Reverse both arrays to show newest first within each group
  todayTrades.reverse();
  otherTrades.reverse();
  
  // Combine: today's trades first, then other trades
  const sortedTrades = [...todayTrades, ...otherTrades];
  
  sortedTrades.forEach((trade, index) => {
    const tradeItem = document.createElement('div');
    tradeItem.className = 'trade-item';
    
    // Check if trade is from today
    const isToday = trade.date.startsWith(todayStr);
    if (isToday) {
      tradeItem.classList.add('trade-today');
    }
    
    const profitColor = trade.profit > 0 ? '#10b981' : trade.profit < 0 ? '#ef4444' : '#6b7280';
    const profitSign = trade.profit > 0 ? '+' : '';
    
    tradeItem.innerHTML = `
      <div class="trade-header">
        <span class="trade-number">#${index + 1}</span>
        <span class="trade-symbol">${trade.symbol || trade.type}</span>
        <span class="trade-profit" style="color: ${profitColor}; font-weight: bold;">${profitSign}${trade.profit.toFixed(2)}</span>
        ${isToday ? '<span class="today-badge">اليوم</span>' : ''}
      </div>
      <div class="trade-info">
        <span>${trade.type} ${trade.volume}</span>
        <span>${trade.date}</span>
      </div>
    `;
    
    tradesList.appendChild(tradeItem);
  });
}
