// User Management Module - CSP Compliant
// Handles all user management functionality

let currentPage = 1;
let totalPages = 1;

// Check permissions on page load
async function checkPermissions() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'owner' && payload.role !== 'admin') {
            alert('⚠️ You do not have permission to access this page');
            window.location.href = '/';
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error checking permissions:', e);
        window.location.href = '/login.html';
        return false;
    }
}

// Load users from API
async function loadUsers(page = 1) {
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const is_active = document.getElementById('statusFilter')?.value || '';
        
        const params = new URLSearchParams({
            page,
            limit: 20,
            ...(search && { search }),
            ...(role && { role }),
            ...(is_active && { is_active })
        });
        
        const response = await authFetch(`/api/users?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const result = await response.json();
        displayUsers(result.data.users);
        updatePagination(result.data.pagination);
        
        currentPage = result.data.pagination.page;
        totalPages = result.data.pagination.pages;
    } catch (error) {
        console.error('Error loading users:', error);
        const grid = document.getElementById('userGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>⚠️ Failed to load users</p>
                    <p style="font-size: 0.9rem; color: #666;">${error.message}</p>
                </div>
            `;
        }
    }
}

// Display users in grid
function displayUsers(users) {
    const grid = document.getElementById('userGrid');
    if (!grid) return;
    
    if (users.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
        return;
    }
    
    grid.innerHTML = users.map(user => {
        const isLocked = user.account_locked && user.locked_until && new Date(user.locked_until) > new Date();
        const lockClass = isLocked ? 'locked' : '';
        
        return `
        <div class="user-card ${lockClass}">
            <div class="user-info">
                <h3>
                    ${escapeHtml(user.username)}
                    <span class="user-badge role-${user.role}">${user.role}</span>
                    ${isLocked ? '<span class="user-badge badge-warning">🔒 Locked</span>' : ''}
                </h3>
                <div class="user-meta">
                    <span>📧 ${escapeHtml(user.email)}</span>
                    <span class="status-${user.is_active ? 'active' : 'inactive'}">
                        ${user.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                    ${user.last_login ? `<span>Last login: ${new Date(user.last_login).toLocaleDateString()}</span>` : '<span>🆕 Never logged in</span>'}
                </div>
            </div>
            <div class="user-actions">
                ${isLocked ? `<button data-action="unlockUser" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">🔓 Unlock</button>` : ''}
                <button data-action="editUser" data-user-id="${user.id}">Edit</button>
                <button data-action="resetPassword" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">Reset Password</button>
                ${user.is_active ? 
                    `<button data-action="deactivateUser" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" class="btn-danger">Deactivate</button>` :
                    `<button data-action="activateUser" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" class="btn-success">Activate</button>`
                }
            </div>
        </div>
    `}).join('');
}

// Update pagination controls
function updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (pagination.pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (pagination.page > 1) {
        html += `<button data-action="loadUsersPage" data-page="${pagination.page - 1}">Previous</button>`;
    }
    
    html += `<span>Page ${pagination.page} of ${pagination.pages} (${pagination.total} users)</span>`;
    
    if (pagination.page < pagination.pages) {
        html += `<button data-action="loadUsersPage" data-page="${pagination.page + 1}">Next</button>`;
    }
    
    paginationDiv.innerHTML = html;
}

// Password strength calculator
function calculatePasswordStrength(password) {
    if (!password) return { score: 0, label: 'weak', color: 'weak' };
    
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (varietyCount >= 3) score++;
    if (varietyCount === 4) score++;
    
    score = Math.max(0, Math.min(3, Math.floor(score / 3)));
    
    const levels = [
        { score: 0, label: 'Weak', color: 'weak' },
        { score: 1, label: 'Fair', color: 'fair' },
        { score: 2, label: 'Good', color: 'good' },
        { score: 3, label: 'Strong', color: 'strong' }
    ];
    
    return levels[score];
}

// Update password strength meter
function updateStrengthMeter() {
    const password = document.getElementById('password')?.value || '';
    const meter = document.getElementById('strengthMeter');
    const fill = document.getElementById('strengthFill');
    const label = document.getElementById('strengthLabel');
    
    if (!password || !meter || !fill || !label) {
        if (meter) meter.style.display = 'none';
        return;
    }
    
    meter.style.display = 'block';
    const strength = calculatePasswordStrength(password);
    
    fill.className = `strength-fill ${strength.color}`;
    label.className = `strength-label ${strength.color}`;
    label.textContent = `Password Strength: ${strength.label}`;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize users page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        const hasPermission = await checkPermissions();
        if (hasPermission) {
            loadUsers();
            
            // Setup password strength meter
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', updateStrengthMeter);
            }
        }
    });
} else {
    checkPermissions().then(hasPermission => {
        if (hasPermission) {
            loadUsers();
            
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', updateStrengthMeter);
            }
        }
    });
}
