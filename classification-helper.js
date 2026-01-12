// Initialize logic
document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Tabs Logic ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons
            navBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            btn.classList.add('active');

            // Hide all sections
            viewSections.forEach(section => section.classList.remove('active'));
            // Show target section
            const targetId = btn.dataset.target;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Add click handlers to all buttons
    document.querySelectorAll('.button-group').forEach(group => {
        group.addEventListener('click', (e) => {
            if (e.target.classList.contains('choice-btn')) {
                // Remove active from siblings
                group.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('active'));
                // Add active to clicked
                e.target.classList.add('active');
                // Trigger analysis
                analyze();
            }
        });
    });

    // Reset Button Handler
    document.getElementById('reset-btn').addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('active'));
        // Clear result area
        const resultArea = document.getElementById('result-area');
        resultArea.innerHTML = '';
        resultArea.style.display = 'none';
    });

    // Initial analysis (removed to start empty)
    // analyze();
});

function getSelectedValue(groupId) {
    const activeBtn = document.querySelector(`#${groupId} .choice-btn.active`);
    return activeBtn ? activeBtn.dataset.value : null;
}

function analyze() {
    const profitStatus = getSelectedValue('profit-group');
    const location = getSelectedValue('location-group');
    const banStatus = getSelectedValue('ban-group');
    const condition = getSelectedValue('condition-group');

    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = '';
    
    // Check if all fields are selected
    if (!profitStatus || !location || !banStatus || !condition) {
        resultArea.style.display = 'none';
        return;
    }
    
    let match = null;

    // --- Logic Rules (Priority Order) ---

    // 1. Exceptional Profit ($6000+) -> Standard 2
    if (condition === 'exceptional-profit') {
        match = {
            type: 'STANDARD 2',
            class: 'standard',
            reason: 'أرباح استثنائية (6000$ فأكثر) في مدة قصيرة'
        };
    }
    
    // 2. B5 2 wb: Negative + Banned + Any Location
    else if (profitStatus === 'negative' && banStatus === 'banned') {
        match = {
            type: 'B5 2 wb',
            class: 'b5',
            reason: 'رصيد سالب + محظور'
        };
    }

    // 3. Standard 2: Governorates + Not Banned (Positive OR Negative)
    else if (location === 'governorates' && banStatus === 'not-banned') {
        match = {
            type: 'STANDARD 2',
            class: 'standard',
            reason: 'محافظات (أربيل/كركوك/سليمانية) + غير محظور'
        };
        // Special Note for Negative Balance
        if (profitStatus === 'negative') {
            match.class = 'ignore'; // Or keep standard and add note? Let's use ignore style for visibility
            match.reason += '<br><strong>(تنبيه: الرصيد سالب -> تفعيل علامة Ignore في الشيت)</strong>';
        }
    }

    // 4. Standard 2: Positive + Governorates + Banned
    else if (profitStatus === 'positive' && location === 'governorates' && banStatus === 'banned') {
        match = {
            type: 'STANDARD 2',
            class: 'standard',
            reason: 'رصيد موجب + محافظات + محظور'
        };
    }

    // 5. Standard 2: Positive + Any Location + Pending Zero
    else if (profitStatus === 'positive' && condition === 'pending-zero') {
        match = {
            type: 'STANDARD 2',
            class: 'standard',
            reason: 'رصيد موجب + أوامر معلقة أرباح صفر'
        };
    }

    // 6. Standard 2: Positive + Not Governorates + (same=sl OR Weekly Profit)
    else if (profitStatus === 'positive' && location === 'other' && (condition === 'same-sl' || condition === 'weekly-profit')) {
        match = {
            type: 'STANDARD 2',
            class: 'standard',
            reason: `رصيد موجب + مناطق أخرى + شرط (${condition === 'same-sl' ? 'Price=SL' : 'أرباح أسبوعية'})`
        };
    }

    // New Rule: Positive + Other + Not Banned + None -> B5 2
    else if (profitStatus === 'positive' && location === 'other' && banStatus === 'not-banned' && condition === 'none') {
        match = {
            type: 'B5 2',
            class: 'b5',
            reason: 'رصيد موجب + مناطق أخرى + غير محظور + لا توجد شروط إضافية'
        };
    }

    // New Rule: Positive + Other + Banned + None -> B5 2 wb
    else if (profitStatus === 'positive' && location === 'other' && banStatus === 'banned' && condition === 'none') {
        match = {
            type: 'B5 2 wb',
            class: 'b5',
            reason: 'رصيد موجب + مناطق أخرى + محظور + لا توجد شروط إضافية'
        };
    }

    // 7. B5 2: Negative + Not Governorates + Not Banned
    else if (profitStatus === 'negative' && location === 'other' && banStatus === 'not-banned') {
        match = {
            type: 'B5 2',
            class: 'b5',
            reason: 'رصيد سالب + مناطق أخرى + غير محظور'
        };
    }

    // 8. B5 2: Negative + Any Location + Pending Zero
    else if (profitStatus === 'negative' && condition === 'pending-zero') {
        match = {
            type: 'B5 2',
            class: 'b5',
            reason: 'رصيد سالب + أوامر معلقة أرباح صفر'
        };
    }

    // 9. B5 2: Negative + Any Location + Weekly Profit ($1000-$5000)
    else if (profitStatus === 'negative' && condition === 'weekly-profit') {
        match = {
            type: 'B5 2',
            class: 'b5',
            reason: 'رصيد سالب + أرباح أسبوعية (1000$-5000$)'
        };
    }


    // Render Result
    if (!match) {
        resultArea.style.display = 'none';
    } else {
        resultArea.style.display = 'block';
        const div = document.createElement('div');
        div.className = `result-box ${match.class}`;
        div.innerHTML = `<span class="result-type">${match.type}</span><span class="result-reason">${match.reason}</span>`;
        resultArea.appendChild(div);

        // --- Auto-link to 3 Days Balance ---
        const tdbGroup = document.getElementById('tdb-classification');
        if (tdbGroup) {
            // Reset active
            tdbGroup.querySelectorAll('.side-btn').forEach(btn => btn.classList.remove('active'));
            
            let action = 'stay';
            // Standard or B5 -> Transfer
            if (match.class === 'standard' || match.class === 'b5') {
                action = 'transfer';
            }
            // Ignore -> Stay (default)

            const btnToActivate = tdbGroup.querySelector(`.side-btn[data-value="${action}"]`);
            if (btnToActivate) {
                btnToActivate.classList.add('active');
                // If profit is already selected in 3 Days, update the result immediately
                const profit = getSelectedValueSide('tdb-profit');
                if (profit) {
                    analyzeThreeDays();
                }
            }
        }
    }
}

// --- Three Days Balance Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // Account Group Selection
    const accountGroup = document.getElementById('tdb-account-group');
    if (accountGroup) {
        accountGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.side-btn');
            if (btn) {
                // UI Update
                accountGroup.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Hide all sections
                document.querySelectorAll('.dynamic-section').forEach(el => el.style.display = 'none');
                
                // Show relevant section
                const val = btn.dataset.value;
                if (val === 'b1') document.getElementById('tdb-b1-section').style.display = 'block';
                if (val === 'b5') document.getElementById('tdb-b5-section').style.display = 'block';
                if (val === 'standard2') document.getElementById('tdb-standard2-section').style.display = 'block';

                // Clear result
                document.getElementById('tdb-result').style.display = 'none';
                
                // Trigger analysis if inputs are already filled (optional, but good for UX)
                analyzeThreeDays();
            }
        });
    }

    // Sub-options Selection
    document.querySelectorAll('#three-days-view .side-btn-group:not(#tdb-account-group)').forEach(group => {
        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.side-btn');
            if (btn) {
                group.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                analyzeThreeDays();
            }
        });
    });

    // B5 Balance Input
    const balanceInput = document.getElementById('tdb-b5-balance');
    if (balanceInput) {
        balanceInput.addEventListener('input', analyzeThreeDays);
    }

    // Sidebar Reset Button
    const tdbResetBtn = document.getElementById('tdb-reset-btn');
    if (tdbResetBtn) {
        tdbResetBtn.addEventListener('click', () => {
            document.querySelectorAll('#three-days-view .side-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.dynamic-section').forEach(el => el.style.display = 'none');
            if (balanceInput) balanceInput.value = '';
            
            const resultDiv = document.getElementById('tdb-result');
            resultDiv.innerHTML = '';
            resultDiv.style.display = 'none';
            resultDiv.className = 'side-result';
        });
    }
});

function getSelectedValueSide(groupId) {
    const activeBtn = document.querySelector(`#${groupId} .side-btn.active`);
    return activeBtn ? activeBtn.dataset.value : null;
}

function analyzeThreeDays() {
    const accountType = getSelectedValueSide('tdb-account-group');
    const resultDiv = document.getElementById('tdb-result');
    
    if (!accountType) {
        resultDiv.style.display = 'none';
        return;
    }

    let message = '';
    let colorClass = '';
    let showResult = false;

    // --- B1 Logic ---
    if (accountType === 'b1') {
        const location = getSelectedValueSide('tdb-b1-location');
        const profits = getSelectedValueSide('tdb-b1-profits');

        if (location || profits) {
            showResult = true;
            // Rule: Governorates OR Profits > 100 -> Standard_Bonus
            if (location === 'governorates' || profits === 'above-100') {
                message = 'القرار: يتحول الى (Standard_Bonus)<br><small>السبب: محافظات أو أرباح 100$ وأكثر</small>';
                colorClass = 'standard'; // Green
            } else {
                message = 'القرار: يبقى (B1)<br><small>السبب: غير محافظات وأرباح أقل من 100$</small>';
                colorClass = 'ignore'; // Orange/Brown
            }
        }
    }

    // --- B5 Logic ---
    else if (accountType === 'b5') {
        const profitStatus = getSelectedValueSide('tdb-b5-profit-status');
        const location = getSelectedValueSide('tdb-b5-location');
        const banStatus = getSelectedValueSide('tdb-b5-ban-status');
        const condition = getSelectedValueSide('tdb-b5-condition');
        
        if (profitStatus && location && banStatus && condition) {
            showResult = true;
            let matchType = '';
            let matchReason = '';
            let matchClass = '';

            // 1. Exceptional Profit ($6000+) -> Standard 2
            if (condition === 'exceptional-profit') {
                matchType = 'STANDARD 2';
                matchClass = 'standard';
                matchReason = 'أرباح استثنائية (6000$ فأكثر)';
            }
            // 2. B5 2 wb: Negative + Banned + Any Location
            else if (profitStatus === 'negative' && banStatus === 'banned') {
                matchType = 'B5 2 wb';
                matchClass = 'b5';
                matchReason = 'رصيد سالب + محظور';
            }
            // 3. Standard 2: Governorates + Not Banned (Positive OR Negative)
            else if (location === 'governorates' && banStatus === 'not-banned') {
                matchType = 'STANDARD 2';
                matchClass = 'standard';
                matchReason = 'محافظات (أربيل/كركوك/سليمانية) + غير محظور';
                if (profitStatus === 'negative') {
                    matchClass = 'ignore'; 
                    matchReason += '<br><strong>(تنبيه: الرصيد سالب -> تفعيل علامة Ignore في الشيت)</strong>';
                }
            }
            // 4. Standard 2: Positive + Governorates + Banned
            else if (profitStatus === 'positive' && location === 'governorates' && banStatus === 'banned') {
                matchType = 'STANDARD 2';
                matchClass = 'standard';
                matchReason = 'رصيد موجب + محافظات + محظور';
            }
            // 5. Standard 2: Positive + Any Location + Pending Zero
            else if (profitStatus === 'positive' && condition === 'pending-zero') {
                matchType = 'STANDARD 2';
                matchClass = 'standard';
                matchReason = 'رصيد موجب + أوامر معلقة أرباح صفر';
            }
            // 6. Standard 2: Positive + Other + (same=sl OR Weekly Profit)
            else if (profitStatus === 'positive' && location === 'other' && (condition === 'same-sl' || condition === 'weekly-profit')) {
                matchType = 'STANDARD 2';
                matchClass = 'standard';
                matchReason = `رصيد موجب + مناطق أخرى + شرط (${condition === 'same-sl' ? 'Price=SL' : 'أرباح أسبوعية'})`;
            }
            // New Rule: Positive + Other + Not Banned + None -> B5 2
            else if (profitStatus === 'positive' && location === 'other' && banStatus === 'not-banned' && condition === 'none') {
                matchType = 'B5 2';
                matchClass = 'b5'; // Or ignore for 'Stay/Done' meaning? Let's use b5 style or ignore style. usually B5 stay is okay.
                matchReason = 'رصيد موجب + مناطق أخرى + غير محظور + لا توجد شروط إضافية';
            }
            // New Rule: Positive + Other + Banned + None -> B5 2 wb
            else if (profitStatus === 'positive' && location === 'other' && banStatus === 'banned' && condition === 'none') {
                matchType = 'B5 2 wb';
                matchClass = 'b5';
                matchReason = 'رصيد موجب + مناطق أخرى + محظور + لا توجد شروط إضافية';
            }
            // 7. B5 2: Negative + Not Governorates + Not Banned
            else if (profitStatus === 'negative' && location === 'other' && banStatus === 'not-banned') {
                matchType = 'B5 2';
                matchClass = 'b5';
                matchReason = 'رصيد سالب + مناطق أخرى + غير محظور';
            }
            // 8. B5 2: Negative + Any Location + Pending Zero
            else if (profitStatus === 'negative' && condition === 'pending-zero') {
                matchType = 'B5 2';
                matchClass = 'b5';
                matchReason = 'رصيد سالب + أوامر معلقة أرباح صفر';
            }
            // 9. B5 2: Negative + Any Location + Weekly Profit ($1000-$5000)
            else if (profitStatus === 'negative' && condition === 'weekly-profit') {
                matchType = 'B5 2';
                matchClass = 'b5';
                matchReason = 'رصيد سالب + أرباح أسبوعية (1000$-5000$)';
            }
            else {
                // Fallback / undefined case
                matchType = 'غير مصنف (Unclassified)';
                matchClass = 'b5';
                matchReason = 'لا تنطبق أي من القواعد المحددة';
            }

            message = `القرار: ${matchType}<br><small>${matchReason}</small>`;
            colorClass = matchClass;
        }
    }

    // --- Standard 2 Logic ---
    else if (accountType === 'standard2') {
        const activity = getSelectedValueSide('tdb-std2-activity');
        
        if (activity) {
            showResult = true;
            // Rule: Style+Withdraw OR High Profit -> Report
            if (activity === 'style-withdraw' || activity === 'high-profit') {
                message = 'القرار: يتم التبليغ (Report)<br><small>السبب: أسلوب تداول وسحب أو أرباح كبيرة</small>';
                colorClass = 'b5'; // Red
            } else {
                message = 'القرار: طبيعي (Normal)<br><small>لا يوجد نشاط يستدعي التبليغ</small>';
                colorClass = 'standard'; // Green
            }
        }
    }

    if (showResult) {
        resultDiv.innerHTML = message;
        resultDiv.className = 'side-result ' + colorClass;
        resultDiv.style.display = 'block';
    } else {
        resultDiv.style.display = 'none';
    }
}
