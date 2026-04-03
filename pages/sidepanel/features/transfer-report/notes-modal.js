// --- Saved Notes Modal Logic ---
const savedNotesModal = document.getElementById('saved-notes-modal');
const savedNotesList = document.getElementById('saved-notes-list');
const newNoteInput = document.getElementById('new-note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const savedNotesCloseBtn = document.getElementById('saved-notes-close');

let savedNotes = [];
const DEFAULT_REPORT_NOTE_TEMPLATES = [
  'تم تحويل الحساب تلقائيا من الاداة الى B1 Clients كون IP متغاير وتم مطابقته بالنظام ارباح العميل بالسالب',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان العميل يستخدم ip من كركوك وغير محظور',
  'تم تحويل الحساب الى   Standard Bonus كونه يعتمد اسلوب صفقات بسعر افتتاح مساوي  لسعر وقف الخسارة بالصفقات المغلقة من خلال اوامر معلقة',
  'تم تحويل الحساب الى Standard Bonus بسبب ان الارباح تجاوزت 100$',
  'تم اعادة الحساب الى B1 لانه مطابق اكثر من اسبوع',
  'تم تحويل الحساب الى Standard Acccount 2, وذلك بسبب ان ارباح العميل خلال اخر اسبوع 1,821$ والكلية بالموجب'
];

// Load notes from storage
async function loadSavedNotes() {
  const result = await chrome.storage.local.get(['transferReportNotes']);
  const storedNotes = Array.isArray(result.transferReportNotes) ? result.transferReportNotes : [];
  savedNotes = storedNotes.length ? storedNotes : [...DEFAULT_REPORT_NOTE_TEMPLATES];
  if (!storedNotes.length) {
    await chrome.storage.local.set({ transferReportNotes: savedNotes });
  }
  renderSavedNotes();
}

// Render notes list
function renderSavedNotes() {
  savedNotesList.innerHTML = '';
  savedNotes.forEach((note, index) => {
    const li = document.createElement('li');
    li.className = 'saved-note-item';
    li.innerHTML = `
      <span class="saved-note-text">${note}</span>
      <div class="saved-note-actions">
        <button class="saved-note-btn edit" title="تعديل">✏️</button>
        <button class="saved-note-btn delete" title="حذف">🗑️</button>
      </div>
    `;

    // Click on text to select note
    li.querySelector('.saved-note-text').addEventListener('click', () => {
      reportNotesInput.value = note;
      savedNotesModal.style.display = 'none';
    });

    li.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const next = prompt('تعديل الملاحظة:', note);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        showToast('تنبيه', 'لا يمكن حفظ ملاحظة فارغة', 'warning');
        return;
      }
      savedNotes[index] = trimmed;
      saveNotesToStorage();
      renderSavedNotes();
    });

    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
      savedNotes.splice(index, 1);
      saveNotesToStorage();
      renderSavedNotes();
    });

    savedNotesList.appendChild(li);
  });
}

// Save to storage
function saveNotesToStorage() {
  chrome.storage.local.set({ transferReportNotes: savedNotes });
}

// Add new note
if (addNoteBtn) {
  addNoteBtn.addEventListener('click', () => {
    const text = (newNoteInput?.value || '').trim();
    if (!text) {
      showToast('تنبيه', 'الرجاء إدخال ملاحظة', 'warning');
      return;
    }
    savedNotes.push(text);
    saveNotesToStorage();
    renderSavedNotes();
    if (newNoteInput) newNoteInput.value = '';
  });
}

// Open modal on focus ONLY if empty
if (reportNotesInput) {
  reportNotesInput.addEventListener('focus', () => {
    if (reportNotesInput.value.trim() === '') {
      loadSavedNotes();
      savedNotesModal.style.display = 'block';
    }
  });
}

// Manual open button
const openNotesModalBtn = document.getElementById('open-notes-modal-btn');
if (openNotesModalBtn) {
  openNotesModalBtn.addEventListener('click', () => {
    loadSavedNotes();
    savedNotesModal.style.display = 'block';
  });
}

// Close modal
if (savedNotesCloseBtn) {
  savedNotesCloseBtn.addEventListener('click', () => {
    savedNotesModal.style.display = 'none';
  });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === savedNotesModal) {
    savedNotesModal.style.display = 'none';
  }
  if (event.target === telegramSettingsModal) {
    telegramSettingsModal.style.display = 'none';
  }
  if (event.target === googleFormSettingsModal) {
    googleFormSettingsModal.style.display = 'none';
  }
});
