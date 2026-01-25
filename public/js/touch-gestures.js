/**
 * Touch Gestures Handler
 * Provides swipe, pull-to-refresh, long-press, and other touch interactions
 */

(function() {
  'use strict';

  /**
   * Swipe Handler
   */
  class SwipeHandler {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        threshold: options.threshold || 50,
        allowedTime: options.allowedTime || 300,
        onSwipeLeft: options.onSwipeLeft || null,
        onSwipeRight: options.onSwipeRight || null,
        onSwipeUp: options.onSwipeUp || null,
        onSwipeDown: options.onSwipeDown || null
      };

      this.startX = 0;
      this.startY = 0;
      this.startTime = 0;

      this.init();
    }

    init() {
      this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    handleTouchStart(e) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.startTime = Date.now();
      this.element.classList.add('swiping');
    }

    handleTouchEnd(e) {
      const touch = e.changedTouches[0];
      const distX = touch.clientX - this.startX;
      const distY = touch.clientY - this.startY;
      const elapsedTime = Date.now() - this.startTime;

      this.element.classList.remove('swiping');

      if (elapsedTime <= this.options.allowedTime) {
        if (Math.abs(distX) >= this.options.threshold && Math.abs(distY) <= 100) {
          // Horizontal swipe
          if (distX > 0 && this.options.onSwipeRight) {
            this.options.onSwipeRight(e);
          } else if (distX < 0 && this.options.onSwipeLeft) {
            this.options.onSwipeLeft(e);
          }
        } else if (Math.abs(distY) >= this.options.threshold && Math.abs(distX) <= 100) {
          // Vertical swipe
          if (distY > 0 && this.options.onSwipeDown) {
            this.options.onSwipeDown(e);
          } else if (distY < 0 && this.options.onSwipeUp) {
            this.options.onSwipeUp(e);
          }
        }
      }
    }
  }

  /**
   * Pull to Refresh
   */
  class PullToRefresh {
    constructor(element, onRefresh) {
      this.element = element;
      this.onRefresh = onRefresh;
      this.startY = 0;
      this.pullThreshold = 80;
      this.indicator = this.createIndicator();
      this.isRefreshing = false;

      this.init();
    }

    createIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'pull-to-refresh';
      indicator.innerHTML = '<div class="spinner"></div><span>Pull to refresh</span>';
      document.body.appendChild(indicator);
      return indicator;
    }

    init() {
      this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(e) {
      if (this.element.scrollTop === 0) {
        this.startY = e.touches[0].clientY;
      }
    }

    handleTouchMove(e) {
      if (this.isRefreshing || this.element.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - this.startY;

      if (pullDistance > 0) {
        e.preventDefault();
        
        if (pullDistance > this.pullThreshold) {
          this.indicator.classList.add('active');
          this.indicator.querySelector('span').textContent = 'Release to refresh';
        } else {
          this.indicator.classList.remove('active');
          this.indicator.querySelector('span').textContent = 'Pull to refresh';
        }
      }
    }

    async handleTouchEnd(e) {
      const pullDistance = e.changedTouches[0].clientY - this.startY;

      if (pullDistance > this.pullThreshold && !this.isRefreshing) {
        this.isRefreshing = true;
        this.indicator.querySelector('span').textContent = 'Refreshing...';

        try {
          await this.onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }

        setTimeout(() => {
          this.indicator.classList.remove('active');
          this.isRefreshing = false;
        }, 500);
      } else {
        this.indicator.classList.remove('active');
      }

      this.startY = 0;
    }
  }

  /**
   * Long Press Handler
   */
  class LongPressHandler {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        duration: options.duration || 500,
        onLongPress: options.onLongPress || null
      };

      this.pressTimer = null;
      this.init();
    }

    init() {
      this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
      this.element.addEventListener('touchmove', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(e) {
      this.pressTimer = setTimeout(() => {
        if (this.options.onLongPress) {
          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          this.options.onLongPress(e);
        }
      }, this.options.duration);
    }

    handleTouchEnd() {
      clearTimeout(this.pressTimer);
    }
  }

  /**
   * Bottom Sheet Controller
   */
  class BottomSheet {
    constructor(id) {
      this.sheet = document.getElementById(id);
      if (!this.sheet) {
        console.error(`Bottom sheet with id '${id}' not found`);
        return;
      }

      this.backdrop = this.sheet.previousElementSibling;
      this.handle = this.sheet.querySelector('.bottom-sheet-handle');
      this.startY = 0;
      this.currentY = 0;

      this.init();
    }

    init() {
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => this.close());
      }

      if (this.handle) {
        this.handle.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.handle.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.handle.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
      }
    }

    handleTouchStart(e) {
      this.startY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
      this.currentY = e.touches[0].clientY;
      const diff = this.currentY - this.startY;

      if (diff > 0) {
        e.preventDefault();
        this.sheet.style.transform = `translateY(${diff}px)`;
      }
    }

    handleTouchEnd() {
      const diff = this.currentY - this.startY;

      if (diff > 100) {
        this.close();
      } else {
        this.sheet.style.transform = 'translateY(0)';
      }
    }

    open() {
      this.sheet.classList.add('active');
      if (this.backdrop) {
        this.backdrop.classList.add('active');
      }
      document.body.style.overflow = 'hidden';
    }

    close() {
      this.sheet.classList.remove('active');
      if (this.backdrop) {
        this.backdrop.classList.remove('active');
      }
      document.body.style.overflow = '';
      this.sheet.style.transform = '';
    }
  }

  /**
   * Touch Ripple Effect
   */
  function addRippleEffect(element) {
    element.classList.add('touch-ripple');
  }

  /**
   * Haptic Feedback
   */
  function hapticFeedback(type = 'medium') {
    if (!navigator.vibrate) return;

    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50
    };

    navigator.vibrate(patterns[type] || patterns.medium);
  }

  /**
   * Initialize Mobile Gestures
   */
  function initMobileGestures() {
    // Add swipe to delete on mobile cards
    document.querySelectorAll('.swipeable').forEach(element => {
      new SwipeHandler(element, {
        onSwipeLeft: (e) => {
          element.classList.add('swiped');
          element.style.transform = 'translateX(-120px)';
        },
        onSwipeRight: (e) => {
          element.classList.remove('swiped');
          element.style.transform = 'translateX(0)';
        }
      });
    });

    // Add pull to refresh on scrollable containers
    const scrollContainer = document.querySelector('.mobile-scroll');
    if (scrollContainer) {
      new PullToRefresh(scrollContainer, async () => {
        // Reload data
        if (typeof window.refreshData === 'function') {
          await window.refreshData();
        } else {
          window.location.reload();
        }
      });
    }

    // Add touch ripple to buttons
    document.querySelectorAll('button, .btn').forEach(button => {
      addRippleEffect(button);
    });
  }

  // Auto-initialize on mobile
  if (window.innerWidth <= 768) {
    document.addEventListener('DOMContentLoaded', initMobileGestures);
  }

  // Export for global access
  window.TouchGestures = {
    SwipeHandler,
    PullToRefresh,
    LongPressHandler,
    BottomSheet,
    addRippleEffect,
    hapticFeedback,
    init: initMobileGestures
  };

})();
