// Mention Buttons Logic
const mentionAhmedBtn = document.getElementById('mention-ahmed-btn');
const mentionBatoulBtn = document.getElementById('mention-batoul-btn');
console.log('Mentions Init: Ahmed Btn found?', !!mentionAhmedBtn, 'Batoul Btn found?', !!mentionBatoulBtn);

// Helper for toggling UI state
function setMentionState(btn, isActive) {
  if (isActive) {
    btn.classList.add('active');
    btn.setAttribute('data-active', 'true'); // For CSS fallback
    btn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    btn.style.color = 'white';
  } else {
    btn.classList.remove('active');
    btn.removeAttribute('data-active');
    btn.style.background = '';
    btn.style.color = '';
  }
}

function handleMentionClick(clickedId) {
  console.log('Handle Mention Click:', clickedId);
  const ahmed = document.getElementById('mention-ahmed-btn');
  const batoul = document.getElementById('mention-batoul-btn');
  
  if (clickedId === 'mention-ahmed-btn' && ahmed) {
     const isAhmedActive = ahmed.classList.contains('active');
     // Toggle Ahmed only (Independent)
     setMentionState(ahmed, !isAhmedActive);
  } 
  else if (clickedId === 'mention-batoul-btn' && batoul) {
     const isBatoulActive = batoul.classList.contains('active');
     // Toggle Batoul only (Independent)
     setMentionState(batoul, !isBatoulActive);
  }
}

if (mentionAhmedBtn) {
  // Use onclick property to override any existing listeners completely and simply
  mentionAhmedBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Ahmed Button onclick fired');
    handleMentionClick('mention-ahmed-btn');
  };
}

if (mentionBatoulBtn) {
  mentionBatoulBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Batoul Button onclick fired');
    handleMentionClick('mention-batoul-btn');
  };
}
