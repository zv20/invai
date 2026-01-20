/* ==========================================================================
   Settings Management
   Version checking, updates, export/import, backup system, and settings
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
    document.getElementById(`settings-${tabName}`).classList.add('active');
    
    // Update nav highlighting
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`).classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'backups') {
        loadBackups();
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
   Version Checking
   ========================================================================== */

async function checkVersion() {
    try {
        const response = await fetch(`${API_URL}/api/version`);
        const data = await response.json();
        versionInfo = data;
        
        document.getElementById('settingsVersion').textContent = data.currentVersion;
        document.getElementById('latestVersion').textContent = data.latestVersion;
        document.getElementById('lastCheck').textContent = new Date().toLocaleString();
        
        const statusDiv = document.getElementById('versionStatus');
        const versionFooter = document.getElementById('versionFooter');
        const footerText = document.getElementById('footerVersionText');
        
        if (data.updateAvailable) {
            document.getElementById('updateBanner').classList.add('show');
            versionFooter.classList.add('update-available');
            footerText.textContent = `⚠️ ${data.currentVersion} → ${data.latestVersion}`;
            
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#fef3c7';
            statusDiv.style.border = '2px solid #f59e0b';
            statusDiv.style.color = '#92400e';
            statusDiv.innerHTML = `<strong>🎉 Update Available!</strong><br>Current: ${data.currentVersion} → Latest: ${data.latestVersion}<br><a href="https://github.com/zv20/invai" target="_blank" style="color: #92400e; text-decoration: underline;">View on GitHub</a>`;
        } else {
            document.getElementById('updateBanner').classList.remove('show');
            versionFooter.classList.remove('update-available');
            footerText.textContent = `✓ v${data.currentVersion}`;
            
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#dcfce7';
            statusDiv.style.border = '2px solid #10b981';
            statusDiv.style.color = '#065f46';
            statusDiv.innerHTML = '<strong>✓ You are running the latest version!</strong>';
        }
    } catch (error) {
        console.error('Error checking version:', error);
        const statusDiv = document.getElementById('versionStatus');
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#fee2e2';
        statusDiv.style.border = '2px solid #ef4444';
        statusDiv.style.color = '#991b1b';
        statusDiv.innerHTML = '<strong>✕ Failed to check for updates</strong><br>Check your connection.';
    }
}

/* ==========================================================================
   Backup System
   ========================================================================== */

async function createBackup() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Creating...';
    
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
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: #9ca3af;">⏳ Loading backups...</div>';
    
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
    document.getElementById('backupUploadInput').click();
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
    document.getElementById('csvFileInput').click();
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