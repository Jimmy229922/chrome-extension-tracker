// MV3 CSP-safe guard for noisy injected WebUI scripts in some Chromium/Brave environments.
// Does not change extension behavior; only suppresses specific non-actionable errors.

(() => {
  // Define Mojo if not present to prevent errors
  if (typeof window.Mojo === 'undefined') {
    window.Mojo = {
      internal: {
        interfaceSupport: {
          InterfaceRemoteBase: class {},
          InterfaceRemoteBaseWrapper: class {}
        }
      }
    };
  }

  const isMojoMissing = (reason, message) => {
    const text = String((reason && reason.message) || reason || message || '');
    return text.includes('Mojo is not defined');
  };

  try {
    window.addEventListener('unhandledrejection', (e) => {
      if (isMojoMissing(e.reason)) e.preventDefault();
    });
  } catch (e) {
    // ignore
  }

  try {
    window.addEventListener('error', (e) => {
      if (isMojoMissing(null, e.message)) e.preventDefault();
    });
  } catch (e) {
    // ignore
  }
})();

