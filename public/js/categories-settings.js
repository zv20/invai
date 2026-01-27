/**
 * Categories Settings Module
 * Frontend management for categories in Settings page
 */

let categoriesList = [];

/**
 * Load all categories from API and display
 */
async function loadCategories() {
    try {
        const response = await authFetch(`${API_URL}/api/categories`);
        if (!response.ok) throw new Error('Failed to load categories');
        
        categoriesList = await response.json();
        renderCategoriesList();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Failed to load categories', 'error');
    }
}

/**
 * Render categories list in UI
 */
function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (categoriesList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">📦 No categories yet</div>';
        return;
    }
    
    container.innerHTML = categoriesList.map(cat => `
        <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; background: white;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">${cat.icon || '📦'}</span>
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${escapeHtml(cat.name)}</div>
                    ${cat.description ? `<div style="font-size: 0.875rem; color: #6b7280;">${escapeHtml(cat.description)}</div>` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="editCategory(${cat.id})" class="btn-small btn-primary" style="padding: 6px 12px; font-size: 0.875rem;">✏️ Edit</button>
                <button onclick="deleteCategory(${cat.id})" class="btn-small btn-danger" style="padding: 6px 12px; font-size: 0.875rem;">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Show add category modal
 */
function showAddCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');
    
    if (!modal || !form || !title) return;
    
    title.textContent = '➕ Add Category';
    form.reset();
    form.dataset.mode = 'add';
    delete form.dataset.categoryId;
    
    modal.classList.add('show');
}

/**
 * Show edit category modal
 */
async function editCategory(id) {
    try {
        const response = await authFetch(`${API_URL}/api/categories/${id}`);
        if (!response.ok) throw new Error('Failed to load category');
        
        const category = await response.json();
        
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        const title = document.getElementById('categoryModalTitle');
        
        if (!modal || !form || !title) return;
        
        title.textContent = '✏️ Edit Category';
        form.dataset.mode = 'edit';
        form.dataset.categoryId = id;
        
        document.getElementById('categoryName').value = category.name || '';
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryIcon').value = category.icon || '📦';
        document.getElementById('categoryColor').value = category.color || '#9333ea';
        
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading category:', error);
        showNotification('Failed to load category details', 'error');
    }
}

/**
 * Close category modal
 */
function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Save category (add or edit)
 */
async function saveCategory(event) {
    event.preventDefault();
    
    const form = event.target;
    const mode = form.dataset.mode;
    const categoryId = form.dataset.categoryId;
    
    const data = {
        name: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDescription').value.trim(),
        icon: document.getElementById('categoryIcon').value.trim() || '📦',
        color: document.getElementById('categoryColor').value || '#9333ea'
    };
    
    if (!data.name) {
        showNotification('Category name is required', 'warning');
        return;
    }
    
    try {
        const url = mode === 'edit' 
            ? `${API_URL}/api/categories/${categoryId}`
            : `${API_URL}/api/categories`;
        
        const method = mode === 'edit' ? 'PUT' : 'POST';
        
        const response = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save category');
        }
        
        showNotification(
            mode === 'edit' ? 'Category updated successfully' : 'Category added successfully',
            'success'
        );
        
        closeCategoryModal();
        await loadCategories(); // Refresh the list
        
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification(error.message || 'Failed to save category', 'error');
    }
}

/**
 * Delete category
 */
async function deleteCategory(id) {
    const category = categoriesList.find(c => c.id === id);
    if (!category) return;
    
    if (!confirm(`Delete category "${category.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/api/categories/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
        
        showNotification('Category deleted successfully', 'success');
        await loadCategories(); // Refresh the list
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification(error.message || 'Failed to delete category', 'error');
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-load categories when settings tab is opened
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Categories will be loaded when tab is switched via switchSettingsTab()
    });
}
