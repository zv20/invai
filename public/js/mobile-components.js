/**
 * Mobile UI Components
 * Reusable mobile components (FAB, Bottom Nav, etc.)
 */

(function() {
  'use strict';

  /**
   * Floating Action Button (FAB)
   */
  class FAB {
    constructor(options = {}) {
      this.options = {
        icon: options.icon || '+',
        position: options.position || 'bottom-right',
        onClick: options.onClick || null,
        actions: options.actions || []
      };

      this.element = null;
      this.isOpen = false;

      if (window.innerWidth <= 768) {
        this.create();
      }
    }

    create() {
      if (this.options.actions.length > 0) {
        // FAB with menu
        this.element = document.createElement('div');
        this.element.className = 'fab-menu';
        
        const fab = document.createElement('button');
        fab.className = 'fab';
        fab.innerHTML = this.options.icon;
        fab.addEventListener('click', () => this.toggle());

        const actions = document.createElement('div');
        actions.className = 'fab-actions';
        
        this.options.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = 'fab-action';
          btn.innerHTML = action.icon;
          btn.title = action.label;
          btn.addEventListener('click', () => {
            action.onClick();
            this.close();
          });
          actions.appendChild(btn);
        });

        this.element.appendChild(actions);
        this.element.appendChild(fab);
      } else {
        // Simple FAB
        this.element = document.createElement('button');
        this.element.className = 'fab';
        this.element.innerHTML = this.options.icon;
        
        if (this.options.onClick) {
          this.element.addEventListener('click', this.options.onClick);
        }
      }

      document.body.appendChild(this.element);
    }

    toggle() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.element.classList.add('active');
      } else {
        this.element.classList.remove('active');
      }
    }

    close() {
      this.isOpen = false;
      this.element.classList.remove('active');
    }

    destroy() {
      if (this.element) {
        this.element.remove();
      }
    }
  }

  /**
   * Bottom Navigation
   */
  function createBottomNav(items) {
    if (window.innerWidth > 768) return;

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';

    items.forEach(item => {
      const link = document.createElement('a');
      link.className = 'bottom-nav-item';
      link.href = item.href;
      
      if (window.location.pathname === item.href || 
          window.location.pathname.includes(item.href.replace('.html', ''))) {
        link.classList.add('active');
      }

      link.innerHTML = `
        <span class="icon">${item.icon}</span>
        <span>${item.label}</span>
      `;

      nav.appendChild(link);
    });

    document.body.appendChild(nav);
  }

  /**
   * Mobile Header
   */
  function createMobileHeader(title, options = {}) {
    if (window.innerWidth > 768) return;

    const header = document.createElement('header');
    header.className = 'mobile-header';

    // Left action (back button or menu)
    if (options.leftAction) {
      const leftBtn = document.createElement('button');
      leftBtn.className = 'mobile-header-action';
      leftBtn.innerHTML = options.leftAction.icon || '←';
      leftBtn.addEventListener('click', options.leftAction.onClick);
      header.appendChild(leftBtn);
    }

    // Title
    const titleEl = document.createElement('h1');
    titleEl.className = 'mobile-header-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    // Right action
    if (options.rightAction) {
      const rightBtn = document.createElement('button');
      rightBtn.className = 'mobile-header-action';
      rightBtn.innerHTML = options.rightAction.icon;
      rightBtn.addEventListener('click', options.rightAction.onClick);
      header.appendChild(rightBtn);
    }

    document.body.insertBefore(header, document.body.firstChild);
  }

  /**
   * Mobile Search Bar
   */
  function createMobileSearch(placeholder, onSearch) {
    if (window.innerWidth > 768) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'mobile-search';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'mobile-search-input';
    input.placeholder = placeholder || '🔍 Search...';
    
    let timeout;
    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        onSearch(e.target.value);
      }, 300);
    });

    searchContainer.appendChild(input);
    return searchContainer;
  }

  /**
   * Mobile Card
   */
  function createMobileCard(data) {
    const card = document.createElement('div');
    card.className = 'mobile-card swipeable';
    
    // Card content
    const content = document.createElement('div');
    content.innerHTML = `
      <h3>${data.title}</h3>
      ${data.subtitle ? `<p style="color: #888; font-size: 14px;">${data.subtitle}</p>` : ''}
      ${data.content || ''}
    `;
    card.appendChild(content);

    // Swipe actions
    if (data.actions) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'swipeable-actions';
      
      data.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `swipe-action ${action.type || ''}`;
        btn.innerHTML = action.icon;
        btn.addEventListener('click', action.onClick);
        actionsContainer.appendChild(btn);
      });
      
      card.appendChild(actionsContainer);
    }

    return card;
  }

  /**
   * Show Toast (Mobile Notification)
   */
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: ${window.innerWidth <= 768 ? '80px' : '20px'};
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      z-index: 10001;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Confirm Dialog (Mobile)
   */
  function showMobileConfirm(title, message, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'bottom-sheet-backdrop active';

    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet active';
    sheet.innerHTML = `
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-content">
        <h2 style="margin-bottom: 12px;">${title}</h2>
        <p style="color: #888; margin-bottom: 24px;">${message}</p>
        <div style="display: flex; gap: 12px;">
          <button class="btn" id="confirm-cancel" style="flex: 1; background: #333;">Cancel</button>
          <button class="btn" id="confirm-ok" style="flex: 1; background: #4CAF50;">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    const close = () => {
      backdrop.remove();
      sheet.remove();
    };

    backdrop.addEventListener('click', close);
    document.getElementById('confirm-cancel').addEventListener('click', close);
    document.getElementById('confirm-ok').addEventListener('click', () => {
      onConfirm();
      close();
    });
  }

  // Export for global access
  window.MobileUI = {
    FAB,
    createBottomNav,
    createMobileHeader,
    createMobileSearch,
    createMobileCard,
    showToast,
    showMobileConfirm
  };

})();
