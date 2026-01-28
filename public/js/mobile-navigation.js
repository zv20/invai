/**
 * Mobile Navigation
 * Bottom navigation bar and mobile menu
 */

(function() {
  'use strict';

  /**
   * Initialize bottom navigation
   */
  function initBottomNav() {
    // Only on mobile
    if (window.innerWidth > 768) return;

    // Check if already exists
    if (document.querySelector('.bottom-nav')) return;

    const navItems = [
      {
        icon: '📊',
        label: 'Dashboard',
        href: '/dashboard.html',
        pages: ['dashboard.html', 'index.html', '/']
      },
      {
        icon: '📦',
        label: 'Products',
        href: '/products.html',
        pages: ['products.html']
      },
      {
        icon: '📷',
        label: 'Scan',
        href: '#',
        onClick: () => openScanner(),
        pages: []
      },
      {
        icon: '🔍',
        label: 'Search',
        href: '/advanced-search.html',
        pages: ['advanced-search.html', 'search.html']
      },
      {
        icon: '☰',
        label: 'More',
        href: '#',
        onClick: () => openMobileMenu(),
        pages: []
      }
    ];

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';

    const currentPath = window.location.pathname;

    navItems.forEach(item => {
      const link = document.createElement('a');
      link.className = 'bottom-nav-item';
      link.href = item.href;

      // Check if current page
      const isActive = item.pages.some(page => 
        currentPath.endsWith(page) || 
        (page === '/' && currentPath === '/')
      );

      if (isActive) {
        link.classList.add('active');
      }

      link.innerHTML = `
        <span class="icon">${item.icon}</span>
        <span>${item.label}</span>
      `;

      // Custom click handler
      if (item.onClick) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          item.onClick();
        });
      }

      nav.appendChild(link);
    });

    document.body.appendChild(nav);
  }

  /**
   * Open barcode scanner
   */
  function openScanner() {
    if (typeof BarcodeScanner === 'undefined') {
      alert('Barcode scanner not available. Please ensure the scanner script is loaded.');
      return;
    }

    BarcodeScanner.open(async (result) => {
      console.log('Scanned:', result.text);
      
      // Look up product by barcode
      try {
        const response = await fetch(`/api/products/search?q=${result.text}`);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
          // Product found - navigate to it
          window.location.href = `/products.html?id=${data.products[0].id}`;
        } else {
          // Product not found - offer to create
          if (confirm(`Product not found. Create new product with barcode ${result.text}?`)) {
            window.location.href = `/products.html?action=add&barcode=${result.text}`;
          }
        }
      } catch (error) {
        console.error('Product lookup error:', error);
        alert('Error looking up product');
      }
    });
  }

  /**
   * Open mobile menu
   */
  function openMobileMenu() {
    const menuItems = [
      { icon: '📊', label: 'Analytics', href: '/analytics.html' },
      { icon: '🔮', label: 'Predictions', href: '/predictions.html' },
      { icon: '📋', label: 'Batches', href: '/batches.html' },
      { icon: '💸', label: 'Transactions', href: '/transactions.html' },
      { icon: '🎯', label: 'Stock Take', href: '/stock-take.html' },
      { icon: '🎨', label: 'Dashboards', href: '/dashboard-builder.html' },
      { icon: '👥', label: 'Users', href: '/users.html' },
      { icon: '⚙️', label: 'Settings', href: '/settings.html' },
      { icon: '🚪', label: 'Logout', href: '/logout.html', style: 'color: #f44336;' }
    ];

    const backdrop = document.createElement('div');
    backdrop.className = 'bottom-sheet-backdrop active';

    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet active';
    sheet.innerHTML = `
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-content">
        <h2 style="margin-bottom: 20px;">Menu</h2>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${menuItems.map(item => `
            <a href="${item.href}" style="display: flex; align-items: center; gap: 16px; padding: 16px; text-decoration: none; color: white; border-radius: 8px; transition: background 0.2s; ${item.style || ''}" class="menu-item">
              <span style="font-size: 24px;">${item.icon}</span>
              <span style="font-size: 16px;">${item.label}</span>
            </a>
          `).join('')}
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

    // Add hover effect
    sheet.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255,255,255,0.05)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });
    });
  }

  /**
   * Initialize mobile header
   */
  function initMobileHeader() {
    // Only on mobile
    if (window.innerWidth > 768) return;

    // Check if already exists
    if (document.querySelector('.mobile-header')) return;

    // Get page title
    const pageTitle = document.title.split(' - ')[0] || 'InvAI';

    const header = document.createElement('header');
    header.className = 'mobile-header';
    header.innerHTML = `
      <button class="mobile-header-action" onclick="history.back()">←</button>
      <h1 class="mobile-header-title">${pageTitle}</h1>
      <button class="mobile-header-action" onclick="location.reload()">🔄</button>
    `;

    document.body.insertBefore(header, document.body.firstChild);
  }

  /**
   * Initialize mobile FAB
   */
  function initMobileFAB() {
    // Only on mobile
    if (window.innerWidth > 768) return;

    // Determine FAB action based on page
    const path = window.location.pathname;
    let fabAction = null;

    if (path.includes('products.html')) {
      fabAction = () => {
        window.location.href = '/products.html?action=add';
      };
    } else if (path.includes('dashboard.html') || path === '/') {
      fabAction = () => openScanner();
    }

    if (fabAction && typeof MobileUI !== 'undefined') {
      new MobileUI.FAB({
        icon: '+',
        onClick: fabAction
      });
    }
  }

  /**
   * Handle mobile back button
   */
  function handleMobileBack() {
    window.addEventListener('popstate', (e) => {
      // Handle back navigation
      console.log('Back button pressed');
    });
  }

  /**
   * Initialize all mobile navigation
   */
  function init() {
    if (window.innerWidth <= 768) {
      initBottomNav();
      initMobileHeader();
      initMobileFAB();
      handleMobileBack();
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on resize (if switching to mobile)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth <= 768 && !document.querySelector('.bottom-nav')) {
        init();
      }
    }, 250);
  });

  // Export
  window.MobileNavigation = {
    init,
    openScanner,
    openMobileMenu
  };

})();
