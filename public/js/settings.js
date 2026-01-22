/* ==========================================================================
   Settings Management - v0.7.8c
   Version checking, updates, export/import, backup system, and settings
   FIXED: Added comprehensive safety checks and error handling
   ========================================================================== */

/* ==========================================================================
   Configuration Constants
   ========================================================================== */

const CONFIG = {
    NOTIFICATION_DURATION: 3000,           // 3 seconds
    UPDATE_CHECK_DEFAULT: 86400000,        // 24 hours
    UPDATE_CHECK_INTERVALS: {
        NEVER: 0,
        HOURLY: 3600000,                   // 1 hour
        SIX_HOURS: 21600000,               // 6 hours
        TWELVE_HOURS: 43200000,            // 12 hours
        DAILY: 86400000,                   // 24 hours
        WEEKLY: 604800000                  // 7 days
    },
    BACKUP_MAX_SIZE: 100 * 1024 * 1024,    // 100MB
    BACKUP_MIN_SIZE: 100,                  // 100 bytes (SQLite header minimum)
    SQLITE_SIGNATURE: 'SQLite format 3\0',
    NOTIFICATION_Z_INDEX: 100001
};

// Update interval names helper
const INTERVAL_NAMES = {
    [CONFIG.UPDATE_CHECK_INTERVALS.NEVER]: 'Never',
    [CONFIG.UPDATE_CHECK_INTERVALS.HOURLY]: 'Every Hour',
    [CONFIG.UPDATE_CHECK_INTERVALS.SIX_HOURS]: 'Every 6 Hours',
    [CONFIG.UPDATE_CHECK_INTERVALS.TWELVE_HOURS]: 'Every 12 Hours',
    [CONFIG.UPDATE_CHECK_INTERVALS.DAILY]: 'Every 24 Hours',
    [CONFIG.UPDATE_CHECK_INTERVALS.WEEKLY]: 'Weekly'
};

// Notification icons
const NOTIFICATION_ICONS = {
    success: '✓',
    error: '✗',
    warning: '⚠️',
    info: 'ℹ️'
};

let updateCheckIntervalId = null;
let isSettingUpChecker = false; // Mutex flag
let currentSettingsTab = 'updates';
let versionInfo = null;

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
    if (tabName === 'updates') {
        loadChannelSelector();
    } else if (tabName === 'backups') {
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
   Channel Selector Initialization - FIXED with defensive checks
   ========================================================================== */

async function loadChannelSelector() {
    try {
        const response = await fetch(`${API_URL}/api/settings/update-channel`);
        
        // Check response validity
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const channelSelectorDiv = document.getElementById('channelSelector');
        const currentStatusDiv = document.getElementById('currentStatus');
        const switchBtn = document.getElementById('switchChannelBtn');
        
        // DEFENSIVE CHECK: Exit if critical elements missing
        if (!channelSelectorDiv || !currentStatusDiv) {
            console.error('Channel selector UI elements not found');
            return;
        }
        
        // Safely populate selector
        channelSelectorDiv.innerHTML = `
            <label for="updateChannelSelect" style="display: block; margin-bottom: 8px; font-weight: 600;">Select Update Channel:</label>
            <select id="updateChannelSelect" style="padding: 8px; border-radius: 6px; border: 2px solid #e5e7eb; width: 100%; max-width: 300px;">
                ${data.availableChannels.map(ch => `
                    <option value="${ch.id}" ${ch.id === data.channel ? 'selected' : ''}>
                        ${ch.name} - ${ch.description}
                    </option>
                `).join('')}
            </select>
        `;
        
        // Store channel data for later use
        channelSelectorDiv.dataset.currentChannel = data.channel;
        
        // Setup event listener with cleanup
        const select = document.getElementById('updateChannelSelect');
        if (select && switchBtn) {
            // Remove old listener to prevent duplicates (using onchange for simplicity)
            select.onchange = function() {
                const isDifferent = this.value !== data.channel;
                switchBtn.disabled = !isDifferent;
            };
        }
        
        // Update status display
        const targetBranch = data.channel === 'stable' ? 'main' : 'beta';
        const statusColor = data.currentBranch === targetBranch ? '#10b981' : '#f59e0b';
        const statusIcon = data.currentBranch === targetBranch ? '✅' : '⚠️';
        
        currentStatusDiv.innerHTML = `
            <div style="margin: 15px 0; padding: 12px; background: #f9fafb; border-left: 4px solid ${statusColor}; border-radius: 6px;">
                <strong>${statusIcon} Current Status:</strong><br>
                <span style="margin-left: 10px;">Channel: <strong>${data.channel}</strong></span><br>
                <span style="margin-left: 10px;">Branch: <strong>${data.currentBranch}</strong></span>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading channel selector:', error);
        
        // IMPROVED: Show user-friendly error in UI
        const currentStatusDiv = document.getElementById('currentStatus');
        if (currentStatusDiv) {
            currentStatusDiv.innerHTML = `
                <div style="margin: 15px 0; padding: 12px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 6px;">
                    <strong>⚠️ Failed to Load Channel Settings</strong><br>
                    <span style="margin-left: 10px; color: #991b1b;">Cannot connect to update server</span>
                </div>
            `;
        }
        notify('Failed to load channel settings', 'error');
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
   Update Interval Management - FIXED with mutex
   ========================================================================== */

function getUpdateInterval() {
    const saved = SafeStorage.getItem('updateCheckInterval');
    return saved ? parseInt(saved) : CONFIG.UPDATE_CHECK_DEFAULT;
}

function saveUpdateInterval() {
    const select = document.getElementById('updateCheckInterval');
    if (!select) return;
    
    const interval = parseInt(select.value);
    SafeStorage.setItem('updateCheckInterval', interval.toString());
    
    setupUpdateChecker();
    
    notify(`Update check frequency: ${INTERVAL_NAMES[interval]}`, 'success');
}

function setupUpdateChecker() {
    // Prevent concurrent setup
    if (isSettingUpChecker) {
        console.log('Update checker setup already in progress...');
        return;
    }
    
    isSettingUpChecker = true;
    
    try {
        // Clear existing interval
        if (updateCheckIntervalId !== null) {
            clearInterval(updateCheckIntervalId);
            updateCheckIntervalId = null;
            console.log('Cleared existing update check interval');
        }

        const interval = getUpdateInterval();
        
        if (interval === 0) {
            console.log('Auto-update check disabled');
            return;
        }

        console.log(`Setting up auto-update check every ${interval / 1000 / 60} minutes`);
        
        // Create new interval
        updateCheckIntervalId = setInterval(() => {
            console.log('Running scheduled update check...');
            checkVersion();
        }, interval);
        
        // Also check immediately on setup
        checkVersion();
        
    } finally {
        isSettingUpChecker = false;
    }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateCheckIntervalId !== null) {
        clearInterval(updateCheckIntervalId);
        updateCheckIntervalId = null;
    }
});

/* ==========================================================================
   Version Checking - FIXED with proper event handling
   ========================================================================== */

// Manual check for updates button handler
window.checkForUpdatesNow = async function(event) {
    const btn = event?.currentTarget || event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⌛ Checking...';
    }
    
    try {
        await checkVersion();
        notify('Update check complete', 'success');
    } catch (error) {
        console.error('Update check error:', error);
        notify('Failed to check for updates', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍 Check for Updates';
        }
    }
};

// Switch channel and update button handler
window.switchChannelAndUpdate = async function(event) {
    const btn = event?.currentTarget || event?.target;
    const select = document.getElementById('updateChannelSelect');
    
    if (!select) {
        notify('Channel selector not found', 'error');
        return;
    }
    
    const newChannel = select.value;
    const channelDiv = document.getElementById('channelSelector');
    const currentChannel = channelDiv?.dataset?.currentChannel;
    
    // Prevent switching if already on target channel
    if (newChannel === currentChannel) {
        notify('Already on selected channel', 'info');
        return;
    }
    
    const targetBranch = newChannel === 'stable' ? 'main' : 'beta';
    
    if (!confirm(`Switch to ${newChannel} channel and update?\n\nThis will:\n✓ Create a backup\n✓ Switch to ${targetBranch} branch\n✓ Pull latest changes\n✓ Restart the server\n\nContinue?`)) {
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        alert(`✓ Switched to ${newChannel} channel!\n\nBackup: ${data.backupFile}\nBranch: ${data.branch}\n\nServer will restart now.`);
        
        // Give user time to read, then reload
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('Channel switch error:', error);
        notify(`Failed to switch channel: ${error.message}`, 'error');
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Switch Channel & Update';
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
            notify(`Backup created: ${data.filename}`, 'success');
            loadBackups();
        } else {
            notify(`Backup failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Backup error:', error);
        notify('Failed to create backup', 'error');
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
            notify(`Restore failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Restore error:', error);
        notify('Failed to restore backup', 'error');
    }
}

function downloadBackup(filename) {
    window.location.href = `${API_URL}/api/backup/download/${filename}`;
    notify(`Downloading: ${filename}`, 'success');
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
            notify(`Backup deleted: ${filename}`, 'success');
            loadBackups();
        } else {
            notify(`Failed to delete: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        notify('Failed to delete backup', 'error');
    }
}

function triggerUploadRestore() {
    const input = document.getElementById('backupUploadInput');
    if (input) input.click();
}

async function handleUploadRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Extension check
    if (!file.name.endsWith('.db')) {
        notify('Please select a valid .db file', 'warning');
        event.target.value = '';
        return;
    }
    
    // Size check (max 100MB)
    if (file.size > CONFIG.BACKUP_MAX_SIZE) {
        notify('File too large (max 100MB)', 'error');
        event.target.value = '';
        return;
    }
    
    // Minimum size check (SQLite header is at least 100 bytes)
    if (file.size < CONFIG.BACKUP_MIN_SIZE) {
        notify('File too small to be a valid database', 'error');
        event.target.value = '';
        return;
    }
    
    // Validate SQLite file signature
    try {
        const headerBytes = await file.slice(0, 16).arrayBuffer();
        const headerArray = new Uint8Array(headerBytes);
        const sqliteSignature = CONFIG.SQLITE_SIGNATURE;
        
        let isValid = true;
        for (let i = 0; i < sqliteSignature.length; i++) {
            if (headerArray[i] !== sqliteSignature.charCodeAt(i)) {
                isValid = false;
                break;
            }
        }
        
        if (!isValid) {
            notify('Invalid SQLite database file', 'error');
            event.target.value = '';
            return;
        }
    } catch (error) {
        console.error('Error validating file:', error);
        notify('Could not validate file', 'error');
        event.target.value = '';
        return;
    }
    
    if (!confirm(`⚠️ RESTORE DATABASE FROM UPLOAD?\n\nFile: ${file.name}\nSize: ${formatFileSize(file.size)}\n\n✓ A safety backup will be created first\n✓ Current data will be replaced\n✓ Page will reload after restore\n\nContinue?`)) {
        event.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('backup', file);
    
    const uploadBtn = document.querySelector('button[onclick="triggerUploadRestore()"]');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⌛ Uploading & Restoring...';
    }
    
    try {
        const response = await fetch(`${API_URL}/api/backup/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        alert(`✓ Database Restored!\n\nRestored from: ${data.originalFilename}\nSafety backup: ${data.safetyBackup}\n\nPage will now reload.`);
        location.reload();
        
    } catch (error) {
        console.error('Upload restore error:', error);
        notify(`Upload restore failed: ${error.message}`, 'error');
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '📤 Upload & Restore';
        }
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
    notify('Exporting inventory...', 'success');
}

function triggerImport() {
    const input = document.getElementById('csvFileInput');
    if (input) input.click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        notify('Please select a valid CSV file', 'warning');
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
            notify(`Import Failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Import error:', error);
        notify('Failed to import CSV file', 'error');
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
            SafeStorage.clear();
            location.reload();
        } else {
            notify('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        notify('Failed to reset database', 'error');
    }
}

/* ==========================================================================
   Notification Helper - Standardized with icons
   ========================================================================== */

function notify(message, type = 'info') {
    const icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info;
    const formattedMessage = `${icon} ${message}`;
    showNotification(formattedMessage, type);
}

function showNotification(message, type = 'info') {
    const colors = {
        success: { bg: '#dcfce7', border: '#10b981', text: '#065f46' },
        error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
        warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
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
        z-index: ${CONFIG.NOTIFICATION_Z_INDEX};
        font-weight: 600;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, CONFIG.NOTIFICATION_DURATION);
}

// Show toast for compatibility with other modules
function showToast(message, type) {
    showNotification(message, type);
}