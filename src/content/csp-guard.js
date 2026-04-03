// MV3 CSP-safe guard for noisy injected WebUI scripts in some Chromium/Brave environments.
// Does not change extension behavior; only suppresses specific non-actionable errors.

(() => {
  // Define Mojo and related objects if not present to prevent errors
  if (typeof window.Mojo === 'undefined') {
    window.Mojo = {
      internal: {
        interfaceSupport: {
          InterfaceRemoteBase: class {
            bindNewPipeAndPassReceiver() {
              // Stub method to prevent errors
              return Promise.reject(new Error('Mojo not available'));
            }
          },
          InterfaceRemoteBaseWrapper: class {
            bindNewPipeAndPassReceiver() {
              // Stub method to prevent errors
              return Promise.reject(new Error('Mojo not available'));
            }
          }
        }
      }
    };
  }

  // Also define mojo if lowercase
  if (typeof window.mojo === 'undefined') {
    window.mojo = window.Mojo;
  }

  const isMojoMissing = (reason, message) => {
    const text = String((reason && reason.message) || reason || message || '');
    return text.includes('Mojo is not defined') || text.includes('mojo is not defined');
  };

  try {
    window.addEventListener('unhandledrejection', (e) => {
      if (isMojoMissing(e.reason)) {
        e.preventDefault();
        console.error('🚨 تم منع خطأ Mojo: هذا الخطأ يحدث عادةً في بيئات Chromium/Brave عندما تحاول مكتبات خارجية (مثل GitHub Copilot) الوصول إلى Mojo API غير المتاح. الخطأ آمن ولا يؤثر على الإضافة. إذا استمر، جرب تعطيل الإضافات الخارجية مؤقتًا.');
      }
    });
  } catch (e) {
    // ignore
  }

  try {
    window.addEventListener('error', (e) => {
      if (isMojoMissing(null, e.message)) {
        e.preventDefault();
        console.error('🚨 تم منع خطأ Mojo: هذا الخطأ يحدث عادةً في بيئات Chromium/Brave عندما تحاول مكتبات خارجية (مثل GitHub Copilot) الوصول إلى Mojo API غير المتاح. الخطأ آمن ولا يؤثر على الإضافة. إذا استمر، جرب تعطيل الإضافات الخارجية مؤقتًا.');
      }
    });
  } catch (e) {
    // ignore
  }
})();

