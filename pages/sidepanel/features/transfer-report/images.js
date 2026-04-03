// --- Image Upload Logic ---
let selectedImages = [];
const reportImagesInput = document.getElementById('report-images');
const imagePreviewContainer = document.getElementById('image-preview-container');

function isDuplicateFile(newFile, currentList) {
  return currentList.some(existingFile => 
    existingFile.name === newFile.name &&
    existingFile.size === newFile.size &&
    existingFile.lastModified === newFile.lastModified
  );
}

if (reportImagesInput) {
  reportImagesInput.addEventListener('change', (e) => {
    console.log('Image upload detected (change event)');
    const files = Array.from(e.target.files);
    let addedCount = 0;
    
    files.forEach(file => {
      if (!isDuplicateFile(file, selectedImages)) {
        selectedImages.push(file);
        addedCount++;
      }
    });

    if (addedCount < files.length) {
      showToast('تنبيه', 'تم تجاهل الصور المكررة', 'warning');
    }

    renderImagePreviews();
    reportImagesInput.value = ''; // Reset input to allow selecting same files again
  });
}


// Handle Paste (Ctrl+V) for images
document.addEventListener('paste', (e) => {
  // Only handle paste if we are in the transfer report tab
  if (activeTab !== 'transfer-report') return;

  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let blob = null;
  let hasImage = false;
  let duplicateCount = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') === 0) {
      blob = items[i].getAsFile();
      if (blob) {
        // For pasted images, we might not have reliable name/lastModified, 
        // but we can check size and type at least, or if it's a file copy, it has props.
        if (!isDuplicateFile(blob, selectedImages)) {
          selectedImages.push(blob);
          hasImage = true;
        } else {
          duplicateCount++;
        }
      }
    }
  }

  if (hasImage) {
    renderImagePreviews();
    showToast('تم اللصق', 'تم إضافة الصورة من الحافظة', 'default');
    e.preventDefault(); // Prevent default paste behavior if image was handled
  } else if (duplicateCount > 0) {
    showToast('تنبيه', 'الصورة موجودة بالفعل', 'warning');
    e.preventDefault();
  }
});

function renderImagePreviews() {
  console.log('renderImagePreviews called. Count:', selectedImages.length);
  const container = document.getElementById('image-preview-container');
  if (!container) {
    console.error('CRITICAL: image-preview-container NOT FOUND in DOM!');
    return;
  }
  console.log('Container found:', container);

  container.innerHTML = '';
  selectedImages.forEach((file, index) => {
    console.log(`Processing image ${index}:`, file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(`Image ${index} loaded by FileReader`);
      const div = document.createElement('div');
      div.className = 'preview-item';
      
      const img = document.createElement('img');
      img.src = e.target.result;
      
      const btn = document.createElement('button');
      btn.type = 'button'; // Explicit type
      btn.className = 'remove-image-btn';
      btn.innerHTML = '×';
      btn.dataset.index = index;
      
      // Inline style fallback in case CSS fails
      btn.style.position = 'absolute';
      btn.style.top = '5px';
      btn.style.right = '5px';
      btn.style.zIndex = '99999';
      btn.style.opacity = '1';
      btn.style.display = 'flex';
      btn.style.cursor = 'pointer';

      btn.onclick = (ev) => { // Direct property handler
         console.log('Remove btn CLICKED via onclick property', index);
         ev.stopPropagation();
         ev.preventDefault();
         selectedImages.splice(index, 1);
         renderImagePreviews();
      };
      
      div.appendChild(img);
      div.appendChild(btn);
      container.appendChild(div);
      console.log(`Image ${index} appended to container`);
    };
    reader.onerror = (err) => console.error('FileReader Error:', err);
    reader.readAsDataURL(file);
  });
}
