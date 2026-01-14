document.addEventListener('DOMContentLoaded', async () => {
    // -------------------------------------------------------------------------
    // SECURITY CHECK
    // Only Ahmed Gamal or Ahmed – Manager can access this page
    // -------------------------------------------------------------------------
    const { userSettings } = await chrome.storage.local.get(['userSettings']);
    const employeeName = userSettings?.employeeName;
    const authorizedUsers = ['Ahmed Gamal', 'Ahmed – Manager'];

    // If not authorized, block access
    if (!authorizedUsers.includes(employeeName)) {
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;color:#e94560;">
                <h1 style="font-size:3rem;">🚫</h1>
                <h2 style="margin:0;">غير مصرح لك بالدخول</h2>
                <p>سيتم إغلاق الصفحة تلقائياً.</p>
            </div>
        `;
        setTimeout(() => {
            window.close(); 
        }, 3000);
        return; 
    }

    // -------------------------------------------------------------------------
    // CONSTANTS & WEIGHTS
    // -------------------------------------------------------------------------
    const REPORT_WEIGHTS = {
        suspicious: 14,
        depositPercentage: 14,
        kpi3DaysBalance: 10, 
        newPositions: 8,
        profitWatching: 8,
        profitSummary: 8,
        samePriceSL: 6,
        dealsProfit: 6,
        creditOut: 4,
        profitOver0: 4,
        floatingProfit: 4,
        twoActions: 3,
        marketWarnings: 0,
        profitLeverage: 1,
        excellence: 0
    };

    const STORAGE_KEY = 'weeklyEvaluationData_v2';
    const EMPLOYEES_LIST_KEY = 'employeeList_v1';

    const DEFAULT_EMPLOYEES = [
        "ABBASS", "AHMED MAGDY", "zahraa Shaqir", "Zainab",
        "Hadil zaiter", "Nour karsifi", "Ahmed Gamal", "Mohamed Abd",
        "Shahenda Sherif"
    ];

    // Keys for iteration
    const CAT_KEYS = Object.keys(REPORT_WEIGHTS);
    const REPORT_KEYS = CAT_KEYS.filter(key => key !== 'excellence');
    const REPORT_WEIGHT_TOTAL = REPORT_KEYS.reduce((sum, key) => sum + (REPORT_WEIGHTS[key] || 0), 0);
    const STAGE1_MAX = 60;
    const STAGE2_MAX = 30;
    const SHIFT_MAX = 5;
    const DEPT_MAX = 5;

    const REPORT_TITLE_MAP = {
        suspicious: 'Suspicious',
        depositPercentage: 'Deposit Percentage',
        kpi3DaysBalance: '3 Days Balance',
        newPositions: 'New Positions',
        profitWatching: 'Profit Watching',
        profitSummary: 'Profit Summary',
        samePriceSL: 'Same Price SL',
        dealsProfit: 'Deals Profit',
        creditOut: 'Credit Out',
        profitOver0: 'Profit over 0',
        floatingProfit: 'Floating Profit',
        twoActions: 'Two Actions',
        marketWarnings: 'Market Warnings',
        profitLeverage: 'Profit Leverage',
        excellence: 'التميز'
    };

    const REPORT_RULES = {
        suspicious: { formula: '(Done + Sent) × 14', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 14' },
        depositPercentage: { formula: '(Done + Sent) × 14', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 14' },
        kpi3DaysBalance: { formula: '(Done + Sent) × 10', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 10' },
        newPositions: { formula: '(Done + Sent) × 8', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 8' },
        profitWatching: { formula: '(Done + Sent) × 8', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 8' },
        profitSummary: { formula: '(Done + Sent) × 8', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 8' },
        samePriceSL: { formula: '(Done + Sent) × 6', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 6' },
        dealsProfit: { formula: '(Done + Sent) × 6', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 6' },
        creditOut: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        profitOver0: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        floatingProfit: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        twoActions: { formula: '(Done + Sent) × 3', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 3' },
        marketWarnings: { formula: 'متابع = 1 / غير متابع = 0', desc: 'يتم تسجيل حالة المتابعة فقط بدون وزن' },
        profitLeverage: { formula: '(Done + Sent) × 1', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 1' },
        excellence: { formula: 'نقاط إضافية (0-3)', desc: 'نقاط تميز إضافية يمنحها المدير للأداء المتميز' }
    };

    // -------------------------------------------------------------------------
    // DOM ELEMENTS
    // -------------------------------------------------------------------------
    const employeeSelect = document.getElementById('employee-select');
    const saveBtn = document.getElementById('save-btn');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const idealContainer = document.getElementById('ideal-employee-container');
    const idealNameEl = document.getElementById('ideal-name');
    const idealScoreEl = document.getElementById('ideal-score');
    const currentTotalScoreEl = document.getElementById('current-total-score');

    // Modals
    const detailsModal = document.getElementById('details-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalHeader = document.getElementById('modal-employee-header');
    const modalBody = document.getElementById('modal-details-body');
    const printModalBtn = document.getElementById('print-modal-btn');

    const ruleModal = document.getElementById('rule-modal');
    const ruleTitleEl = document.getElementById('rule-title');
    const ruleFormulaEl = document.getElementById('rule-formula');
    const ruleDescEl = document.getElementById('rule-desc');
    const closeRuleModalBtn = document.getElementById('close-rule-modal-btn');

    const manageModal = document.getElementById('manage-modal');
    const manageBtn = document.getElementById('manage-employees-btn');
    const closeManageModalBtn = document.getElementById('close-manage-modal-btn');
    const manageListContainer = document.getElementById('manage-list-container');
    const newEmployeeInput = document.getElementById('new-employee-name');
    const addEmployeeBtn = document.getElementById('add-employee-btn');

    const editEmployeeModal = document.getElementById('edit-employee-modal');
    const editEmployeeInput = document.getElementById('edit-employee-input');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteConfirmMsg = document.getElementById('delete-confirm-msg');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Manager Eval Modals
    const shiftEvalModal = document.getElementById('shift-eval-modal');
    const shiftEvalModalInput = document.getElementById('shift-eval-modal-input');
    const saveShiftEvalBtn = document.getElementById('save-shift-eval-btn');
    const shiftManagerDisplayContainer = document.getElementById('shift-manager-display-container');
    const shiftManagerDisplayValue = document.getElementById('shift-manager-display-value');
    const editShiftScoreBtn = document.getElementById('edit-shift-score-btn');

    const deptEvalModal = document.getElementById('dept-eval-modal');
    const deptEvalModalInput = document.getElementById('dept-eval-modal-input');
    const saveDeptEvalBtn = document.getElementById('save-dept-eval-btn');
    const deptManagerDisplayContainer = document.getElementById('dept-manager-display-container');
    const deptManagerDisplayValue = document.getElementById('dept-manager-display-value');
    const editDeptScoreBtn = document.getElementById('edit-dept-score-btn');

    // Compare Modal
    const compareBtn = document.getElementById('compare-btn');
    const compareModal = document.getElementById('compare-modal');
    const closeCompareModalBtn = document.getElementById('close-compare-modal-btn');
    const compareContent = document.getElementById('compare-content');

    // Reset Week Modal
    const resetAllBtn = document.getElementById('reset-all-btn');
    const resetWeekModal = document.getElementById('reset-week-modal');
    const confirmResetWeekBtn = document.getElementById('confirm-reset-week-btn');
    const cancelResetWeekBtn = document.getElementById('cancel-reset-week-btn');

    // Manager Required Modal
    const managerRequiredModal = document.getElementById('manager-required-modal');
    const closeManagerRequiredBtn = document.getElementById('close-manager-required-btn');

    // Input Fields Mapping
    const INPUT_MAP = {
        suspicious: { done: 'inp-suspicious-done', sent: 'inp-suspicious-sent' },
        depositPercentage: { done: 'inp-deposit-done', sent: 'inp-deposit-sent' },
        kpi3DaysBalance: { done: 'inp-3days-done', sent: 'inp-3days-sent' },
        newPositions: { done: 'inp-new-pos-done', sent: 'inp-new-pos-sent' },
        profitWatching: { done: 'inp-profit-watch-done', sent: 'inp-profit-watch-sent' },
        profitSummary: { done: 'inp-profit-sum-done', sent: 'inp-profit-sum-sent' },
        samePriceSL: { done: 'inp-same-sl-done', sent: 'inp-same-sl-sent' },
        dealsProfit: { done: 'inp-deals-profit-done', sent: 'inp-deals-profit-sent' },
        creditOut: { done: 'inp-credit-done', sent: 'inp-credit-sent' },
        profitOver0: { done: 'inp-profit-zero-done', sent: 'inp-profit-zero-sent' },
        floatingProfit: { done: 'inp-floating-done', sent: 'inp-floating-sent' },
        twoActions: { done: 'inp-two-actions-done', sent: 'inp-two-actions-sent' },
        marketWarnings: { done: 'inp-market-done' },
        profitLeverage: { done: 'inp-leverage-done', sent: 'inp-leverage-sent' }
    };

    const excellenceNoteInput = document.getElementById('inp-excellence-note');
    const excellenceBonusSelect = document.getElementById('inp-excellence-bonus');
    const accuracyTotalInput = document.getElementById('inp-accuracy-total');

    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------
    let weeklyData = {};
    let employeeList = [];
    let currentEditingEmployee = null;
    let currentDeletingEmployee = null;
    let currentShiftScore = null;
    let currentDeptScore = null;
    let currentModalEmployee = null;

    // -------------------------------------------------------------------------
    // HELPER FUNCTIONS
    // -------------------------------------------------------------------------
    function formatScore(score) {
        return typeof score === 'number' ? score.toFixed(2) : '0.00';
    }

    function getInputValue(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        const val = parseFloat(el.value);
        return isNaN(val) ? 0 : val;
    }

    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    function calculateStage1Score(data) {
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') continue;
            const weight = REPORT_WEIGHTS[key] || 0;
            if (weight === 0) continue;

            const done = data[key]?.done || 0;
            const sent = data[key]?.sent || 0;
            const total = done + sent;

            totalWeightedScore += total * weight;
            totalWeight += weight;
        }

        if (totalWeight === 0) return 0;
        const normalized = (totalWeightedScore / (totalWeight * 10)) * STAGE1_MAX;
        return Math.min(normalized, STAGE1_MAX);
    }

    function calculateTotalScore(data) {
        const stage1 = calculateStage1Score(data);
        const accuracy = Math.min(data.accuracyTotal || 0, STAGE2_MAX);
        const shiftScore = Math.min(data.shiftManagerScore || 0, SHIFT_MAX);
        const deptScore = Math.min(data.deptManagerScore || 0, DEPT_MAX);
        const excellence = data.excellence?.bonus || 0;

        return stage1 + accuracy + shiftScore + deptScore + excellence;
    }

    function updateCurrentTotalDisplay() {
        const selectedEmployee = employeeSelect.value;
        if (!selectedEmployee) {
            currentTotalScoreEl.textContent = '0';
            return;
        }

        const data = collectFormData();
        const total = calculateTotalScore(data);
        currentTotalScoreEl.textContent = formatScore(total);
    }

    function collectFormData() {
        const data = {};

        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') {
                data[key] = { done: getInputValue(INPUT_MAP[key].done) };
            } else if (INPUT_MAP[key]) {
                data[key] = {
                    done: getInputValue(INPUT_MAP[key].done),
                    sent: getInputValue(INPUT_MAP[key].sent)
                };
            }
        }

        data.excellence = {
            note: excellenceNoteInput.value || '',
            bonus: parseInt(excellenceBonusSelect.value) || 0
        };

        data.accuracyTotal = parseFloat(accuracyTotalInput.value) || 0;
        data.shiftManagerScore = currentShiftScore;
        data.deptManagerScore = currentDeptScore;

        return data;
    }

    function populateFormFromData(data) {
        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') {
                setInputValue(INPUT_MAP[key].done, data[key]?.done || 0);
            } else if (INPUT_MAP[key]) {
                setInputValue(INPUT_MAP[key].done, data[key]?.done || 0);
                setInputValue(INPUT_MAP[key].sent, data[key]?.sent || 0);
            }
        }

        excellenceNoteInput.value = data.excellence?.note || '';
        excellenceBonusSelect.value = data.excellence?.bonus || 0;
        accuracyTotalInput.value = data.accuracyTotal || '';

        currentShiftScore = data.shiftManagerScore;
        currentDeptScore = data.deptManagerScore;

        updateManagerDisplays();
        updateCurrentTotalDisplay();
    }

    function clearForm() {
        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') {
                setInputValue(INPUT_MAP[key].done, 0);
            } else if (INPUT_MAP[key]) {
                setInputValue(INPUT_MAP[key].done, '');
                setInputValue(INPUT_MAP[key].sent, '');
            }
        }

        excellenceNoteInput.value = '';
        excellenceBonusSelect.value = 0;
        accuracyTotalInput.value = '';

        currentShiftScore = null;
        currentDeptScore = null;

        updateManagerDisplays();
        currentTotalScoreEl.textContent = '0';
    }

    function updateManagerDisplays() {
        if (currentShiftScore !== null && currentShiftScore !== undefined) {
            shiftManagerDisplayContainer.style.display = 'flex';
            shiftManagerDisplayValue.textContent = formatScore(currentShiftScore);
        } else {
            shiftManagerDisplayContainer.style.display = 'none';
        }

        if (currentDeptScore !== null && currentDeptScore !== undefined) {
            deptManagerDisplayContainer.style.display = 'flex';
            deptManagerDisplayValue.textContent = formatScore(currentDeptScore);
        } else {
            deptManagerDisplayContainer.style.display = 'none';
        }
    }

    // -------------------------------------------------------------------------
    // STORAGE FUNCTIONS
    // -------------------------------------------------------------------------
    async function loadData() {
        const result = await chrome.storage.local.get([STORAGE_KEY, EMPLOYEES_LIST_KEY]);
        weeklyData = result[STORAGE_KEY] || {};
        employeeList = result[EMPLOYEES_LIST_KEY] || [...DEFAULT_EMPLOYEES];
        populateEmployeeSelect();
        renderLeaderboard();
    }

    async function saveData() {
        await chrome.storage.local.set({ [STORAGE_KEY]: weeklyData });
        renderLeaderboard();
    }

    async function saveEmployeeList() {
        await chrome.storage.local.set({ [EMPLOYEES_LIST_KEY]: employeeList });
        populateEmployeeSelect();
        renderManageList();
    }

    // -------------------------------------------------------------------------
    // UI FUNCTIONS
    // -------------------------------------------------------------------------
    function populateEmployeeSelect() {
        const currentValue = employeeSelect.value;
        employeeSelect.innerHTML = '<option value="" disabled selected>-- اختر الموظف لتقييمه --</option>';

        employeeList.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp;
            option.textContent = emp;
            employeeSelect.appendChild(option);
        });

        if (currentValue && employeeList.includes(currentValue)) {
            employeeSelect.value = currentValue;
        }
    }

    function renderLeaderboard() {
        const entries = [];

        for (const emp of employeeList) {
            const data = weeklyData[emp] || {};
            const score = calculateTotalScore(data);
            entries.push({ name: emp, score, data });
        }

        entries.sort((a, b) => b.score - a.score);

        leaderboardBody.innerHTML = '';

        if (entries.length === 0 || entries[0].score === 0) {
            idealContainer.style.display = 'none';
        } else {
            idealContainer.style.display = 'block';
            idealNameEl.textContent = entries[0].name;
            idealScoreEl.textContent = formatScore(entries[0].score);
        }

        const checkedEmployees = new Set();

        entries.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';

            tr.innerHTML = `
                <td style="text-align:center;">
                    <input type="checkbox" class="compare-checkbox" data-employee="${entry.name}" style="width:18px; height:18px; cursor:pointer;">
                </td>
                <td class="rank-cell ${rankClass}">${index + 1}</td>
                <td>${entry.name}</td>
                <td class="score-cell" style="text-align:center;">${formatScore(entry.score)}</td>
            `;

            tr.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox') return;
                showEmployeeDetails(entry.name, entry.data, entry.score, index + 1);
            });

            leaderboardBody.appendChild(tr);
        });

        // Update compare button visibility
        updateCompareButtonVisibility();

        // Add checkbox listeners
        document.querySelectorAll('.compare-checkbox').forEach(cb => {
            cb.addEventListener('change', updateCompareButtonVisibility);
        });
    }

    function updateCompareButtonVisibility() {
        const checked = document.querySelectorAll('.compare-checkbox:checked');
        compareBtn.style.display = checked.length >= 2 ? 'inline-flex' : 'none';
    }

    function showEmployeeDetails(name, data, score, rank) {
        currentModalEmployee = name;
        modalHeader.textContent = name;

        const stage1 = calculateStage1Score(data);
        const accuracy = data.accuracyTotal || 0;
        const shiftScore = data.shiftManagerScore || 0;
        const deptScore = data.deptManagerScore || 0;
        const excellence = data.excellence?.bonus || 0;

        let detailsHtml = `
            <div style="background:#0f3460; border-radius:15px; padding:20px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <span style="color:#aaa;">الترتيب</span>
                    <span style="font-size:1.5rem; font-weight:800; color:#ffd700;">#${rank}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#aaa;">الدرجة الإجمالية</span>
                    <span style="font-size:1.8rem; font-weight:800; color:#00d2ff;">${formatScore(score)}</span>
                </div>
            </div>

            <div style="background:#0f3460; border-radius:15px; padding:20px; margin-bottom:15px;">
                <h4 style="margin:0 0 15px 0; color:#fff; font-size:1rem;">تفاصيل الدرجات</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div style="background:rgba(0,210,255,0.1); padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#aaa; font-size:0.8rem;">التقارير</div>
                        <div style="color:#00d2ff; font-weight:bold; font-size:1.2rem;">${formatScore(stage1)}/60</div>
                    </div>
                    <div style="background:rgba(0,210,255,0.1); padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#aaa; font-size:0.8rem;">الدقة</div>
                        <div style="color:#00d2ff; font-weight:bold; font-size:1.2rem;">${formatScore(accuracy)}/30</div>
                    </div>
                    <div style="background:rgba(255,159,243,0.1); padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#aaa; font-size:0.8rem;">تقييم الشيفت</div>
                        <div style="color:#ff9ff3; font-weight:bold; font-size:1.2rem;">${formatScore(shiftScore)}/5</div>
                    </div>
                    <div style="background:rgba(0,210,255,0.1); padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#aaa; font-size:0.8rem;">تقييم القسم</div>
                        <div style="color:#00d2ff; font-weight:bold; font-size:1.2rem;">${formatScore(deptScore)}/5</div>
                    </div>
                </div>
                ${excellence > 0 ? `
                <div style="margin-top:10px; background:rgba(255,215,0,0.1); padding:10px; border-radius:8px; text-align:center;">
                    <div style="color:#aaa; font-size:0.8rem;">نقاط التميز</div>
                    <div style="color:#ffd700; font-weight:bold; font-size:1.2rem;">+${excellence}</div>
                    ${data.excellence?.note ? `<div style="color:#ccc; font-size:0.8rem; margin-top:5px;">${data.excellence.note}</div>` : ''}
                </div>
                ` : ''}
            </div>

            <div style="background:#0f3460; border-radius:15px; padding:20px;">
                <h4 style="margin:0 0 15px 0; color:#fff; font-size:1rem;">تفاصيل التقارير</h4>
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead>
                        <tr style="color:#aaa; border-bottom:1px solid rgba(255,255,255,0.1);">
                            <th style="text-align:right; padding:8px;">التقرير</th>
                            <th style="text-align:center; padding:8px;">Done</th>
                            <th style="text-align:center; padding:8px;">Sent</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const key of REPORT_KEYS) {
            const title = REPORT_TITLE_MAP[key];
            const done = data[key]?.done || 0;
            const sent = data[key]?.sent || 0;

            if (key === 'marketWarnings') {
                detailsHtml += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:8px; color:#fff;">${title}</td>
                        <td colspan="2" style="text-align:center; padding:8px; color:${done ? '#4cd137' : '#e74c3c'};">${done ? 'متابع' : 'غير متابع'}</td>
                    </tr>
                `;
            } else {
                detailsHtml += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:8px; color:#fff;">${title}</td>
                        <td style="text-align:center; padding:8px; color:#00d2ff;">${done}</td>
                        <td style="text-align:center; padding:8px; color:#00d2ff;">${sent}</td>
                    </tr>
                `;
            }
        }

        detailsHtml += `
                    </tbody>
                </table>
            </div>
        `;

        modalBody.innerHTML = detailsHtml;
        detailsModal.style.display = 'flex';
    }

    function renderManageList() {
        manageListContainer.innerHTML = '';

        employeeList.forEach(emp => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; gap:10px; background:#0f3460; padding:12px 15px; border-radius:10px;';

            row.innerHTML = `
                <span style="flex-grow:1; color:#fff; font-weight:500;">${emp}</span>
                <button class="edit-emp-btn" data-name="${emp}" style="background:none; border:none; color:#00d2ff; cursor:pointer; font-size:1.1rem;" title="تعديل">✏️</button>
                <button class="delete-emp-btn" data-name="${emp}" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.1rem;" title="حذف">🗑️</button>
            `;

            manageListContainer.appendChild(row);
        });

        // Add event listeners
        document.querySelectorAll('.edit-emp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentEditingEmployee = btn.dataset.name;
                editEmployeeInput.value = currentEditingEmployee;
                editEmployeeModal.style.display = 'flex';
            });
        });

        document.querySelectorAll('.delete-emp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentDeletingEmployee = btn.dataset.name;
                deleteConfirmMsg.textContent = `هل أنت متأكد من حذف "${currentDeletingEmployee}"؟`;
                deleteConfirmModal.style.display = 'flex';
            });
        });
    }

    // -------------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------------

    // Employee Select Change
    employeeSelect.addEventListener('change', () => {
        const selectedEmployee = employeeSelect.value;
        if (selectedEmployee && weeklyData[selectedEmployee]) {
            populateFormFromData(weeklyData[selectedEmployee]);
        } else {
            clearForm();
        }
    });

    // Save Button
    saveBtn.addEventListener('click', async () => {
        const selectedEmployee = employeeSelect.value;
        if (!selectedEmployee) {
            alert('الرجاء اختيار موظف أولاً');
            return;
        }

        // Validate manager scores
        if (currentShiftScore === null || currentShiftScore === undefined ||
            currentDeptScore === null || currentDeptScore === undefined) {
            managerRequiredModal.style.display = 'flex';
            return;
        }

        const data = collectFormData();
        weeklyData[selectedEmployee] = data;
        await saveData();

        // Show success feedback
        saveBtn.textContent = '✓ تم الحفظ';
        saveBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        setTimeout(() => {
            saveBtn.textContent = 'حفظ وتحديث';
            saveBtn.style.background = 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)';
        }, 1500);
    });

    // Manager Required Modal - Close Button
    if (closeManagerRequiredBtn) {
        closeManagerRequiredBtn.addEventListener('click', () => {
            managerRequiredModal.style.display = 'none';
        });
    }

    // Shift Manager Display Click - Open Modal
    shiftManagerDisplayContainer.addEventListener('click', (e) => {
        if (e.target !== editShiftScoreBtn) return;
        shiftEvalModalInput.value = currentShiftScore || '';
        shiftEvalModal.style.display = 'flex';
    });

    editShiftScoreBtn.addEventListener('click', () => {
        shiftEvalModalInput.value = currentShiftScore || '';
        shiftEvalModal.style.display = 'flex';
    });

    // Dept Manager Display Click - Open Modal
    deptManagerDisplayContainer.addEventListener('click', (e) => {
        if (e.target !== editDeptScoreBtn) return;
        deptEvalModalInput.value = currentDeptScore || '';
        deptEvalModal.style.display = 'flex';
    });

    editDeptScoreBtn.addEventListener('click', () => {
        deptEvalModalInput.value = currentDeptScore || '';
        deptEvalModal.style.display = 'flex';
    });

    // Save Shift Eval
    saveShiftEvalBtn.addEventListener('click', () => {
        const val = parseFloat(shiftEvalModalInput.value);
        if (!isNaN(val) && val >= 0 && val <= 5) {
            currentShiftScore = val;
            updateManagerDisplays();
            updateCurrentTotalDisplay();
            shiftEvalModal.style.display = 'none';
        }
    });

    // Save Dept Eval
    saveDeptEvalBtn.addEventListener('click', () => {
        const val = parseFloat(deptEvalModalInput.value);
        if (!isNaN(val) && val >= 0 && val <= 5) {
            currentDeptScore = val;
            updateManagerDisplays();
            updateCurrentTotalDisplay();
            deptEvalModal.style.display = 'none';
        }
    });

    // Close Details Modal
    closeModalBtn.addEventListener('click', () => {
        detailsModal.style.display = 'none';
    });

    // Print Modal
    printModalBtn.addEventListener('click', () => {
        if (!currentModalEmployee) return;
        const data = weeklyData[currentModalEmployee] || {};
        const score = calculateTotalScore(data);
        printEmployeeReport(currentModalEmployee, data, score);
    });

    // Rule Modal - Show on label click
    document.querySelectorAll('.grid-row-label').forEach(label => {
        label.addEventListener('click', () => {
            const text = label.textContent.trim();
            let key = null;

            for (const k of REPORT_KEYS) {
                if (text.includes(REPORT_TITLE_MAP[k])) {
                    key = k;
                    break;
                }
            }

            if (key && REPORT_RULES[key]) {
                ruleTitleEl.textContent = REPORT_TITLE_MAP[key];
                ruleFormulaEl.textContent = REPORT_RULES[key].formula;
                ruleDescEl.textContent = REPORT_RULES[key].desc;
                ruleModal.style.display = 'flex';
            }
        });
    });

    closeRuleModalBtn.addEventListener('click', () => {
        ruleModal.style.display = 'none';
    });

    // Manage Employees Modal
    manageBtn.addEventListener('click', () => {
        renderManageList();
        manageModal.style.display = 'flex';
    });

    closeManageModalBtn.addEventListener('click', () => {
        manageModal.style.display = 'none';
    });

    // Add Employee
    addEmployeeBtn.addEventListener('click', async () => {
        const name = newEmployeeInput.value.trim();
        if (name && !employeeList.includes(name)) {
            employeeList.push(name);
            await saveEmployeeList();
            newEmployeeInput.value = '';
            renderLeaderboard();
        }
    });

    // Edit Employee - Save
    saveEditBtn.addEventListener('click', async () => {
        const newName = editEmployeeInput.value.trim();
        if (newName && currentEditingEmployee) {
            const index = employeeList.indexOf(currentEditingEmployee);
            if (index !== -1) {
                employeeList[index] = newName;

                // Update data key
                if (weeklyData[currentEditingEmployee]) {
                    weeklyData[newName] = weeklyData[currentEditingEmployee];
                    delete weeklyData[currentEditingEmployee];
                    await saveData();
                }

                await saveEmployeeList();
                renderLeaderboard();
            }
        }
        editEmployeeModal.style.display = 'none';
        currentEditingEmployee = null;
    });

    cancelEditBtn.addEventListener('click', () => {
        editEmployeeModal.style.display = 'none';
        currentEditingEmployee = null;
    });

    // Delete Employee - Confirm
    confirmDeleteBtn.addEventListener('click', async () => {
        if (currentDeletingEmployee) {
            const index = employeeList.indexOf(currentDeletingEmployee);
            if (index !== -1) {
                employeeList.splice(index, 1);

                // Remove data
                if (weeklyData[currentDeletingEmployee]) {
                    delete weeklyData[currentDeletingEmployee];
                    await saveData();
                }

                await saveEmployeeList();
                renderLeaderboard();
            }
        }
        deleteConfirmModal.style.display = 'none';
        currentDeletingEmployee = null;
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.style.display = 'none';
        currentDeletingEmployee = null;
    });

    // Compare Button
    compareBtn.addEventListener('click', () => {
        const checked = document.querySelectorAll('.compare-checkbox:checked');
        if (checked.length < 2) return;

        const employees = Array.from(checked).map(cb => cb.dataset.employee);
        showComparisonModal(employees);
    });

    function showComparisonModal(employees) {
        // Calculate scores and find winner
        const employeeScores = employees.map(emp => {
            const data = weeklyData[emp] || {};
            return {
                name: emp,
                data: data,
                score: calculateTotalScore(data),
                stage1: calculateStage1Score(data),
                accuracy: data.accuracyTotal || 0,
                shiftScore: data.shiftManagerScore || 0,
                deptScore: data.deptManagerScore || 0,
                excellence: data.excellence?.bonus || 0
            };
        }).sort((a, b) => b.score - a.score);

        const winner = employeeScores[0];
        const maxScore = winner.score;

        // Build comparison cards
        let cardsHtml = `
            <div style="display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; justify-content: center;">
        `;

        employeeScores.forEach((emp, index) => {
            const isWinner = index === 0 && emp.score > 0;
            const percentage = maxScore > 0 ? ((emp.score / maxScore) * 100).toFixed(0) : 0;
            
            cardsHtml += `
                <div style="flex: 1; min-width: 200px; max-width: 280px; background: ${isWinner ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,193,7,0.1) 100%)' : 'rgba(15,52,96,0.5)'}; border: 2px solid ${isWinner ? '#ffd700' : 'rgba(255,255,255,0.1)'}; border-radius: 15px; padding: 20px; text-align: center; position: relative; ${isWinner ? 'box-shadow: 0 0 30px rgba(255,215,0,0.2);' : ''}">
                    ${isWinner ? '<div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 2rem;">👑</div>' : ''}
                    <div style="font-size: 0.8rem; color: ${isWinner ? '#ffd700' : '#aaa'}; margin-bottom: 5px; margin-top: ${isWinner ? '10px' : '0'};">الترتيب #${index + 1}</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 10px;">${emp.name}</div>
                    <div style="font-size: 2.2rem; font-weight: 800; color: ${isWinner ? '#ffd700' : '#00d2ff'}; margin-bottom: 10px;">${formatScore(emp.score)}</div>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 10px; height: 8px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${isWinner ? 'linear-gradient(90deg, #ffd700, #ffaa00)' : 'linear-gradient(90deg, #00d2ff, #3a7bd5)'}; border-radius: 10px; transition: width 0.5s;"></div>
                    </div>
                    <div style="font-size: 0.75rem; color: #888; margin-top: 5px;">${percentage}% من الأعلى</div>
                </div>
            `;
        });

        cardsHtml += `</div>`;

        // Build detailed comparison table
        let tableHtml = `
            <div style="background: rgba(15,52,96,0.3); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #00d2ff; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <span>📊</span> تفاصيل الدرجات
                </h3>
                <div style="display: grid; grid-template-columns: repeat(${employees.length}, 1fr); gap: 10px;">
        `;

        // Score breakdown for each employee
        employeeScores.forEach(emp => {
            tableHtml += `
                <div style="background: rgba(0,0,0,0.2); border-radius: 10px; padding: 15px;">
                    <div style="font-weight: bold; color: #fff; margin-bottom: 12px; text-align: center; font-size: 0.95rem;">${emp.name}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #aaa; font-size: 0.85rem;">📋 التقارير</span>
                            <span style="color: #00d2ff; font-weight: bold;">${formatScore(emp.stage1)}/60</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #aaa; font-size: 0.85rem;">🎯 الدقة</span>
                            <span style="color: #00d2ff; font-weight: bold;">${formatScore(emp.accuracy)}/30</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #aaa; font-size: 0.85rem;">👔 الشيفت</span>
                            <span style="color: #ff9ff3; font-weight: bold;">${formatScore(emp.shiftScore)}/5</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #aaa; font-size: 0.85rem;">🏢 القسم</span>
                            <span style="color: #00d2ff; font-weight: bold;">${formatScore(emp.deptScore)}/5</span>
                        </div>
                        ${emp.excellence > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #aaa; font-size: 0.85rem;">⭐ التميز</span>
                            <span style="color: #ffd700; font-weight: bold;">+${emp.excellence}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        tableHtml += `</div></div>`;

        // Reports comparison table
        tableHtml += `
            <div style="background: rgba(15,52,96,0.3); border-radius: 15px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #00d2ff; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <span>📑</span> مقارنة التقارير
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: rgba(0,0,0,0.3);">
                                <th style="padding: 12px; text-align: right; color: #00d2ff; border-bottom: 2px solid rgba(0,210,255,0.3);">التقرير</th>
        `;

        employees.forEach(emp => {
            tableHtml += `<th style="padding: 12px; text-align: center; color: #fff; border-bottom: 2px solid rgba(0,210,255,0.3);">${emp}</th>`;
        });

        tableHtml += `
                                <th style="padding: 12px; text-align: center; color: #ffd700; border-bottom: 2px solid rgba(255,215,0,0.3);">الأفضل</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Add rows for each report
        for (const key of REPORT_KEYS) {
            const values = employees.map(emp => {
                const data = weeklyData[emp] || {};
                if (key === 'marketWarnings') {
                    return data[key]?.done || 0;
                }
                return (data[key]?.done || 0) + (data[key]?.sent || 0);
            });
            const maxVal = Math.max(...values);

            tableHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">`;
            tableHtml += `<td style="padding: 10px; color: #ccc;"><span style="background: #253b6e; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; color: #00d2ff; margin-left: 5px;">${REPORT_WEIGHTS[key]}</span> ${REPORT_TITLE_MAP[key]}</td>`;

            employees.forEach((emp, idx) => {
                const val = values[idx];
                const isMax = val === maxVal && maxVal > 0;
                
                if (key === 'marketWarnings') {
                    tableHtml += `<td style="text-align: center; padding: 10px; color: ${val ? '#4cd137' : '#e74c3c'};">${val ? '✓ متابع' : '✗ غير متابع'}</td>`;
                } else {
                    tableHtml += `<td style="text-align: center; padding: 10px; color: ${isMax ? '#ffd700' : '#00d2ff'}; font-weight: ${isMax ? 'bold' : 'normal'};">${val}${isMax ? ' 🏆' : ''}</td>`;
                }
            });

            // Best column
            if (key === 'marketWarnings') {
                const followingCount = values.filter(v => v > 0).length;
                tableHtml += `<td style="text-align: center; padding: 10px; color: #ffd700;">${followingCount}/${employees.length}</td>`;
            } else {
                const bestIdx = values.indexOf(maxVal);
                tableHtml += `<td style="text-align: center; padding: 10px; color: #ffd700; font-weight: bold;">${maxVal > 0 ? employees[bestIdx] : '-'}</td>`;
            }

            tableHtml += `</tr>`;
        }

        // Accuracy row
        const accuracyValues = employees.map(emp => weeklyData[emp]?.accuracyTotal || 0);
        const maxAccuracy = Math.max(...accuracyValues);
        tableHtml += `<tr style="background: rgba(0,210,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">`;
        tableHtml += `<td style="padding: 10px; color: #00d2ff; font-weight: bold;">🎯 الدقة الإجمالية</td>`;
        employees.forEach((emp, idx) => {
            const val = accuracyValues[idx];
            const isMax = val === maxAccuracy && maxAccuracy > 0;
            tableHtml += `<td style="text-align: center; padding: 10px; color: ${isMax ? '#ffd700' : '#00d2ff'}; font-weight: bold;">${formatScore(val)}${isMax ? ' 🏆' : ''}</td>`;
        });
        const bestAccIdx = accuracyValues.indexOf(maxAccuracy);
        tableHtml += `<td style="text-align: center; padding: 10px; color: #ffd700; font-weight: bold;">${maxAccuracy > 0 ? employees[bestAccIdx] : '-'}</td>`;
        tableHtml += `</tr>`;

        // Total row
        tableHtml += `<tr style="background: linear-gradient(90deg, rgba(255,215,0,0.1), rgba(255,193,7,0.05));">`;
        tableHtml += `<td style="padding: 15px; color: #ffd700; font-weight: bold; font-size: 1.1rem;">🏆 الإجمالي</td>`;
        employeeScores.forEach(emp => {
            const isWinner = emp.score === maxScore && maxScore > 0;
            tableHtml += `<td style="text-align: center; padding: 15px; color: ${isWinner ? '#ffd700' : '#fff'}; font-weight: bold; font-size: 1.2rem;">${formatScore(emp.score)}${isWinner ? ' 👑' : ''}</td>`;
        });
        tableHtml += `<td style="text-align: center; padding: 15px; color: #ffd700; font-weight: bold; font-size: 1.1rem;">${winner.name}</td>`;
        tableHtml += `</tr>`;

        tableHtml += `</tbody></table></div></div>`;

        // Print button
        let footerHtml = `
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">
                <button id="print-comparison-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; padding: 12px 30px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    🖨️ طباعة المقارنة
                </button>
            </div>
        `;

        compareContent.innerHTML = cardsHtml + tableHtml + footerHtml;
        compareModal.style.display = 'flex';

        // Add print button listener
        document.getElementById('print-comparison-btn')?.addEventListener('click', () => {
            printComparisonReport(employeeScores);
        });
    }

    function printComparisonReport(employeeScores) {
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const winner = employeeScores[0];

        let reportsHtml = '';
        for (const key of REPORT_KEYS) {
            reportsHtml += `<tr>`;
            reportsHtml += `<td style="padding: 8px; border: 1px solid #ddd;">${REPORT_TITLE_MAP[key]}</td>`;
            
            employeeScores.forEach(emp => {
                const data = emp.data;
                if (key === 'marketWarnings') {
                    const val = data[key]?.done || 0;
                    reportsHtml += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${val ? 'green' : 'red'};">${val ? 'متابع' : 'غير متابع'}</td>`;
                } else {
                    const done = data[key]?.done || 0;
                    const sent = data[key]?.sent || 0;
                    reportsHtml += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${done + sent}</td>`;
                }
            });
            reportsHtml += `</tr>`;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>مقارنة الموظفين - ${dateStr}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; background: #fff; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #667eea; }
                    .header h1 { color: #667eea; margin: 0 0 10px 0; }
                    .winner-box { background: linear-gradient(135deg, #ffd700, #ffaa00); color: #333; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 25px; }
                    .winner-box h2 { margin: 0; font-size: 1.5rem; }
                    .cards { display: flex; gap: 15px; justify-content: center; margin-bottom: 25px; flex-wrap: wrap; }
                    .card { flex: 1; min-width: 150px; max-width: 200px; background: #f5f5f5; padding: 15px; border-radius: 10px; text-align: center; }
                    .card.winner { background: #fff3cd; border: 2px solid #ffd700; }
                    .card .name { font-weight: bold; margin-bottom: 5px; }
                    .card .score { font-size: 1.5rem; font-weight: bold; color: #667eea; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; border: 1px solid #ddd; }
                    th { background: #667eea; color: #fff; }
                    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 0.8rem; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>⚖️ مقارنة أداء الموظفين</h1>
                    <p>التاريخ: ${dateStr}</p>
                </div>

                <div class="winner-box">
                    <div style="font-size: 2rem;">👑</div>
                    <h2>الفائز: ${winner.name}</h2>
                    <div style="font-size: 1.3rem; margin-top: 5px;">الدرجة: ${formatScore(winner.score)}</div>
                </div>

                <div class="cards">
                    ${employeeScores.map((emp, idx) => `
                        <div class="card ${idx === 0 ? 'winner' : ''}">
                            <div class="name">${idx === 0 ? '🏆 ' : ''}${emp.name}</div>
                            <div class="score">${formatScore(emp.score)}</div>
                            <div style="font-size: 0.8rem; color: #666;">الترتيب #${idx + 1}</div>
                        </div>
                    `).join('')}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>التقرير</th>
                            ${employeeScores.map(emp => `<th>${emp.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${reportsHtml}
                        <tr style="background: #f0f0f0;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">الدقة</td>
                            ${employeeScores.map(emp => `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${formatScore(emp.accuracy)}</td>`).join('')}
                        </tr>
                        <tr style="background: #f0f0f0;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تقييم الشيفت</td>
                            ${employeeScores.map(emp => `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatScore(emp.shiftScore)}</td>`).join('')}
                        </tr>
                        <tr style="background: #f0f0f0;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تقييم القسم</td>
                            ${employeeScores.map(emp => `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatScore(emp.deptScore)}</td>`).join('')}
                        </tr>
                        <tr style="background: #667eea; color: #fff;">
                            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; font-size: 1.1rem;">الإجمالي</td>
                            ${employeeScores.map(emp => `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 1.2rem;">${formatScore(emp.score)}</td>`).join('')}
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    <p>سري - للاستخدام الداخلي فقط</p>
                    <p>نظام أداء فريق إنزو</p>
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (printWin) {
            printWin.document.open();
            printWin.document.write(htmlContent);
            printWin.document.close();
        }
    }

    closeCompareModalBtn.addEventListener('click', () => {
        compareModal.style.display = 'none';
    });

    // Reset Week Button - Show Modal
    resetAllBtn.addEventListener('click', () => {
        resetWeekModal.style.display = 'flex';
    });

    // Confirm Reset Week
    confirmResetWeekBtn.addEventListener('click', async () => {
        weeklyData = {};
        await saveData();
        clearForm();
        renderLeaderboard();
        resetWeekModal.style.display = 'none';
    });

    // Cancel Reset Week
    cancelResetWeekBtn.addEventListener('click', () => {
        resetWeekModal.style.display = 'none';
    });

    // Close modals on outside click
    window.addEventListener('click', (event) => {
        if (event.target === resetWeekModal) {
            resetWeekModal.style.display = 'none';
        }
        if (event.target === managerRequiredModal) {
            managerRequiredModal.style.display = 'none';
        }
        if (event.target === detailsModal) {
            detailsModal.style.display = 'none';
        }
        if (event.target === ruleModal) {
            ruleModal.style.display = 'none';
        }
        if (event.target === manageModal) {
            manageModal.style.display = 'none';
        }
        if (event.target === editEmployeeModal) {
            editEmployeeModal.style.display = 'none';
        }
        if (event.target === deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
        if (event.target === shiftEvalModal) {
            shiftEvalModal.style.display = 'none';
        }
        if (event.target === deptEvalModal) {
            deptEvalModal.style.display = 'none';
        }
        if (event.target === compareModal) {
            compareModal.style.display = 'none';
        }
    });

    // Input change listeners for live total update
    Object.values(INPUT_MAP).forEach(mapping => {
        if (mapping.done) {
            const el = document.getElementById(mapping.done);
            if (el) el.addEventListener('input', updateCurrentTotalDisplay);
        }
        if (mapping.sent) {
            const el = document.getElementById(mapping.sent);
            if (el) el.addEventListener('input', updateCurrentTotalDisplay);
        }
    });

    excellenceBonusSelect.addEventListener('change', updateCurrentTotalDisplay);
    accuracyTotalInput.addEventListener('input', updateCurrentTotalDisplay);

    // Print Employee Report Function
    function printEmployeeReport(name, data, score) {
        const stage1 = calculateStage1Score(data);
        const accuracy = data.accuracyTotal || 0;
        const shiftScore = data.shiftManagerScore || 0;
        const deptScore = data.deptManagerScore || 0;
        const excellence = data.excellence?.bonus || 0;
        const dateStr = new Date().toLocaleDateString('ar-EG');

        let reportsHtml = '';
        for (const key of REPORT_KEYS) {
            const title = REPORT_TITLE_MAP[key];
            const done = data[key]?.done || 0;
            const sent = data[key]?.sent || 0;

            if (key === 'marketWarnings') {
                reportsHtml += `<tr><td>${title}</td><td colspan="2" style="text-align:center;">${done ? 'متابع' : 'غير متابع'}</td></tr>`;
            } else {
                reportsHtml += `<tr><td>${title}</td><td style="text-align:center;">${done}</td><td style="text-align:center;">${sent}</td></tr>`;
            }
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير أداء - ${name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; background: #fff; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #00d2ff; }
                    .header h1 { color: #0f3460; margin: 0; }
                    .header p { color: #666; margin: 5px 0; }
                    .score-box { background: linear-gradient(135deg, #0f3460, #16213e); color: #fff; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
                    .score-box .score { font-size: 3rem; font-weight: bold; color: #00d2ff; }
                    .details-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                    .detail-box { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
                    .detail-box .label { color: #666; font-size: 0.9rem; }
                    .detail-box .value { font-size: 1.3rem; font-weight: bold; color: #0f3460; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: right; }
                    th { background: #0f3460; color: #fff; }
                    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 0.8rem; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>تقرير الأداء الأسبوعي</h1>
                    <p>${name}</p>
                    <p>التاريخ: ${dateStr}</p>
                </div>

                <div class="score-box">
                    <div>الدرجة الإجمالية</div>
                    <div class="score">${formatScore(score)}</div>
                </div>

                <div class="details-grid">
                    <div class="detail-box">
                        <div class="label">التقارير</div>
                        <div class="value">${formatScore(stage1)}/60</div>
                    </div>
                    <div class="detail-box">
                        <div class="label">الدقة</div>
                        <div class="value">${formatScore(accuracy)}/30</div>
                    </div>
                    <div class="detail-box">
                        <div class="label">تقييم الشيفت</div>
                        <div class="value">${formatScore(shiftScore)}/5</div>
                    </div>
                    <div class="detail-box">
                        <div class="label">تقييم القسم</div>
                        <div class="value">${formatScore(deptScore)}/5</div>
                    </div>
                </div>

                ${excellence > 0 ? `<div style="background:#fff3cd; padding:10px; border-radius:8px; text-align:center; margin-bottom:20px;"><strong>نقاط التميز:</strong> +${excellence} ${data.excellence?.note ? `(${data.excellence.note})` : ''}</div>` : ''}

                <table>
                    <thead>
                        <tr>
                            <th>التقرير</th>
                            <th style="text-align:center;">Done</th>
                            <th style="text-align:center;">Sent</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportsHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <p>سري - للاستخدام الداخلي فقط</p>
                    <p>نظام أداء فريق إنزو</p>
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        const printWin = window.open('', '_blank', 'width=800,height=600');
        if (printWin) {
            printWin.document.open();
            printWin.document.write(htmlContent);
            printWin.document.close();
        }
    }

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------
    await loadData();
});
