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
        suspicious: 8,
        depositPercentage: 8,
        kpi3DaysBalance: 5,
        newPositions: 5,
        profitWatching: 5,
        profitSummary: 5,
        samePriceSL: 4,
        dealsProfit: 4,
        creditOut: 4,
        profitOver0: 4,
        floatingProfit: 4,
        twoActions: 3,
        marketWarnings: 0,
        profitLeverage: 1,
        excellence: 0
    };

    const SENT_MULTIPLIERS = {
        suspicious: 10,
        kpi3DaysBalance: 5,
        newPositions: 10,
        dealsProfit: 20,
        twoActions: 10
    };

    const STORAGE_KEY = 'weeklyEvaluationData_v2';
    const EMPLOYEES_LIST_KEY = 'employeeList_v1';
    const ARCHIVE_STORAGE_KEY = 'evaluationArchive_v1';

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
        suspicious: { formula: '(Done + (Sent × 10))', desc: 'يتم احتساب النقاط بناءً على مجموع (Done) مضافًا إليه (Sent) مضروبًا في 10. والناتج تتم مقارنته بأعلى أداء لتحديد الدرجة من الوزن 8.' },
        depositPercentage: { formula: '(Done + Sent) × 8', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 8' },
        kpi3DaysBalance: { formula: '(Done + (Sent × 5))', desc: 'يتم احتساب النقاط بناءً على مجموع (Done) مضافًا إليه (Sent) مضروبًا في 5. والناتج تتم مقارنته بأعلى أداء لتحديد الدرجة من الوزن 5.' },
        newPositions: { formula: '(Done + (Sent × 10))', desc: 'يتم احتساب النقاط بناءً على مجموع (Done) مضافًا إليه (Sent) مضروبًا في 10. والناتج تتم مقارنته بأعلى أداء لتحديد الدرجة من الوزن 5.' },
        profitWatching: { formula: '(Done + Sent) × 5', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 5' },
        profitSummary: { formula: '(Done + Sent) × 5', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 5' },
        samePriceSL: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        dealsProfit: { formula: '(Done + (Sent × 20))', desc: 'يتم احتساب النقاط بناءً على مجموع (Done) مضافًا إليه (Sent) مضروبًا في 20. والناتج تتم مقارنته بأعلى أداء لتحديد الدرجة من الوزن 4.' },
        creditOut: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        profitOver0: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        floatingProfit: { formula: '(Done + Sent) × 4', desc: 'يتم احتساب عدد التقارير المنجزة والمرسلة مضروبة في الوزن 4' },
        twoActions: { formula: '(Done + (Sent × 10))', desc: 'يتم احتساب النقاط بناءً على مجموع (Done) مضافًا إليه (Sent) مضروبًا في 10. والناتج تتم مقارنته بأعلى أداء لتحديد الدرجة من الوزن 3.' },
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

    // Archive Elements
    const saveToArchiveBtn = document.getElementById('save-to-archive-btn');
    const openArchiveBtn = document.getElementById('open-archive-btn');
    const goToEvaluationBtn = document.getElementById('go-to-evaluation-btn');
    const archiveModal = document.getElementById('archive-modal');
    const archiveCloseBtn = document.getElementById('archive-close-btn');
    const archiveMonthsPanel = document.getElementById('archive-months-panel');
    const archiveWeeksPanel = document.getElementById('archive-weeks-panel');
    const archiveDataPanel = document.getElementById('archive-data-panel');
    const archiveToast = document.getElementById('archive-toast');
    const deleteArchiveWeekModal = document.getElementById('delete-archive-week-modal');
    const confirmDeleteArchiveWeekBtn = document.getElementById('confirm-delete-archive-week-btn');
    const cancelDeleteArchiveWeekBtn = document.getElementById('cancel-delete-archive-week-btn');
    const deleteArchiveWeekMsg = document.getElementById('delete-archive-week-msg');

    // Archive Edit Elements
    const archiveEditModal = document.getElementById('archive-edit-modal');
    const archiveEditCloseBtn = document.getElementById('archive-edit-close-btn');
    const archiveEditSaveBtn = document.getElementById('archive-edit-save-btn');
    const archiveEditCancelBtn = document.getElementById('archive-edit-cancel-btn');
    const archiveEditEmployeeName = document.getElementById('archive-edit-employee-name');
    const archiveEditWeekInfo = document.getElementById('archive-edit-week-info');
    const archiveEditReportsContainer = document.getElementById('archive-edit-reports-container');
    const archiveEditExcellence = document.getElementById('archive-edit-excellence');
    const archiveEditExcellenceNote = document.getElementById('archive-edit-excellence-note');
    const archiveEditAccuracy = document.getElementById('archive-edit-accuracy');
    const archiveEditShiftScore = document.getElementById('archive-edit-shift-score');
    const archiveEditDeptScore = document.getElementById('archive-edit-dept-score');

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
    let reportMaxValues = {};
    let archiveData = {};
    let currentArchiveMonth = null;
    let currentArchiveWeek = null;
    let pendingDeleteArchiveWeek = null;
    let currentArchiveEditEmployee = null;

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

    function calculateReportMaxValues(currentEmployeeName, currentEmployeeData) {
        const tempWeeklyData = { ...weeklyData };
        if (currentEmployeeName && currentEmployeeData) {
            tempWeeklyData[currentEmployeeName] = currentEmployeeData;
        }

        reportMaxValues = {}; // Reset
        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') continue;

            let maxTotal = 0;
            for (const emp in tempWeeklyData) {
                const data = tempWeeklyData[emp];
                if (!data) continue;
                const done = data[key]?.done || 0;
                const sent = data[key]?.sent || 0;
                const multiplier = SENT_MULTIPLIERS[key] || 1;
                const total = done + (sent * multiplier);
                if (total > maxTotal) {
                    maxTotal = total;
                }
            }
            reportMaxValues[key] = maxTotal > 0 ? maxTotal : 1; // Avoid division by zero
        }
    }

    function calculateStage1Score(data) {
        let employeeScore = 0;

        if (REPORT_WEIGHT_TOTAL === 0) return 0;

        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') continue;
            
            const weight = REPORT_WEIGHTS[key] || 0;
            if (weight === 0) continue;

            const done = data[key]?.done || 0;
            const sent = data[key]?.sent || 0;
            const multiplier = SENT_MULTIPLIERS[key] || 1;
            const total = done + (sent * multiplier);

            const maxTotal = reportMaxValues[key] || 1;

            const reportScore = (total / maxTotal) * weight;
            employeeScore += reportScore;
        }
        
        const normalized = (employeeScore / REPORT_WEIGHT_TOTAL) * STAGE1_MAX;

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
        calculateReportMaxValues(selectedEmployee, data); // Recalculate max values with live data
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
        // Shift Manager
        if (currentShiftScore !== null && currentShiftScore !== undefined) {
            shiftManagerDisplayValue.textContent = formatScore(currentShiftScore);
            editShiftScoreBtn.textContent = 'تعديل';
        } else {
            shiftManagerDisplayValue.textContent = 'اضغط للتقييم';
            editShiftScoreBtn.textContent = 'تقييم';
        }

        // Dept Manager
        if (currentDeptScore !== null && currentDeptScore !== undefined) {
            deptManagerDisplayValue.textContent = formatScore(currentDeptScore);
            editDeptScoreBtn.textContent = 'تعديل';
        } else {
            deptManagerDisplayValue.textContent = 'اضغط للتقييم';
            editDeptScoreBtn.textContent = 'تقييم';
        }
    }

    // -------------------------------------------------------------------------
    // STORAGE FUNCTIONS
    // -------------------------------------------------------------------------
    async function loadData() {
        const result = await chrome.storage.local.get([STORAGE_KEY, EMPLOYEES_LIST_KEY, ARCHIVE_STORAGE_KEY]);
        weeklyData = result[STORAGE_KEY] || {};
        employeeList = result[EMPLOYEES_LIST_KEY] || [...DEFAULT_EMPLOYEES];
        archiveData = result[ARCHIVE_STORAGE_KEY] || {};
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
        calculateReportMaxValues(null, null); // Recalculate maxes before rendering
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
            <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05)); border-radius:18px; padding:22px; margin-bottom:18px; border: 1px solid rgba(99, 102, 241, 0.25);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <span style="color:#d0d0e0; font-size: 1.05rem;">الترتيب العام</span>
                    <span style="font-size:1.8rem; font-weight:800; color:#fbbf24; text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);">#${rank}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#d0d0e0; font-size: 1.05rem;">الدرجة الإجمالية</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size:2.2rem; font-weight:800; color:#fff;">${formatScore(score)}</span>
                        <span style="font-size: 1rem; color: #aaa; align-self: flex-end; margin-bottom: 6px;">%</span>
                    </div>
                </div>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border-radius:18px; padding:22px; margin-bottom:18px; border: 1px solid rgba(255,255,255,0.05);">
                <h4 style="margin:0 0 18px 0; color:#a5b4fc; font-size:1.1rem; font-weight:700;">تفاصيل الدرجات</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:rgba(59, 130, 246, 0.1); padding:15px; border-radius:12px; text-align:center; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="color:#93c5fd; font-size:0.85rem; margin-bottom: 5px;">التقارير</div>
                        <div style="color:#fff; font-weight:800; font-size:1.3rem;">${formatScore(stage1)}<span style="font-size:0.9rem; color:#60a5fa;">/60</span></div>
                    </div>
                    <div style="background:rgba(16, 185, 129, 0.1); padding:15px; border-radius:12px; text-align:center; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <div style="color:#6ee7b7; font-size:0.85rem; margin-bottom: 5px;">الدقة</div>
                        <div style="color:#fff; font-weight:800; font-size:1.3rem;">${formatScore(accuracy)}<span style="font-size:0.9rem; color:#34d399;">/30</span></div>
                    </div>
                    <div style="background:rgba(236, 72, 153, 0.1); padding:15px; border-radius:12px; text-align:center; border: 1px solid rgba(236, 72, 153, 0.2);">
                        <div style="color:#f9a8d4; font-size:0.85rem; margin-bottom: 5px;">تقييم الشيفت</div>
                        <div style="color:#fff; font-weight:800; font-size:1.3rem;">${formatScore(shiftScore)}<span style="font-size:0.9rem; color:#f472b6;">/5</span></div>
                    </div>
                    <div style="background:rgba(139, 92, 246, 0.1); padding:15px; border-radius:12px; text-align:center; border: 1px solid rgba(139, 92, 246, 0.2);">
                        <div style="color:#c4b5fd; font-size:0.85rem; margin-bottom: 5px;">تقييم القسم</div>
                        <div style="color:#fff; font-weight:800; font-size:1.3rem;">${formatScore(deptScore)}<span style="font-size:0.9rem; color:#a78bfa;">/5</span></div>
                    </div>
                </div>
                ${excellence > 0 ? `
                <div style="margin-top:12px; background:linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05)); padding:15px; border-radius:12px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.3);">
                    <div style="color:#fbbf24; font-size:0.9rem; margin-bottom: 5px; font-weight: 600;">⭐ نقاط التميز</div>
                    <div style="color:#fff; font-weight:800; font-size:1.4rem; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);">+${excellence}</div>
                    ${data.excellence?.note ? `<div style="color:#fcd34d; font-size:0.85rem; margin-top:8px; border-top: 1px dashed rgba(251, 191, 36, 0.3); padding-top: 6px;">"${data.excellence.note}"</div>` : ''}
                </div>
                ` : ''}
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border-radius:18px; padding:22px; border: 1px solid rgba(255,255,255,0.05);">
                <h4 style="margin:0 0 18px 0; color:#a5b4fc; font-size:1.1rem; font-weight:700;">تفاصيل التقارير</h4>
                <div style="position: relative; overflow: hidden; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                        <thead>
                            <tr style="background: rgba(0,0,0,0.3); color:#94a3b8;">
                                <th style="text-align:right; padding:12px 15px; font-weight: 600;">التقرير</th>
                                <th style="text-align:center; padding:12px 10px; font-weight: 600;">Done</th>
                                <th style="text-align:center; padding:12px 10px; font-weight: 600;">Sent</th>
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
                        <td style="padding:12px 15px; color:#e2e8f0;">${title}</td>
                        <td colspan="2" style="text-align:center; padding:12px 10px;">
                            <span style="background: ${done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${done ? '#34d399' : '#f87171'}; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                                ${done ? 'متابع ✅' : 'غير متابع ❌'}
                            </span>
                        </td>
                    </tr>
                `;
            } else {
                detailsHtml += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:12px 15px; color:#e2e8f0;">${title}</td>
                        <td style="text-align:center; padding:12px 10px; color:#38bdf8; font-weight: 600;">${done}</td>
                        <td style="text-align:center; padding:12px 10px; color:#fbbf24; font-weight: 600;">${sent}</td>
                    </tr>
                `;
            }
        }

        detailsHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        modalBody.innerHTML = detailsHtml;
        detailsModal.style.display = 'flex';
    }

    function renderManageList() {
        manageListContainer.innerHTML = '';

        employeeList.forEach(emp => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; gap:12px; background: linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05)); padding:14px 18px; border-radius:12px; border: 1px solid rgba(99, 102, 241, 0.2); transition: all 0.2s;';
            row.onmouseover = () => {
                row.style.background = 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1))';
                row.style.transform = 'translateX(-5px)';
            };
            row.onmouseout = () => {
                row.style.background = 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))';
                row.style.transform = 'none';
            };

            row.innerHTML = `
                <div style="width: 36px; height: 36px; background: rgba(99, 102, 241, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">👤</div>
                <span style="flex-grow:1; color:#fff; font-weight:600; font-size: 1.05rem;">${emp}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="edit-emp-btn" data-name="${emp}" style="background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.3); color:#2ecc71; cursor:pointer; font-size:0.95rem; padding: 6px 12px; border-radius: 8px; transition: all 0.2s;" title="تعديل">✏️ تعديل</button>
                    <button class="delete-emp-btn" data-name="${emp}" style="background: rgba(231, 76, 60, 0.15); border: 1px solid rgba(231, 76, 60, 0.3); color:#e74c3c; cursor:pointer; font-size:0.95rem; padding: 6px 12px; border-radius: 8px; transition: all 0.2s;" title="حذف">🗑️ حذف</button>
                </div>
            `;

            manageListContainer.appendChild(row);
        });

        // Add event listeners
        document.querySelectorAll('.edit-emp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click if any
                currentEditingEmployee = btn.dataset.name;
                editEmployeeInput.value = currentEditingEmployee;
                editEmployeeModal.style.display = 'flex';
            });
        });

        document.querySelectorAll('.delete-emp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
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

        // Show manager score containers if employee selected
        if (selectedEmployee) {
            shiftManagerDisplayContainer.style.display = 'flex';
            deptManagerDisplayContainer.style.display = 'flex';
            updateManagerDisplays(); // Update text and buttons
        } else {
            shiftManagerDisplayContainer.style.display = 'none';
            deptManagerDisplayContainer.style.display = 'none';
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
    shiftManagerDisplayContainer.addEventListener('click', () => {
        shiftEvalModalInput.value = currentShiftScore || '';
        shiftEvalModal.style.display = 'flex';
    });

    // Dept Manager Display Click - Open Modal
    deptManagerDisplayContainer.addEventListener('click', () => {
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
        calculateReportMaxValues(null, null); // Make sure maxes are correct
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
    // ARCHIVE FUNCTIONS
    // -------------------------------------------------------------------------
    const ARABIC_MONTHS = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    function getWeekOfMonth(date) {
        const d = new Date(date);
        const dayOfMonth = d.getDate();
        if (dayOfMonth <= 7) return 1;
        if (dayOfMonth <= 14) return 2;
        if (dayOfMonth <= 21) return 3;
        if (dayOfMonth <= 28) return 4;
        return 5;
    }

    function getWeekDateRange(year, month, weekNum) {
        const startDay = (weekNum - 1) * 7 + 1;
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const endDay = weekNum === 5 ? lastDayOfMonth : Math.min(weekNum * 7, lastDayOfMonth);
        return `${startDay} - ${endDay}`;
    }

    function showArchiveToast(message, isError = false) {
        archiveToast.textContent = message;
        archiveToast.classList.toggle('error', isError);
        archiveToast.classList.add('show');
        setTimeout(() => {
            archiveToast.classList.remove('show');
        }, 3000);
    }

    async function saveArchiveData() {
        await chrome.storage.local.set({ [ARCHIVE_STORAGE_KEY]: archiveData });
    }

    // --- Archive Confirm Modal Logic ---
    const archiveConfirmModal = document.getElementById('archive-confirm-modal');
    const confirmArchiveBtn = document.getElementById('confirm-archive-btn');
    const cancelArchiveBtn = document.getElementById('cancel-archive-btn');

    async function saveToArchive() {
        const hasData = Object.keys(weeklyData).some(emp => {
            const data = weeklyData[emp];
            return data && Object.keys(data).some(key => {
                if (key === 'excellence') return data[key]?.bonus > 0;
                if (key === 'accuracyTotal' || key === 'shiftManagerScore' || key === 'deptManagerScore') return data[key] > 0;
                return data[key]?.done > 0 || data[key]?.sent > 0;
            });
        });

        if (!hasData) {
            showArchiveToast('⚠️ لا توجد بيانات لحفظها في الأرشيف!', true);
            return;
        }

        // Show Custom Modal instead of confirm()
        if (archiveConfirmModal) {
            archiveConfirmModal.style.display = 'flex';
        }
    }

    // Handle Confirm Archive Click
    confirmArchiveBtn?.addEventListener('click', async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const weekNum = getWeekOfMonth(now);
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const weekKey = `week-${weekNum}`;

        if (!archiveData[monthKey]) {
            archiveData[monthKey] = {};
        }

        const archiveEntry = {
            savedAt: now.toISOString(),
            weekNumber: weekNum,
            dateRange: getWeekDateRange(year, month, weekNum),
            employeeList: [...employeeList],
            data: JSON.parse(JSON.stringify(weeklyData))
        };

        archiveData[monthKey][weekKey] = archiveEntry;
        await saveArchiveData();

        // --- NEW WEEK RESET LOGIC ---
        weeklyData = {}; // Clear Data
        await saveData(); // Save Empty State
        clearForm(); // Reset Inputs
        renderLeaderboard(); // Reset Table
        
        // Reset displayed totals if any
        if (currentTotalScoreEl) currentTotalScoreEl.textContent = '0';
        currentEmployeeTotalScore = 0;

        const monthName = ARABIC_MONTHS[month];
        showArchiveToast(`✅ تم الأرشفة وبدء أسبوع جديد بنجاح!`);
        
        // Update Archive UI if needed
        renderArchiveMonths();
        
        // Hide Modal
        if (archiveConfirmModal) {
            archiveConfirmModal.style.display = 'none';
        }
    });

    // Handle Cancel Archive Click
    cancelArchiveBtn?.addEventListener('click', () => {
        if (archiveConfirmModal) {
            archiveConfirmModal.style.display = 'none';
        }
    });

    // Close on click outside
    archiveConfirmModal?.addEventListener('click', (e) => {
        if (e.target === archiveConfirmModal) {
            archiveConfirmModal.style.display = 'none';
        }
    });

    function renderArchiveMonths() {
        const months = Object.keys(archiveData).sort().reverse();

        if (months.length === 0) {
            archiveMonthsPanel.innerHTML = `
                <div class="archive-empty-state">
                    <div class="icon">📅</div>
                    <div>لا توجد بيانات محفوظة</div>
                </div>
            `;
            return;
        }

        let html = '';
        months.forEach(monthKey => {
            const [year, monthNum] = monthKey.split('-');
            const monthName = ARABIC_MONTHS[parseInt(monthNum) - 1];
            const weeksCount = Object.keys(archiveData[monthKey]).length;
            const isActive = currentArchiveMonth === monthKey ? 'active' : '';

            html += `
                <button class="archive-month-btn ${isActive}" data-month="${monthKey}">
                    <div style="font-weight: bold;">${monthName} ${year}</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 3px;">${weeksCount} ${weeksCount === 1 ? 'أسبوع' : 'أسابيع'}</div>
                </button>
            `;
        });

        archiveMonthsPanel.innerHTML = html;

        archiveMonthsPanel.querySelectorAll('.archive-month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentArchiveMonth = btn.dataset.month;
                currentArchiveWeek = null;
                renderArchiveMonths();
                renderArchiveWeeks();
                renderArchiveData();
            });
        });
    }

    function renderArchiveWeeks() {
        if (!currentArchiveMonth || !archiveData[currentArchiveMonth]) {
            archiveWeeksPanel.innerHTML = `
                <div class="archive-empty-state">
                    <div class="icon">📆</div>
                    <div>اختر شهراً</div>
                </div>
            `;
            return;
        }

        const weeks = Object.keys(archiveData[currentArchiveMonth]).sort();
        let html = '';

        weeks.forEach(weekKey => {
            const weekData = archiveData[currentArchiveMonth][weekKey];
            const isActive = currentArchiveWeek === weekKey ? 'active' : '';

            html += `
                <button class="archive-week-btn ${isActive}" data-week="${weekKey}">
                    <div style="font-weight: bold;">الأسبوع ${weekData.weekNumber}</div>
                    <div style="font-size: 0.75rem; color: #888; margin-top: 2px;">${weekData.dateRange}</div>
                </button>
            `;
        });

        archiveWeeksPanel.innerHTML = html;

        archiveWeeksPanel.querySelectorAll('.archive-week-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentArchiveWeek = btn.dataset.week;
                renderArchiveWeeks();
                renderArchiveData();
            });
        });
    }

    function renderArchiveData() {
        if (!currentArchiveMonth || !currentArchiveWeek || !archiveData[currentArchiveMonth]?.[currentArchiveWeek]) {
            archiveDataPanel.innerHTML = `
                <div class="archive-empty-state">
                    <div class="icon">📊</div>
                    <div>اختر أسبوعاً لعرض البيانات</div>
                </div>
            `;
            return;
        }

        const weekData = archiveData[currentArchiveMonth][currentArchiveWeek];
        const savedWeeklyData = weekData.data;
        const savedEmployeeList = weekData.employeeList;

        // Calculate scores for archive data
        const tempReportMaxValues = {};
        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') continue;
            let maxTotal = 0;
            for (const emp of savedEmployeeList) {
                const data = savedWeeklyData[emp];
                if (!data) continue;
                const done = data[key]?.done || 0;
                const sent = data[key]?.sent || 0;
                const multiplier = SENT_MULTIPLIERS[key] || 1;
                const total = done + (sent * multiplier);
                if (total > maxTotal) maxTotal = total;
            }
            tempReportMaxValues[key] = maxTotal > 0 ? maxTotal : 1;
        }

        function calcArchiveStage1(data) {
            let score = 0;
            if (REPORT_WEIGHT_TOTAL === 0) return 0;
            for (const key of REPORT_KEYS) {
                if (key === 'marketWarnings') continue;
                const weight = REPORT_WEIGHTS[key] || 0;
                if (weight === 0) continue;
                const done = data[key]?.done || 0;
                const sent = data[key]?.sent || 0;
                const multiplier = SENT_MULTIPLIERS[key] || 1;
                const total = done + (sent * multiplier);
                const maxTotal = tempReportMaxValues[key] || 1;
                score += (total / maxTotal) * weight;
            }
            return Math.min((score / REPORT_WEIGHT_TOTAL) * STAGE1_MAX, STAGE1_MAX);
        }

        function calcArchiveTotalScore(data) {
            const stage1 = calcArchiveStage1(data);
            const accuracy = Math.min(data.accuracyTotal || 0, STAGE2_MAX);
            const shiftScore = Math.min(data.shiftManagerScore || 0, SHIFT_MAX);
            const deptScore = Math.min(data.deptManagerScore || 0, DEPT_MAX);
            const excellence = data.excellence?.bonus || 0;
            return stage1 + accuracy + shiftScore + deptScore + excellence;
        }

        const entries = savedEmployeeList.map(emp => ({
            name: emp,
            score: calcArchiveTotalScore(savedWeeklyData[emp] || {}),
            data: savedWeeklyData[emp] || {}
        })).sort((a, b) => b.score - a.score);

        const [year, monthNum] = currentArchiveMonth.split('-');
        const monthName = ARABIC_MONTHS[parseInt(monthNum) - 1];
        const savedDate = new Date(weekData.savedAt);
        const formattedDate = savedDate.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let html = `
            <div class="archive-leaderboard">
                <div class="archive-leaderboard-header">
                    <div class="archive-week-info">
                        <div class="archive-week-title">الأسبوع ${weekData.weekNumber} - ${monthName} ${year}</div>
                        <div class="archive-week-date">📅 تم الحفظ: ${formattedDate}</div>
                    </div>
                    <button class="archive-delete-week-btn" data-month="${currentArchiveMonth}" data-week="${currentArchiveWeek}">
                        🗑️ حذف
                    </button>
                </div>
        `;

        if (entries.length > 0 && entries[0].score > 0) {
            html += `
                <div class="archive-winner-badge">
                    <div class="crown">👑</div>
                    <div class="winner-name">${entries[0].name}</div>
                    <div class="winner-score">الموظف المثالي - ${formatScore(entries[0].score)} نقطة</div>
                </div>
            `;
        }

        entries.forEach((entry, index) => {
            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
            html += `
                <div class="archive-employee-row" data-employee="${entry.name}">
                    <div class="archive-rank ${rankClass}">${index + 1}</div>
                    <div class="archive-employee-name">${entry.name}</div>
                    <span class="edit-hint">✏️ تعديل</span>
                    <div class="archive-employee-score">${formatScore(entry.score)}</div>
                </div>
            `;
        });

        html += '</div>';
        archiveDataPanel.innerHTML = html;

        // Add click listeners for editing employees
        archiveDataPanel.querySelectorAll('.archive-employee-row').forEach(row => {
            row.addEventListener('click', () => {
                const empName = row.dataset.employee;
                openArchiveEditModal(empName);
            });
        });

        archiveDataPanel.querySelector('.archive-delete-week-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const month = e.target.dataset.month;
            const week = e.target.dataset.week;
            pendingDeleteArchiveWeek = { month, week };
            const weekInfo = archiveData[month][week];
            deleteArchiveWeekMsg.innerHTML = `هل أنت متأكد من حذف <b style="color:#00d2ff;">الأسبوع ${weekInfo.weekNumber}</b>؟<br><small style="color:#888;">هذا الإجراء لا يمكن التراجع عنه</small>`;
            deleteArchiveWeekModal.style.display = 'flex';
        });
    }

    async function deleteArchiveWeek(month, week) {
        if (archiveData[month]) {
            delete archiveData[month][week];
            if (Object.keys(archiveData[month]).length === 0) {
                delete archiveData[month];
            }
            await saveArchiveData();

            if (currentArchiveMonth === month && currentArchiveWeek === week) {
                currentArchiveWeek = null;
            }
            if (!archiveData[month]) {
                currentArchiveMonth = null;
            }

            renderArchiveMonths();
            renderArchiveWeeks();
            renderArchiveData();
            showArchiveToast('تم حذف الأسبوع من الأرشيف');
        }
    }

    function openArchiveModal() {
        currentArchiveMonth = null;
        currentArchiveWeek = null;
        renderArchiveMonths();
        renderArchiveWeeks();
        renderArchiveData();
        archiveModal.style.display = 'flex';
    }

    function closeArchiveModal() {
        archiveModal.style.display = 'none';
    }

    // Archive Edit Functions
    function openArchiveEditModal(employeeName) {
        if (!currentArchiveMonth || !currentArchiveWeek) return;
        
        const weekData = archiveData[currentArchiveMonth]?.[currentArchiveWeek];
        if (!weekData) return;
        
        currentArchiveEditEmployee = employeeName;
        const empData = weekData.data[employeeName] || {};
        
        const [year, monthNum] = currentArchiveMonth.split('-');
        const monthName = ARABIC_MONTHS[parseInt(monthNum) - 1];
        
        archiveEditEmployeeName.textContent = employeeName;
        archiveEditWeekInfo.textContent = `الأسبوع ${weekData.weekNumber} - ${monthName} ${year}`;
        
        // Generate reports inputs
        let reportsHtml = '';
        for (const key of REPORT_KEYS) {
            const title = REPORT_TITLE_MAP[key];
            const weight = REPORT_WEIGHTS[key];
            const done = empData[key]?.done || 0;
            const sent = empData[key]?.sent || 0;
            
            if (key === 'marketWarnings') {
                reportsHtml += `
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: center; padding: 10px 12px; background: linear-gradient(90deg, rgba(99, 102, 241, 0.08), transparent); border-radius: 10px; border-right: 3px solid #6366f1;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #e2e8f0;">
                            <span style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 4px 8px; border-radius: 6px; color: #fff; font-size: 0.7rem; font-weight: 700;">${weight}</span>
                            <span style="font-weight: 500;">${title}</span>
                        </div>
                        <div style="grid-column: span 2;">
                            <select id="archive-edit-${key}-done" style="width: 100%; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(99, 102, 241, 0.3); color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
                                <option value="0" ${done == 0 ? 'selected' : ''}>❌ غير متابع</option>
                                <option value="1" ${done == 1 ? 'selected' : ''}>✅ متابع</option>
                            </select>
                        </div>
                    </div>
                `;
            } else {
                reportsHtml += `
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: center; padding: 10px 12px; background: linear-gradient(90deg, rgba(99, 102, 241, 0.05), transparent); border-radius: 10px; transition: all 0.2s;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #e2e8f0;">
                            <span style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 4px 8px; border-radius: 6px; color: #fff; font-size: 0.7rem; font-weight: 700;">${weight}</span>
                            <span style="font-weight: 500;">${title}</span>
                        </div>
                        <div>
                            <input type="number" id="archive-edit-${key}-done" value="${done}" min="0" placeholder="0" style="width: 100%; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(52, 211, 153, 0.3); color: #34d399; padding: 10px; border-radius: 8px; text-align: center; box-sizing: border-box; font-weight: 600; font-size: 0.95rem;">
                        </div>
                        <div>
                            <input type="number" id="archive-edit-${key}-sent" value="${sent}" min="0" placeholder="0" style="width: 100%; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 10px; border-radius: 8px; text-align: center; box-sizing: border-box; font-weight: 600; font-size: 0.95rem;">
                        </div>
                    </div>
                `;
            }
        }
        
        archiveEditReportsContainer.innerHTML = reportsHtml;
        
        // Set other values
        archiveEditExcellence.value = empData.excellence?.bonus || 0;
        archiveEditExcellenceNote.value = empData.excellence?.note || '';
        archiveEditAccuracy.value = empData.accuracyTotal || '';
        archiveEditShiftScore.value = empData.shiftManagerScore ?? '';
        archiveEditDeptScore.value = empData.deptManagerScore ?? '';
        
        archiveEditModal.style.display = 'flex';
    }

    function closeArchiveEditModal() {
        archiveEditModal.style.display = 'none';
        currentArchiveEditEmployee = null;
    }

    async function saveArchiveEdit() {
        if (!currentArchiveMonth || !currentArchiveWeek || !currentArchiveEditEmployee) return;
        
        const weekData = archiveData[currentArchiveMonth]?.[currentArchiveWeek];
        if (!weekData) return;
        
        // Collect data from form
        const newData = {};
        
        for (const key of REPORT_KEYS) {
            if (key === 'marketWarnings') {
                const doneEl = document.getElementById(`archive-edit-${key}-done`);
                newData[key] = { done: parseInt(doneEl?.value) || 0 };
            } else {
                const doneEl = document.getElementById(`archive-edit-${key}-done`);
                const sentEl = document.getElementById(`archive-edit-${key}-sent`);
                newData[key] = {
                    done: parseFloat(doneEl?.value) || 0,
                    sent: parseFloat(sentEl?.value) || 0
                };
            }
        }
        
        newData.excellence = {
            bonus: parseInt(archiveEditExcellence.value) || 0,
            note: archiveEditExcellenceNote.value || ''
        };
        
        newData.accuracyTotal = parseFloat(archiveEditAccuracy.value) || 0;
        newData.shiftManagerScore = archiveEditShiftScore.value !== '' ? parseFloat(archiveEditShiftScore.value) : null;
        newData.deptManagerScore = archiveEditDeptScore.value !== '' ? parseFloat(archiveEditDeptScore.value) : null;
        
        // Update archive data
        weekData.data[currentArchiveEditEmployee] = newData;
        weekData.lastModified = new Date().toISOString();
        
        await saveArchiveData();
        
        closeArchiveEditModal();
        renderArchiveData();
        showArchiveToast(`✅ تم تحديث بيانات ${currentArchiveEditEmployee}`);
    }

    // Archive Event Listeners
    saveToArchiveBtn?.addEventListener('click', saveToArchive);
    openArchiveBtn?.addEventListener('click', openArchiveModal);
    archiveCloseBtn?.addEventListener('click', closeArchiveModal);
    
    // Evaluation Button: Should close archive if open and scroll to top
    goToEvaluationBtn?.addEventListener('click', () => {
        const archiveModal = document.getElementById('archive-modal');
        if (archiveModal && archiveModal.style.display !== 'none') {
             closeArchiveModal();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Archive Edit Event Listeners
    archiveEditCloseBtn?.addEventListener('click', closeArchiveEditModal);
    archiveEditCancelBtn?.addEventListener('click', closeArchiveEditModal);
    archiveEditSaveBtn?.addEventListener('click', saveArchiveEdit);
    
    archiveEditModal?.addEventListener('click', (e) => {
        if (e.target === archiveEditModal) {
            closeArchiveEditModal();
        }
    });

    confirmDeleteArchiveWeekBtn?.addEventListener('click', async () => {
        if (pendingDeleteArchiveWeek) {
            await deleteArchiveWeek(pendingDeleteArchiveWeek.month, pendingDeleteArchiveWeek.week);
            pendingDeleteArchiveWeek = null;
        }
        deleteArchiveWeekModal.style.display = 'none';
    });

    cancelDeleteArchiveWeekBtn?.addEventListener('click', () => {
        pendingDeleteArchiveWeek = null;
        deleteArchiveWeekModal.style.display = 'none';
    });

    archiveModal?.addEventListener('click', (e) => {
        if (e.target === archiveModal) {
            closeArchiveModal();
        }
    });

    deleteArchiveWeekModal?.addEventListener('click', (e) => {
        if (e.target === deleteArchiveWeekModal) {
            deleteArchiveWeekModal.style.display = 'none';
            pendingDeleteArchiveWeek = null;
        }
    });

    // Sidebar Toggle Logic (Updated for Right Sidebar)
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.archive-sidebar');
    
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from closing immediately
            sidebar.classList.toggle('expanded');
            document.body.classList.toggle('sidebar-expanded');
        });

        // Optional: Close when clicking outside if expanded
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('expanded') && 
                !sidebar.contains(e.target) && 
                e.target !== sidebarToggleBtn) {
                
                sidebar.classList.remove('expanded');
                document.body.classList.remove('sidebar-expanded');
            }
        });
    }

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------
    await loadData();
});
