# خطة تقسيم ملف sidepanel.js

## الحالة الحالية
- الملف الحالي: 6,073 سطر
- غير منظم ويصعب صيانته

## خطة التقسيم المقترحة (7 ملفات)

### 1. sidepanel-core.js (تم إنشاؤه ✓)
**الحجم المتوقع:** ~400 سطر
**المحتوى:**
- جميع متغيرات DOM
- نظام Toast للإشعارات
- خرائط الترجمة العربية
- وظائف مساعدة أساسية

### 2. sidepanel-modals.js
**الحجم المتوقع:** ~800 سطر
**المحتوى:**
- Image Preview Modal (السطور 43-192)
- Note Edit Modal
- History Modal
- IP Details Modal
- Delete Confirm Modal
- Suspicious Report Modal

**المحتوى المطلوب:**
```javascript
// Image Preview Modal
function setupImageClickPreviewModal() { ... }

// Note Edit Modal
function openNoteEditModal({ kind, value, note }) { ... }
function closeNoteEditModal(result) { ... }

// Field Completion Indicator
function applyFieldCompletionState(el) { ... }
function setupFieldCompletionIndicators() { ... }
```

### 3. sidepanel-tabs.js
**الحجم المتوقع:** ~600 سطر
**المحتوى:**
- Tab Switching Logic (السطور 744-945)
- Tag Filter System
- Search Functionality
- Header Auto-Hide

**المحتوى المطلوب:**
```javascript
function switchTab(tabName) { ... }

// Tab Event Listeners
accountsTab.addEventListener('click', () => switchTab('accounts'));
ipsTab.addEventListener('click', () => switchTab('ips'));
criticalTab.addEventListener('click', () => switchTab('critical'));
// ... etc

// Tag Filter Buttons
document.querySelectorAll('.tag-filter-btn').forEach(btn => { ... });

// Search Bar Logic
searchBar.addEventListener('input', () => { ... });

// Header Auto-Hide on Scroll
function handleScroll() { ... }
```

### 4. sidepanel-watchlist.js
**الحجم المتوقع:** ~900 سطر
**المحتوى:**
- VIP/Critical Watchlist (السطور 946-1306)
- Default Critical IPs
- Custom IP Management
- Account Watchlist

**المحتوى المطلوب:**
```javascript
const DEFAULT_CRITICAL_IPS = ['166.88.54.203', '166.88.167.40', '77.76.9.250'];
const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';

function normalizeIPv4Value(raw) { ... }
function normalizeSevenDigitAccountValue(raw) { ... }
function loadCriticalWatchlist() { ... }
function saveCriticalWatchlist(nextState) { ... }
function renderCriticalWatchlist() { ... }
function addCriticalIpFromInput() { ... }
function addCriticalAccountFromInput() { ... }
```

### 5. sidepanel-rendering.js
**الحجم المتوقع:** ~1,200 سطر  
**المحتوى:**
- renderAccounts() (السطور 1354-1702)
- renderIPs() (السطور 1703-2247)
- renderWallets()
- Data Loading Functions

**المحتوى المطلوب:**
```javascript
async function loadAccounts() { ... }
async function loadIPs() { ... }
function loadAllData() { ... }
function renderAll() { ... }
function renderAccounts(filter = searchBar.value) { ... }
function renderIPs(filter = searchBar.value) { ... }
async function loadWallets() { ... }
function renderWallets(filter = searchBar.value) { ... }
```

### 6. sidepanel-reports.js
**الحجم المتوقع:** ~1,600 سطر
**المحتوى:**
- Profit Calculator (السطور 2248-2676)
- Transfer Report (السطور 2740-3107 + 3231-3499)
- Deposit Percentage Report (السطور 4070-4623)
- Withdrawal Report (السطور 4627-5250)
- Credit Out Report (السطور 5600-6073)

**المحتوى المطلوب:**
```javascript
// Profit Calculator
function parseTradesText(text) { ... }
function detectSuspiciousPatterns(trades) { ... }
function showSuspiciousReport(patterns) { ... }
function displayProfitResults(trades) { ... }
function renderProfitView(trades) { ... }

// Transfer Report
async function fetchIpInfo(ip) { ... }
function autoDetectShift() { ... }
function setShift(shiftValue) { ... }

// Deposit Percentage Report
async function fetchDepositIpInfo(ip) { ... }
function setDepositShift(shiftValue) { ... }
function renderDepositImagePreviews() { ... }

// Withdrawal Report
async function checkWithdrawalDuplicate(wallet) { ... }
async function saveWithdrawalToHistory(wallet) { ... }
function handleWithdrawalFiles(files) { ... }
function renderWithdrawalPreviews() { ... }

// Credit Out Report (IIFE)
(function() {
  // Credit Out Logic
  function creditOutAutoDetectShift() { ... }
  function renderCreditOutImagePreviews() { ... }
  function generateCreditOutReportTextAsync() { ... }
})();
```

### 7. sidepanel-integrations.js
**الحجم المتوقع:** ~1,300 سطر
**المحتوى:**
- Google Form Integration (السطور 3500-4069)
- Telegram Integration
- Settings Management
- Custom Dropdown Logic
- Persistence (Storage)

**المحتوى المطلوب:**
```javascript
// Google Form Integration
const DEFAULT_GF_URL = 'https://script.google.com/macros/...';
function loadGoogleFormSettings() { ... }

// User Settings (Employee Name)
function lockEmployeeNameUI(employeeName) { ... }
function unlockEmployeeNameUI() { ... }
function loadUserSettings() { ... }

// Telegram Integration
const DEFAULT_TELEGRAM_TOKEN = '...';
const DEFAULT_TELEGRAM_CHAT_ID = '...';

// Saved Notes Modal
let savedNotes = [];
async function loadSavedNotes() { ... }
function renderSavedNotes() { ... }
function saveNotesToStorage() { ... }

// Image Upload Logic
let selectedImages = [];
function isDuplicateFile(newFile, currentList) { ... }
function renderImagePreviews() { ... }

// Custom Dropdown Logic
function convertToCustomSelect(selectId) { ... }
function restoreNativeSelect(selectId) { ... }

// Persistence & Storage
chrome.storage.sync.get([...], (data) => { ... });
chrome.storage.onChanged.addListener((changes, namespace) => { ... });

// Smart Auto-Scroll (Transfer Report)
function smartRevealInView(el) { ... }
function scheduleSmartReveal(el) { ... }

// Pause Tracking Logic
function applyPauseUI(isPaused) { ... }
```

## ترتيب التحميل في sidepanel.html

يجب تحميل الملفات بهذا الترتيب في `<body>` قبل نهاية `</body>`:

```html
  <!-- Core: Variables, Toast, Translations -->
  <script src="sidepanel-core.js"></script>
  
  <!-- Modals: All Modal Windows -->
  <script src="sidepanel-modals.js"></script>
  
  <!-- Tabs: Navigation & Filters -->
  <script src="sidepanel-tabs.js"></script>
  
  <!-- Watchlist: VIP/Critical Management -->
  <script src="sidepanel-watchlist.js"></script>
  
  <!-- Rendering: Display Logic -->
  <script src="sidepanel-rendering.js"></script>
  
  <!-- Reports: All Report Systems -->
  <script src="sidepanel-reports.js"></script>
  
  <!-- Integrations: External APIs & Persistence -->
  <script src="sidepanel-integrations.js"></script>
</body>
```

## ملاحظات مهمة

### المتغيرات المشتركة
جميع المتغيرات التالية يجب أن تبقى في `sidepanel-core.js` لأنها مستخدمة في أكثر من ملف:
- `allAccounts`, `allIPs`, `allWallets`
- `activeTab`, `filterState`, `currentTagFilter`
- `tooltipsEnabled`, `timestampFormat`
- جميع عناصر DOM
- دوال `showToast()`, `translateValue()`, `formatTimestamp()`

### تجنب الأخطاء
1. لا تنسخ أي متغير مشترك في أكثر من ملف
2. تأكد من ترتيب التحميل الصحيح
3. جميع الدوال يجب أن تكون عامة (global) لتعمل عبر الملفات
4. لا تستخدم `import/export` لأنها Chrome Extension بدون bundler

### الاختبار
بعد التقسيم، تأكد من:
1. جميع التبويبات تعمل
2. جميع التقارير تعمل
3. جميع النوافذ المنبثقة تعمل
4. الحفظ والتحميل يعمل
5. لا توجد أخطاء في Console

## الفوائد المتوقعة
✅ سهولة الصيانة
✅ إيجاد الأكواد بسرعة
✅ تقليل الأخطاء
✅ عمل جماعي أسهل
✅ إضافة ميزات جديدة أسرع

## الخطوات التالية
1. إنشاء الملفات الستة المتبقية
2. نسخ الكود المناسب لكل ملف
3. حذف الكود المنسوخ من `sidepanel.js` الأصلي
4. تحديث `sidepanel.html`
5. اختبار شامل

---
**ملاحظة:** تم إنشاء `sidepanel-core.js` بالفعل ويحتوي على:
- جميع متغيرات DOM
- نظام Toast
- خرائط الترجمة العربية
- الدوال المساعدة
