/**
 * PWA Install Prompt Manager
 * Handles install prompt and app installation
 */

(function() {
  'use strict';

  let deferredPrompt = null;
  const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
  const INSTALL_PROMPT_DELAY = 60000; // 1 minute

  /**
   * Check if user has dismissed install prompt
   */
  function isDismissed() {
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!dismissed) return false;

    const dismissedTime = new Date(dismissed);
    const now = new Date();
    const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    return daysSinceDismissed < 7;
  }

  /**
   * Mark install prompt as dismissed
   */
  function markDismissed() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, new Date().toISOString());
  }

  /**
   * Check if app is already installed
   */
  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  /**
   * Detect iOS Safari
   */
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Show install banner
   */
  function showInstallBanner() {
    if (isInstalled() || isDismissed()) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    
    if (isIOS()) {
      // iOS instructions
      banner.innerHTML = `
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000; box-shadow: 0 -4px 12px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
          <button id="dismiss-install" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 40px;">📱</div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px;">Install InvAI</h3>
              <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">Add to your home screen for quick access</p>
              <div style="font-size: 13px; opacity: 0.85; line-height: 1.5;">
                Tap <strong>Share</strong> 📤 then <strong>Add to Home Screen</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Chrome/Edge install
      banner.innerHTML = `
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000; box-shadow: 0 -4px 12px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
          <button id="dismiss-install" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
          <div style="display: flex; align-items: center; gap: 15px; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
              <div style="font-size: 40px;">📦</div>
              <div>
                <h3 style="margin: 0 0 5px 0; font-size: 18px;">Install InvAI</h3>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Get quick access and work offline</p>
              </div>
            </div>
            <button id="install-app-btn" style="background: white; color: #4CAF50; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; white-space: nowrap;">Install App</button>
          </div>
        </div>
      `;
    }

    document.body.appendChild(banner);

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Dismiss button
    document.getElementById('dismiss-install').addEventListener('click', () => {
      banner.remove();
      markDismissed();
    });

    // Install button (Chrome/Edge)
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        // Show install prompt
        deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);

        if (outcome === 'accepted') {
          console.log('PWA installed');
          showInstallSuccess();
        }

        // Clear deferred prompt
        deferredPrompt = null;
        banner.remove();
      });
    }
  }

  /**
   * Show install success message
   */
  function showInstallSuccess() {
    const message = document.createElement('div');
    message.style.cssText = 'background: #4CAF50; color: white; padding: 20px; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10001; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: fadeIn 0.3s ease-out;';
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 32px;">✅</div>
        <div>
          <h3 style="margin: 0 0 5px 0; font-size: 16px;">App Installed!</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">InvAI has been added to your device</p>
        </div>
      </div>
    `;
    document.body.appendChild(message);

    setTimeout(() => {
      message.style.transition = 'opacity 0.3s';
      message.style.opacity = '0';
      setTimeout(() => message.remove(), 300);
    }, 4000);
  }

  /**
   * Listen for beforeinstallprompt event
   */
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired');
    
    // Prevent default prompt
    e.preventDefault();
    
    // Store for later
    deferredPrompt = e;

    // Show custom install banner after delay
    setTimeout(() => {
      showInstallBanner();
    }, INSTALL_PROMPT_DELAY);
  });

  /**
   * Listen for app installed event
   */
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    showInstallSuccess();

    // Track installation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install');
    }
  });

  /**
   * Show install button in UI
   */
  function addInstallButton() {
    // Add install button to navbar or header
    const installBtn = document.createElement('button');
    installBtn.id = 'header-install-btn';
    installBtn.innerHTML = '📦 Install App';
    installBtn.style.cssText = 'background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;';
    
    installBtn.addEventListener('click', () => {
      showInstallBanner();
    });

    // Try to add to header/nav
    const header = document.querySelector('header nav');
    if (header && !isInstalled()) {
      header.appendChild(installBtn);
    }
  }

  // Initialize
  if (!isInstalled() && !isIOS()) {
    // Wait for deferred prompt
    setTimeout(addInstallButton, 2000);
  }

  // Export for manual triggering
  window.PWAInstall = {
    showBanner: showInstallBanner,
    isInstalled,
    isIOS
  };

})();
