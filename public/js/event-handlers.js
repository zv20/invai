/**
 * Centralized Event Handler System
 * 
 * Replaces ALL inline onclick/onchange/onsubmit handlers with event delegation.
 * This enables strict Content Security Policy (CSP) without 'unsafe-inline'.
 * 
 * Benefits:
 * - No CSP violations from inline event handlers
 * - Better security (XSS protection)
 * - Centralized event management
 * - Easier to maintain and debug
 * 
 * Usage:
 * Instead of: <button onclick="toggleMenu()">Menu</button>
 * Use: <button class="menu-toggle">Menu</button>
 * 
 * Instead of: <a onclick="switchTab('dashboard')">Dashboard</a>
 * Use: <a href="#" data-tab="dashboard">Dashboard</a>
 * 
 * Created: 2026-01-27
 * Issue: #11, #15
 */

class EventManager {
    constructor() {
        this.initialized = false;
    }
    
    /**
     * Initialize all event listeners
     */
    init() {
        if (this.initialized) {
            console.warn('EventManager already initialized');
            return;
        }
        
        console.log('⚙️  Initializing EventManager (CSP-compliant event delegation)...');
        
        // Menu toggle handlers
        this.initMenuHandlers();
        
        // Navigation handlers
        this.initNavigationHandlers();
        
        // Settings handlers
        this.initSettingsHandlers();
        
        // Report handlers
        this.initReportHandlers();
        
        // Form handlers
        this.initFormHandlers();
        
        // Button handlers
        this.initButtonHandlers();
        
        this.initialized = true;
        console.log('✅ EventManager initialized successfully');
    }
    
    /**
     * Menu toggle handlers
     */
    initMenuHandlers() {
        document.addEventListener('click', (e) => {
            // Menu toggle button
            if (e.target.closest('.menu-toggle')) {
                e.preventDefault();
                if (typeof toggleMenu === 'function') {
                    toggleMenu();
                }
            }
            
            // Close sidebar button
            if (e.target.closest('.close-sidebar')) {
                e.preventDefault();
                if (typeof toggleMenu === 'function') {
                    toggleMenu();
                }
            }
            
            // Sidebar overlay
            if (e.target.classList.contains('sidebar-overlay')) {
                e.preventDefault();
                if (typeof toggleMenu === 'function') {
                    toggleMenu();
                }
            }
        });
    }
    
    /**
     * Navigation tab handlers
     */
    initNavigationHandlers() {
        document.addEventListener('click', (e) => {
            // Main navigation tabs (use data-tab attribute)
            const navItem = e.target.closest('[data-tab]');
            if (navItem) {
                e.preventDefault();
                const tab = navItem.dataset.tab;
                if (typeof switchTab === 'function') {
                    switchTab(tab);
                }
            }
            
            // Legacy: Support .nav-item with onclick for backward compatibility
            const legacyNav = e.target.closest('.nav-item');
            if (legacyNav && !legacyNav.dataset.tab) {
                // Extract tab from onclick attribute if present
                const onclick = legacyNav.getAttribute('onclick');
                if (onclick && onclick.includes('switchTab')) {
                    const match = onclick.match(/switchTab\('([^']+)'\)/);
                    if (match && typeof switchTab === 'function') {
                        e.preventDefault();
                        switchTab(match[1]);
                    }
                }
            }
        });
    }
    
    /**
     * Settings tab handlers
     */
    initSettingsHandlers() {
        document.addEventListener('click', (e) => {
            // Settings navigation tabs (use data-settings-tab attribute)
            const settingsItem = e.target.closest('[data-settings-tab]');
            if (settingsItem) {
                e.preventDefault();
                const tab = settingsItem.dataset.settingsTab;
                if (typeof switchSettingsTab === 'function') {
                    switchSettingsTab(tab);
                }
            }
            
            // Legacy: Support .settings-nav-item with onclick
            const legacySettings = e.target.closest('.settings-nav-item');
            if (legacySettings && !legacySettings.dataset.settingsTab) {
                const onclick = legacySettings.getAttribute('onclick');
                if (onclick && onclick.includes('switchSettingsTab')) {
                    const match = onclick.match(/switchSettingsTab\('([^']+)'\)/);
                    if (match && typeof switchSettingsTab === 'function') {
                        e.preventDefault();
                        switchSettingsTab(match[1]);
                    }
                }
            }
        });
    }
    
    /**
     * Report navigation handlers
     */
    initReportHandlers() {
        document.addEventListener('click', (e) => {
            // Report navigation items (use data-report attribute)
            const reportItem = e.target.closest('[data-report]');
            if (reportItem) {
                e.preventDefault();
                const report = reportItem.dataset.report;
                
                // Update active state
                document.querySelectorAll('.report-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                reportItem.classList.add('active');
                
                // Load report if function exists
                if (typeof loadReport === 'function') {
                    loadReport(report);
                } else if (typeof window.ReportsModule?.loadReport === 'function') {
                    window.ReportsModule.loadReport(report);
                }
            }
        });
    }
    
    /**
     * Form submission handlers
     */
    initFormHandlers() {
        // Product form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (typeof saveProduct === 'function') {
                    saveProduct();
                }
            });
        }
        
        // Batch form
        const batchForm = document.getElementById('batchForm');
        if (batchForm) {
            batchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (typeof saveBatch === 'function') {
                    saveBatch();
                }
            });
        }
        
        // Category form
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (typeof saveCategory === 'function') {
                    saveCategory();
                } else if (typeof window.CategoriesManager?.saveCategory === 'function') {
                    window.CategoriesManager.saveCategory();
                }
            });
        }
        
        // Supplier form
        const supplierForm = document.getElementById('supplierForm');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (typeof saveSupplier === 'function') {
                    saveSupplier();
                } else if (typeof window.SuppliersManager?.saveSupplier === 'function') {
                    window.SuppliersManager.saveSupplier();
                }
            });
        }
    }
    
    /**
     * Button click handlers
     */
    initButtonHandlers() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                e.preventDefault();
                const action = button.dataset.action;
                const param = button.dataset.param;
                
                // Call function by name
                if (typeof window[action] === 'function') {
                    if (param) {
                        window[action](param);
                    } else {
                        window[action]();
                    }
                }
            }
        });
    }
    
    /**
     * Manual cleanup for hot reload
     */
    destroy() {
        this.initialized = false;
        console.log('⚠️  EventManager destroyed');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.eventManager = new EventManager();
        window.eventManager.init();
    });
} else {
    // DOM already loaded
    window.eventManager = new EventManager();
    window.eventManager.init();
}

/**
 * Export for module usage
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventManager;
}