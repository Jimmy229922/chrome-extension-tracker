function parseIpsFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const raw = params.get('ips') || '';
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function parseAccountsFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const raw = params.get('accounts') || '';
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function getNoteForItem(item) {
  const note = item && typeof item.note === 'string' ? item.note.trim() : '';
  return note || '';
}

async function readPayloadFromStorage() {
  try {
    const res = await chrome.storage.local.get('criticalAlertPayload');
    const payload = res && res.criticalAlertPayload ? res.criticalAlertPayload : null;
    if (!payload || !Array.isArray(payload.items)) return null;
    const items = payload.items
      .filter(i => i && typeof i === 'object')
      .map(i => ({
        type: i.type === 'AC' ? 'AC' : 'IP',
        value: typeof i.value === 'string' ? i.value.trim() : '',
        note: typeof i.note === 'string' ? i.note.trim() : ''
      }))
      .filter(i => i.value);
    if (!items.length) return null;
    return { items };
  } catch (e) {
    return null;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 900);
}

async function copyText(text) {
  if (!text) return;
  try {
    await chrome.runtime.sendMessage({ type: 'writeClipboardText', text });
    showToast('تم النسخ');
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم النسخ');
    } catch (e2) {
      // ignore
    }
  }
}

async function updateItemNote(item, newNote) {
  const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';
  try {
    const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
    const watchlist = data[CRITICAL_WATCHLIST_STORAGE_KEY] || { ips: [], accounts: [] };
    const trimmedNote = typeof newNote === 'string' ? newNote.trim() : '';

    if (item.type === 'IP') {
      const ips = Array.isArray(watchlist.ips) ? watchlist.ips : [];
      const updatedIps = ips.map(v => {
        if (v && typeof v === 'object' && v.ip === item.value) {
          return { ...v, note: trimmedNote };
        }
        return v;
      });
      await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ...watchlist, ips: updatedIps } });
      showToast('تم تحديث الملاحظة');
    } else if (item.type === 'AC') {
      const accounts = Array.isArray(watchlist.accounts) ? watchlist.accounts : [];
      const updatedAccounts = accounts.map(v => {
        if (v && typeof v === 'object' && v.account === item.value) {
          return { ...v, note: trimmedNote };
        }
        return v;
      });
      await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ...watchlist, accounts: updatedAccounts } });
      showToast('تم تحديث الملاحظة');
    }
  } catch (e) {
    showToast('فشل في تحديث الملاحظة');
  }
}

async function removeItemFromWatchlist(item) {
  const CRITICAL_WATCHLIST_STORAGE_KEY = 'criticalWatchlist';
  try {
    const data = await chrome.storage.sync.get(CRITICAL_WATCHLIST_STORAGE_KEY);
    const watchlist = data[CRITICAL_WATCHLIST_STORAGE_KEY] || { ips: [], accounts: [] };

    if (item.type === 'IP') {
      const ips = Array.isArray(watchlist.ips) ? watchlist.ips : [];
      const filteredIps = ips.filter(v => !(v && typeof v === 'object' && v.ip === item.value));
      await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ...watchlist, ips: filteredIps } });
      showToast('تم حذف العنصر');
    } else if (item.type === 'AC') {
      const accounts = Array.isArray(watchlist.accounts) ? watchlist.accounts : [];
      const filteredAccounts = accounts.filter(v => !(v && typeof v === 'object' && v.account === item.value));
      await chrome.storage.sync.set({ [CRITICAL_WATCHLIST_STORAGE_KEY]: { ...watchlist, accounts: filteredAccounts } });
      showToast('تم حذف العنصر');
    }
  } catch (e) {
    showToast('فشل في حذف العنصر');
  }
}

function tryPlaySound() {
  chrome.storage.sync.get(['alertSoundText'], async (data) => {
    let text = data.alertSoundText || '';

    // If no custom text, determine based on type
    if (!text) {
      const payload = await readPayloadFromStorage();
      if (payload && payload.items && payload.items.length > 0) {
        const firstItem = payload.items[0];
        if (firstItem.type === 'IP') {
          text = ' آي بي مهم';
        } else if (firstItem.type === 'AC') {
          text = 'تنبيه حساب مهم';
        } else {
          text = 'الحساب خطير';
        }
      } else {
        // Fallback from query params
        const ips = parseIpsFromQuery();
        const accounts = parseAccountsFromQuery();
        if (ips.length > 0) {
          text = 'تنبيه آي بي مهم';
        } else if (accounts.length > 0) {
          text = 'تنبيه حساب مهم';
        } else {
          text = 'الحساب خطير';
        }
      }
    }

    try {
      // First, play the beep sound
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        const now = audioCtx.currentTime;
        const beeps = [
          { freq: 1200, start: 0, duration: 0.15, gain: 0.5 },
          { freq: 1000, start: 0.18, duration: 0.15, gain: 0.45 },
          { freq: 1400, start: 0.36, duration: 0.2, gain: 0.5 },
          { freq: 800, start: 0.58, duration: 0.1, gain: 0.4 }
        ];

        beeps.forEach(b => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'square';
          osc.frequency.value = b.freq;
          gain.gain.setValueAtTime(0.001, now + b.start);
          gain.gain.linearRampToValueAtTime(b.gain, now + b.start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + b.start + b.duration);
          osc.start(now + b.start);
          osc.stop(now + b.start + b.duration + 0.02);
        });
      }

      // Then, text-to-speech after 1 second
      console.log('Setting timeout for TTS in 1 second');
      setTimeout(() => {
        console.log('Timeout triggered, attempting to speak:', text);
        const speakWithVoices = () => {
          console.log('speakWithVoices called');
          const voices = speechSynthesis.getVoices();
          console.log('Available voices count:', voices.length);
          console.log('Available voices:', voices.map(v => `${v.lang} - ${v.name} - ${v.default ? 'default' : 'not default'}`));
          const utterance = new SpeechSynthesisUtterance(text);
          console.log('Utterance created with text:', utterance.text);
          // Try to find an Arabic voice
          const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
          if (arabicVoice) {
            utterance.voice = arabicVoice;
            utterance.lang = arabicVoice.lang;
            console.log('✅ Using Arabic voice:', arabicVoice.name, 'lang:', arabicVoice.lang, 'for text:', text);
          } else {
            utterance.lang = 'ar'; // Try Arabic even without specific voice
            console.log('❌ No Arabic voice found, trying Arabic lang anyway for text:', text);
          }
          console.log('Utterance settings: lang=', utterance.lang, 'rate=', utterance.rate, 'pitch=', utterance.pitch, 'volume=', utterance.volume);
          speechSynthesis.speak(utterance);
          console.log('Speech synthesis started');
        };

        if (speechSynthesis.getVoices().length === 0) {
          console.log('No voices loaded yet, setting onvoiceschanged');
          speechSynthesis.onvoiceschanged = () => {
            console.log('onvoiceschanged triggered');
            speakWithVoices();
          };
        } else {
          console.log('Voices already loaded, speaking immediately');
          speakWithVoices();
        }
      }, 1000); // 1 second delay after beep

    } catch (e) {
      console.error('Error in tryPlaySound:', e);
    }
  });
}

function renderItems({ ips, accounts }) {
  const list = document.getElementById('item-list');
  if (!list) return;
  list.innerHTML = '';

  const ipItems = Array.isArray(ips) ? ips : [];
  const accountItems = Array.isArray(accounts) ? accounts : [];

  const merged = [];
  ipItems.forEach(value => merged.push({ type: 'IP', value }));
  accountItems.forEach(value => merged.push({ type: 'ACC', value }));

  const seen = new Set();
  const deduped = merged.filter(item => {
    const key = `${item.type}:${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.forEach(item => {
    const li = document.createElement('li');
    li.className = 'ipItem';

    const tag = document.createElement('span');
    tag.textContent = item.type === 'ACC' ? 'AC' : 'IP';
    tag.style.fontSize = '12px';
    tag.style.fontWeight = '800';
    tag.style.padding = '2px 8px';
    tag.style.borderRadius = '999px';
    tag.style.border = '1px solid rgba(255,255,255,0.16)';
    tag.style.background = 'rgba(0,0,0,0.12)';

    const text = document.createElement('span');
    text.textContent = item.value;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copyBtn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'نسخ';
    copyBtn.addEventListener('click', () => void copyText(item.value));

    li.appendChild(tag);
    li.appendChild(text);
    li.appendChild(copyBtn);
    list.appendChild(li);
  });
}

function renderPayloadItems(items) {
  const list = document.getElementById('item-list');
  if (!list) return;
  list.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'ipItem';

    const tag = document.createElement('span');
    tag.textContent = item.type;
    tag.style.fontSize = '12px';
    tag.style.fontWeight = '800';
    tag.style.padding = '2px 8px';
    tag.style.borderRadius = '999px';
    tag.style.border = '1px solid rgba(255,255,255,0.16)';
    tag.style.background = 'rgba(0,0,0,0.12)';

    const textWrap = document.createElement('div');
    textWrap.style.display = 'flex';
    textWrap.style.flexDirection = 'column';
    textWrap.style.gap = '4px';
    textWrap.style.flex = '1';

    const text = document.createElement('span');
    text.textContent = item.value;

    textWrap.appendChild(text);
    const noteText = getNoteForItem(item);
    if (noteText) {
      const note = document.createElement('span');
      note.style.fontSize = '12.5px';
      note.style.fontWeight = '700';
      note.style.color = 'rgba(249, 250, 251, 0.78)';
      note.textContent = noteText;
      textWrap.appendChild(note);
    }

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copyBtn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'نسخ';
    copyBtn.addEventListener('click', () => void copyText(item.value));

    li.appendChild(tag);
    li.appendChild(textWrap);
    li.appendChild(copyBtn);
    list.appendChild(li);
  });
}

function setupAutoClose(seconds) {
  const countdownEl = document.getElementById('countdown');
  let remaining = seconds;
  if (countdownEl) countdownEl.textContent = String(remaining);

  const interval = window.setInterval(() => {
    remaining -= 1;
    if (countdownEl) countdownEl.textContent = String(Math.max(remaining, 0));
    if (remaining <= 0) {
      window.clearInterval(interval);
      window.close();
    }
  }, 1000);
}

function setupButtons() {
  const openSidepanelBtn = document.getElementById('open-sidepanel-btn');
  const closeBtn = document.getElementById('close-btn');
  const hideOnlyBtn = document.getElementById('hide-only');
  const ackBtn = document.getElementById('ack-btn');

  if (openSidepanelBtn) openSidepanelBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('price-sl-checker.html') });
    window.close();
  });
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());
  if (hideOnlyBtn) hideOnlyBtn.addEventListener('click', () => window.close());

  if (ackBtn) {
    ackBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'criticalIpPopupDismissed' });
      } catch (e) {
        // ignore
      }
      window.close();
    });
  }
}

(() => {
  void (async () => {
    const payload = await readPayloadFromStorage();
    if (payload && Array.isArray(payload.items) && payload.items.length) {
      renderPayloadItems(payload.items);
    } else {
      const ips = parseIpsFromQuery();
      const accounts = parseAccountsFromQuery();
      renderItems({ ips, accounts });
    }
  })();
  setupButtons();
  setupAutoClose(10);
  tryPlaySound();
})();
