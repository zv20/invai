/**
 * Shared Navigation Functionality
 * Used across all pages for consistent menu behavior
 */

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

function initializeNavigation() {
    // Highlight active page
    highlightActivePage();
    
    // Setup menu toggle
    setupMenuToggle();
    
    // Setup sidebar overlay
    setupSidebarOverlay();
}

/**
 * Highlight the current active page in navigation
 */
function highlightActivePage() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentPath.endsWith(href) || (currentPath === '/' && href === '/dashboard.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Setup menu toggle button
 */
function setupMenuToggle() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (overlay) {
                overlay.classList.toggle('active');
            }
        });
    }
    
    // Close button
    const closeSidebar = document.querySelector('.close-sidebar');
    if (closeSidebar) {
        closeSidebar.addEventListener('click', function() {
            sidebar.classList.remove('active');
            if (overlay) {
                overlay.classList.remove('active');
            }
        });
    }
}

/**
 * Setup sidebar overlay to close menu when clicked
 */
function setupSidebarOverlay() {
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (overlay && sidebar) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}
