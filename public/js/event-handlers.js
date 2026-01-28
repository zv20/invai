/**
 * Centralized Event Handler System
 * 
 * Replaces ALL inline onclick/onchange/onsubmit/oninput handlers with event delegation.
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
 * Instead of: <input oninput="calcCostPerItem()">
 * Use: <input id="prodCostPerCase" data-input-handler="calcCostPerItem">
 * 
 * Created: 2026-01-27
 * Updated: 2026-01-27 - Added product card and batch button handlers
 * Updated: 2026-01-28 - Added supplier button handlers (PR #26)
 * Issue: #11, #12, #13, #15
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
        
        // Input handlers (oninput replacement)
        this.initInputHandlers();
        
        // Change handlers (onchange replacement)
        this.initChangeHandlers();
        
        // File input handlers
        this.initFileHandlers();
        
        // Inventory handlers (product cards, batch buttons)
        this.initInventoryHandlers();
        
        // Supplier handlers (supplier edit/delete/toggle buttons)
        this.initSupplierHandlers();
        
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
            
            // Version footer click
            const versionFooter = e.target.closest('.version-footer');
            if (versionFooter) {
                if (typeof checkVersion === 'function') {
                    checkVersion();
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
     * Button click handlers with data-action
     */
    initButtonHandlers() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action], a[data-action]');
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
     * Input event handlers (replaces oninput)
     */
    initInputHandlers() {
        // Specific input handlers
        const prodPerCase = document.getElementById('prodPerCase');
        const prodCostPerCase = document.getElementById('prodCostPerCase');
        const batchCases = document.getElementById('batchCases');
        
        if (prodPerCase) {
            prodPerCase.addEventListener('input', () => {
                if (typeof calcCostPerItem === 'function') {
                    calcCostPerItem();
                }
            });
        }
        
        if (prodCostPerCase) {
            prodCostPerCase.addEventListener('input', () => {
                if (typeof calcCostPerItem === 'function') {
                    calcCostPerItem();
                }
            });
        }
        
        if (batchCases) {
            batchCases.addEventListener('input', () => {
                if (typeof calcBatchTotal === 'function') {
                    calcBatchTotal();
                }
            });
        }
    }
    
    /**
     * Change event handlers (replaces onchange)
     */
    initChangeHandlers() {
        // Filter change handlers
        const filterCategory = document.getElementById('filterCategory');
        const filterSupplier = document.getElementById('filterSupplier');
        const filterStock = document.getElementById('filterStock');
        const filterExpiry = document.getElementById('filterExpiry');
        
        if (filterCategory) {
            filterCategory.addEventListener('change', () => {
                if (typeof applyFilters === 'function') {
                    applyFilters();
                }
            });
        }
        
        if (filterSupplier) {
            filterSupplier.addEventListener('change', () => {
                if (typeof applyFilters === 'function') {
                    applyFilters();
                }
            });
        }
        
        if (filterStock) {
            filterStock.addEventListener('change', () => {
                if (typeof applyFilters === 'function') {
                    applyFilters();
                }
            });
        }
        
        if (filterExpiry) {
            filterExpiry.addEventListener('change', () => {
                if (typeof applyFilters === 'function') {
                    applyFilters();
                }
            });
        }
    }
    
    /**
     * File input handlers (replaces onchange for file inputs)
     */
    initFileHandlers() {
        // Backup upload restore
        const backupUploadInput = document.getElementById('backupUploadInput');
        if (backupUploadInput) {
            backupUploadInput.addEventListener('change', (event) => {
                if (typeof handleUploadRestore === 'function') {
                    handleUploadRestore(event);
                }
            });
        }
        
        // CSV file import
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (event) => {
                if (typeof handleImport === 'function') {
                    handleImport(event);
                }
            });
        }
    }
    
    /**
     * Inventory handlers - Product cards and batch buttons
     */
    initInventoryHandlers() {
        document.addEventListener('click', (e) => {
            // Product card click - open detail view
            const productCard = e.target.closest('.product-card');
            if (productCard && !e.target.closest('button')) {
                const productId = productCard.dataset.productId;
                if (productId && typeof viewProductDetail === 'function') {
                    viewProductDetail(parseInt(productId));
                }
                return;
            }
            
            // Batch edit button
            const editBatchBtn = e.target.closest('[data-batch-action="edit"]');
            if (editBatchBtn) {
                e.stopPropagation();
                const batchId = editBatchBtn.dataset.batchId;
                const productId = editBatchBtn.dataset.productId;
                if (batchId && productId && typeof editBatch === 'function') {
                    editBatch(parseInt(batchId), parseInt(productId));
                }
                return;
            }
            
            // Batch delete button
            const deleteBatchBtn = e.target.closest('[data-batch-action="delete"]');
            if (deleteBatchBtn) {
                e.stopPropagation();
                const batchId = deleteBatchBtn.dataset.batchId;
                if (batchId && typeof deleteBatch === 'function') {
                    deleteBatch(parseInt(batchId));
                }
                return;
            }
        });
    }
    
    /**
     * Supplier handlers - Edit, delete, and toggle status buttons (NEW for PR #26)
     */
    initSupplierHandlers() {
        document.addEventListener('click', (e) => {
            // Supplier toggle status button
            const toggleStatusBtn = e.target.closest('[data-action="toggleSupplierStatus"]');
            if (toggleStatusBtn) {
                e.stopPropagation();
                const supplierId = toggleStatusBtn.dataset.supplierId;
                const newStatus = toggleStatusBtn.dataset.newStatus;
                if (supplierId && typeof toggleSupplierStatus === 'function') {
                    toggleSupplierStatus(parseInt(supplierId), parseInt(newStatus));
                }
                return;
            }
            
            // Supplier edit button
            const editSupplierBtn = e.target.closest('[data-action="editSupplier"]');
            if (editSupplierBtn) {
                e.stopPropagation();
                const supplierId = editSupplierBtn.dataset.supplierId;
                if (supplierId && typeof editSupplier === 'function') {
                    editSupplier(parseInt(supplierId));
                }
                return;
            }
            
            // Supplier delete button
            const deleteSupplierBtn = e.target.closest('[data-action="deleteSupplier"]');
            if (deleteSupplierBtn) {
                e.stopPropagation();
                const supplierId = deleteSupplierBtn.dataset.supplierId;
                if (supplierId && typeof deleteSupplier === 'function') {
                    deleteSupplier(parseInt(supplierId));
                }
                return;
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