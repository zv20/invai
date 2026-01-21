/**
 * Categories Manager - v0.7.4
 * Handles category CRUD operations
 */

let categories = [];
let editingCategoryId = null;

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        renderCategoriesList();
        
        // Also update product modal dropdown
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No categories yet. Click "Add Category" to create one.</p>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" style="border-left: 4px solid ${cat.color}">
            <div class="category-icon">${cat.icon || '🏷️'}</div>
            <div class="category-info">
                <h4>${cat.name}</h4>
                <p>${cat.description || 'No description'}</p>
            </div>
            <div class="category-actions">
                <button class="btn-icon" onclick="editCategory(${cat.id})" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteCategory(${cat.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function updateCategoryDropdown() {
    const select = document.getElementById('prodCategory');
    if (select) {
        select.innerHTML = '<option value="">Select category...</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.icon || ''} ${cat.name}</option>`).join('');
    }
}

function openAddCategoryModal() {
    editingCategoryId = null;
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryColor').value = '#667eea';
    document.getElementById('categoryModal').style.display = 'block';
}

function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    editingCategoryId = id;
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryModal').style.display = 'block';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    editingCategoryId = null;
}

async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!confirm(`Delete category "${category.name}"? Products will be moved to "Other".`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Category deleted', 'success');
            loadCategories();
        } else {
            showToast('Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    }
}

// Form submit handler
if (document.getElementById('categoryForm')) {
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            color: document.getElementById('categoryColor').value
        };
        
        try {
            const url = editingCategoryId 
                ? `/api/categories/${editingCategoryId}` 
                : '/api/categories';
            const method = editingCategoryId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(editingCategoryId ? 'Category updated' : 'Category created', 'success');
                closeCategoryModal();
                loadCategories();
            } else {
                showToast('Failed to save category', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to save category', 'error');
        }
    });
}
