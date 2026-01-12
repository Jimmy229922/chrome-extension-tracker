document.getElementById('check-btn').addEventListener('click', () => {
    const client1Text = document.getElementById('client1-trades').value;
    const client2Text = document.getElementById('client2-trades').value;
    const timeToleranceSec = parseInt(document.getElementById('time-tolerance').value) || 180;
    const priceTolerance = parseFloat(document.getElementById('price-tolerance').value) || 1;

    const trades1 = parseTrades(client1Text);
    const trades2 = parseTrades(client2Text);

    const matches = findHedgeMatches(trades1, trades2, timeToleranceSec, priceTolerance);
    currentMatches = matches;
    renderResults(matches);
});

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = '8284290450:AAFFhQlAMWliCY0jGTAct50GTNtF5NzLIec';
const TELEGRAM_CHAT_ID = '-1003692121203';

// Image Handling
let allImages = [];
let currentMatches = [];

// Modal Elements
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalClose = document.getElementById('modal-close');

modalClose.onclick = function() { 
    modal.style.display = "none"; 
}
modal.onclick = function(e) {
    if (e.target === modal) modal.style.display = "none";
}

// Handle File Input
document.getElementById('report-images').addEventListener('change', (e) => {
    addImages(e.target.files);
    // Reset input so same files can be selected again if needed
    e.target.value = ''; 
});

// Handle Paste (Ctrl+V / Windows+V)
window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            files.push(item.getAsFile());
        }
    }
    if (files.length > 0) {
        addImages(files);
    }
});

function addImages(files) {
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        allImages.push(files[i]);
    }
    renderImagePreviews();
}

function renderImagePreviews() {
    const container = document.getElementById('image-preview-container');
    container.innerHTML = '';
    
    allImages.forEach((file, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; width: 100px; height: 100px; border: 1px solid #555; border-radius: 4px; overflow: hidden; cursor: pointer;';
        
        const img = document.createElement('img');
        img.file = file;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);
        
        // Click to open modal
        img.onclick = () => {
            modal.style.display = "block";
            modalImg.src = img.src;
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText = 'position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.7); color: white; border: none; cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 10;';
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent modal opening
            allImages.splice(index, 1);
            renderImagePreviews();
        };
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}

document.getElementById('send-telegram-btn').addEventListener('click', async () => {
    const btn = document.getElementById('send-telegram-btn');
    const statusDiv = document.getElementById('telegram-status');
    
    // Gather Data
    const c1Email = document.getElementById('c1-email').value.trim();
    const c1Account = document.getElementById('c1-account').value.trim();
    const c1Country = document.getElementById('c1-country').value.trim();
    
    const c2Email = document.getElementById('c2-email').value.trim();
    const c2Account = document.getElementById('c2-account').value.trim();
    const c2Country = document.getElementById('c2-country').value.trim();
    
    // Use the allImages array instead of the file input directly
    const images = allImages;

    // Validation
    if (!c1Email || !c1Account || !c1Country || !c2Email || !c2Account || !c2Country) {
        statusDiv.innerHTML = '<span style="color: #ff5252;">الرجاء ملء جميع بيانات العميلين (البريد، الحساب، الدولة).</span>';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
    statusDiv.innerHTML = '';

    let details = '';
    let symbols = '';
    if (currentMatches.length > 0) {
        // Take the first match or summarize all? Usually one hedge case is relevant.
        // Let's list them if few, or just the first one.
        // User asked for "the duration difference and price difference".
        
        // Let's format it nicely
        details = currentMatches.map(m => 
            `فرق التوقيت: ${Math.round(m.timeDiff / 1000)} ثانية | فرق السعر: ${m.priceDiff.toFixed(5)}`
        ).join('\n');

        const uniqueSymbols = [...new Set(currentMatches.map(m => m.t1.symbol))];
        symbols = uniqueSymbols.join(', ');
    }

    const message = `${c1Email}
${c1Account} / ${c1Country}

${c2Email}
${c2Account}  / ${c2Country}
صفقات متعاكسه بنفس السعر وبوقت متقارب / ${c1Country} و${c2Country}

${details}

الزوج هو: ${symbols}`;

    try {
        if (images.length === 0) {
            // 1. Send Text Message Only
            const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            const textResponse = await fetch(textUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message
                })
            });
            if (!textResponse.ok) throw new Error('فشل إرسال النص');

        } else if (images.length === 1) {
            // 2. Send Single Photo with Caption
            const photoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('photo', images[0]);
            formData.append('caption', message);

            const imgResponse = await fetch(photoUrl, {
                method: 'POST',
                body: formData
            });
            if (!imgResponse.ok) throw new Error('فشل إرسال الصورة');

        } else {
            // 3. Send Media Group (Album) with Caption on first item
            const mediaGroupUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);

            const mediaArray = images.map((file, index) => {
                return {
                    type: 'photo',
                    media: `attach://image${index}`,
                    caption: index === 0 ? message : '' // Caption only on first image
                };
            });

            formData.append('media', JSON.stringify(mediaArray));

            // Append files with keys matching the attach:// names
            images.forEach((file, index) => {
                formData.append(`image${index}`, file);
            });

            const groupResponse = await fetch(mediaGroupUrl, {
                method: 'POST',
                body: formData
            });
            if (!groupResponse.ok) throw new Error('فشل إرسال مجموعة الصور');
        }

        statusDiv.innerHTML = '<span style="color: #4caf50;">تم الإرسال بنجاح! ✅</span>';
        
        // Reset Form after 1.5 seconds
        setTimeout(() => {
            // Clear Telegram Inputs
            document.getElementById('c1-email').value = '';
            document.getElementById('c1-account').value = '';
            document.getElementById('c1-country').value = '';
            document.getElementById('c2-email').value = '';
            document.getElementById('c2-account').value = '';
            document.getElementById('c2-country').value = '';
            
            // Clear Images
            allImages = [];
            renderImagePreviews();
            
            // Clear Trades Inputs
            document.getElementById('client1-trades').value = '';
            document.getElementById('client2-trades').value = '';
            
            // Clear Results
            document.getElementById('results').innerHTML = '';
            
            statusDiv.innerHTML = '';
            btn.textContent = 'إرسال إلى تلجرام ✈️';
            btn.disabled = false;
        }, 1500);
        
    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = `<span style="color: #ff5252;">حدث خطأ: ${error.message}</span>`;
        btn.disabled = false;
        btn.textContent = 'إرسال إلى تلجرام ✈️';
    }
});

function parseTrades(text) {
    const lines = text.split('\n');
    const trades = [];

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // 1. Detect Date/Time
        // Supports YYYY.MM.DD or DD.MM.YYYY with separators . - / and Time HH:MM:SS
        const timeMatch = line.match(/(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}|\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\s+(\d{2}:\d{2}(:\d{2})?)/);
        
        // 2. Detect Type
        const typeMatch = line.match(/\b(buy|sell)\b/i);
        
        // 3. Detect Symbol & Price
        const words = line.split(/\s+/);
        let symbol = '';
        let price = 0;
        let volume = 0;
        let ticket = '';
        let decimals = 0;
        
        // Find Symbol
        for (const w of words) {
            const upperW = w.toUpperCase();
            // Skip keywords and date/time parts
            if (['BUY', 'SELL', 'LIMIT', 'STOP', 'MARKET', 'MOBILE', 'DESKTOP', 'WEB'].includes(upperW)) continue;
            if (w.match(/^[\d\.\-\/:]+$/)) continue; 
            
            if (w.length >= 3 && /^[A-Z0-9]+$/.test(upperW) && !/^\d+$/.test(w)) {
                symbol = upperW;
                break; 
            }
        }

        // Find Ticket (Look for large integer, usually 8+ digits, not volume/price)
        for (const w of words) {
            if (/^\d{7,}$/.test(w)) {
                ticket = w;
                break;
            }
        }

        // Find Price and Volume
        if (typeMatch) {
            const typeIndex = words.findIndex(w => w.toLowerCase() === typeMatch[0].toLowerCase());
            if (typeIndex !== -1) {
                let numbersFound = 0;
                for (let i = typeIndex + 1; i < words.length; i++) {
                    const w = words[i];
                    // Check if it is a number
                    if (/^[\d\.]+$/.test(w) && !isNaN(parseFloat(w)) && w !== '.') {
                        // Ignore date-like numbers (e.g. 2025.12.12 has 2 dots)
                        if ((w.match(/\./g) || []).length >= 2) continue;

                        numbersFound++;
                        if (numbersFound === 1) {
                            volume = parseFloat(w);
                        } else if (numbersFound === 2) { // The second number is the Price
                            price = parseFloat(w);
                            if (w.includes('.')) {
                                decimals = w.split('.')[1].length;
                            }
                            break;
                        }
                    }
                }
            }
        }

        if (timeMatch && typeMatch) {
            let dateStr = timeMatch[0].replace(/\./g, '-').replace(/\//g, '-');
            if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
                const parts = dateStr.split(' ')[0].split('-');
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]} ${timeMatch[2]}`;
            }
            
            const time = new Date(dateStr).getTime();
            if (!isNaN(time)) {
                trades.push({
                    id: index,
                    time: time,
                    timeStr: timeMatch[0],
                    type: typeMatch[1].toLowerCase(),
                    symbol: symbol,
                    price: price,
                    volume: volume,
                    ticket: ticket,
                    decimals: decimals,
                    line: line.trim()
                });
            }
        }
    });
    return trades;
}

function findHedgeMatches(trades1, trades2, timeToleranceSec, priceTolerance) {
    const matches = [];
    const timeThreshold = timeToleranceSec * 1000;

    trades1.forEach(t1 => {
        trades2.forEach(t2 => {
            // Check time difference
            const timeDiff = Math.abs(t1.time - t2.time);
            
            // Check symbol
            const symbolMatch = (t1.symbol && t2.symbol) ? (t1.symbol === t2.symbol) : true;
            
            // Check opposite type
            const oppositeType = (t1.type === 'buy' && t2.type === 'sell') || (t1.type === 'sell' && t2.type === 'buy');

            // Check price difference
            let priceDiff = 0;
            let pointsDiff = 0;
            let isPriceMatch = true;

            if (t1.price && t2.price) {
                priceDiff = Math.abs(t1.price - t2.price);
                
                // Smart Point Detection: Use the max decimals to determine what "1 Point" is
                const maxDecimals = Math.max(t1.decimals || 0, t2.decimals || 0);
                const pointValue = maxDecimals > 0 ? Math.pow(10, -maxDecimals) : 1;
                
                pointsDiff = priceDiff / pointValue;

                // Filter by Price Tolerance if provided
                if (priceTolerance > 0 && priceDiff > priceTolerance) {
                    isPriceMatch = false;
                }
            }

            if (timeDiff <= timeThreshold && oppositeType && symbolMatch && isPriceMatch) {
                matches.push({
                    t1: t1,
                    t2: t2,
                    timeDiff: timeDiff,
                    priceDiff: priceDiff,
                    pointsDiff: pointsDiff
                });
            }
        });
    });
    return matches;
}

function renderResults(matches) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-matches">لا توجد صفقات هيدج متطابقة (No matching hedge trades found)</div>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>صفقة العميل الأول (Client 1)</th>
                <th>صفقة العميل الثاني (Client 2)</th>
                <th>فرق التوقيت (Time Diff)</th>
                <th>فرق السعر (Price Diff)</th>
                <th>الرمز (Symbol)</th>
            </tr>
        </thead>
        <tbody>
            ${matches.map(m => `
                <tr class="match-row">
                    <td>${formatTrade(m.t1)}</td>
                    <td>${formatTrade(m.t2)}</td>
                    <td style="direction: ltr;">${Math.round(m.timeDiff / 1000)}s</td>
                    <td style="direction: ltr;">
                        <strong>${m.priceDiff !== undefined ? m.priceDiff.toFixed(5) : 'N/A'}</strong>
                        <br>
                        <span style="font-size:0.8em; color:#ddd;">(${Math.round(m.pointsDiff)} pts)</span>
                    </td>
                    <td>${m.t1.symbol || '?'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    resultsDiv.appendChild(table);
}

function formatTrade(trade) {
    const typeClass = trade.type === 'buy' ? 'buy' : 'sell';
    const typeAr = trade.type === 'buy' ? 'شراء' : 'بيع';
    return `
        <div style="margin-bottom: 5px;">
            <span style="background: #444; padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">#${trade.ticket || 'N/A'}</span>
            <span style="float:left; font-family: monospace;">${trade.timeStr}</span>
        </div>
        <div class="${typeClass}" style="font-size: 1.1em;">
            ${typeAr} (${trade.type.toUpperCase()}) 
            <span style="color: #fff;">${trade.volume || '?'}</span>
        </div>
        <div style="margin-top: 2px;">
            السعر: <strong style="color: #ffd700;">${trade.price || '?'}</strong>
        </div>
    `;
}
