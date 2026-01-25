/**
 * Barcode Scanner
 * Camera-based barcode and QR code scanning using ZXing
 */

(function() {
  'use strict';

  class BarcodeScanner {
    constructor(options = {}) {
      this.options = {
        onScan: options.onScan || null,
        onError: options.onError || null,
        formats: options.formats || [
          'EAN_13',
          'EAN_8',
          'UPC_A',
          'UPC_E',
          'CODE_128',
          'CODE_39',
          'QR_CODE'
        ],
        facingMode: options.facingMode || 'environment' // 'user' or 'environment'
      };

      this.video = null;
      this.stream = null;
      this.scanning = false;
      this.codeReader = null;
    }

    /**
     * Initialize scanner
     */
    async init() {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported');
        }

        // Load ZXing library dynamically if not already loaded
        if (typeof ZXing === 'undefined') {
          await this.loadZXing();
        }

        this.codeReader = new ZXing.BrowserMultiFormatReader();
        console.log('Barcode scanner initialized');
        return true;
      } catch (error) {
        console.error('Scanner init error:', error);
        if (this.options.onError) {
          this.options.onError(error);
        }
        return false;
      }
    }

    /**
     * Load ZXing library
     */
    async loadZXing() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    /**
     * Start scanning
     */
    async start(videoElement) {
      if (!this.codeReader) {
        await this.init();
      }

      if (!videoElement) {
        throw new Error('Video element required');
      }

      this.video = videoElement;
      this.scanning = true;

      try {
        // Get available cameras
        const devices = await this.codeReader.listVideoInputDevices();
        console.log('Available cameras:', devices);

        // Find back camera
        let selectedDevice = devices[0];
        for (const device of devices) {
          if (device.label.toLowerCase().includes('back')) {
            selectedDevice = device;
            break;
          }
        }

        // Start decoding
        this.codeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          this.video,
          (result, err) => {
            if (result) {
              console.log('Barcode detected:', result.text);
              
              // Haptic feedback
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }

              if (this.options.onScan) {
                this.options.onScan({
                  text: result.text,
                  format: result.format,
                  timestamp: Date.now()
                });
              }
            }

            if (err && err.name !== 'NotFoundException') {
              console.error('Scan error:', err);
            }
          }
        );

        console.log('Scanner started');
      } catch (error) {
        console.error('Start scanning error:', error);
        this.scanning = false;
        
        if (this.options.onError) {
          this.options.onError(error);
        }
        
        throw error;
      }
    }

    /**
     * Stop scanning
     */
    stop() {
      if (this.codeReader) {
        this.codeReader.reset();
      }

      if (this.video && this.video.srcObject) {
        const tracks = this.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        this.video.srcObject = null;
      }

      this.scanning = false;
      console.log('Scanner stopped');
    }

    /**
     * Toggle torch/flashlight
     */
    async toggleTorch() {
      if (!this.video || !this.video.srcObject) return;

      const track = this.video.srcObject.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        const enabled = track.getSettings().torch;
        await track.applyConstraints({
          advanced: [{ torch: !enabled }]
        });
        return !enabled;
      }

      return false;
    }

    /**
     * Switch camera (front/back)
     */
    async switchCamera() {
      const newFacingMode = this.options.facingMode === 'user' ? 'environment' : 'user';
      this.options.facingMode = newFacingMode;
      
      this.stop();
      await this.start(this.video);
    }
  }

  /**
   * Scanner UI
   */
  class ScannerUI {
    constructor(onScan) {
      this.scanner = new BarcodeScanner({
        onScan: (result) => {
          this.showResult(result);
          if (onScan) onScan(result);
        },
        onError: (error) => {
          this.showError(error.message);
        }
      });

      this.container = null;
      this.torchEnabled = false;
    }

    /**
     * Create scanner UI
     */
    create() {
      this.container = document.createElement('div');
      this.container.id = 'scanner-ui';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        z-index: 10000;
        display: flex;
        flex-direction: column;
      `;

      this.container.innerHTML = `
        <div style="position: relative; flex: 1; overflow: hidden;">
          <video id="scanner-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
          
          <!-- Scanning overlay -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="width: 80%; max-width: 400px; aspect-ratio: 1; border: 2px solid #4CAF50; border-radius: 16px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); animation: pulse 2s ease-in-out infinite;"></div>
          </div>

          <!-- Instructions -->
          <div style="position: absolute; top: 60px; left: 0; right: 0; text-align: center; color: white;">
            <p style="font-size: 18px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Position barcode in frame</p>
          </div>

          <!-- Controls -->
          <div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 12px;">
            <button id="torch-btn" style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; font-size: 24px; cursor: pointer;">🔦</button>
            <button id="flip-btn" style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; font-size: 24px; cursor: pointer;">🔄</button>
          </div>
        </div>

        <!-- Bottom controls -->
        <div style="padding: 20px; background: #1a1a1a;">
          <button id="close-scanner-btn" style="width: 100%; padding: 16px; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Close Scanner</button>
          <button id="manual-entry-btn" style="width: 100%; padding: 12px; background: transparent; color: #4CAF50; border: none; font-size: 14px; cursor: pointer; margin-top: 8px;">Enter Manually</button>
        </div>
      `;

      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(this.container);

      // Event listeners
      document.getElementById('close-scanner-btn').addEventListener('click', () => this.close());
      document.getElementById('torch-btn').addEventListener('click', () => this.toggleTorch());
      document.getElementById('flip-btn').addEventListener('click', () => this.scanner.switchCamera());
      document.getElementById('manual-entry-btn').addEventListener('click', () => this.manualEntry());

      // Start scanner
      const video = document.getElementById('scanner-video');
      this.scanner.start(video);
    }

    /**
     * Show scan result
     */
    showResult(result) {
      const resultDiv = document.createElement('div');
      resultDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #4CAF50;
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        z-index: 10001;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      resultDiv.textContent = `✓ Scanned: ${result.text}`;
      document.body.appendChild(resultDiv);

      setTimeout(() => resultDiv.remove(), 2000);
    }

    /**
     * Show error
     */
    showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        z-index: 10001;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 80%;
        text-align: center;
      `;
      errorDiv.textContent = message;
      document.body.appendChild(errorDiv);

      setTimeout(() => errorDiv.remove(), 3000);
    }

    /**
     * Toggle torch
     */
    async toggleTorch() {
      this.torchEnabled = await this.scanner.toggleTorch();
      const btn = document.getElementById('torch-btn');
      if (btn) {
        btn.style.background = this.torchEnabled ? '#4CAF50' : 'rgba(0,0,0,0.7)';
      }
    }

    /**
     * Manual entry fallback
     */
    manualEntry() {
      const barcode = prompt('Enter barcode manually:');
      if (barcode) {
        this.scanner.options.onScan({
          text: barcode,
          format: 'MANUAL',
          timestamp: Date.now()
        });
        this.close();
      }
    }

    /**
     * Close scanner
     */
    close() {
      this.scanner.stop();
      if (this.container) {
        this.container.remove();
      }
    }
  }

  /**
   * Open scanner
   */
  function openScanner(onScan) {
    const scannerUI = new ScannerUI(onScan);
    scannerUI.create();
    return scannerUI;
  }

  // Export
  window.BarcodeScanner = {
    Scanner: BarcodeScanner,
    UI: ScannerUI,
    open: openScanner
  };

})();
