// Update Settings Management - v0.10.5
// FIXED v0.10.5: Use authFetch() for authenticated endpoints to prevent 401 errors (PR #32)

let updateCheckInterval;

async function initUpdateSettings() {
    await loadChannelSettings();
    await checkForUpdates();
    
    // Auto-check every 5 minutes
    updateCheckInterval = setInterval(checkForUpdates, 5 * 60 * 1000);
}

async function loadChannelSettings() {
    try {
        // FIXED v0.10.5: Use authFetch() instead of plain fetch() to include authentication
        const response = await authFetch('/api/settings/update-channel');
        const data = await response.json();
        
        const channelSelect = document.getElementById('updateChannel');
        if (channelSelect) {
            channelSelect.value = data.channel || 'stable';
        }
        
        // Display current branch info
        const branchInfo = document.getElementById('currentBranch');
        if (branchInfo) {
            branchInfo.textContent = `Current: ${data.currentBranch || 'unknown'}`;
        }
        
        // Display channel descriptions
        displayChannelInfo(data.availableChannels);
        
    } catch (error) {
        console.error('Error loading channel settings:', error);
        showNotification('Failed to load update channel settings', 'error');
    }
}

function displayChannelInfo(channels) {
    const container = document.getElementById('channelInfo');
    if (!container || !channels) return;
    
    container.innerHTML = channels.map(ch => `
        <div class="channel-option ${ch.id}">
            <h4>${ch.name}</h4>
            <p>${ch.description}</p>
            <small>Branch: ${ch.branch}</small>
        </div>
    `).join('');
}

async function saveChannelPreference() {
    const channelSelect = document.getElementById('updateChannel');
    const newChannel = channelSelect.value;
    
    try {
        // FIXED v0.10.5: Use authFetch() with proper headers
        const response = await authFetch('/api/settings/update-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: newChannel })
        });
        
        if (response.ok) {
            showNotification('Update channel preference saved', 'success');
            await loadChannelSettings();
        } else {
            throw new Error('Failed to save channel');
        }
    } catch (error) {
        console.error('Error saving channel:', error);
        showNotification('Failed to save channel preference', 'error');
    }
}

async function switchChannel() {
    const channelSelect = document.getElementById('updateChannel');
    const newChannel = channelSelect.value;
    
    if (!confirm(`Switch to ${newChannel} channel? This will restart the application.`)) {
        return;
    }
    
    const switchBtn = document.getElementById('switchChannelBtn');
    switchBtn.disabled = true;
    switchBtn.textContent = 'Switching...';
    
    try {
        // FIXED v0.10.5: Use authFetch()
        const response = await authFetch('/api/settings/switch-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: newChannel })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(result.message, 'success');
            
            if (result.restartRequired) {
                showNotification('Application is restarting... Page will reload in 5 seconds', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 5000);
            }
        } else {
            throw new Error(result.error || 'Failed to switch channel');
        }
    } catch (error) {
        console.error('Error switching channel:', error);
        showNotification('Failed to switch channel: ' + error.message, 'error');
    } finally {
        switchBtn.disabled = false;
        switchBtn.textContent = 'Switch Channel';
    }
}

async function checkForUpdates() {
    try {
        // Version endpoint is public, can use plain fetch
        const response = await fetch('/api/version');
        const data = await response.json();
        
        const updateStatus = document.getElementById('updateStatus');
        const updateBtn = document.getElementById('updateBtn');
        const versionInfo = document.getElementById('versionInfo');
        
        if (versionInfo) {
            versionInfo.innerHTML = `
                <div class="version-display">
                    <strong>Current:</strong> ${data.currentVersion}<br>
                    <strong>Latest:</strong> ${data.latestVersion}<br>
                    <strong>Channel:</strong> ${data.channel || 'stable'} (${data.branch || 'main'})
                </div>
            `;
        }
        
        if (data.updateAvailable) {
            if (updateStatus) {
                updateStatus.innerHTML = `
                    <div class="update-available">
                        ⚠️ Update Available: ${data.latestVersion}
                    </div>
                `;
            }
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.classList.add('update-available');
            }
        } else {
            if (updateStatus) {
                updateStatus.innerHTML = `
                    <div class="update-current">
                        ✅ You're up to date!
                    </div>
                `;
            }
            if (updateBtn) {
                updateBtn.disabled = true;
                updateBtn.classList.remove('update-available');
            }
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

async function performUpdate() {
    if (!confirm('Update the application? This will restart the server.')) {
        return;
    }
    
    const updateBtn = document.getElementById('updateBtn');
    const updateStatus = document.getElementById('updateStatus');
    
    updateBtn.disabled = true;
    updateBtn.textContent = 'Updating...';
    
    if (updateStatus) {
        updateStatus.innerHTML = '<div class="update-progress">🔄 Updating application...</div>';
    }
    
    try {
        // FIXED v0.10.5: Use authFetch() for authenticated system endpoint
        const response = await authFetch('/api/system/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Update completed! Restarting...', 'success');
            
            if (updateStatus) {
                updateStatus.innerHTML = `
                    <div class="update-success">
                        ✅ ${result.message}<br>
                        <small>Restarting application...</small>
                    </div>
                `;
            }
            
            // Wait and reload
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        } else {
            throw new Error(result.error || 'Update failed');
        }
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Update failed: ' + error.message, 'error');
        
        if (updateStatus) {
            updateStatus.innerHTML = `
                <div class="update-error">
                    ❌ Update failed: ${error.message}
                </div>
            `;
        }
        
        updateBtn.disabled = false;
        updateBtn.textContent = 'Update Now';
    }
}

// Initialize when settings tab opens
if (typeof window !== 'undefined') {
    // Initialize on page load if update tab is active
    document.addEventListener('DOMContentLoaded', () => {
        const updateTab = document.querySelector('[data-settings-tab="updates"]');
        if (updateTab && updateTab.classList.contains('active')) {
            initUpdateSettings();
        }
    });
}
