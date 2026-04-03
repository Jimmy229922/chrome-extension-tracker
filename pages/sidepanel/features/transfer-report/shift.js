// Shift Selector Logic
const transferReportShiftBtns = document.querySelectorAll('#transfer-report-section .shift-btn:not(.deposit-shift-btn):not(.credit-out-shift-btn)');
const reportShiftInput = document.getElementById('report-shift');

function setShift(shiftValue) {
  console.log('setShift called with:', shiftValue);
  if (transferReportShiftBtns && transferReportShiftBtns.length > 0) {
    transferReportShiftBtns.forEach(b => {
      // console.log('Checking button:', b.dataset.value, 'against', shiftValue);
      if (b.dataset.value === shiftValue) {
        b.classList.add('active');
        console.log('Activated button:', b.dataset.value);
      } else {
        b.classList.remove('active');
      }
    });
  } else {
    console.warn('No transfer-report shift buttons found in DOM');
  }
  if (reportShiftInput) {
    reportShiftInput.value = shiftValue;
  }
}

function autoDetectShift() {
  const now = new Date();
  const day = now.getDay(); // 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  console.log('autoDetectShift running. Day:', day, 'Time:', hour + ':' + minute);
  
  let shift = 'الخفر'; // Default

  // Friday Special Schedule
  if (day === 5) {
      // Morning: 07:00 (420m) - 12:39 (759m)
      if (totalMinutes >= 420 && totalMinutes <= 759) {
          shift = 'الصباحي';
      }
      // Evening: 12:40 (760m) - 18:19 (1099m)
      else if (totalMinutes >= 760 && totalMinutes <= 1099) {
          shift = 'المسائي';
      }
      // Night: 18:20 (1100m) onwards (covers until midnight)
      // Early morning (00:00 - 06:59) is also Night (handled by default or logic below)
      else if (totalMinutes >= 1100) {
          shift = 'الخفر';
      }
      // 00:00 - 06:59 is already 'الخفر' by default
  } 
  // Standard Schedule (Sat-Thu)
  else {
      // Morning: 07:00 - 14:59
      if (hour >= 7 && hour < 15) {
        shift = 'الصباحي';
      } 
      // Evening: 15:00 - 22:59
      else if (hour >= 15 && hour < 23) {
        shift = 'المسائي';
      }
      // Night: 23:00 - 06:59 (Default)
  }
  
  console.log('Detected Shift:', shift);
  setShift(shift);
}

// Initialize Shift Buttons
if (transferReportShiftBtns.length > 0) {
  transferReportShiftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setShift(btn.dataset.value);
    });
  });
}
