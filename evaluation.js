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
        suspicious: 15,
        depositPercentage: 15,
        kpi3DaysBalance: 12, 
        newPositions: 8,
        profitWatching: 8,
        profitSummary: 8,
        samePriceSL: 7,
        dealsProfit: 7,
        creditOut: 5,
        profitOver0: 5,
        floatingProfit: 4,
        twoActions: 3,
        marketWarnings: 0,
        profitLeverage: 1,
        excellence: 0
    };

    const STORAGE_KEY = 'weeklyEvaluationData_v2'; // Changed Key for new structure
    const EMPLOYEES_LIST_KEY = 'employeeList_v1';

    const DEFAULT_EMPLOYEES = [
        "ABBASS", "AHMED MAGDY", "zahraa Shaqir", "Zainab", 
        "Hadil zaiter", "Nour karsifi", "Ahmed Gamal", 
        "Mohamed Abd", "Ahmed – Manager", "Shahenda Sherif"
    ];

    // Keys for iteration
    const CAT_KEYS = Object.keys(REPORT_WEIGHTS);

    // DOM Elements
    const employeeSelect = document.getElementById('employee-select');
    // Shift Manager Elements
    const shiftEvalDisplay = document.getElementById('shift-manager-display-container');
    const shiftEvalValueEl = document.getElementById('shift-manager-display-value');
    const shiftEvalHiddenInput = document.getElementById('shift-manager-input');
    const editShiftScoreBtn = document.getElementById('edit-shift-score-btn');
    const shiftEvalModal = document.getElementById('shift-eval-modal');
    const shiftEvalModalInput = document.getElementById('shift-eval-modal-input');
    const saveShiftEvalBtn = document.getElementById('save-shift-eval-btn');

    // Dept Manager Elements
    const deptEvalDisplay = document.getElementById('dept-manager-display-container');
    const deptEvalValueEl = document.getElementById('dept-manager-display-value');
    const deptEvalHiddenInput = document.getElementById('dept-manager-input');
    const editDeptScoreBtn = document.getElementById('edit-dept-score-btn');
    const deptEvalModal = document.getElementById('dept-eval-modal');
    const deptEvalModalInput = document.getElementById('dept-eval-modal-input');
    const saveDeptEvalBtn = document.getElementById('save-dept-eval-btn');

    // Comparison Elements
    const compareBtn = document.getElementById('compare-btn');
    const compareModal = document.getElementById('compare-modal');
    const closeCompareModalBtn = document.getElementById('close-compare-modal-btn');
    const compareContent = document.getElementById('compare-content');

    const saveBtn = document.getElementById('save-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const idealContainer = document.getElementById('ideal-employee-container');
    const idealNameEl = document.getElementById('ideal-name');
    const idealScoreEl = document.getElementById('ideal-score');
    const currentTotalScoreEl = document.getElementById('current-total-score');

    // Input Map - Generating programmatically
    // Structure: inputs.suspicious.done, inputs.suspicious.sent
    const inputs = {};
    
    // Helper to map IDs from html
    const idMap = {
        suspicious: 'suspicious',
        depositPercentage: 'deposit',
        kpi3DaysBalance: '3days',
        newPositions: 'new-pos',
        profitWatching: 'profit-watch',
        profitSummary: 'profit-sum',
        samePriceSL: 'same-sl',
        dealsProfit: 'deals-profit',
        creditOut: 'credit',
        profitOver0: 'profit-zero',
        floatingProfit: 'floating',
        twoActions: 'two-actions',
        marketWarnings: 'market',
        profitLeverage: 'leverage',
        excellence: 'excellence'
    };

    CAT_KEYS.forEach(key => {
        const baseId = idMap[key];
        inputs[key] = {
            done: document.getElementById(`inp-${baseId}-done`),
            sent: document.getElementById(`inp-${baseId}-sent`),
            acc: document.getElementById(`inp-${baseId}-acc`),
            error: document.getElementById(`inp-${baseId}-error`)
        };
    });

    // State
    // Structure: { "EmployeeName": { suspicious: {done: 5, sent: 2}, ... } }
    let evaluationData = {};
    let activeEmployees = [];
    
    // Modal Elements
    const detailsModal = document.getElementById('details-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalHeaderName = document.getElementById('modal-employee-header'); // Updated element ID
    const modalDetailsBody = document.getElementById('modal-details-body');

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------
    await loadData();
    renderEmployeeSelect();
    renderLeaderboard();
    toggleInputs(false); // Disable initially

    // -------------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------------
    
    // Live Score Calculation
    function updateLiveScore() {
        let currentScore = 0;
        
        CAT_KEYS.forEach(key => {
            const inputGroup = inputs[key];
            const weight = REPORT_WEIGHTS[key];
            // Handle potentially missing inputs (e.g. Market Warnings select replacement)
            const doneVal = (inputGroup.done && parseInt(inputGroup.done.value)) || 0;
            const sentVal = (inputGroup.sent && parseInt(inputGroup.sent.value)) || 0;
            let accRaw = (inputGroup.acc && parseInt(inputGroup.acc.value));
            
            // If input is empty (NaN), treat as 100% accuracy (no penalty)
            if (isNaN(accRaw)) accRaw = 100;

            const accuracyMultiplier = accRaw / 100;
            
            let itemScore = 0;
            
            // Formula: (Done + Sent) * Weight
            // Special Rules:
            // Suspicious: Sent * 10
            // 3 Days Balance & Profit Summary: Sent * 5
            // Deals Profit: Done/2, Sent*5
            if (key === 'suspicious') {
                itemScore = (doneVal + (sentVal * 10)) * weight;
            } else if (key === 'kpi3DaysBalance' || key === 'profitSummary') {
                itemScore = (doneVal + (sentVal * 5)) * weight;
            } else if (key === 'dealsProfit') {
                itemScore = ((doneVal / 2) + (sentVal * 5)) * weight;
            } else {
                itemScore = (doneVal + sentVal) * weight;
            }

            // Apply Accuracy
            currentScore += (itemScore * accuracyMultiplier);
        });

        // Apply Excellence Bonus Logic
        // 1=2%, 2=4%, 3=6%, 4=8%, 5=10%
        if (inputs.excellence && inputs.excellence.done) {
            const excellenceLevel = parseInt(inputs.excellence.done.value) || 0;
            if (excellenceLevel > 0) {
                // Example: Level 1 -> 0.02, Level 5 -> 0.10
                const bonusFactor = excellenceLevel * 0.02; 
                // Add bonus to current technical score
                currentScore = currentScore * (1 + bonusFactor);
            }
        }

        // Apply Shift Manager Score Multiplier
        let shiftScore = 100;
        if (shiftEvalHiddenInput && shiftEvalHiddenInput.value !== '') {
            shiftScore = parseInt(shiftEvalHiddenInput.value);
            if (isNaN(shiftScore)) shiftScore = 100;
        }
        currentScore = currentScore * (shiftScore / 100);

        // Apply Dept Manager Score Multiplier
        let deptScore = 100;
        if (deptEvalHiddenInput && deptEvalHiddenInput.value !== '') {
            deptScore = parseInt(deptEvalHiddenInput.value);
            if (isNaN(deptScore)) deptScore = 100;
        }
        currentScore = currentScore * (deptScore / 100);

        if (currentTotalScoreEl) {
            currentTotalScoreEl.textContent = Math.round(currentScore).toLocaleString();
        }
    }

    // Attach live update to all inputs
    CAT_KEYS.forEach(key => {
        if (inputs[key].done) inputs[key].done.addEventListener('input', updateLiveScore);
        if (inputs[key].sent) inputs[key].sent.addEventListener('input', updateLiveScore);
        if (inputs[key].acc) inputs[key].acc.addEventListener('input', updateLiveScore);
        if (inputs[key].error) inputs[key].error.addEventListener('input', updateLiveScore);
    });

    // Load employee data when selected
    employeeSelect.addEventListener('change', () => {
        const name = employeeSelect.value;
        if (!name) {
             toggleInputs(false);
             if (shiftEvalDisplay) shiftEvalDisplay.style.display = 'none';
             if (deptEvalDisplay) deptEvalDisplay.style.display = 'none';
             return;
        }
        
        toggleInputs(true);
        const empData = evaluationData[name] || {};
        fillInputs(empData);
        updateLiveScore();

        // Handle Shift Manager Score
        const savedShiftScore = (empData.shiftManagerScore !== undefined) ? empData.shiftManagerScore : '';
        shiftEvalHiddenInput.value = savedShiftScore;
        shiftEvalValueEl.textContent = savedShiftScore !== '' ? `%${savedShiftScore}` : '-';
        shiftEvalDisplay.style.display = 'flex';

        // Handle Dept Manager Score
        const savedDeptScore = (empData.deptManagerScore !== undefined) ? empData.deptManagerScore : '';
        deptEvalHiddenInput.value = savedDeptScore;
        deptEvalValueEl.textContent = savedDeptScore !== '' ? `%${savedDeptScore}` : '-';
        deptEvalDisplay.style.display = 'flex';

        // Auto-show modal removed as per request
    });

    // Shift Eval Modal Logic
    if (saveShiftEvalBtn) {
        saveShiftEvalBtn.addEventListener('click', () => {
            const val = shiftEvalModalInput.value;
            // Update hidden input and display
            shiftEvalHiddenInput.value = val;
            shiftEvalValueEl.textContent = val !== '' ? `%${val}` : '-';
            shiftEvalModal.style.display = 'none';
            updateLiveScore();
        });
    }

    // Dept Manager Modal Logic
    if (saveDeptEvalBtn) {
        saveDeptEvalBtn.addEventListener('click', () => {
            const val = deptEvalModalInput.value;
            // Update hidden input and display
            deptEvalHiddenInput.value = val;
            deptEvalValueEl.textContent = val !== '' ? `%${val}` : '-';
            deptEvalModal.style.display = 'none';
            updateLiveScore();
        });
    }

    if (editDeptScoreBtn) {
        editDeptScoreBtn.addEventListener('click', () => {
             deptEvalModalInput.value = deptEvalHiddenInput.value;
             deptEvalModal.style.display = 'flex';
             deptEvalModalInput.focus();
        });
    }

    if (editShiftScoreBtn) {
        editShiftScoreBtn.addEventListener('click', () => {
             shiftEvalModalInput.value = shiftEvalHiddenInput.value;
             shiftEvalModal.style.display = 'flex';
             shiftEvalModalInput.focus();
        });
    }

    // Save Button
    saveBtn.addEventListener('click', async () => {
        const name = employeeSelect.value;
        if (!name) {
            alert('الرجاء اختيار موظف أولاً.');
            return;
        }

        // Gather counts from inputs
        const newEmpData = {};
        CAT_KEYS.forEach(key => {
             // Retrieve values
             const d = (inputs[key].done && parseInt(inputs[key].done.value)) || 0;
             const s = (inputs[key].sent && parseInt(inputs[key].sent.value)) || 0;
             let a = (inputs[key].acc && parseInt(inputs[key].acc.value));
             if (isNaN(a)) a = 100; // Default to 100% implicitly if not set
             const e = (inputs[key].error && parseInt(inputs[key].error.value)) || 0;

            newEmpData[key] = {
                done: d,
                sent: s,
                acc: a,
                error: e
            };
        });

        // Add Shift Manager Score
        const shiftScore = parseInt(shiftEvalHiddenInput.value);
        if (!isNaN(shiftScore)) {
            newEmpData.shiftManagerScore = shiftScore;
        }

        // Add Dept Manager Score
        const deptScore = parseInt(deptEvalHiddenInput.value);
        if (!isNaN(deptScore)) {
            newEmpData.deptManagerScore = deptScore;
        }

        // Save to state
        evaluationData[name] = newEmpData;

        // Persist
        await saveData();

        // Update UI
        renderLeaderboard();
        
        // Visual feedback
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ تم الحفظ';
        saveBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = ''; // Revert to CSS
        }, 1500);
    });

    // Reset Week Button
    resetAllBtn.addEventListener('click', async () => {
        if(confirm('هل أنت متأكد من تصفير الأسبوع؟ سيتم حذف جميع البيانات.')) {
            evaluationData = {};
            await saveData();
            
            // Clear inputs
            employeeSelect.value = "";
            clearInputs();
            toggleInputs(false);
            currentTotalScoreEl.textContent = "0";
            
            renderLeaderboard();
            clearInputs();
            currentTotalScoreEl.textContent = "0";
            
            renderLeaderboard();
        }
    });
    
    // Close Modal Events
    closeModalBtn.addEventListener('click', () => {
        detailsModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            detailsModal.style.display = 'none';
        }
    });

    // -------------------------------------------------------------------------
    // EMPLOYEE MANAGEMENT LOGIC
    // -------------------------------------------------------------------------
    const manageBtn = document.getElementById('manage-employees-btn');
    const manageModal = document.getElementById('manage-modal');
    const closeManageBtn = document.getElementById('close-manage-modal-btn');
    const manageListContainer = document.getElementById('manage-list-container');
    const newEmployeeInput = document.getElementById('new-employee-name');
    const addEmployeeBtn = document.getElementById('add-employee-btn');

    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            renderManageEmployeesList();
            manageModal.style.display = 'flex';
        });
    }

    if (closeManageBtn) {
        closeManageBtn.addEventListener('click', () => {
            manageModal.style.display = 'none';
        });
    }

    if (manageModal) {
         window.addEventListener('click', (e) => {
            if (e.target === manageModal) {
                manageModal.style.display = 'none';
            }
        });
    }

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', async () => {
            const name = newEmployeeInput.value.trim();
            if (!name) return;
            
            if (activeEmployees.some(n => n.toLowerCase() === name.toLowerCase())) {
                alert('هذا الاسم موجود بالفعل!');
                return;
            }

            activeEmployees.push(name);
            await saveEmployees();
            
            newEmployeeInput.value = '';
            renderManageEmployeesList();
            renderEmployeeSelect(); // Update the main dropdown
        });
    }

    // State for Modals
    let pendingEditIndex = -1;
    let pendingEditName = "";
    let pendingDeleteIndex = -1;
    let pendingDeleteName = "";

    // Edit Modal Elements
    const editModal = document.getElementById('edit-employee-modal');
    const editInput = document.getElementById('edit-employee-input');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Delete Modal Elements
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteMsg = document.getElementById('delete-confirm-msg');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Edit Modal Logic
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async () => {
            const newName = editInput.value.trim();
            const oldName = pendingEditName;

            if (newName && newName !== "" && newName !== oldName) {
                if (activeEmployees.some((n, i) => i !== pendingEditIndex && n.toLowerCase() === newName.toLowerCase())) {
                    alert('اسم موجود بالفعل!');
                    return;
                }
                
                // Update list
                activeEmployees[pendingEditIndex] = newName;
                await saveEmployees();
                
                // Migrate Data
                if (evaluationData[oldName]) {
                    evaluationData[newName] = evaluationData[oldName];
                    delete evaluationData[oldName];
                    await saveData();
                }
                
                renderManageEmployeesList();
                renderEmployeeSelect();
                renderLeaderboard();
                
                // If currently selected, update selection
                if (employeeSelect.value === oldName) {
                    employeeSelect.value = newName;
                }
            }
            editModal.style.display = 'none';
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    // Delete Modal Logic
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (pendingDeleteIndex > -1) {
                const name = pendingDeleteName;
                
                activeEmployees.splice(pendingDeleteIndex, 1);
                await saveEmployees();
                
                if (evaluationData[name]) {
                    delete evaluationData[name];
                    await saveData();
                }

                renderManageEmployeesList();
                renderEmployeeSelect();
                renderLeaderboard();
                
                // If current selection was deleted, clear inputs
                if (employeeSelect.value === name) {
                    employeeSelect.value = "";
                    clearInputs();
                    toggleInputs(false);
                    if (currentTotalScoreEl) currentTotalScoreEl.textContent = "0";
                }
            }
            deleteModal.style.display = 'none';
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === deleteModal) deleteModal.style.display = 'none';
    });


    function renderManageEmployeesList() {
        manageListContainer.innerHTML = '';
        activeEmployees.forEach((name, index) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            nameSpan.style.flexGrow = '1';
            
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '8px';

            // Edit Button
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '✏️';
            editBtn.style.cssText = 'background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.7; transition:opacity 0.2s;';
            editBtn.title = 'تعديل الاسم';
            editBtn.onmouseover = () => editBtn.style.opacity = '1';
            editBtn.onmouseout = () => editBtn.style.opacity = '0.7';
            
            editBtn.onclick = () => {
                pendingEditIndex = index;
                pendingEditName = name;
                editInput.value = name;
                editModal.style.display = 'flex';
                editInput.focus();
            };

            // Delete Button
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '🗑️';
            delBtn.style.cssText = 'background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.7; transition:opacity 0.2s; color:#ff6b6b;';
            delBtn.title = 'حذف الموظف';
            delBtn.onmouseover = () => delBtn.style.opacity = '1';
            delBtn.onmouseout = () => delBtn.style.opacity = '0.7';
            
            delBtn.onclick = () => {
                pendingDeleteIndex = index;
                pendingDeleteName = name;
                
                deleteMsg.innerHTML = `هل أنت متأكد من حذف الموظف <b style="color:#00d2ff;">"${name}"</b>؟<br>سيتم حذف بيانات التقييم المرتبطة به.`;
                deleteModal.style.display = 'flex';
            };

            btnGroup.appendChild(editBtn);
            btnGroup.appendChild(delBtn);
            
            row.appendChild(nameSpan);
            row.appendChild(btnGroup);
            
            manageListContainer.appendChild(row);
        });
    }

    // -------------------------------------------------------------------------
    // FUNCTIONS
    // -------------------------------------------------------------------------

    async function loadData() {
        const result = await chrome.storage.local.get([STORAGE_KEY, EMPLOYEES_LIST_KEY]);
        evaluationData = result[STORAGE_KEY] || {};
        activeEmployees = result[EMPLOYEES_LIST_KEY] || [...DEFAULT_EMPLOYEES];
    }

    async function saveEmployees() {
        await chrome.storage.local.set({ [EMPLOYEES_LIST_KEY]: activeEmployees });
    }

    async function saveData() {
        await chrome.storage.local.set({ [STORAGE_KEY]: evaluationData });
    }

    function renderEmployeeSelect() {
        // Keep the placeholder and clear others
        employeeSelect.innerHTML = '<option value="" disabled selected>-- اختر الموظف لتقييمه --</option>';
        activeEmployees.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            employeeSelect.appendChild(opt);
        });
    }

    function calculateTotalScore(empData) {
        if (!empData) return 0;
        let score = 0;
        
        CAT_KEYS.forEach(key => {
             const catData = empData[key] || {done:0, sent:0, acc:100};
             const weight = REPORT_WEIGHTS[key];
             const acc = (catData.acc !== undefined) ? catData.acc : 100;
             const multiplier = acc / 100;
             
             let itemScore = 0;

             // Special Rule:
             // 1. Suspicious: 1 Sent = 10 Done
             // 2. 3 Days Balance & Profit Summary: 1 Sent = 5 Done
             // 3. Deals Profit : Done = Done/2, Sent = Sent*5 (which is 10x Done/2)
             if (key === 'suspicious') {
                 itemScore = (catData.done + (catData.sent * 10)) * weight;
             } else if (key === 'kpi3DaysBalance' || key === 'profitSummary') {
                 itemScore = (catData.done + (catData.sent * 5)) * weight;
             } else if (key === 'dealsProfit') {
                 itemScore = ((catData.done / 2) + (catData.sent * 5)) * weight;
             } else {
                 itemScore = (catData.done + catData.sent) * weight;
             }
             
             score += (itemScore * multiplier);
        });
        
        // Apply Shift Manager Score Multiplier
        let shiftScore = (empData.shiftManagerScore !== undefined) ? empData.shiftManagerScore : 100;
        if (shiftScore === null || shiftScore === "") shiftScore = 100;
        score = score * (shiftScore / 100);

        return Math.round(score);
    }

    function fillInputs(empData) {
        CAT_KEYS.forEach(key => {
            const catData = empData[key] || {done: '', sent: '', acc: '', error: ''};
            
            if (inputs[key].done) {
                 if (inputs[key].done.tagName === 'SELECT') {
                     // For Select elements (Market, Excellence), use value directly or default to 0
                     inputs[key].done.value = (catData.done !== undefined && catData.done !== '') ? catData.done : '0';
                 } else {
                     inputs[key].done.value = (catData.done !== undefined && catData.done !== 0) ? catData.done : '';
                 }
            }

            if (inputs[key].sent) inputs[key].sent.value = (catData.sent !== undefined && catData.sent !== 0) ? catData.sent : '';
            
            if (inputs[key].acc) inputs[key].acc.value = (catData.acc !== undefined && catData.acc !== 100) ? catData.acc : '';
            
            if (inputs[key].error) inputs[key].error.value = (catData.error !== undefined && catData.error !== 0) ? catData.error : '';
        });
    }

    function toggleInputs(enable) {
        const opacity = enable ? '1' : '0.5';
        
        CAT_KEYS.forEach(key => {
            if (inputs[key].done) {
                inputs[key].done.disabled = !enable;
                inputs[key].done.style.opacity = opacity;
                inputs[key].done.style.cursor = enable ? 'text' : 'not-allowed';
                if (inputs[key].done.tagName === 'SELECT') inputs[key].done.style.cursor = enable ? 'pointer' : 'not-allowed';
            }
            if (inputs[key].sent) {
                inputs[key].sent.disabled = !enable;
                inputs[key].sent.style.opacity = opacity;
                inputs[key].sent.style.cursor = enable ? 'text' : 'not-allowed';
            }
            if (inputs[key].acc) {
                inputs[key].acc.disabled = !enable;
                inputs[key].acc.style.opacity = opacity;
                inputs[key].acc.style.cursor = enable ? 'text' : 'not-allowed';
            }
            if (inputs[key].error) {
                inputs[key].error.disabled = !enable;
                inputs[key].error.style.opacity = opacity;
                inputs[key].error.style.cursor = enable ? 'text' : 'not-allowed';
            }
        });
        
        if (saveBtn) {
            saveBtn.disabled = !enable;
            saveBtn.style.opacity = opacity;
            saveBtn.style.cursor = enable ? 'pointer' : 'not-allowed';
        }
    }
    
    function clearInputs() {
        CAT_KEYS.forEach(key => {
            if (inputs[key].done) inputs[key].done.value = '';
            if (inputs[key].done && inputs[key].done.tagName === 'SELECT') inputs[key].done.value = '0';
            if (inputs[key].sent) inputs[key].sent.value = '';
            if (inputs[key].acc)  inputs[key].acc.value = '';
            if (inputs[key].error) inputs[key].error.value = '';
        });
    }

    function renderLeaderboard() {
        leaderboardBody.innerHTML = '';
        
        // Convert map to array {name, score}
        const ranking = [];
        for (const [name, empData] of Object.entries(evaluationData)) {
            const score = calculateTotalScore(empData);
            ranking.push({ name, score });
        }

        // Sort descending by score
        ranking.sort((a, b) => b.score - a.score);

        // Render Rows
        if (ranking.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#555;">لا توجد بيانات (ابدأ بإدخال بيانات لموظف)</td></tr>';
            idealContainer.style.display = 'none';
            if(compareBtn) compareBtn.style.display = 'none';
            return;
        }

        // Show Ideal Employee if exists
        const winner = ranking[0];
        if (winner.score > 0) {
            idealContainer.style.display = 'block';
            idealNameEl.textContent = winner.name;
            idealScoreEl.textContent = winner.score.toLocaleString();
        } else {
            idealContainer.style.display = 'none';
        }

        ranking.forEach((emp, index) => {
            const rank = index + 1;
            const tr = document.createElement('tr');
            
            // Rank Styles
            let rankClass = '';
            let rankIcon = `#${rank}`;
            if (rank === 1) { rankClass = 'rank-1'; rankIcon = '🥇'; }
            if (rank === 2) { rankClass = 'rank-2'; rankIcon = '🥈'; }
            if (rank === 3) { rankClass = 'rank-3'; rankIcon = '🥉'; }

            tr.innerHTML = `
                <td style="text-align:center;">
                    <input type="checkbox" class="compare-checkbox" value="${emp.name}" style="transform: scale(1.2); cursor:pointer;">
                </td>
                <td class="rank-cell ${rankClass}">${rankIcon}</td>
                <td style="cursor:pointer; color:#00d2ff; text-decoration:underline;" class="employee-name-link" data-name="${emp.name}">${emp.name}</td>
                <td style="text-align:center;" class="score-cell">${emp.score.toLocaleString()}</td>
            `;
            leaderboardBody.appendChild(tr);
        });

        // Add Click Listeners to Employee Names
        document.querySelectorAll('.employee-name-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                showEmployeeDetails(name);
            });
        });

        // Add Checkbox Listeners
        const checkboxes = document.querySelectorAll('.compare-checkbox');
        checkboxes.forEach(box => {
            box.addEventListener('change', () => {
                const checkedCount = document.querySelectorAll('.compare-checkbox:checked').length;
                if (checkedCount >= 2) {
                    compareBtn.style.display = 'inline-flex';
                } else {
                    compareBtn.style.display = 'none';
                }
            });
        });
    }

    if(compareBtn) {
        compareBtn.addEventListener('click', () => {
            const selectedEmployees = Array.from(document.querySelectorAll('.compare-checkbox:checked')).map(cb => cb.value);
            renderComparisonTable(selectedEmployees);
            compareModal.style.display = 'flex';
        });
    }

    if(closeCompareModalBtn) {
        closeCompareModalBtn.addEventListener('click', () => {
            compareModal.style.display = 'none';
        });
    }

    function renderComparisonTable(employeeNames) {
        
        // Helper to extract metric data
        const getMetricData = (metricId, empData) => {
            let numeric = 0;
            let display = '-';
            
            // 1. Calculate Aggregates first if needed
            let technicalScore = 0;
            let totalAccuracy = 0;
            let totalError = 0;
            let countItems = 0;
            
            // Standard loop to calc tech score & averages
            CAT_KEYS.forEach(key => {
                if (key === 'excellence') return; // Exclude from tech calc loop, handled separately

                const weight = REPORT_WEIGHTS[key] || 0;
                const catData = empData[key] || {};
                const d = parseInt(catData.done) || 0;
                const s = parseInt(catData.sent) || 0;
                let a = parseInt(catData.acc); 
                if(isNaN(a)) a = 100;
                let e = parseInt(catData.error) || 0;

                let itemBase = 0;
                if (key === 'suspicious') itemBase = (d + (s * 10)) * weight;
                else if (key === 'kpi3DaysBalance' || key === 'profitSummary') itemBase = (d + (s * 5)) * weight;
                else if (key === 'dealsProfit') itemBase = ((d / 2) + (s * 5)) * weight;
                else itemBase = (d + s) * weight;

                const netFactor = (a - e) / 100;
                technicalScore += itemBase * netFactor;
                
                if (catData.done || catData.sent) {
                    totalAccuracy += a;
                    totalError += e;
                    countItems++;
                }
            });

            const shiftS = parseInt(empData.shiftManagerScore) || 100;
            const deptS = parseInt(empData.deptManagerScore) || 100;
            const avgMgmt = (shiftS + deptS) / 2;

            let excVal = 0;
            if (empData['excellence']) {
                excVal = parseInt(empData['excellence'].done) || 0; 
            }
            const excBonus = excVal * 0.02;

            // Route by Metric ID
            if (metricId === 'total') {
                const final = (technicalScore * (avgMgmt/100)) * (1 + excBonus);
                numeric = Math.round(final);
                display = numeric.toLocaleString();
            } else if (metricId === 'technical') {
                numeric = Math.round(technicalScore);
                display = numeric.toLocaleString();
            } else if (metricId === 'management') {
                numeric = avgMgmt;
                display = `${avgMgmt}%`;
            } else if (metricId === 'excellence') {
                numeric = excVal;
                display = `Level ${excVal} (+${Math.round(excBonus*100)}%)`;
            } else if (metricId === 'accuracy_avg') {
                numeric = countItems ? Math.round(totalAccuracy/countItems) : 0;
                display = countItems ? `${numeric}%` : '-';
            } else if (metricId === 'error_avg') {
                numeric = countItems ? Math.round(totalError/countItems) : 0;
                display = countItems ? `${numeric}%` : '-';
            } else {
                // Specific Report
                const rData = empData[metricId] || {};
                const d = parseInt(rData.done) || 0;
                const s = parseInt(rData.sent) || 0;
                numeric = d + s; // Simple sum for bar visualization
                display = `${d} <span style="color:#666; font-size:0.8rem;">Done</span> / ${s} <span style="color:#666; font-size:0.8rem;">Sent</span>`;
            }
            
            return { numeric, display };
        };

        // Define Sections
        const reportKeys = CAT_KEYS.filter(k => k !== 'excellence');
        
        const sections = [
            {
                title: "📊 النتائج الرئيسية",
                background: "linear-gradient(90deg, rgba(0,210,255,0.15) 0%, rgba(0,0,0,0) 100%)",
                metrics: [
                    { id: 'total', label: 'التقييم النهائي' },
                    { id: 'technical', label: 'النقاط الفنية' },
                    { id: 'management', label: 'الرضا الإداري' },
                    { id: 'excellence', label: 'مستوى التميز' }
                ]
            },
            {
                title: "🎯 مؤشرات الجودة",
                background: "linear-gradient(90deg, rgba(255,159,243,0.15) 0%, rgba(0,0,0,0) 100%)",
                metrics: [
                    { id: 'accuracy_avg', label: 'متوسط الدقة' },
                    { id: 'error_avg', label: 'متوسط الأخطاء' }
                ]
            },
            {
                title: "📝 تفاصيل التقارير (العدد)",
                background: "linear-gradient(90deg, rgba(76,209,55,0.15) 0%, rgba(0,0,0,0) 100%)",
                metrics: reportKeys.map(k => {
                    // Try to map to Arabic labels if possible, or friendly ID
                    let label = k;
                    if(k === 'suspicious') label = 'Suspicious';
                    else if(k === 'depositPercentage') label = 'Deposit %';
                    else if(k === 'kpi3DaysBalance') label = '3 Days Balance';
                    else label = k.replace(/([A-Z])/g, ' $1').trim();
                    return { id: k, label: label };
                })
            }
        ];

        let tableHtml = `
        <table style="width:100%; border-collapse:separate; border-spacing:0; color:#fff; text-align:center;">
            <thead>
                <tr>
                    <th style="padding:20px 15px; border-bottom:2px solid #555; background:#1e272e; position:sticky; top:0; left:0; z-index:20; text-align:right; min-width:180px;">المعيار</th>
        `;

        employeeNames.forEach(name => {
            tableHtml += `<th style="padding:20px 10px; border-bottom:2px solid #555; background:#162447; min-width:150px; font-size:1.1rem; color:#00d2ff; position:sticky; top:0; z-index:10; border-left:1px solid rgba(255,255,255,0.05); text-shadow:0 2px 4px rgba(0,0,0,0.3);">${name}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;

        sections.forEach(section => {
            // Section Header
            tableHtml += `
                <tr>
                    <td colspan="${employeeNames.length + 1}" style="background:${section.background}; padding:12px 15px; text-align:right; font-weight:800; color:#fff; font-size:1rem; border-top:1px solid rgba(255,255,255,0.1); letter-spacing:1px;">
                        ${section.title}
                    </td>
                </tr>
            `;

            section.metrics.forEach(metric => {
                // Calculate values for this row across all employees
                const rowData = employeeNames.map(name => {
                    const empData = evaluationData[name] || {};
                    return getMetricData(metric.id, empData);
                });

                // Find highlighting baseline
                const numerics = rowData.map(d => d.numeric);
                const isError = metric.id === 'error_avg';
                let bestVal = isError ? Math.min(...numerics.filter(n=>n>=0)) : Math.max(...numerics);
                // If all zeros, ignore bestVal
                if (numerics.every(n => n === 0)) bestVal = -999;

                tableHtml += `<tr>
                    <td class="comp-metric-label" data-id="${metric.id}" style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.05); background:#1e272e; color:#a0a0b0; text-align:right; position:sticky; left:0; font-weight:500; cursor:pointer;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#a0a0b0'">
                        ${metric.label} <span style="font-size:0.8rem; margin-right:5px; opacity:0.5;">ℹ️</span>
                    </td>
                `;

                rowData.forEach(data => {
                    const isWinner = (data.numeric === bestVal) && bestVal !== -999;
                    
                    // Bar Calculation
                    // For metrics, bar is relative to max in row
                    const maxInRow = Math.max(...numerics);
                    let barPercent = 0;
                    if (maxInRow > 0) barPercent = (data.numeric / maxInRow) * 100;
                    if (isError) {
                        // For errors, maybe show bar relative to 100% or just proportional
                        barPercent = data.numeric; // % Error is 0-100
                    }

                    // Bar Color
                    let barColor = isWinner ? '#4cd137' : '#00d2ff';
                    if (isError) barColor = '#ff5e57';

                    let cellBg = isWinner ? 'background:rgba(76, 209, 55, 0.05);' : '';
                    let valColor = isWinner ? 'color:#4cd137; font-weight:800; font-size:1.1rem;' : 'color:#ddd;';

                    tableHtml += `
                        <td style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); border-left:1px solid rgba(255,255,255,0.05); position:relative; vertical-align:middle; ${cellBg}">
                            <!-- Bar -->
                            <div style="position:absolute; bottom:0; left:0; width:${barPercent}%; height:3px; background:${barColor}; opacity:0.7; transition:width 0.3s; box-shadow:0 0 5px ${barColor};"></div>
                            
                            <div style="${valColor} position:relative; z-index:2; display:flex; align-items:center; justify-content:center; gap:5px;">
                                ${isWinner ? '<span>🏆</span>' : ''}
                                <span>${data.display}</span>
                            </div>
                        </td>
                    `;
                });
                tableHtml += `</tr>`;
            });
        });

        tableHtml += `</tbody></table>`;
        compareContent.innerHTML = tableHtml;

        // Attach Click Listeners for Explanations
        compareContent.querySelectorAll('.comp-metric-label').forEach(el => {
            el.addEventListener('click', () => {
                const mid = el.getAttribute('data-id');
                showComparisonRule(mid);
            });
        });
    }

    function showComparisonRule(metricId) {
        // Reset Content
        if(ruleTitle) ruleTitle.textContent = "تفاصيل المعيار";
        if(ruleFormula) ruleFormula.textContent = "";
        if(ruleDesc) ruleDesc.innerHTML = "";
        
        // 1. Check for Aggregate Metrics
        if (metricId === 'total') {
            ruleTitle.textContent = "التقييم الكلي (Total Score)";
            ruleFormula.textContent = "(Technical × Management%) × (1 + Excellence)";
            ruleDesc.innerHTML = `
                <p>يتم احتساب التقييم النهائي بناءً على ثلاثة عوامل رئيسية:</p>
                <ul style="margin-right:20px; margin-top:10px;">
                    <li><b>النقاط الفنية (Technical):</b> تعتمد على عدد التقارير والدقة.</li>
                    <li><b>الرضا الإداري (Management):</b> نسبة مئوية تؤثر على النقاط الفنية.</li>
                    <li><b>علاوة التميز (Excellence):</b> بونص إضافي يضاف إلى المجموع النهائي.</li>
                </ul>
            `;
        } else if (metricId === 'technical') {
             ruleTitle.textContent = "النقاط الفنية (Technical Score)";
             ruleFormula.textContent = "Σ (Item Score × Accuracy%)";
             ruleDesc.innerHTML = `<p>مجموع نقاط كل التقارير والمهام المنجزة، بعد تطبيق معامل الدقة (Accuracy) وخصم الأخطاء (Errors) لكل مهمة.</p>`;
        } else if (metricId === 'management') {
             ruleTitle.textContent = "الرضا الإداري (Management Score)";
             ruleFormula.textContent = "Average (Shift Manager + Dept Manager)";
             ruleDesc.innerHTML = `<p>متوسط تقييم مدير الشفت وتقييم مدير القسم. هذه النسبة تؤثر بشكل مباشر على تحويل النقاط الفنية إلى نقاط نهائية.</p>`;
        } else if (metricId === 'excellence') {
             ruleTitle.textContent = "مستوى التميز (Excellence Level)";
             ruleFormula.textContent = "Level × 2%";
             ruleDesc.innerHTML = `
                <p>بونص إضافي يمنح للموظف بناءً على مستوى التميز:</p>
                <ul style="direction:ltr; text-align:left; margin-top:10px;">
                    <li>Level 1: +2%</li>
                    <li>Level 2: +4%</li>
                    <li>Level 3: +6%</li>
                    <li>Level 4: +8%</li>
                    <li style="color:#fbc531; font-weight:bold;">Level 5: +10%</li>
                </ul>
             `;
        } else if (metricId === 'accuracy_avg') {
             ruleTitle.textContent = "متوسط الدقة (Average Accuracy)";
             ruleDesc.innerHTML = `<p>المتوسط الحسابي لنسبة الدقة (Accuracy %) في جميع التقارير التي تم العمل عليها.</p>`;
        } else if (metricId === 'error_avg') {
             ruleTitle.textContent = "متوسط الأخطاء (Average Errors)";
             ruleDesc.innerHTML = `<p>المتوسط الحسابي لنسبة الخطأ (Error %) في جميع التقارير التي تم العمل عليها.</p>`;
        } 
        // 2. Check for Specific Reports
        else {
            const weight = REPORT_WEIGHTS[metricId] || 0;
            let displayTitle = metricId.replace(/([A-Z])/g, ' $1').trim();
            // Localize Title
            if (metricId === 'suspicious') displayTitle = 'Suspicious Accounts';
            if (metricId === 'kpi3DaysBalance') displayTitle = '3 Days Balance';
            if (metricId === 'profitSummary') displayTitle = 'Profit Summary';
            
            ruleTitle.textContent = `${displayTitle} (Weight: ${weight})`;

            // Different Logic based on ID
            if (metricId === 'suspicious') {
                ruleFormula.textContent = `(${weight} × (Done + (Sent × 10)))`;
                ruleDesc.innerHTML = `<p>في هذا التقرير، كل حساب مرسل (Sent) يعادل 10 أضعاف الحساب المنجز (Done).</p>`;
            } else if (metricId === 'kpi3DaysBalance' || metricId === 'profitSummary') {
                ruleFormula.textContent = `(${weight} × (Done + (Sent × 5)))`;
                ruleDesc.innerHTML = `<p>في هذا التقرير، كل حساب مرسل (Sent) يعادل 5 أضعاف الحساب المنجز (Done).</p>`;
            } else if (metricId === 'dealsProfit') {
                ruleFormula.textContent = `(${weight} × ((Done ÷ 2) + (Sent × 5)))`;
                ruleDesc.innerHTML = `<p>قاعدة خاصة: الحسابات المنجزة تقسم على 2، والحسابات المرسلة تضرب في 5.</p>`;
            } else if (metricId === 'marketWarnings') {
                 ruleFormula.textContent = `Rank Selection (1-5)`;
                 ruleDesc.innerHTML = `<p>تقييم تقديري يعتمد على الاختيار المباشر للمستوى.</p>`;
            } else {
                 ruleFormula.textContent = `(${weight} × (Done + Sent))`;
                 ruleDesc.innerHTML = `<p>القاعدة القياسية: يتم جمع المنجز والمرسل ويضرب في الوزن.</p>`;
            }
            
             ruleDesc.innerHTML += `
                <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                    <p><strong style="color:#00d2ff;">تأثير الدقة (Accuracy):</strong></p>
                    <p>النتيجة النهائية لهذا التقرير تضرب في نسبة الدقة الخاصة به.</p>
                </div>`;
        }

        // Show Modal
        if(ruleModal) ruleModal.style.display = 'flex';
    }

    function showEmployeeDetails(name) {
        const empData = evaluationData[name];
        if (!empData) return;

        modalHeaderName.textContent = name;
        modalDetailsBody.innerHTML = '';
        
        // Calculate Totals
        let totalScore = calculateTotalScore(empData);
        let totalDone = 0;
        let totalSent = 0;
        
        let shiftScoreVal = (empData.shiftManagerScore !== undefined) ? empData.shiftManagerScore : 100;
        if (shiftScoreVal === null || shiftScoreVal === "") shiftScoreVal = 100;

        CAT_KEYS.forEach(key => {
            const d = empData[key] || {done:0, sent:0};
            totalDone += d.done || 0;
            totalSent += d.sent || 0;
        });

        // 1. Summary Cards (Floating on top of body)
        // Image Layout Order: Sent (Yellow) | Done (Green) | Score (Blue)
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 25px;';
        
        statsContainer.innerHTML = `
            <div style="background:#1e272e; padding:12px 5px; border-radius:12px; text-align:center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="font-size:1.6rem; color:#fbc531; font-weight:800; line-height:1; margin-bottom:4px;">${totalSent.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#ccc; font-weight:500;">Total Sent</div>
            </div>
            <div style="background:#1e272e; padding:12px 5px; border-radius:12px; text-align:center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="font-size:1.6rem; color:#4cd137; font-weight:800; line-height:1; margin-bottom:4px;">${totalDone.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#ccc; font-weight:500;">Total Done</div>
            </div>
             <div style="background:#1e272e; padding:12px 5px; border-radius:12px; text-align:center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255, 159, 243, 0.3);">
                <div style="font-size:1.6rem; color:#ff9ff3; font-weight:800; line-height:1; margin-bottom:4px;">%${shiftScoreVal}</div>
                <div style="font-size:0.8rem; color:#ccc; font-weight:500;">Shift Eval</div>
            </div>
            <div style="background:#1e272e; padding:12px 5px; border-radius:12px; text-align:center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="font-size:1.6rem; color:#00d2ff; font-weight:800; line-height:1; margin-bottom:4px;">${totalScore.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#ccc; font-weight:500;">Final Score</div>
            </div>
        `;
        modalDetailsBody.appendChild(statsContainer);

        // 2. Section Title
        const detailsTitle = document.createElement('div');
        detailsTitle.innerHTML = `<span style="border-bottom: 2px solid #00d2ff; padding-bottom: 5px; font-weight:bold; color:#fff;">تفاصيل التقارير</span>`;
        detailsTitle.style.marginBottom = '20px';
        detailsTitle.style.textAlign = 'center';
        modalDetailsBody.appendChild(detailsTitle);

        // 3. Reports List
        const listContainer = document.createElement('div');
        listContainer.style.cssText = "display:flex; flex-direction:column; gap:12px; max-height:400px; overflow-y:auto; padding-right:5px;";

        CAT_KEYS.forEach(key => {
             const catData = empData[key] || {done:0, sent:0};
             if (catData.done === 0 && catData.sent === 0) return; // Skip empty rows

             const weight = REPORT_WEIGHTS[key];
             
             // Calculate local score
             let itemScore = 0;
             let doneScore = 0;
             let sentScore = 0;

             if (key === 'suspicious') {
                 doneScore = catData.done * weight;
                 sentScore = (catData.sent * 10) * weight;
             } else if (key === 'kpi3DaysBalance' || key === 'profitSummary') { // New Rule: 1 Sent = 5 Done
                 doneScore = catData.done * weight;
                 sentScore = (catData.sent * 5) * weight;
             } else if (key === 'dealsProfit') { // New Rule: Done/2, Sent*5
                 doneScore = (catData.done / 2) * weight;
                 sentScore = (catData.sent * 5) * weight;
             } else {
                 doneScore = catData.done * weight;
                 sentScore = catData.sent * weight;
             }
             const rawScore = doneScore + sentScore;
             
             // Apply Accuracy
             const acc = (catData.acc !== undefined) ? catData.acc : 100;
             itemScore = rawScore * (acc / 100);

             // Friendly Name
             let displayName = key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
             
             // Custom Overrides
             if (key === 'kpi3DaysBalance') displayName = '3 Days Balance';
             if (key === 'floatingProfit') displayName = "Accounts' Floating";
             if (key === 'profitOver0') displayName = "Accounts' Profit over 0";

             let rightDetailsHtml = `
                <span style="color:#0088cc;">Done: <b style="color:#fff;">${catData.done}</b></span>
                <span style="color:#555; margin:0 6px;">|</span>
                <span style="color:#fbc531;">Sent: <b style="color:#fff;">${catData.sent}</b></span>
             `;

             if (key === 'marketWarnings') {
                 const ratings = {1: 'Low (1)', 2: 'Medium (2)', 3: 'Good (3)', 4: 'Very Good (4)', 5: 'Excellent (5)'};
                 const rVal = catData.done; // Using 'done' input for the dropdown value
                 // Just show the numeric value or text. User asked for "Single value".
                 // "Rate: 5"
                 rightDetailsHtml = `<span style="color:#fbc531;">Rate: <b style="color:#fff;">${rVal}/5</b></span>`;
             }

             // Calculation Explanation Removed by User Request
             const item = document.createElement('div');
             // Box styling: Dark bg, rounded corners, subtle border
             item.style.cssText = `
                background: #151521; 
                border-radius: 12px; 
                border: 1px solid rgba(255,255,255,0.08);
                position: relative;
                overflow: hidden;
                transition: background 0.2s;
                /* Allow height to grow if needed */
                min-height: 100px;
                display: flex;
                align-items: stretch; 
             `;
             
             // The yellow accent bar on the left
             const accentBar = `<div style="width: 5px; background: #fbc531; flex-shrink: 0;"></div>`;

             item.innerHTML = `
                ${accentBar}
                
                <div class="report-header" style="flex-grow: 1; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    
                    <!-- LEFT: Score Area (Points & Breakdown) -->
                    <div style="display:flex; flex-direction:column; align-items:flex-start; min-width: 35%; margin-left: 10px;">
                        <div style="font-weight:800; color:#fff; font-size:1.9rem; line-height:1;">${Math.round(itemScore).toLocaleString()}</div>
                        <div style="font-size:0.8rem; color:#a0a0b0; margin: 4px 0 8px 0;">points <span style="color:#00d2ff; font-weight:bold;">(${acc}%)</span></div>
                        
                        <div style="font-size:0.8rem; font-family: 'Consolas', monospace; white-space:nowrap; background: rgba(255,255,255,0.05); padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
                            <span style="color:#4cd137;">D: ${doneScore.toLocaleString()}</span>
                            <span style="color:#666; margin:0 3px;">+</span>
                            <span style="color:#fbc531;">S: ${sentScore.toLocaleString()}</span>
                        </div>
                    </div>

                    <!-- RIGHT: Details Area (Title & Raw Stats) -->
                    <div style="display:flex; flex-direction:column; justify-content:center; align-items:flex-end; max-width: 60%; text-align: right;">
                         <div style="display:flex; align-items:center; gap:8px; margin-bottom: 8px; flex-wrap: wrap; justify-content: flex-end;">
                            <span style="font-weight:bold; color:#fff; font-size:1.1rem; line-height: 1.2;">${displayName}</span>
                            <div style="background:rgba(0, 210, 255, 0.1); color:#00d2ff; padding:3px 8px; border-radius:6px; font-weight:800; font-size:0.85rem; white-space:nowrap;">${weight}x</div>
                        </div>
                        <div style="font-size:0.9rem; opacity:0.9; white-space: nowrap;">
                            ${rightDetailsHtml}
                        </div>
                    </div>

                </div>
             `;
             listContainer.appendChild(item);
        });
        
        if (listContainer.children.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#808e9b; background:#1a1a2e; border-radius:10px; border:1px dashed #333;">لا توجد تقارير مسجلة لهذا الموظف</div>`;
        }

        modalDetailsBody.appendChild(listContainer);
        
        detailsModal.style.display = 'flex';
    }

    // -------------------------------------------------------------------------
    // RULE POPUP LOGIC
    // -------------------------------------------------------------------------
    const ruleModal = document.getElementById('rule-modal');
    const ruleTitle = document.getElementById('rule-title');
    const ruleFormula = document.getElementById('rule-formula');
    const ruleDesc = document.getElementById('rule-desc');
    const closeRuleBtn = document.getElementById('close-rule-modal-btn');

    // Close modal when clicking "Okay" button
    if (closeRuleBtn) {
        closeRuleBtn.addEventListener('click', () => {
            ruleModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === ruleModal) {
            ruleModal.style.display = 'none';
        }
    });

    document.querySelectorAll('.grid-row-label').forEach(label => {
        label.addEventListener('click', () => {
             // Find associated weight
             const weightBadge = label.querySelector('.weight-badge');
             const weight = weightBadge ? weightBadge.textContent : '0';
             
             // Infer report name (Text node usually)
             // Retrieve text content but exclude the badge text
             let reportName = label.innerText.replace(weight, '').trim();
             
             // Infer type from input ID (next sibling div -> input)
             const nextDiv = label.nextElementSibling;
             let isSuspicious = false;
             let is3Days = false;
             let isProfitSummary = false;
             let isDealsProfit = false;

             if (nextDiv) {
                 const inp = nextDiv.querySelector('input');
                 if (inp) {
                     const id = inp.id.toLowerCase();
                     if (id.includes('suspicious')) isSuspicious = true;
                     if (id.includes('3days')) is3Days = true;
                     if (id.includes('profit-sum')) isProfitSummary = true;
                     if (id.includes('deals-profit')) isDealsProfit = true;
                 }
             }

             // Populate Modal
             ruleTitle.textContent = reportName;
             
             if (isSuspicious) {
                 ruleFormula.textContent = `(${weight} × (Done + (Sent × 10)))`;
                 ruleDesc.innerHTML = `
                    <p style="margin-bottom:10px;"><strong style="color:#fbc531;">نوع خاص (Suspicious):</strong></p>
                    <p>يتم تعظيم قيمة التقارير المرسلة (Sent) بضربها في <b>10</b>.</p>
                    <p>تُضاف النتيجة للتقارير المنجزة (Done)، ويُضرب الإجمالي في وزن التقرير (<b>${weight}</b>).</p>
                 `;
             } else if (is3Days || isProfitSummary) {
                 ruleFormula.textContent = `(${weight} × (Done + (Sent × 5)))`;
                 ruleDesc.innerHTML = `
                    <p style="margin-bottom:10px;"><strong style="color:#ff9ff3;">نوع خاص (${reportName}):</strong></p>
                    <p>يتم تعظيم قيمة التقارير المرسلة (Sent) بضربها في <b>5</b>.</p>
                    <p>تُضاف النتيجة للتقارير المنجزة (Done)، ويُضرب الإجمالي في وزن التقرير (<b>${weight}</b>).</p>
                 `;
             } else if (isDealsProfit) {
                 ruleFormula.textContent = `(${weight} × ((Done ÷ 2) + (Sent × 5)))`;
                 ruleDesc.innerHTML = `
                    <p style="margin-bottom:10px;"><strong style="color:#00d2ff;">نوع خاص (${reportName}):</strong></p>
                    <p>يتم تقسيم عدد التقارير المنجزة (Done) على <b>2</b>.</p>
                    <p>يتم ضرب عدد التقارير المرسلة (Sent) في <b>5</b>.</p>
                    <p>يُضرب المجموع الكلي في وزن التقرير (<b>${weight}</b>).</p>
                 `;
             } else {
                 ruleFormula.textContent = `(${weight} × (Done + Sent))`;
                 ruleDesc.innerHTML = `
                    <p style="margin-bottom:10px;"><strong style="color:#4cd137;">القاعدة القياسية:</strong></p>
                    <p>يتم جمع عدد التقارير المنجزة (Done) والمرسلة (Sent) معاً.</p>
                    <p>يُضرب المجموع الكلي في وزن التقرير (<b>${weight}</b>) لاحتساب النقاط.</p>
                 `;
             }

             // Add Accuracy Note
             ruleDesc.innerHTML += `
                <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                    <p><strong style="color:#00d2ff;">تأثير الدقة (Accuracy %):</strong></p>
                    <p>يتم ضرب النقاط النهائية لهذه الفئة في نسبة الدقة.</p>
                    <p style="font-size:0.9rem; color:#aaa;">مثال: دقة 90% تعني الحصول على 90% فقط من النقاط المستحقة.</p>
                </div>
             `;

             ruleModal.style.display = 'flex';
        });
    });

    // Accuracy Header Info
    const accHeader = document.getElementById('acc-header');
    if (accHeader) {
        accHeader.addEventListener('click', () => {
             ruleTitle.textContent = 'نظام الدقة (% Accuracy)';
             ruleFormula.textContent = 'النقاط المستحقة × (الدقة ÷ 100)';
             ruleDesc.innerHTML = `
                <p style="margin-bottom:10px;"><strong style="color:#00d2ff;">كيف تؤثر الدقة على التقييم؟</strong></p>
                <p>تعتبر الدقة عاملاً حاسماً في جودة العمل، وتؤثر مباشراً على النقاط المحتسبة:</p>
                <ul style="padding-right:20px; line-height:1.6;">
                    <li><b>100%</b>: يحصل الموظف على النقاط كاملة.</li>
                    <li><b>أقل من 100%</b>: يتم خصم نسبة من النقاط تعادل نسبة الخطأ.</li>
                    <li><b>مثال عملي</b>: إذا استحق الموظف 1000 نقطة في تقرير معين، وكانت دقته 80%، فإنه سيحصل فقط على <b>800 نقطة</b>.</li>
                </ul>
                <p style="color:#fbc531; font-size:0.9rem;">يتم تطبيق هذا المعيار على جميع التقارير لضمان الجودة وليس الكمية فقط.</p>
             `;
             ruleModal.style.display = 'flex';
        });
    }

    // Error Header Info
    const errorHeader = document.getElementById('error-header');
    if (errorHeader) {
        errorHeader.addEventListener('click', () => {
             ruleTitle.textContent = 'نظام الأخطاء (% Error)';
             ruleFormula.textContent = 'Net Accuracy = Accuracy - Error';
             ruleDesc.innerHTML = `
                <p style="margin-bottom:10px;"><strong style="color:#ff5e57;">ما هو تأثير نسبة الخطأ؟</strong></p>
                <p>نسبة الخطأ تؤثر بشكل سلبي مباشر على النتيجة، حيث يتم طرحها من نسبة الدقة.</p>
                <ul style="padding-right:20px; line-height:1.6;">
                    <li><b>المعادلة:</b> يتم احتساب الدقة الصافية بطرح نسبة الخطأ من نسبة الدقة المدخلة.</li>
                    <li><b style="color:#ff5e57;">مثال:</b> دقة <b>100%</b> مع خطأ <b>5%</b> = دقة صافية <b>95%</b>.</li>
                    <li>تُضرب النقاط المستحقة في الدقة الصافية.</li>
                </ul>
                <p style="font-size:0.9rem; color:#aaa;">الهدف هو تقليل الأخطاء للحفاظ على كامل النقاط المكتسبة.</p>
             `;
             ruleModal.style.display = 'flex';
        });
    }

    // Shift Manager Score Info
    if (shiftEvalDisplay) {
        shiftEvalDisplay.addEventListener('click', (e) => {
             if (e.target === editShiftScoreBtn) return; // Allow clicking edit button
             
             ruleTitle.textContent = 'تقييم مسؤول الشيفت';
             ruleFormula.textContent = 'النقاط الكلية × (التقييم ÷ 100)';
             ruleDesc.innerHTML = `
                <p style="margin-bottom:10px;"><strong style="color:#ff9ff3;">تأثير تقييم المسؤول:</strong></p>
                <p>يعد تقييم مسؤول الشيفت <b>عاملاً مضاعفاً (Multiplier)</b> للنتيجة النهائية للموظف.</p>
                <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin:10px 0;">
                    <p style="margin:5px 0;"><b>المعادلة:</b></p>
                    <p style="color:#ff9ff3; direction:rtl; text-align:center;">النقاط النهائية = مجموع نقاط التقارير × (تقييم مسؤول الشيفت ÷ 100)</p>
                </div>
                <p style="color:#aaa; font-size:0.9rem;">
                    مثال: إذا جمع الموظف <b>1000 نقطة</b> من التقارير، وكان تقييم مسؤول الشيفت <b>90%</b>، فإن نقاطه النهائية تصبح <b>900 نقطة</b> فقط.
                </p>
             `;
             ruleModal.style.display = 'flex';
        });
    }
});
