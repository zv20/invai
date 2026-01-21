/**
 * Categories Manager
 * Handles category CRUD operations and display
 */

class CategoriesManager {
    constructor() {
        this.categories = [];
        this.init();
    }

    async init() {
        await this.loadCategories();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            this.categories = await response.json();
            this.renderCategoriesList();
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        }
    }

    renderCategoriesList() {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = '<p class="no-data">No categories found</p>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div class="category-item" data-id="${cat.id}" style="border-left: 4px solid ${cat.color}">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-info">
                    <h4>${cat.name}</h4>
                    <p>${cat.description || 'No description'}</p>
                </div>
                <div class="category-actions">
                    <button class="btn-icon" onclick="categoriesManager.editCategory(${cat.id})" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="categoriesManager.deleteCategory(${cat.id})" title="Delete">
                        🗑️
                    </button>
                    <button class="btn-icon drag-handle" title="Reorder">
                        ☰
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addCategoryBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showCategoryModal());
        }
    }

    showCategoryModal(categoryId = null) {
        const category = categoryId ? this.categories.find(c => c.id === categoryId) : null;
        
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        
        if (category) {
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryColor').value = category.color;
            document.getElementById('categoryIcon').value = category.icon || '';
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        } else {
            form.reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryModalTitle').textContent = 'Add Category';
        }
        
        modal.style.display = 'block';
    }

    async saveCategory(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const categoryId = formData.get('categoryId');
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            color: formData.get('color'),
            icon: formData.get('icon')
        };

        try {
            const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
            const method = categoryId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast(categoryId ? 'Category updated' : 'Category created', 'success');
                this.closeCategoryModal();
                await this.loadCategories();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save category', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to save category', 'error');
        }
    }

    editCategory(id) {
        this.showCategoryModal(id);
    }

    async deleteCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (!confirm(`Delete category "${category.name}"? Products will be moved to "Other".`)) {
            return;
        }

        try {
            const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Category deleted', 'success');
                await this.loadCategories();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category', 'error');
        }
    }

    closeCategoryModal() {
        document.getElementById('categoryModal').style.display = 'none';
    }
}

// Global instance
let categoriesManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('categoriesList')) {
            categoriesManager = new CategoriesManager();
        }
    });
} else {
    if (document.getElementById('categoriesList')) {
        categoriesManager = new CategoriesManager();
    }
}
