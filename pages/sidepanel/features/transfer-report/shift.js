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
  // حساب الشفت بناءً على توقيت مصر/القاهرة عشان يظبط مع الموظفين اللي في دول تانية
  const localNow = new Date();
  const cairoTimeStr = localNow.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const now = new Date(cairoTimeStr);

  const day = now.getDay(); // 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  console.log('autoDetectShift running. Day:', day, 'Time:', hour + ':' + minute);
  
  let shift = 'الخفر'; // Default

  // Friday Special Schedule
  if (day === 5) {
      if (totalMinutes >= 420 && totalMinutes <= 739) {
          shift = 'الصباحي'; // 07:00 -> 12:19
      } else if (totalMinutes >= 740 && totalMinutes <= 1059) {
          shift = 'المسائي'; // 12:20 -> 17:39
      } else if (totalMinutes >= 1060 || totalMinutes < 420) {
          shift = 'الخفر'; // 17:40 -> 06:59
      }
  } 
  // Standard Schedule (Sat-Thu)
  else {
      if (hour >= 7 && hour < 15) {
          shift = 'الصباحي'; // 07:00 -> 14:59
      } else if (hour >= 15 && hour < 23) {
          shift = 'المسائي'; // 15:00 -> 22:59
      } else if (hour >= 23 || hour < 7) {
          shift = 'الخفر'; // 23:00 -> 06:59
      }
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
