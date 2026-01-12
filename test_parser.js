
function parseTrades(text) {
    const lines = text.split('\n');
    const trades = [];

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // 1. Detect Date/Time
        const timeMatch = line.match(/(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}|\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\s+(\d{2}:\d{2}(:\d{2})?)/);
        
        // 2. Detect Type
        const typeMatch = line.match(/\b(buy|sell)\b/i);
        
        // 3. Detect Symbol & Price
        const words = line.split(/\s+/);
        let symbol = '';
        let price = 0;
        let decimals = 0;
        
        // Find Symbol
        for (const w of words) {
            const upperW = w.toUpperCase();
            if (['BUY', 'SELL', 'LIMIT', 'STOP', 'MARKET', 'MOBILE', 'DESKTOP', 'WEB'].includes(upperW)) continue;
            if (w.match(/^[\d\.\-\/:]+$/)) continue; 
            
            if (w.length >= 3 && /^[A-Z0-9]+$/.test(upperW) && !/^\d+$/.test(w)) {
                symbol = upperW;
                break; 
            }
        }

        // Find Price
        if (typeMatch) {
            const typeIndex = words.findIndex(w => w.toLowerCase() === typeMatch[0].toLowerCase());
            console.log(`Line: ${line}`);
            console.log(`Type: ${typeMatch[0]}, Index: ${typeIndex}`);
            
            if (typeIndex !== -1) {
                let numbersFound = 0;
                for (let i = typeIndex + 1; i < words.length; i++) {
                    const w = words[i];
                    console.log(`Checking word '${w}'`);
                    if (/^[\d\.]+$/.test(w) && !isNaN(parseFloat(w)) && w !== '.') {
                        numbersFound++;
                        console.log(`  -> Is number. Count: ${numbersFound}`);
                        if (numbersFound === 2) { 
                            price = parseFloat(w);
                            console.log(`  -> Price found: ${price}`);
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
             trades.push({
                price: price
            });
        }
    });
    return trades;
}

const input = `AUDUSD 118790076 2025.12.12 02:55:00 Sell 0.01 0.66698 0 0 0.66752 MOBILE 0 -0.54 185.80.46.149`;
const result = parseTrades(input);
console.log(result);
