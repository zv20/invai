/**
 * Categories Manager - v0.10.1
 * Manages product categories
 * FIXED v0.10.1: Removed inline onclick handlers for CSP compliance
 * FIXED v0.8.4a: Removed inline styles for CSP compliance
 */

let categories = [];
let editingCategoryId = null;

// Load categories from API
window.loadCategories = async function() {
    console.log('🔄 Loading categories...');
    try {
        const response = await authFetch('/api/categories');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        categories = data;
        
        console.log(`✅ Loaded ${categories.length} categories:`, categories);
        
        renderCategoriesList();
        updateCategoryDropdown();
        
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        const container = document.getElementById('categoriesList');
        if (container) {
            container.innerHTML = `<p class="error-message">Failed to load categories: ${error.message}</p>`;
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
    
    // FIXED v0.10.1: Removed inline onclick handlers, using data-action for CSP compliance
    container.innerHTML = categories.map(cat => `
        <div class="category-item">
            <span class="category-name">${escapeHtml(cat.name)}</span>
            <div class="category-actions">
                <button class="btn-icon" data-action="editCategory" data-category-id="${cat.id}" title="Edit">✏️</button>
                <button class="btn-icon" data-action="deleteCategory" data-category-id="${cat.id}" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Categories rendered to UI');
}

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
            categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
        select.value = oldValue;
        console.log('✅ Category dropdown updated');
    }
}

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
    modal.style.display = 'block';
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal').style.display = 'none';
    editingCategoryId = null;
};

window.deleteCategory = async function(id) {
    const category = categories.find(c => c.id === id);
    if (!confirm(`Delete category "${category.name}"? Products will be moved to "Uncategorized".`)) {
        return;
    }
    
    try {
        const response = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Category deleted', 'success');
            await window.loadCategories();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    }
};

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
                name: document.getElementById('categoryName').value
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
                    
                    setTimeout(async () => {
                        console.log('🔄 Reloading categories after save...');
                        await window.loadCategories();
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
