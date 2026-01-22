/* ==========================================================================
   Settings Management - v0.7.8a
   Version checking, updates, export/import, backup system, and settings
   FIXED: Added missing button handlers for update buttons
   ========================================================================== */

let updateCheckIntervalId = null;
let currentSettingsTab = 'updates';

/* ==========================================================================
   Settings Tab Navigation
   ========================================================================== */

function switchSettingsTab(tabName) {
    currentSettingsTab = tabName;
    
    // Hide all settings tabs
    document.querySelectorAll('.settings-subtab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`settings-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update nav highlighting
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navButton = document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tabName === 'backups') {
        loadBackups();
    } else if (tabName === 'about') {
        loadAboutInfo();
    } else if (tabName === 'categories') {
        if (typeof loadCategories === 'function') {
            loadCategories();
        }
    } else if (tabName === 'suppliers') {
        if (typeof loadSuppliers === 'function') {
            loadSuppliers();
        }
    }
}

/* ==========================================================================
   About Section - Dynamic Loading
   ========================================================================== */

async function loadAboutInfo() {
    try {
        const response = await fetch(`${API_URL}/api/changelog`);
        const data = await response.json();
        
        const aboutSection = document.getElementById('settings-about');
        if (!aboutSection) return;
        
        const container = aboutSection.querySelector('.settings-section');
        if (!container) return;
        
        let html = `
            <h3>🛍️ Grocery Inventory v${data.currentVersion}</h3>
            <p style="margin-top: 10px;">Professional inventory management for grocery stores</p>
        `;
        
        if (data.versions && data.versions.length > 0) {
            html += `<h4 style="margin-top: 25px; margin-bottom: 10px;">Recent Updates</h4><ul class="changelog-list">`;
            
            data.versions.slice(0, 5).forEach(version => {
                html += `<li style="margin-bottom: 15px;"><strong>v${version.version}</strong> - ${version.date}<ul style="margin-left: 20px; margin-top: 5px;">`;
                
                let lastCategory = null;
                version.changes.forEach(change => {
                    if (change.type === 'category') {
                        if (lastCategory) html += '</ul>';
                        html += `<li style="font-weight: 600; color: #667eea; margin-top: 8px;">${change.text}<ul style="margin-left: 15px;">`;
                        lastCategory = change.text;
                    } else if (change.type === 'item') {
                        html += `<li style="font-weight: normal; color: #374151;">${change.text}</li>`;
                    }
                });
                
                if (lastCategory) html += '</ul>';
                html += '</ul></li>';
            });
            
            html += '</ul>';
        }
        
        html += `
            <h4 style="margin-top: 25px; margin-bottom: 10px;">Features</h4>
            <ul class="changelog-list">
                <li>📊 Dashboard with real-time statistics</li>
                <li>🚨 Expiration alerts (expired, urgent, soon)</li>
                <li>🔄 Unified inventory with detail view</li>
                <li>📦 Product catalog management</li>
                <li>📋 Batch inventory tracking</li>
                <li>📷 Barcode scanning</li>
                <li>💾 Automated backups with retention</li>
                <li>♻️ Backup restore with safety snapshots</li>
                <li>📊 CSV import/export</li>
            </ul>
            <h4 style="margin-top: 25px; margin-bottom: 10px;">Links</h4>
            <p><a href="https://github.com/zv20/invai" target="_blank" style="color: #667eea; text-decoration: underline;">🔗 GitHub Repository</a></p>
            <p style="margin-top: 10px;"><a href="https://github.com/zv20/invai/blob/main/CHANGELOG.md" target="_blank" style="color: #667eea; text-decoration: underline;">📋 Full Changelog</a></p>
            <p style="margin-top: 10px;"><a href="https://github.com/zv20/invai/issues" target="_blank" style="color: #667eea; text-decoration: underline;">📝 Report an Issue</a></p>
            <h4 style="margin-top: 25px; margin-bottom: 10px;">License</h4>
            <p>MIT License - Free to use and modify</p>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading about info:', error);
    }
}

/* ==========================================================================
   Update Interval Management
   ========================================================================== */

function getUpdateInterval() {
    const saved = localStorage.getItem('updateCheckInterval');
    return saved ? parseInt(saved) : 86400000; // Default 24 hours
}

function saveUpdateInterval() {
    const select = document.getElementById('updateCheckInterval');
    if (!select) return;
    
    const interval = parseInt(select.value);
    localStorage.setItem('updateCheckInterval', interval);
    
    setupUpdateChecker();
    
    const intervalNames = {
        0: 'Never',
        3600000: 'Every Hour',
        21600000: 'Every 6 Hours',
        43200000: 'Every 12 Hours',
        86400000: 'Every 24 Hours',
        604800000: 'Weekly'
    };
    
    showNotification(`✓ Update check frequency: ${intervalNames[interval]}`, 'success');
}

function setupUpdateChecker() {
    if (updateCheckIntervalId) {
        clearInterval(updateCheckIntervalId);
        updateCheckIntervalId = null;
    }

    const interval = getUpdateInterval();
    
    if (interval === 0) {
        console.log('Auto-update check disabled');
        return;
    }

    console.log(`Auto-update check every ${interval / 1000 / 60} minutes`);
    updateCheckIntervalId = setInterval(checkVersion, interval);
}

/* ==========================================================================
   Version Checking - NEW: Added button handlers
   ========================================================================== */

// NEW: Manual check for updates button handler
window.checkForUpdatesNow = async function() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⌛ Checking...';
    }
    
    try {
        await checkVersion();
        showNotification('✓ Update check complete', 'success');
    } catch (error) {
        showNotification('✗ Failed to check for updates', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Check for Updates';
        }
    }
};

// NEW: Switch channel and update button handler
window.switchChannelAndUpdate = async function() {
    const select = document.getElementById('updateChannelSelect');
    if (!select) {
        showNotification('✗ Channel selector not found', 'error');
        return;
    }
    
    const newChannel = select.value;
    const btn = event?.target;
    
    if (!confirm(`Switch to ${newChannel} channel and update?\n\nThis will:\n✓ Create a backup\n✓ Switch to ${newChannel} branch\n✓ Pull latest changes\n✓ Restart the server\n\nContinue?`)) {
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⌛ Switching...';
    }
    
    try {
        const response = await fetch(`${API_URL}/api/settings/switch-channel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: newChannel })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✓ Switched to ${newChannel} channel!\n\nBackup: ${data.backupFile}\nBranch: ${data.branch}\n\nServer will restart now.`);
            location.reload();
        } else {
            showNotification(`✗ Failed: ${data.error}`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔄 Switch & Update';
            }
        }
    } catch (error) {
        console.error('Channel switch error:', error);
        showNotification('✗ Failed to switch channel', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Switch & Update';
        }
    }
};

async function checkVersion() {
    try {
        const response = await fetch(`${API_URL}/api/version`);
        const data = await response.json();
        versionInfo = data;
        
        const settingsVersion = document.getElementById('settingsVersion');
        const latestVersion = document.getElementById('latestVersion');
        const lastCheck = document.getElementById('lastCheck');
        const statusDiv = document.getElementById('versionStatus');
        const versionFooter = document.getElementById('versionFooter');
        const footerText = document.getElementById('footerVersionText');
        
        if (settingsVersion) settingsVersion.textContent = data.currentVersion;
        if (latestVersion) latestVersion.textContent = data.latestVersion;
        if (lastCheck) lastCheck.textContent = new Date().toLocaleString();
        
        if (data.updateAvailable) {
            const updateBanner = document.getElementById('updateBanner');
            if (updateBanner) updateBanner.classList.add('show');
            if (versionFooter) versionFooter.classList.add('update-available');
            if (footerText) footerText.textContent = `⚠️ ${data.currentVersion} → ${data.latestVersion}`;
            
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#fef3c7';
                statusDiv.style.border = '2px solid #f59e0b';
                statusDiv.style.color = '#92400e';
                statusDiv.innerHTML = `<strong>🎉 Update Available!</strong><br>Current: ${data.currentVersion} → Latest: ${data.latestVersion}<br><a href="https://github.com/zv20/invai" target="_blank" style="color: #92400e; text-decoration: underline;">View on GitHub</a>`;
            }
        } else {
            const updateBanner = document.getElementById('updateBanner');
            if (updateBanner) updateBanner.classList.remove('show');
            if (versionFooter) versionFooter.classList.remove('update-available');
            if (footerText) footerText.textContent = `✓ v${data.currentVersion}`;
            
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#dcfce7';
                statusDiv.style.border = '2px solid #10b981';
                statusDiv.style.color = '#065f46';
                statusDiv.innerHTML = '<strong>✓ You are running the latest version!</strong>';
            }
        }
    } catch (error) {
        console.error('Error checking version:', error);
        const statusDiv = document.getElementById('versionStatus');
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#fee2e2';
            statusDiv.style.border = '2px solid #ef4444';
            statusDiv.style.color = '#991b1b';
            statusDiv.innerHTML = '<strong>✕ Failed to check for updates</strong><br>Check your connection.';
        }
    }
}

/* ==========================================================================
   Backup System
   ========================================================================== */

async function createBackup() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⌛ Creating...';
    
    try {
        const response = await fetch(`${API_URL}/api/backup/create`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✓ Backup created: ${data.filename}`, 'success');
            loadBackups();
        } else {
            showNotification(`✗ Backup failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Backup error:', error);
        showNotification('✗ Failed to create backup', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Create Backup Now';
    }
}

async function loadBackups() {
    const list = document.getElementById('backupList');
    if (!list) return;
    
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: #9ca3af;">⌛ Loading backups...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/backup/list`);
        const backups = await response.json();
        
        if (!response.ok) {
            throw new Error(backups.error || 'Failed to load backups');
        }
        
        if (backups.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: #9ca3af;">📂 No backups yet</div>';
            return;
        }
        
        list.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">💾 ${backup.filename}</div>
                    <div class="backup-meta">
                        <span>📅 ${new Date(backup.created).toLocaleString()}</span>
                        <span>📦 ${formatFileSize(backup.size)}</span>
                        <span>⏰ ${formatAge(backup.age)}</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button onclick="restoreBackup('${backup.filename}')" class="btn-small btn-primary">♻️ Restore</button>
                    <button onclick="downloadBackup('${backup.filename}')" class="btn-small btn-primary">⬇️ Download</button>
                    <button onclick="deleteBackup('${backup.filename}')" class="btn-small btn-danger">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading backups:', error);
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">✗ Failed to load backups</div>';
    }
}

async function restoreBackup(filename) {
    if (!confirm(`⚠️ RESTORE DATABASE FROM BACKUP?\n\nRestore from: ${filename}\n\n✓ A safety backup will be created first\n✓ Current data will be replaced\n✓ Page will reload after restore\n\nContinue?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/backup/restore/${filename}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✓ Database Restored!\n\nRestored from: ${data.restoredFrom}\nSafety backup: ${data.safetyBackup}\n\nPage will now reload.`);
            location.reload();
        } else {
            showNotification(`✗ Restore failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Restore error:', error);
        showNotification('✗ Failed to restore backup', 'error');
    }
}

function downloadBackup(filename) {
    window.location.href = `${API_URL}/api/backup/download/${filename}`;
    showNotification(`⬇️ Downloading: ${filename}`, 'success');
}

async function deleteBackup(filename) {
    if (!confirm(`Delete backup: ${filename}?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/backup/delete/${filename}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✓ Backup deleted: ${filename}`, 'success');
            loadBackups();
        } else {
            showNotification(`✗ Failed to delete: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('✗ Failed to delete backup', 'error');
    }
}

function triggerUploadRestore() {
    const input = document.getElementById('backupUploadInput');
    if (input) input.click();
}

async function handleUploadRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.db')) {
        showNotification('⚠️ Please select a valid .db file', 'error');
        event.target.value = '';
        return;
    }
    
    if (!confirm(`⚠️ RESTORE DATABASE FROM UPLOAD?\n\nFile: ${file.name}\nSize: ${formatFileSize(file.size)}\n\n✓ A safety backup will be created first\n✓ Current data will be replaced\n✓ Page will reload after restore\n\nContinue?`)) {
        event.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('backup', file);
    
    try {
        const response = await fetch(`${API_URL}/api/backup/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✓ Database Restored!\n\nRestored from: ${data.originalFilename}\nSafety backup: ${data.safetyBackup}\n\nPage will now reload.`);
            location.reload();
        } else {
            showNotification(`✗ Upload restore failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Upload restore error:', error);
        showNotification('✗ Failed to restore from upload', 'error');
    } finally {
        event.target.value = '';
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/* ==========================================================================
   Export/Import Functions
   ========================================================================== */

function exportCSV() {
    window.location.href = `${API_URL}/api/export/inventory`;
    showNotification('📥 Exporting inventory...', 'success');
}

function triggerImport() {
    const input = document.getElementById('csvFileInput');
    if (input) input.click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showNotification('⚠️ Please select a valid CSV file', 'error');
        event.target.value = '';
        return;
    }
    
    if (!confirm(`Import data from "${file.name}"?\n\nThis will add products and batches from the CSV file.\n\nExisting data will NOT be deleted.`)) {
        event.target.value = '';
        return;
    }
    
    try {
        const text = await file.text();
        
        const response = await fetch(`${API_URL}/api/import/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv'
            },
            body: text
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`✓ Import Successful!\n\nProducts created: ${result.productsCreated}\nProducts updated: ${result.productsUpdated}\nBatches created: ${result.batchesCreated}\nErrors: ${result.errors}\n\nThe page will now reload.`);
            location.reload();
        } else {
            showNotification(`✗ Import Failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Import error:', error);
        showNotification('✗ Failed to import CSV file', 'error');
    }
    
    event.target.value = '';
}

/* ==========================================================================
   Database Reset
   ========================================================================== */

async function confirmReset() {
    if (!confirm('⚠️ WARNING: Delete ALL Data?\n\nThis will permanently delete:\n• All products\n• All inventory batches\n• All settings\n\nThis action CANNOT be undone!\n\nClick OK to continue or Cancel to abort.')) {
        return;
    }
    
    if (!confirm('🚨 FINAL WARNING!\n\nYou are about to delete EVERYTHING.\n\nMake sure you have exported your data first!\n\nType confirmation required. Click OK to proceed.')) {
        return;
    }
    
    const confirmation = prompt('Type "DELETE ALL" (in caps) to confirm:');
    if (confirmation !== 'DELETE ALL') {
        alert('Reset cancelled. Database was not modified.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/database/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✓ Database reset successful!\n\nAll data has been deleted.\n\nThe page will now reload.');
            localStorage.clear();
            location.reload();
        } else {
            showNotification('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        showNotification('Failed to reset database', 'error');
    }
}

/* ==========================================================================
   Notification Helper
   ========================================================================== */

function showNotification(message, type = 'info') {
    const colors = {
        success: { bg: '#dcfce7', border: '#10b981', text: '#065f46' },
        error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
        info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
    };
    
    const color = colors[type] || colors.info;
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        border: 2px solid ${color.border};
        color: ${color.text};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100001;
        font-weight: 600;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show toast for compatibility with other modules
function showToast(message, type) {
    showNotification(message, type);
}