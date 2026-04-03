// --- Dark Mode & Settings ---
function applyDarkMode(isDarkMode) {
  document.body.classList.toggle('dark-mode', isDarkMode);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (timestampFormat === 'hide') return '';
  return date.toLocaleString(); // Simplified for now
}

chrome.storage.sync.get(['darkMode', 'maxAccounts', 'timestampFormat', 'filters', 'tooltipsEnabled'], (data) => {
  applyDarkMode(data.darkMode !== false);
  maxAccounts = data.maxAccounts || 50;
  timestampFormat = data.timestampFormat || 'locale';
  // Load persisted filters (accounts & ips)
  if (data.filters) {
    filterState.accounts = data.filters.accounts || filterState.accounts;
    filterState.ips = data.filters.ips || filterState.ips;
  }
  tooltipsEnabled = data.tooltipsEnabled !== false; // default true
  loadAllData();
  loadCriticalWatchlist();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.darkMode) applyDarkMode(changes.darkMode.newValue);
    if (changes.maxAccounts) maxAccounts = changes.maxAccounts.newValue;
    if (changes.timestampFormat) timestampFormat = changes.timestampFormat.newValue;
    if (changes.filters) {
      const newFilters = changes.filters.newValue;
      if (newFilters.accounts) filterState.accounts = newFilters.accounts;
      if (newFilters.ips) filterState.ips = newFilters.ips;
    }
    if (changes.tooltipsEnabled) tooltipsEnabled = changes.tooltipsEnabled.newValue !== false;
    if (changes[CRITICAL_WATCHLIST_STORAGE_KEY]) loadCriticalWatchlist();
    renderAll();
  }
  if (namespace === 'local') {
    if (changes.copiedAccounts) loadAccounts();
    if (changes.copiedIPs) loadIPs();
    if (changes.copiedCards) loadCards();
  }
});

// --- Data Loading ---
async function loadAccounts() {
  const data = await chrome.storage.local.get('copiedAccounts');
  allAccounts = data.copiedAccounts || [];
  renderAccounts();
}

async function loadIPs() {
  const data = await chrome.storage.local.get('copiedIPs');
  allIPs = data.copiedIPs || [];
  renderIPs();
}

function loadAllData() {
  loadAccounts();
  loadIPs();
}

// --- Rendering ---
function renderAll() {
  renderAccounts();
  renderIPs();
}

function renderAccounts(filter = searchBar.value) {
  if (activeTab !== 'accounts') return;
  accountList.innerHTML = '';

  // Create a map to hold unique accounts and their most recent entry
  const uniqueAccountsMap = new Map();
  allAccounts.forEach(item => {
      if (!uniqueAccountsMap.has(item.account) || item.timestamp > uniqueAccountsMap.get(item.account).timestamp) {
          uniqueAccountsMap.set(item.account, item);
      }
  });

  let uniqueAccounts = Array.from(uniqueAccountsMap.values());
  
  // Sort: pinned items first, then by most recent timestamp
  uniqueAccounts.sort((a, b) => {
    // Pinned items come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // If both pinned or both not pinned, sort by timestamp
    return b.timestamp - a.timestamp;
  });

  // Apply text filter
  let filtered = uniqueAccounts.filter(item => item.account.toLowerCase().includes(filter.toLowerCase()));

  // Apply status filter (from sync storage state)
  const st = filterState.accounts.status;
  if (st === 'pinned') filtered = filtered.filter(i => i.isPinned);
  if (st === 'duplicate') filtered = filtered.filter(i => allAccounts.filter(a => a.account === i.account).length > 1);
  if (st === 'noted') filtered = filtered.filter(i => (i.notes || '').trim().length > 0);

  // Apply tag filter
  if (currentTagFilter !== 'all') {
    if (currentTagFilter === 'none') {
      filtered = filtered.filter(i => !i.tag || i.tag === 'none');
    } else {
      filtered = filtered.filter(i => i.tag === currentTagFilter);
    }
  }

  // Apply date filter (from sync storage state)
  const dt = filterState.accounts.date;
  const now = Date.now();
  const cutoffs = {
    'today': new Date(new Date().toDateString()).getTime(),
    '24h': now - 24*60*60*1000,
    '7d': now - 7*24*60*60*1000
  };
  if (dt !== 'all') {
    const cutoff = cutoffs[dt] ?? 0;
    filtered = filtered.filter(i => i.timestamp >= cutoff);
  }

  filtered.slice(0, maxAccounts).forEach(item => {
    const templateClone = accountItemTemplate.content.cloneNode(true);
    const listItem = templateClone.querySelector('li');
    const accountName = templateClone.querySelector('.account-name');
    const timestamp = templateClone.querySelector('.timestamp');
    const copyButton = templateClone.querySelector('.copy-button');
    const deleteButton = templateClone.querySelector('.delete-button');
    const notesContainer = templateClone.querySelector('.notes-container');
    const noteText = templateClone.querySelector('.note-text');
    const noteInput = templateClone.querySelector('.note-input');
    const addNoteButton = templateClone.querySelector('.add-note-button');
    const saveNoteButton = templateClone.querySelector('.save-note-button');
    const pinIcon = templateClone.querySelector('.pin-icon');
    const tagButton = templateClone.querySelector('.tag-button');
    const tagDropdown = templateClone.querySelector('.tag-dropdown');
    const tagBadge = templateClone.querySelector('.account-tag-badge');

    accountName.textContent = item.account;
    timestamp.textContent = formatTimestamp(item.timestamp);

    // Display tag badge if exists
    if (item.tag && item.tag !== 'none') {
      const tagConfig = {
        'suspicious': { text: '🔴 مشبوه', class: 'tag-suspicious' },
        'safe': { text: '🟢 آمن', class: 'tag-safe' },
        'under-review': { text: '🟡 قيد المراجعة', class: 'tag-under-review' },
        'flagged': { text: '🚩 محظور', class: 'tag-flagged' }
      };
      const config = tagConfig[item.tag];
      if (config) {
        listItem.classList.add('tagged-' + item.tag);
        if (tagBadge) {
          tagBadge.style.display = 'inline-flex';
          tagBadge.className = `account-tag-badge ${config.class}`;
          tagBadge.textContent = config.text;
        }
      }
    } else if (tagBadge) {
      tagBadge.style.display = 'none';
      tagBadge.textContent = '';
      tagBadge.className = 'account-tag-badge';
    }

    // Tooltips
    if (tooltipsEnabled) {
      pinIcon.setAttribute('title', 'تثبيت/إلغاء التثبيت');
      pinIcon.setAttribute('aria-label', 'تثبيت');
      accountName.setAttribute('title', 'عرض السجل');
      copyButton.setAttribute('title', 'نسخ');
      deleteButton.setAttribute('title', 'حذف');
      addNoteButton.setAttribute('title', 'إضافة/تعديل الملاحظة');
      saveNoteButton.setAttribute('title', 'حفظ الملاحظة');
    }

    // Handle pinned status
    if (item.isPinned) {
      listItem.classList.add('pinned');
      pinIcon.style.fill = '#f39c12';
      pinIcon.style.stroke = '#f39c12';
    } else {
      pinIcon.style.fill = 'none';
      pinIcon.style.stroke = 'currentColor';
    }

    // Pin icon click handler
    pinIcon.addEventListener('click', async () => {
      const newPinnedStatus = !item.isPinned;
      
      // Update all instances of this account
      allAccounts = allAccounts.map(acc => {
        if (acc.account === item.account) {
          return { ...acc, isPinned: newPinnedStatus };
        }
        return acc;
      });
      
      await chrome.storage.local.set({ copiedAccounts: allAccounts });
      renderAccounts(); // Re-render to update display
    });

    // Tag system handlers
    tagButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other dropdowns first
      document.querySelectorAll('.tag-dropdown').forEach(dropdown => {
        if (dropdown !== tagDropdown) {
          dropdown.style.display = 'none';
          const parentLi = dropdown.closest('li');
          if (parentLi) parentLi.classList.remove('active-dropdown-container');
        }
      });
      
      const isHidden = tagDropdown.style.display === 'none';
      tagDropdown.style.display = isHidden ? 'block' : 'none';
      
      if (isHidden) {
        listItem.classList.add('active-dropdown-container');
      } else {
        listItem.classList.remove('active-dropdown-container');
      }
    });

    const tagOptions = templateClone.querySelectorAll('.tag-option');
    tagOptions.forEach(option => {
      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        const selectedTag = option.getAttribute('data-tag');
        
        // Update all instances of this account with the new tag
        allAccounts = allAccounts.map(acc => {
          if (acc.account === item.account) {
            return { ...acc, tag: selectedTag };
          }
          return acc;
        });
        
        await chrome.storage.local.set({ copiedAccounts: allAccounts });
        tagDropdown.style.display = 'none';
        listItem.classList.remove('active-dropdown-container');
        renderAccounts();
      });
      
      // Prevent dropdown from closing when hovering over options
      option.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
      });
      
      option.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!tagButton.contains(e.target) && !tagDropdown.contains(e.target)) {
        tagDropdown.style.display = 'none';
        listItem.classList.remove('active-dropdown-container');
      }
    }, { capture: true });

    // Display existing note
    if (item.notes && item.notes.trim() !== '') {
      noteText.textContent = item.notes;
      noteText.style.display = 'block';
      addNoteButton.textContent = 'تعديل الملاحظة';
    } else {
      noteText.style.display = 'none';
      addNoteButton.textContent = 'إضافة ملاحظة';
    }

    // Check for duplicates
    const historyCount = allAccounts.filter(acc => acc.account === item.account).length;
    if (historyCount > 1) {
        listItem.classList.add('duplicate');
    }

    // History Modal click listener
    accountName.addEventListener('click', () => {
      historyContent.innerHTML = '';
      document.querySelector('#history-modal h2').innerHTML = `📋 سجل الحساب: <span style="color: #667eea;">${item.account}</span>`;
      const accountHistory = allAccounts.filter(acc => acc.account === item.account).sort((a,b) => b.timestamp - a.timestamp);
      const historyList = document.createElement('ul');
      historyList.style.listStyle = 'none';
      historyList.style.padding = '0';
      accountHistory.forEach((histItem, index) => {
        const historyItem = document.createElement('li');
        historyItem.style.padding = '12px 15px';
        historyItem.style.marginBottom = '8px';
        historyItem.style.background = index % 2 === 0 ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.1)';
        historyItem.style.borderRadius = '8px';
        historyItem.style.borderRight = '4px solid ' + (index % 2 === 0 ? '#667eea' : '#764ba2');
        historyItem.innerHTML = `<strong>${index + 1}.</strong> ${new Date(histItem.timestamp).toLocaleString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
        historyList.appendChild(historyItem);
      });
      historyContent.appendChild(historyList);
      modal.style.display = 'block';
    });

    // Copy Button
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(item.account);
        copyButton.textContent = 'تم النسخ!';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1000);
    });

    // Delete Button
    deleteButton.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف جميع سجلات الحساب ${item.account}؟`)) {
        allAccounts = allAccounts.filter(acc => acc.account !== item.account);
        await chrome.storage.local.set({ copiedAccounts: allAccounts });
      }
    });

    // Add/Edit Note Button
    addNoteButton.addEventListener('click', () => {
      noteText.style.display = 'none';
      noteInput.style.display = 'block';
      noteInput.value = item.notes || '';
      addNoteButton.style.display = 'none';
      saveNoteButton.style.display = 'inline-block';
      noteInput.focus();
    });

    // Save note function (reusable)
    const saveNote = async () => {
      const newNote = noteInput.value.trim();
      
      // Update all instances of this account with the new note
      allAccounts = allAccounts.map(acc => {
        if (acc.account === item.account) {
          return { ...acc, notes: newNote };
        }
        return acc;
      });
      
      await chrome.storage.local.set({ copiedAccounts: allAccounts });
      
      // Update UI
      item.notes = newNote;
      if (newNote !== '') {
        noteText.textContent = newNote;
        noteText.style.display = 'block';
        addNoteButton.textContent = 'تعديل الملاحظة';
      } else {
        noteText.style.display = 'none';
        addNoteButton.textContent = 'إضافة ملاحظة';
      }
      
      noteInput.style.display = 'none';
      saveNoteButton.style.display = 'none';
      addNoteButton.style.display = 'inline-block';
    };

    // Save Note Button
    saveNoteButton.addEventListener('click', saveNote);

    // Save note on Enter key
    noteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveNote();
      }
    });

    accountList.appendChild(templateClone);
  });
}

function renderIPs(filter = searchBar.value) {
  if (activeTab !== 'ips') return;
  ipList.innerHTML = '';

  // Create a map to hold unique IPs and their most recent entry to display in the list
  const uniqueIPsMap = new Map();
  allIPs.forEach(item => {
      // We want the most recent entry for each IP
      if (!uniqueIPsMap.has(item.ip) || item.timestamp > uniqueIPsMap.get(item.ip).timestamp) {
          uniqueIPsMap.set(item.ip, item);
      }
  });
  
  let uniqueIPs = Array.from(uniqueIPsMap.values());
  uniqueIPs.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent

  // Apply text filter
  let filtered = uniqueIPs.filter(item => item.ip.toLowerCase().includes(filter.toLowerCase()));

  // Apply status filter (only duplicate makes sense for IPs now)
  const st = filterState.ips.status;
  if (st === 'duplicate') filtered = filtered.filter(i => allIPs.filter(x => x.ip === i.ip).length > 1);

  // Apply date filter
  const dt = filterState.ips.date;
  const now = Date.now();
  const cutoffs = {
    'today': new Date(new Date().toDateString()).getTime(),
    '24h': now - 24*60*60*1000,
    '7d': now - 7*24*60*60*1000
  };
  if (dt !== 'all') {
    const cutoff = cutoffs[dt] ?? 0;
    filtered = filtered.filter(i => i.timestamp >= cutoff);
  }

  filtered.slice(0, maxAccounts).forEach(item => {
    const templateClone = ipItemTemplate.content.cloneNode(true);
    const listItem = templateClone.querySelector('li');
    const ipAddressSpan = templateClone.querySelector('.ip-address');
    const ipCountry = templateClone.querySelector('.ip-country');
    const ipRegion = templateClone.querySelector('.ip-region');
    const highlightBadge = templateClone.querySelector('.highlight-badge');
    const timestamp = templateClone.querySelector('.timestamp');
    const copyButton = templateClone.querySelector('.copy-button');
    const deleteButton = templateClone.querySelector('.delete-button');
    const infoButton = templateClone.querySelector('.info-button');

    ipAddressSpan.textContent = item.ip;
    ipCountry.textContent = item.country;
    
    // Show region if available
    if (item.region && item.region !== 'N/A') {
      ipRegion.textContent = `(${item.region})`;
      ipRegion.style.color = '#444';
      ipRegion.style.fontWeight = '500';
    }
    
    timestamp.textContent = formatTimestamp(item.timestamp);
    
    // Determine badge based on country/region
    const ht = item.highlightType || '';
    const lowerRegion = (item.region || '').toLowerCase();
    const lowerCity = (item.city || '').toLowerCase();
    const lowerCountry = (item.country || '').toLowerCase();
    
    // Check banned countries
    const isUK = ht === 'uk' || lowerCountry.includes('united kingdom') || lowerCountry === 'uk';
    const isNetherlands = ht === 'netherlands' || lowerCountry.includes('netherlands') || lowerCountry === 'nl';
    const isLithuania = ht === 'lithuania' || lowerCountry.includes('lithuania') || lowerCountry === 'lt';
    const isSingapore = ht === 'singapore' || lowerCountry.includes('singapore');
    const isFrance = ht === 'france' || lowerCountry.includes('france');
    const isGermany = ht === 'germany' || lowerCountry.includes('germany');
    const isCanada = ht === 'canada' || lowerCountry.includes('canada');
    const isUSA = ht === 'usa' || lowerCountry.includes('united states') || lowerCountry.includes('usa');
    const isTurkey = ht === 'turkey' || lowerCountry.includes('turkey') || lowerCountry.includes('türkiye');
    const isItaly = ht === 'italy' || lowerCountry.includes('italy') || lowerCountry.includes('italia');
    const isAustria = ht === 'austria' || lowerCountry.includes('austria');
    const isRomania = ht === 'romania' || lowerCountry.includes('romania');
    const isFinland = ht === 'finland' || lowerCountry.includes('finland');
    const isPortugal = ht === 'portugal' || lowerCountry.includes('portugal');
    const isSwitzerland = ht === 'switzerland' || lowerCountry.includes('switzerland') || lowerCountry.includes('suisse');
    const isPakistan = ht === 'pakistan' || lowerCountry.includes('pakistan');
    const isBelgium = ht === 'belgium' || lowerCountry.includes('belgium') || lowerCountry.includes('belgique');
    const isDjibouti = ht === 'djibouti' || lowerCountry.includes('djibouti');
    const isHungary = ht === 'hungary' || lowerCountry.includes('hungary');
    const isKenya = ht === 'kenya' || lowerCountry.includes('kenya');
    const isBulgaria = ht === 'bulgaria' || lowerCountry.includes('bulgaria');
    const isChina = ht === 'china' || lowerCountry.includes('china');
    const isSerbia = ht === 'serbia' || lowerCountry.includes('serbia');
    const isBannedCountry = isUK || isNetherlands || isLithuania || isSingapore || isFrance || isGermany || isCanada || isUSA || isTurkey || isItaly || isAustria || isRomania || isFinland || isPortugal || isSwitzerland || isPakistan || isBelgium || isDjibouti || isHungary || isKenya || isBulgaria || isChina || isSerbia;
    
    // Check if Iraqi highlighted regions with comprehensive patterns
    const isKirkuk = ht === 'kirkuk' || lowerRegion.includes('kirkuk') || lowerCity.includes('kirkuk') || lowerRegion.includes('كركوك') || lowerCity.includes('كركوك');
    const isSulaymaniyah = ht === 'sulaymaniyah' || lowerRegion.includes('sulay') || lowerCity.includes('sulay') || lowerRegion.includes('slemani') || lowerCity.includes('slemani') || lowerRegion.includes('sulaimani') || lowerCity.includes('sulaimani') || lowerRegion.includes('السلي') || lowerCity.includes('السلي') || lowerRegion.includes('السليماني') || lowerCity.includes('السليماني') || lowerRegion.includes('iraqi kurdistan') || lowerCity.includes('iraqi kurdistan');
    const isErbilRegion = ht === 'erbil' || lowerRegion.includes('erbil') || lowerCity.includes('erbil') || lowerRegion.includes('arbil') || lowerCity.includes('arbil') || lowerRegion.includes('أربيل') || lowerCity.includes('أربيل') || lowerRegion.includes('hewler') || lowerCity.includes('hewler');
    
    // Handle highlighted IPs with proper badge
    if (isBannedCountry || isKirkuk || isSulaymaniyah || isErbilRegion || item.isHighlighted || item.isErbil) {
      listItem.classList.add('erbil');
      highlightBadge.style.display = 'inline-block';
      
      // Check UK first
      if (isUK) {
        highlightBadge.textContent = '🇬🇧 UK';
        highlightBadge.title = '⚠️ هام جداً: لازم نبعت ال IP دة لمدير الشيفت';
        highlightBadge.style.background = '#1d4ed8';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('uk-highlight');
      }
      // Check Netherlands
      else if (isNetherlands) {
        highlightBadge.textContent = '🇱🇹 LT';
        highlightBadge.title = '⚠️ هام جداً: لازم نبعت ال IP دة لمدير الشيفت';
        highlightBadge.style.background = 'linear-gradient(135deg, #f97316, #2563eb)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('nl-highlight');
      }

      // Check Lithuania
      else if (isLithuania) {
        highlightBadge.textContent = '🇱🇹 LT';
        highlightBadge.title = '⚠️ هام جداً: لازم نبعت ال IP دة لمدير الشيفت';
        highlightBadge.style.background = 'linear-gradient(135deg, #f97316, #2563eb)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('nl-highlight');
      }
      // Check Singapore
      else if (isSingapore) {
        highlightBadge.textContent = '🇸🇬 SG';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - سنغافورة';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#000';
        listItem.classList.add('banned-highlight');
      }
      // Check France
      else if (isFrance) {
        highlightBadge.textContent = '🇫🇷 FR';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - فرنسا';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Germany
      else if (isGermany) {
        highlightBadge.textContent = '🇩🇪 DE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - ألمانيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Canada
      else if (isCanada) {
        highlightBadge.textContent = '🇨🇦 CA';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - كندا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check USA
      else if (isUSA) {
        highlightBadge.textContent = '🇺🇸 US';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - الولايات المتحدة';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Turkey
      else if (isTurkey) {
        highlightBadge.textContent = '🇹🇷 TR';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - تركيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Italy
      else if (isItaly) {
        highlightBadge.textContent = '🇮🇹 IT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - إيطاليا';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #fff, #dc2626)';
        highlightBadge.style.color = '#000';
        listItem.classList.add('banned-highlight');
      }
      // Check Austria
      else if (isAustria) {
        highlightBadge.textContent = '🇦🇹 AT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - النمسا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Romania
      else if (isRomania) {
        highlightBadge.textContent = '🇷🇴 RO';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - رومانيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #1e40af, #fbbf24, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Finland
      else if (isFinland) {
        highlightBadge.textContent = '🇫🇮 FI';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - فنلندا';
        highlightBadge.style.background = 'linear-gradient(135deg, #fff, #1e40af)';
        highlightBadge.style.color = '#1e40af';
        listItem.classList.add('banned-highlight');
      }
      // Check Portugal
      else if (isPortugal) {
        highlightBadge.textContent = '🇵🇹 PT';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - البرتغال';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Switzerland
      else if (isSwitzerland) {
        highlightBadge.textContent = '🇨🇭 CH';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - سويسرا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Pakistan
      else if (isPakistan) {
        highlightBadge.textContent = '🇵🇰 PK';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - باكستان';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #fff)';
        highlightBadge.style.color = '#22c55e';
        listItem.classList.add('banned-highlight');
      }
      // Check Belgium
      else if (isBelgium) {
        highlightBadge.textContent = '🇧🇪 BE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - بلجيكا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #fbbf24, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Djibouti
      else if (isDjibouti) {
        highlightBadge.textContent = '🇩🇯 DJ';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - جيبوتي';
        highlightBadge.style.background = 'linear-gradient(135deg, #22c55e, #1e40af, #dc2626)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Hungary
      else if (isHungary) {
        highlightBadge.textContent = '🇭🇺 HU';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - المجر';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fff, #22c55e)';
        highlightBadge.style.color = '#dc2626';
        listItem.classList.add('banned-highlight');
      }
      // Check Kenya
      else if (isKenya) {
        highlightBadge.textContent = '🇰🇪 KE';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - كينيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #000, #dc2626, #22c55e)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Bulgaria
      else if (isBulgaria) {
        highlightBadge.textContent = '🇧🇬 BG';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - بلغاريا';
        highlightBadge.style.background = 'linear-gradient(135deg, #fff, #22c55e, #dc2626)';
        highlightBadge.style.color = '#22c55e';
        listItem.classList.add('banned-highlight');
      }
      // Check China
      else if (isChina) {
        highlightBadge.textContent = '🇨🇳 CN';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - الصين';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #fbbf24)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Serbia
      else if (isSerbia) {
        highlightBadge.textContent = '🇷🇸 RS';
        highlightBadge.title = '⚠️ هام جداً: دولة محظورة - صربيا';
        highlightBadge.style.background = 'linear-gradient(135deg, #dc2626, #1e40af, #fff)';
        highlightBadge.style.color = '#fff';
        listItem.classList.add('banned-highlight');
      }
      // Check Kirkuk
      else if (isKirkuk) {
        highlightBadge.textContent = '⭐ كركوك';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      } 
      // Check Sulaymaniyah
      else if (isSulaymaniyah) {
        highlightBadge.textContent = '⭐ السليمانية';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      } 
      // Check Erbil explicitly
      else if (isErbilRegion) {
        highlightBadge.textContent = '⭐ أربيل';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      }
      // Default fallback (old data marked as highlighted but no specific region)
      else {
        highlightBadge.textContent = '⭐ محظور';
        highlightBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        highlightBadge.style.color = '#fff';
      }
      
      highlightBadge.style.padding = '2px 8px';
      highlightBadge.style.borderRadius = '4px';
      highlightBadge.style.fontSize = '0.8em';
      highlightBadge.style.fontWeight = 'bold';
      highlightBadge.style.marginBottom = '4px';
    }

    // Tooltips
    if (tooltipsEnabled) {
      ipAddressSpan.setAttribute('title', 'عرض السجل');
      copyButton.setAttribute('title', 'نسخ');
      deleteButton.setAttribute('title', 'حذف');
      infoButton.setAttribute('title', 'عرض تفاصيل IP');
    } else {
      infoButton.removeAttribute('title');
    }

    // Check if this IP has duplicates in the full list
    const historyCount = allIPs.filter(i => i.ip === item.ip).length;
    if (historyCount > 1) {
        listItem.classList.add('duplicate');
    }

    // Modal click listener
    ipAddressSpan.style.cursor = 'pointer'; // Make it look clickable
    ipAddressSpan.addEventListener('click', () => {
      historyContent.innerHTML = '';
      document.querySelector('#history-modal h2').innerHTML = `🌐 سجل IP: <span style="color: #667eea;">${item.ip}</span>`;
      const ipHistory = allIPs.filter(i => i.ip === item.ip).sort((a,b) => b.timestamp - a.timestamp);
      const historyList = document.createElement('ul');
      historyList.style.listStyle = 'none';
      historyList.style.padding = '0';
      ipHistory.forEach((histItem, index) => {
        const historyItem = document.createElement('li');
        historyItem.style.padding = '12px 15px';
        historyItem.style.marginBottom = '8px';
        historyItem.style.background = index % 2 === 0 ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.1)';
        historyItem.style.borderRadius = '8px';
        historyItem.style.borderRight = '4px solid ' + (index % 2 === 0 ? '#667eea' : '#764ba2');
        historyItem.innerHTML = `<strong>${index + 1}.</strong> ${new Date(histItem.timestamp).toLocaleString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })} - <span style="color: #7f8c8d;">${histItem.country}</span>`;
        historyList.appendChild(historyItem);
      });
      historyContent.appendChild(historyList);
      modal.style.display = 'block';
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(item.ip);
        copyButton.textContent = 'تم النسخ!';
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1000);
    });

    deleteButton.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف جميع سجلات ${item.ip}؟`)) {
        allIPs = allIPs.filter(i => i.ip !== item.ip);
        await chrome.storage.local.set({ copiedIPs: allIPs });
      }
    });

    infoButton.addEventListener('click', async () => {
      ipDetailsContent.innerHTML = 'جاري تحميل التفاصيل...'; // Loading message
      ipDetailsModal.style.display = 'block';

      try {
        const geoClient = window.IPGeoClient;
        const result = geoClient ? await geoClient.lookup(item.ip) : { success: false, error: 'IPGeoClient unavailable' };
        if (result.success) {
          ipDetailsContent.innerHTML = buildArabicDetailHTML(result.data);
        } else if (result.error) {
          ipDetailsContent.innerHTML = `خطأ: ${result.error}`;
        } else {
          ipDetailsContent.innerHTML = 'تعذر استرداد معلومات IP.';
        }
      } catch (error) {
        ipDetailsContent.innerHTML = `خطأ: ${error.message}`;
      }
    });

    ipList.appendChild(templateClone);
  });
}

// --- Delegated UI wiring lives in sidepanel-tabs.js / sidepanel-modals.js ---

// Initial data load (tab selection is triggered once at file end)
loadAllData();

// Listen for toast notifications from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('Sidepanel received message:', message);

  if (activeTab === 'transfer-report' && message.type === 'showToast') {
    return;
  }

  if (message.type === 'showToast') {
    console.log('Showing toast with title:', message.title);
    showToast(message.title, message.message, message.toastType);
  } else if (message.type === 'tooltipsToggled') {
    try {
      tooltipsEnabled = !!message.enabled;
      renderAll();
    } catch (e) {
      console.warn('tooltipsToggled handler error', e);
    }
  }
});
// --- Sound Effects ---
function playWarningSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Alarm sound: High-Low-High-Low
    const now = ctx.currentTime;
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(440, now + 0.2); // A4
    osc.frequency.setValueAtTime(880, now + 0.4); // A5
    osc.frequency.setValueAtTime(440, now + 0.6); // A4
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  } catch (e) {
    console.error('Audio play failed', e);
  }
}

