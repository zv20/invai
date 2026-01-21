// Category Management Module
const CategoryManager = (() => {
    let categories = [];
    
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            categories = await response.json();
            renderCategoriesList();
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        }
    }
    
    function renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        if (categories.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No categories found</p>';
            return;
        }
        
        container.innerHTML = categories.map(cat => `
            <div class="category-card" data-id="${cat.id}">
                <div class="category-header">
                    <span class="category-icon" style="background: ${cat.color}">${cat.icon}</span>
                    <div class="category-info">
                        <h4>${cat.name}</h4>
                        <p>${cat.description || ''}</p>
                    </div>
                    <div class="category-actions">
                        <button onclick="CategoryManager.editCategory(${cat.id})" class="btn-icon" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="CategoryManager.deleteCategory(${cat.id})" class="btn-icon text-red-600" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function showCategoryModal(category = null) {
        const isEdit = category !== null;
        const modal = document.getElementById('category-modal');
        const form = document.getElementById('category-form');
        
        document.getElementById('category-modal-title').textContent = isEdit ? 'Edit Category' : 'Add Category';
        
        if (isEdit) {
            document.getElementById('category-id').value = category.id;
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-description').value = category.description || '';
            document.getElementById('category-color').value = category.color || '#9333ea';
            document.getElementById('category-icon').value = category.icon || '';
        } else {
            form.reset();
            document.getElementById('category-id').value = '';
            document.getElementById('category-color').value = '#9333ea';
        }
        
        modal.classList.remove('hidden');
    }
    
    async function saveCategory(event) {
        event.preventDefault();
        
        const id = document.getElementById('category-id').value;
        const data = {
            name: document.getElementById('category-name').value.trim(),
            description: document.getElementById('category-description').value.trim(),
            color: document.getElementById('category-color').value,
            icon: document.getElementById('category-icon').value.trim()
        };
        
        try {
            const url = id ? `/api/categories/${id}` : '/api/categories';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(id ? 'Category updated successfully' : 'Category added successfully', 'success');
                closeCategoryModal();
                loadCategories();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save category', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to save category', 'error');
        }
    }
    
    async function deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category? Products using this category will need to be reassigned.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            
            if (response.ok) {
                showToast('Category deleted successfully', 'success');
                loadCategories();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category', 'error');
        }
    }
    
    function editCategory(id) {
        const category = categories.find(c => c.id === id);
        if (category) {
            showCategoryModal(category);
        }
    }
    
    function closeCategoryModal() {
        document.getElementById('category-modal').classList.add('hidden');
    }
    
    return {
        init: loadCategories,
        loadCategories,
        showCategoryModal,
        saveCategory,
        deleteCategory,
        editCategory,
        closeCategoryModal
    };
})();
