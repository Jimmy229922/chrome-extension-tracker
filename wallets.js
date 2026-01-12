document.addEventListener('DOMContentLoaded', () => {
    loadWallets();
    setupTabs();
    setupReportForm();
    
    // Check for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    }
});

// --- Wallets Logic ---
document.getElementById('clear-wallets').addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من مسح جميع سجلات المحافظ؟')) {
        await chrome.storage.local.remove('walletNotes');
        loadWallets();
    }
});

async function loadWallets() {
    const data = await chrome.storage.local.get('walletNotes');
    const walletNotes = data.walletNotes || {};
    const container = document.getElementById('wallets-list');
    
    container.innerHTML = '';

    const addresses = Object.keys(walletNotes);

    if (addresses.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد محافظ محفوظة حالياً</div>';
        return;
    }
    
    addresses.forEach(address => {
        const note = walletNotes[address];
        const item = document.createElement('div');
        item.className = 'wallet-item';
        
        item.innerHTML = `
            <div class="wallet-info">
                <div class="wallet-address">${address}</div>
                <div class="wallet-note">📝 ${note}</div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// --- Tabs Logic ---
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            tab.classList.add('active');
            const targetId = `tab-${tab.dataset.tab}`;
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// --- Report Form Logic ---
function setupReportForm() {
    const form = document.getElementById('withdrawal-form');
    const emailInput = document.getElementById('report-email');
    const ipInput = document.getElementById('report-ip');
    const countryInput = document.getElementById('report-country');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    
    let selectedImages = [];

    // 1. Email Paste Logic
    emailInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = pastedText.match(emailRegex);
        
        if (match) {
            emailInput.value = match[0];
            // Optional: Flash input to indicate success
            emailInput.style.borderColor = '#2ecc71';
            setTimeout(() => emailInput.style.borderColor = '#ddd', 1000);
        } else {
            emailInput.value = pastedText; // Fallback if no email found
        }
    });

    // 2. IP to Country Logic (Simple Fetch)
    ipInput.addEventListener('blur', async () => {
        const ip = ipInput.value.trim();
        if (ip && !countryInput.value) {
            try {
                countryInput.placeholder = 'جاري البحث...';
                const response = await fetch(`https://ipapi.co/${ip}/json/`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.country_name) {
                        countryInput.value = data.country_name;
                    }
                }
            } catch (error) {
                console.error('Error fetching country:', error);
            } finally {
                countryInput.placeholder = 'الدولة (تلقائي أو يدوي)';
            }
        }
    });

    // 3. Image Upload Logic
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = ''; // Reset to allow same file selection
    });

    // Paste images
    document.addEventListener('paste', (e) => {
        // Only handle paste if we are in the report tab
        if (!document.getElementById('tab-report').classList.contains('active')) return;
        
        if (e.clipboardData && e.clipboardData.items) {
            const items = e.clipboardData.items;
            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    files.push(items[i].getAsFile());
                }
            }
            if (files.length > 0) {
                handleFiles(files);
            }
        }
    });

    function handleFiles(files) {
        if (selectedImages.length + files.length > 3) {
            alert('الحد الأقصى 3 صور فقط');
            return;
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgObj = {
                    file: file,
                    dataUrl: e.target.result
                };
                selectedImages.push(imgObj);
                renderPreviews();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderPreviews() {
        previewContainer.innerHTML = '';
        selectedImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${img.dataUrl}" class="preview-image">
                <button class="remove-image" data-index="${index}">×</button>
            `;
            previewContainer.appendChild(div);
        });

        // Add remove listeners
        document.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering dropZone click if nested (it's not, but good practice)
                const index = parseInt(e.target.dataset.index);
                selectedImages.splice(index, 1);
                renderPreviews();
            });
        });
    }

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
            const img = modal.querySelector('.image-preview-modal-img');
            const wrap = modal.querySelector('.image-preview-zoom-wrap');
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

    // 4. Submit Logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'جاري الإرسال...';
        submitBtn.disabled = true;

        try {
            const formData = {
                type: 'withdrawal',
                ip: ipInput.value,
                country: countryInput.value,
                account: document.getElementById('report-account').value,
                email: emailInput.value,
                amount: document.getElementById('report-amount').value,
                method: document.getElementById('report-method').value,
                notes: document.getElementById('report-notes').value,
                images: selectedImages.map(img => img.dataUrl) // Sending Base64
            };

            // Sending as JSON as requested "send data to API"
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('تم إرسال التقرير بنجاح!');
                form.reset();
                selectedImages = [];
                renderPreviews();
            } else {
                throw new Error('فشل الإرسال');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('حدث خطأ أثناء إرسال التقرير. يرجى المحاولة مرة أخرى.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}