const textarea = document.getElementById('clipboard-textarea');
let lastRead = '';
// Sound feature removed entirely

setInterval(() => {
  textarea.value = '';
  textarea.focus();
  if (document.execCommand && document.execCommand('paste')) {
    const text = textarea.value;
    if (text && text !== lastRead) {
      lastRead = text;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'clipboardContent', text });
      }
    }
  } else {
    // This can happen if the extension doesn't have clipboard permissions
    // or if the clipboard is empty.
  }
}, 500);

// Write to clipboard when requested from background
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'writeClipboardText' && typeof message.text === 'string') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message.text).then(() => {
          lastRead = message.text; // Prevent re-detection
        }).catch(() => {
          // Fallback to execCommand copy via textarea
          textarea.value = message.text;
          textarea.select();
          try { document.execCommand('copy'); lastRead = message.text; } catch (e) { /* ignore */ }
        });
      } else {
        textarea.value = message.text;
        textarea.select();
        try { document.execCommand('copy'); lastRead = message.text; } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // Swallow errors; clipboard write may fail depending on context
    }
  }
  // Play a distinct sound for highlighted provinces using Web Audio API
  if (message && message.type === 'playHighlightSound') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // Create a loud, urgent alert sound: rapid 5-beep sequence with harsh tone
      const beeps = [
        { freq: 1200, start: 0, duration: 0.12 },
        { freq: 900, start: 0.15, duration: 0.12 },
        { freq: 1200, start: 0.3, duration: 0.12 },
        { freq: 900, start: 0.45, duration: 0.12 },
        { freq: 1400, start: 0.6, duration: 0.25 }
      ];
      
      beeps.forEach(beep => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = beep.freq;
        oscillator.type = 'square'; // Harsher, more attention-grabbing tone
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + beep.start);
        gainNode.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + beep.start + 0.01); // Much louder
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + beep.start + beep.duration);
        
        oscillator.start(audioCtx.currentTime + beep.start);
        oscillator.stop(audioCtx.currentTime + beep.start + beep.duration);
      });
    } catch (e) { 
      console.warn('Could not play highlight sound:', e);
    }
  }
  
  // Play UK IP sound - softer but still attention-grabbing (gentle chime duo)
  if (message && message.type === 'playUKSound') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const now = audioCtx.currentTime;
      
      // Two-tone chime: brighter first ping then softer response
      const chimes = [
        { freq: 1180, start: 0, duration: 0.22, gain: 0.48 },
        { freq: 920, start: 0.22, duration: 0.20, gain: 0.40 },
        { freq: 1180, start: 0.44, duration: 0.18, gain: 0.38 }
      ];
      
      chimes.forEach(chime => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.value = chime.freq;
        osc.type = 'triangle'; // Softer timbre than sawtooth/square
        
        gain.gain.setValueAtTime(0, now + chime.start);
        gain.gain.linearRampToValueAtTime(chime.gain, now + chime.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.01, now + chime.start + chime.duration);
        
        osc.start(now + chime.start);
        osc.stop(now + chime.start + chime.duration + 0.02);
      });
    } catch (e) {
      console.warn('Could not play UK sound:', e);
    }
  }

  // Play Netherlands IP sound - similar gentle chime with slightly different pitch
  if (message && message.type === 'playNLSound') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const now = audioCtx.currentTime;
      
      // NL chime: slightly lower primary tone than UK
      const chimes = [
        { freq: 980, start: 0, duration: 0.14, gain: 0.45 },
        { freq: 760, start: 0.15, duration: 0.13, gain: 0.37 },
        { freq: 980, start: 0.30, duration: 0.12, gain: 0.35 }
      ];
      
      chimes.forEach(chime => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.value = chime.freq;
        osc.type = 'triangle';
        
        gain.gain.setValueAtTime(0, now + chime.start);
        gain.gain.linearRampToValueAtTime(chime.gain, now + chime.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.01, now + chime.start + chime.duration);
        
        osc.start(now + chime.start);
        osc.stop(now + chime.start + chime.duration + 0.02);
      });
    } catch (e) {
      console.warn('Could not play NL sound:', e);
    }
  }

  // Play warning sound for suspicious activity
  if (message && message.type === 'playWarningSound') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const now = audioCtx.currentTime;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
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
      console.warn('Could not play warning sound:', e);
    }
  }

// Global variable to prevent garbage collection of the utterance
let currentUtterance = null;

  // Handle Text-to-Speech (TTS)
  if (message && message.type === 'playTTS' && typeof message.text === 'string') {
    try {
      // Cancel any currently playing speech
      window.speechSynthesis.cancel();
      
      const speak = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Prioritize "Google" Arabic voices (highest quality)
        let selectedVoice = voices.find(v => v.lang.includes('ar') && v.name.includes('Google'));
        
        // Fallback to Microsoft voices
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('ar') && v.name.includes('Microsoft'));
        }
        
        // General fallback
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('ar'));
        }

        currentUtterance = new SpeechSynthesisUtterance(message.text);
        currentUtterance.volume = 1.0;

        if (selectedVoice) {
          currentUtterance.voice = selectedVoice;
          currentUtterance.lang = selectedVoice.lang;
          
          // Micro-tuning for natural flow
          if (selectedVoice.name.includes('Google')) {
             currentUtterance.rate = 0.9; // Slightly slower for gravity/clarity
             currentUtterance.pitch = 1.0;
          } else {
             currentUtterance.rate = 1.1; // Speed up legacy voices
             currentUtterance.pitch = 1.1; // Slightly higher pitch often clears up "muddy" legacy audio
          }
        } else {
          currentUtterance.lang = 'ar-SA';
          currentUtterance.rate = 1.0;
        }

        // Release the global reference when done to allow GC
        currentUtterance.onend = () => { currentUtterance = null; };
        
        window.speechSynthesis.speak(currentUtterance);
      };

      // Ensure voices are loaded before speaking
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            speak();
            window.speechSynthesis.onvoiceschanged = null; // Remove listener
        };
      } else {
        speak();
      }

    } catch (e) {
      console.warn('TTS error:', e);
    }
  }
});