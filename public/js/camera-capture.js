/**
 * Camera Capture
 * Take photos for products using device camera
 */

(function() {
  'use strict';

  class CameraCapture {
    constructor(options = {}) {
      this.options = {
        facingMode: options.facingMode || 'environment',
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1080,
        quality: options.quality || 0.85,
        onCapture: options.onCapture || null
      };

      this.video = null;
      this.stream = null;
      this.container = null;
    }

    /**
     * Open camera
     */
    async open() {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported');
        }

        // Create UI
        this.createUI();

        // Request camera access
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: this.options.facingMode,
            width: { ideal: this.options.maxWidth },
            height: { ideal: this.options.maxHeight }
          }
        });

        this.video.srcObject = this.stream;
        await this.video.play();

        console.log('Camera opened');
      } catch (error) {
        console.error('Camera error:', error);
        this.showError('Camera access denied or not available');
        throw error;
      }
    }

    /**
     * Create camera UI
     */
    createUI() {
      this.container = document.createElement('div');
      this.container.id = 'camera-capture-ui';
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
        <div style="position: relative; flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <video id="camera-video" autoplay playsinline style="max-width: 100%; max-height: 100%; object-fit: contain;"></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
        </div>

        <!-- Controls -->
        <div style="position: absolute; bottom: 80px; left: 0; right: 0; display: flex; justify-content: center; gap: 20px;">
          <button id="flip-camera-btn" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; font-size: 28px; cursor: pointer;">🔄</button>
          <button id="capture-btn" style="width: 72px; height: 72px; border-radius: 50%; background: white; border: 4px solid #4CAF50; cursor: pointer; position: relative;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #4CAF50; margin: 4px auto;"></div>
          </button>
          <button id="gallery-btn" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; font-size: 28px; cursor: pointer;">🖼️</button>
        </div>

        <!-- Bottom bar -->
        <div style="padding: 20px; background: #1a1a1a;">
          <button id="close-camera-btn" style="width: 100%; padding: 16px; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
      `;

      document.body.appendChild(this.container);

      this.video = document.getElementById('camera-video');

      // Event listeners
      document.getElementById('capture-btn').addEventListener('click', () => this.capture());
      document.getElementById('flip-camera-btn').addEventListener('click', () => this.flipCamera());
      document.getElementById('gallery-btn').addEventListener('click', () => this.openGallery());
      document.getElementById('close-camera-btn').addEventListener('click', () => this.close());
    }

    /**
     * Capture photo
     */
    async capture() {
      const canvas = document.getElementById('camera-canvas');
      const context = canvas.getContext('2d');

      // Set canvas size
      canvas.width = this.video.videoWidth;
      canvas.height = this.video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(this.video, 0, 0);

      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', this.options.quality);

      // Compress if needed
      const compressed = await this.compressImage(imageData);

      // Show preview
      this.showPreview(compressed);
    }

    /**
     * Compress image
     */
    async compressImage(dataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if too large
          if (width > this.options.maxWidth || height > this.options.maxHeight) {
            const ratio = Math.min(
              this.options.maxWidth / width,
              this.options.maxHeight / height
            );
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', this.options.quality));
        };
        img.src = dataUrl;
      });
    }

    /**
     * Show preview
     */
    showPreview(imageData) {
      const preview = document.createElement('div');
      preview.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        z-index: 10001;
        display: flex;
        flex-direction: column;
      `;

      preview.innerHTML = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <img src="${imageData}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>
        <div style="padding: 20px; background: #1a1a1a; display: flex; gap: 12px;">
          <button id="retake-btn" style="flex: 1; padding: 16px; background: #333; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Retake</button>
          <button id="use-photo-btn" style="flex: 1; padding: 16px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Use Photo</button>
        </div>
      `;

      document.body.appendChild(preview);

      document.getElementById('retake-btn').addEventListener('click', () => {
        preview.remove();
      });

      document.getElementById('use-photo-btn').addEventListener('click', () => {
        if (this.options.onCapture) {
          this.options.onCapture(imageData);
        }
        preview.remove();
        this.close();
      });
    }

    /**
     * Flip camera (front/back)
     */
    async flipCamera() {
      const newMode = this.options.facingMode === 'user' ? 'environment' : 'user';
      this.options.facingMode = newMode;

      this.close();
      await this.open();
    }

    /**
     * Open gallery (file picker)
     */
    openGallery() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const compressed = await this.compressImage(event.target.result);
            this.showPreview(compressed);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    }

    /**
     * Show error
     */
    showError(message) {
      alert(message);
    }

    /**
     * Close camera
     */
    close() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      if (this.container) {
        this.container.remove();
        this.container = null;
      }

      this.video = null;
    }
  }

  /**
   * Open camera capture
   */
  function openCamera(onCapture) {
    const camera = new CameraCapture({ onCapture });
    camera.open();
    return camera;
  }

  // Export
  window.CameraCapture = {
    Camera: CameraCapture,
    open: openCamera
  };

})();
