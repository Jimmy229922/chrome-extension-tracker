// =====================================================
// SIDEPANEL MODALS - All Modal Windows and Dialogs
// =====================================================

// --- Image Preview Modal (Click to Preview) ---
function setupImageClickPreviewModal() {
  if (window.__imagePreviewModalInitialized) return;
  window.__imagePreviewModalInitialized = true;

  function ensureModal() {
    let modal = document.getElementById('image-preview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-preview-modal';
      modal.className = 'modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close-button" role="button" aria-label="إغلاق">×</span>
          <div class="image-preview-zoom-wrap">
            <img class="image-preview-modal-img" alt="معاينة الصورة">
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    const closeBtn = modal.querySelector('.close-button');
    return { modal, wrap, img, closeBtn };
  }

  let previousBodyOverflow = '';

  function openPreview(src) {
    const { modal, wrap, img } = ensureModal();
    if (!src) return;
    img.src = src;

    setupZoomHandlers();

    if (wrap) wrap.classList.remove('is-zooming');
    if (img) {
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    }

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closePreview() {
    const modal = document.getElementById('image-preview-modal');
    if (!modal) return;
    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    if (wrap) wrap.classList.remove('is-zooming');
    if (img) {
      img.src = '';
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    }
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
  }

  function setupZoomHandlers() {
    const modal = document.getElementById('image-preview-modal');
    if (!modal) return;
    if (modal.__zoomHandlersBound) return;
    modal.__zoomHandlersBound = true;

    const wrap = modal.querySelector('.image-preview-zoom-wrap');
    const img = modal.querySelector('.image-preview-modal-img');
    if (!wrap || !img) return;

    const ZOOM_SCALE = 4;
    let raf = 0;
    let lastX = 50;
    let lastY = 50;

    function applyZoomFrame() {
      raf = 0;
      wrap.classList.add('is-zooming');
      img.style.transformOrigin = `${lastX}% ${lastY}%`;
      img.style.transform = `scale(${ZOOM_SCALE})`;
    }

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      lastX = Math.max(0, Math.min(100, x));
      lastY = Math.max(0, Math.min(100, y));
      if (!raf) raf = requestAnimationFrame(applyZoomFrame);
    });

    wrap.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      wrap.classList.remove('is-zooming');
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'scale(1)';
    });
  }

  setupZoomHandlers();

  document.addEventListener('click', (e) => {
    const modal = document.getElementById('image-preview-modal');
    if (modal && modal.style.display === 'block') {
      if (e.target === modal) {
        closePreview();
        return;
      }
      const closeBtn = e.target.closest('.close-button');
      if (closeBtn && closeBtn.closest('#image-preview-modal')) {
        closePreview();
        return;
      }
    }

    const imgEl = e.target.closest('img');
    if (!imgEl) return;

    if (imgEl.closest('button') || imgEl.closest('a')) return;
    if (imgEl.closest('.custom-select-wrapper') || imgEl.closest('.custom-select-options')) return;
    if (imgEl.closest('#image-preview-modal')) return;

    const src = imgEl.currentSrc || imgEl.src;
    if (!src) return;
    openPreview(src);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('image-preview-modal');
    if (modal && modal.style.display === 'block') closePreview();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupImageClickPreviewModal);
} else {
  setupImageClickPreviewModal();
}

// --- Field Completion Indicator (Filled field marker) ---
function applyFieldCompletionState(el) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.classList || !el.classList.contains('report-input')) return;
  if (el.matches('input[type="hidden"]')) return;
  const container = el.closest('.report-container');
  if (!container) return;

  let isComplete = false;
  if (el instanceof HTMLSelectElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') isComplete = !!el.checked;
    else isComplete = (el.value ?? '').toString().trim() !== '';
  } else if (el instanceof HTMLTextAreaElement) {
    isComplete = (el.value ?? '').toString().trim() !== '';
  }

  el.classList.toggle('field-complete', isComplete);
  const group = el.closest('.report-field-group');
  if (group) group.classList.toggle('field-complete', isComplete);

  if (el instanceof HTMLSelectElement && el.style.display === 'none') {
    const wrapper = el.previousElementSibling;
    if (wrapper && wrapper.classList && wrapper.classList.contains('custom-select-wrapper')) {
      wrapper.classList.toggle('field-complete', isComplete);
      const trigger = wrapper.querySelector('.custom-select-trigger');
      if (trigger) trigger.classList.toggle('field-complete', isComplete);
    }
  }
}

function setupFieldCompletionIndicators() {
  if (window.__fieldCompletionIndicatorsInitialized) return;
  window.__fieldCompletionIndicatorsInitialized = true;

  const shouldHandle = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    if (!target.classList || !target.classList.contains('report-input')) return false;
    if (target.matches('input[type="hidden"]')) return false;
    return !!target.closest('.report-container');
  };

  const onChangeOrBlur = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    applyFieldCompletionState(t);
  };

  const onInput = (e) => {
    const t = e.target;
    if (!shouldHandle(t)) return;
    if ((t.value ?? '').toString().trim() === '') applyFieldCompletionState(t);
  };

  document.addEventListener('focusout', onChangeOrBlur, true);
  document.addEventListener('change', onChangeOrBlur, true);
  document.addEventListener('input', onInput, true);

  document.querySelectorAll('.report-container input.report-input, .report-container select.report-input, .report-container textarea.report-input').forEach((node) => {
    applyFieldCompletionState(node);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFieldCompletionIndicators);
} else {
  setupFieldCompletionIndicators();
}

// --- Delete Confirm Modal ---
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const deleteConfirmCancel = document.getElementById('delete-confirm-cancel');
const deleteConfirmOk = document.getElementById('delete-confirm-ok');
let deleteCallback = null;

function showDeleteConfirm(message, callback) {
  deleteConfirmMessage.textContent = message;
  deleteCallback = callback;
  deleteConfirmModal.style.display = 'flex';
}

function hideDeleteConfirm() {
  deleteConfirmModal.style.display = 'none';
  deleteCallback = null;
}

if (deleteConfirmCancel) {
  deleteConfirmCancel.addEventListener('click', hideDeleteConfirm);
}

if (deleteConfirmOk) {
  deleteConfirmOk.addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
    hideDeleteConfirm();
  });
}

// --- History Modal ---
const modal = document.getElementById('history-modal');
const closeButton = document.querySelector('.close-button');
const historyContent = document.getElementById('history-content');

if (closeButton) {
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

window.addEventListener('click', (event) => {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
});

// --- IP Details Modal ---
const ipDetailsModal = document.getElementById('ip-details-modal');
const ipDetailsContent = document.getElementById('ip-details-content');
const ipDetailsCloseButton = ipDetailsModal.querySelector('.close-button');

if (ipDetailsCloseButton) {
  ipDetailsCloseButton.addEventListener('click', () => {
    ipDetailsModal.style.display = 'none';
  });
}

window.addEventListener('click', (event) => {
  if (event.target == ipDetailsModal) {
    ipDetailsModal.style.display = 'none';
  }
});

// --- VIP Note Edit Modal ---
const noteEditModal = document.getElementById('note-edit-modal');
const noteEditTitle = document.getElementById('note-edit-title');
const noteEditKind = document.getElementById('note-edit-kind');
const noteEditValue = document.getElementById('note-edit-value');
const noteEditInput = document.getElementById('note-edit-input');
const noteEditSaveBtn = document.getElementById('note-edit-save');
const noteEditCancelBtn = document.getElementById('note-edit-cancel');
const noteEditCloseBtn = document.getElementById('note-edit-close');
let noteEditResolve = null;
let noteEditOpen = false;

function closeNoteEditModal(result) {
  if (!noteEditModal) return;
  noteEditModal.style.display = 'none';
  noteEditOpen = false;
  const resolve = noteEditResolve;
  noteEditResolve = null;
  if (resolve) resolve(result);
}

function openNoteEditModal({ kind, value, note }) {
  if (!noteEditModal || !noteEditInput || !noteEditTitle || !noteEditKind || !noteEditValue) {
    return Promise.resolve(null);
  }

  const safeValue = typeof value === 'string' ? value.trim() : '';
  const safeNote = typeof note === 'string' ? note : '';
  const isAccount = kind === 'AC';

  noteEditTitle.textContent = isAccount ? 'تعديل ملاحظة رقم الحساب' : 'تعديل ملاحظة الـ IP';
  noteEditKind.textContent = isAccount ? 'رقم حساب' : 'IP';
  noteEditValue.textContent = safeValue;
  noteEditInput.value = safeNote;

  noteEditModal.style.display = 'block';
  noteEditOpen = true;
  setTimeout(() => {
    try { noteEditInput.focus(); } catch (e) { /* ignore */ }
    try { noteEditInput.select(); } catch (e) { /* ignore */ }
  }, 0);

  return new Promise((resolve) => {
    noteEditResolve = resolve;
  });
}

if (noteEditSaveBtn && noteEditCancelBtn && noteEditCloseBtn && noteEditInput && noteEditModal) {
  noteEditSaveBtn.addEventListener('click', () => closeNoteEditModal(String(noteEditInput.value || '').trim()));
  noteEditCancelBtn.addEventListener('click', () => closeNoteEditModal(null));
  noteEditCloseBtn.addEventListener('click', () => closeNoteEditModal(null));

  noteEditInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      closeNoteEditModal(String(noteEditInput.value || '').trim());
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!noteEditOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeNoteEditModal(null);
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target === noteEditModal) {
      closeNoteEditModal(null);
    }
  });
}

// --- Smart Auto-Scroll (Transfer Report) ---
const SMART_AUTO_SCROLL_ENABLED = true;

function getScrollParent(el) {
  let parent = el?.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll');
    if (isScrollable && parent.scrollHeight > parent.clientHeight + 4) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function smartRevealInView(el) {
  if (!el || !(el instanceof HTMLElement)) return;
  if (!transferReportSection || !transferReportSection.contains(el)) return;

  const sectionStyle = window.getComputedStyle(transferReportSection);
  if (sectionStyle.display === 'none' || sectionStyle.visibility === 'hidden') return;

  if (el.tagName === 'INPUT') {
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(t)) return;
  }

  const cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;

  const margin = 20;
  const scrollParent = getScrollParent(el);
  const rect = el.getBoundingClientRect();

  if (scrollParent === document.scrollingElement || scrollParent === document.documentElement || scrollParent === document.body) {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top >= margin && rect.bottom <= (vh - margin)) return;
    const targetTop = window.scrollY + rect.top - Math.round(vh * 0.25);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const topWithin = rect.top - parentRect.top;
  const bottomWithin = rect.bottom - parentRect.top;
  const containerH = scrollParent.clientHeight;
  if (topWithin >= margin && bottomWithin <= (containerH - margin)) return;

  const targetTop = scrollParent.scrollTop + topWithin - Math.round(containerH * 0.25);
  scrollParent.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}

let smartScrollLastAt = 0;
let smartScrollRaf = 0;
function scheduleSmartReveal(el) {
  if (!SMART_AUTO_SCROLL_ENABLED) return;
  const now = Date.now();
  if (now - smartScrollLastAt < 120) return;
  smartScrollLastAt = now;
  cancelAnimationFrame(smartScrollRaf);
  smartScrollRaf = requestAnimationFrame(() => smartRevealInView(el));
}

document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (!el.matches('input, textarea, select')) return;
  scheduleSmartReveal(el);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (!el.matches('input, textarea')) return;
  scheduleSmartReveal(el);
});
