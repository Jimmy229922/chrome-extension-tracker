document.addEventListener('DOMContentLoaded', async () => {
  const reportContent = document.getElementById('report-content');
  const reportDate = document.getElementById('report-date');
  const summarySection = document.getElementById('summary-section');
  const closeBtn = document.getElementById('close-btn');

  // Set current date/time
  const now = new Date();
  reportDate.textContent = now.toLocaleDateString('ar-EG', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  // Load data
  const data = await chrome.storage.local.get('suspiciousReportData');
  let patterns = data.suspiciousReportData || [];

  if (patterns.length === 0) {
    reportContent.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها حالياً</div>';
    return;
  }

  // Assign IDs based on chronological order (Oldest = 1)
  // First, ensure they are sorted by date ascending
  patterns.sort((a, b) => {
      const dateA = new Date(a.withdrawal.date.replace(/\./g, '-'));
      const dateB = new Date(b.withdrawal.date.replace(/\./g, '-'));
      return dateA - dateB;
  });
  
  patterns.forEach((p, i) => p.displayId = i + 1);

  // Now sort descending for display (Newest first)
  patterns.sort((a, b) => {
      const dateA = new Date(a.withdrawal.date.replace(/\./g, '-'));
      const dateB = new Date(b.withdrawal.date.replace(/\./g, '-'));
      return dateB - dateA;
  });

  // Split groups
  const marketTests = patterns.filter(p => p.type === 'market_test');
  const quickProfits = patterns.filter(p => p.type === 'quick_profit');

  // Render Summary Cards
  if (summarySection) {
    summarySection.innerHTML = `
      <div class="summary-card market-test" id="card-market-test" style="cursor: pointer;">
        <span class="summary-count">${marketTests.length}</span>
        <span class="summary-label">اختبار السوق</span>
      </div>
      <div class="summary-card quick-profit" id="card-quick-profit" style="cursor: pointer;">
        <span class="summary-count">${quickProfits.length}</span>
        <span class="summary-label">سحب سريع</span>
      </div>
    `;
    
    document.getElementById('card-market-test').onclick = () => {
        const el = document.getElementById('section-market-test');
        if(el) el.scrollIntoView({behavior: 'smooth'});
    };
    document.getElementById('card-quick-profit').onclick = () => {
        const el = document.getElementById('section-quick-profit');
        if(el) el.scrollIntoView({behavior: 'smooth'});
    };
  }

  // Helper to check if date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const cleanDateStr = dateStr.replace(/\./g, '-').split(' ')[0];
    const date = new Date(cleanDateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Render Function
  const renderGroup = (groupPatterns, title, sectionId) => {
      if (groupPatterns.length === 0) return;

      const section = document.createElement('div');
      section.id = sectionId;
      section.innerHTML = `<h3 style="color:#555; margin: 30px 0 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${title} (${groupPatterns.length})</h3>`;
      
      groupPatterns.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suspicious-item';
        if (isToday(p.withdrawal.date)) item.classList.add('today-highlight');

        if (p.type === 'market_test') {
            const winTradesHtml = p.winTrades.map(t => {
                // Calculate duration with seconds
                const openDate = new Date(t.date.replace(/\./g, '-'));
                const closeDate = new Date(t.closeTime.replace(/\./g, '-'));
                const durationMs = closeDate - openDate;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                const durationStr = `${hours}س ${minutes}د ${seconds}ث`;
                
                return `
                <div class="step-info" style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">${t.type} ${t.volume} | ${t.symbol}</div>
                        <div style="color: #999; font-size: 0.85em; line-height: 1.4;">
                            📂 فتح: ${t.date.split(' ')[0]} ${t.date.split(' ')[1]}<br>
                            📁 أغلق: ${t.closeTime.split(' ')[0]} ${t.closeTime.split(' ')[1]}
                        </div>
                    </div>
                    <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span class="suspicious-profit-loss win-text" style="font-size: 1.1em;">+${t.profit}</span>
                        <span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">⏱ ${durationStr}</span>
                    </div>
                </div>
            `}).join('');

            item.innerHTML = `
              <div class="suspicious-header">
                <span class="suspicious-badge">حالة #${p.displayId} (اختبار السوق)</span>
                <span class="timestamp">${p.lossTrade.date.split(' ')[0]}</span>
              </div>
              
              <div class="suspicious-step step-loss">
                <div class="step-icon">📉</div>
                <div class="step-details">
                  <span class="step-title">1. اختبار السوق (خسارة)</span>
                  <div class="step-info" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div style="font-weight: bold; margin-bottom: 4px;">${p.lossTrade.type} ${p.lossTrade.volume} | ${p.lossTrade.symbol}</div>
                      <div style="color: #999; font-size: 0.85em; line-height: 1.4;">
                        📂 فتح: ${p.lossTrade.date.split(' ')[0]} ${p.lossTrade.date.split(' ')[1]}<br>
                        📁 أغلق: ${p.lossTrade.closeTime.split(' ')[0]} ${p.lossTrade.closeTime.split(' ')[1]}
                      </div>
                    </div>
                    <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                      <span class="suspicious-profit-loss loss-text" style="font-size: 1.1em;">${p.lossTrade.profit}</span>
                      <span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">⏱ ${(() => {
                        const openDate = new Date(p.lossTrade.date.replace(/\./g, '-'));
                        const closeDate = new Date(p.lossTrade.closeTime.replace(/\./g, '-'));
                        const durationMs = closeDate - openDate;
                        const hours = Math.floor(durationMs / (1000 * 60 * 60));
                        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                        return `${hours}س ${minutes}د ${seconds}ث`;
                      })()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="suspicious-step step-win">
                <div class="step-icon">📈</div>
                <div class="step-details">
                  <span class="step-title">2. صفقات عكسية رابحة (${p.winTrades.length})</span>
                  ${winTradesHtml}
                </div>
              </div>
              
              <div class="suspicious-step step-withdraw">
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
            const tradesHtml = p.trades.map(t => {
                // Calculate duration with seconds
                const openDate = new Date(t.date.replace(/\./g, '-'));
                const closeDate = new Date(t.closeTime.replace(/\./g, '-'));
                const durationMs = closeDate - openDate;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                const durationStr = `${hours}س ${minutes}د ${seconds}ث`;
                
                return `
                <div class="step-info" style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">${t.type} ${t.volume} | ${t.symbol}</div>
                        <div style="color: #999; font-size: 0.85em; line-height: 1.4;">
                            📂 فتح: ${t.date.split(' ')[0]} ${t.date.split(' ')[1]}<br>
                            📁 أغلق: ${t.closeTime.split(' ')[0]} ${t.closeTime.split(' ')[1]}
                        </div>
                    </div>
                    <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span class="suspicious-profit-loss win-text" style="font-size: 1.1em;">+${t.profit}</span>
                        <span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">⏱ ${durationStr}</span>
                    </div>
                </div>
            `}).join('');

            item.innerHTML = `
              <div class="suspicious-header">
                <span class="suspicious-badge" style="background: #f39c12;">حالة #${p.displayId} (سحب أرباح سريع)</span>
                <span class="timestamp">${p.withdrawal.date.split(' ')[0]}</span>
              </div>
              
              <div class="suspicious-step step-win">
                <div class="step-icon">💰</div>
                <div class="step-details">
                  <span class="step-title">1. صفقات رابحة (${p.trades.length})</span>
                  ${tradesHtml}
                </div>
              </div>
              
              <div class="suspicious-step step-withdraw">
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
        section.appendChild(item);
      });
      reportContent.appendChild(section);
  };

  reportContent.innerHTML = '';
  renderGroup(marketTests, 'اختبار السوق', 'section-market-test');
  renderGroup(quickProfits, 'سحب أرباح سريع', 'section-quick-profit');

  closeBtn.addEventListener('click', () => {
    window.close();
  });
});