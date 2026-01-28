/**
 * Categories Manager - v0.10.5
 * Handles category CRUD operations
 * ADDED v0.10.5: Client-side caching to reduce API calls and prevent rate limiting (PR #32)
 * FIXED v0.10.3: Removed inline styles for 100% CSP compliance (PR #29)
 * FIXED v0.10.2: Added safety check in deleteCategory to prevent crash
 * FIXED v0.10.1: Removed inline onclick handlers for CSP compliance
 */

let categories = [];
let editingCategoryId = null;

// Cache management
const categoriesCache = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
    
    isValid() {
        return this.data && (Date.now() - this.timestamp) < this.ttl;
    },
    
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
        console.log('💾 Categories cached for 5 minutes');
    },
    
    get() {
        return this.data;
    },
    
    invalidate() {
        this.data = null;
        this.timestamp = 0;
        console.log('🗑️  Categories cache invalidated');
    }
};

// Load categories with caching
window.loadCategories = async function(forceRefresh = false) {
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && categoriesCache.isValid()) {
        console.log('✅ Using cached categories');
        categories = categoriesCache.get();
        renderCategoriesList();
        updateCategoryDropdown();
        return;
    }
    
    console.log('🔄 Loading categories from API...');
    try {
        const response = await authFetch('/api/categories');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        categories = data;
        categoriesCache.set(data);
        
        console.log(`✅ Loaded ${categories.length} categories:`, categories);
        
        renderCategoriesList();
        updateCategoryDropdown();
        
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        const container = document.getElementById('categoriesList');
        if (container) {
            container.innerHTML = `<p class="error-state">Failed to load categories: ${error.message}</p>`;
        }
    }
};

function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    if (!container) {
        console.warn('⚠️  categoriesList container not found');
        return;
    }
    
    console.log(`🎨 Rendering ${categories.length} categories...`);
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">No categories yet. Click "Add Category" to create one.</p>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-icon">${cat.icon || '🏷️'}</div>
            <div class="category-info">
                <h4>${escapeHtml(cat.name)}</h4>
                <p>${escapeHtml(cat.description || 'No description')}</p>
            </div>
            <div class="category-actions">
                <button class="btn-icon" data-action="editCategory" data-category-id="${cat.id}" title="Edit">✏️</button>
                <button class="btn-icon" data-action="deleteCategory" data-category-id="${cat.id}" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Categories rendered to UI');
}

// Simple HTML escape function
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCategoryDropdown() {
    const select = document.getElementById('prodCategory');
    if (select) {
        const oldValue = select.value;
        select.innerHTML = '<option value="">Select category...</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.icon || ''} ${escapeHtml(cat.name)}</option>`).join('');
        select.value = oldValue;
        console.log('✅ Category dropdown updated');
    }
}

// Make globally accessible
window.openAddCategoryModal = function() {
    editingCategoryId = null;
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    
    if (!modal || !form) {
        console.error('Category modal or form not found!');
        alert('Error: Modal not found. Please refresh the page.');
        return;
    }
    
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    form.reset();
    modal.style.display = 'block';
};

window.editCategory = function(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    editingCategoryId = id;
    const modal = document.getElementById('categoryModal');
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    modal.style.display = 'block';
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal').style.display = 'none';
    editingCategoryId = null;
};

window.deleteCategory = async function(id) {
    const category = categories.find(c => c.id === id);
    
    if (!category) {
        console.warn('⚠️  Category not found, may have been already deleted');
        return;
    }
    
    if (!confirm(`Delete category "${category.name}"? Products will be moved to "Other".`)) {
        return;
    }
    
    try {
        const response = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Category deleted', 'success');
            // Invalidate cache and force reload
            categoriesCache.invalidate();
            await window.loadCategories(true);
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    }
};

// Form submit handler
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCategoryForm);
} else {
    setupCategoryForm();
}

function setupCategoryForm() {
    const form = document.getElementById('categoryForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                name: document.getElementById('categoryName').value,
                description: document.getElementById('categoryDescription').value,
                color: '#667eea'
            };
            
            console.log('💾 Saving category:', data);
            
            try {
                const url = editingCategoryId 
                    ? `/api/categories/${editingCategoryId}` 
                    : '/api/categories';
                const method = editingCategoryId ? 'PUT' : 'POST';
                
                console.log(`🚀 ${method} ${url}`);
                
                const response = await authFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Category saved:', result);
                    
                    showToast(editingCategoryId ? 'Category updated' : 'Category created', 'success');
                    window.closeCategoryModal();
                    
                    // Invalidate cache and force reload
                    categoriesCache.invalidate();
                    setTimeout(async () => {
                        console.log('🔄 Reloading categories after save...');
                        await window.loadCategories(true);
                    }, 100);
                } else {
                    const error = await response.json();
                    console.error('❌ Save failed:', error);
                    showToast(error.error || 'Failed to save category', 'error');
                }
            } catch (error) {
                console.error('❌ Error saving category:', error);
                showToast('Failed to save category: ' + error.message, 'error');
            }
        });
    } else {
        console.warn('⚠️  categoryForm not found - form submission will not work');
    }
}
