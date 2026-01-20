/* ==========================================================================
   Settings Management
   Version checking, updates, export/import, and system settings
   ========================================================================== */

let updateCheckIntervalId = null;

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
    
    // Restart the update check interval
    setupUpdateChecker();
    
    // Show confirmation
    const intervalNames = {
        0: 'Never',
        3600000: 'Every Hour',
        21600000: 'Every 6 Hours',
        43200000: 'Every 12 Hours',
        86400000: 'Every 24 Hours',
        604800000: 'Weekly'
    };
    
    const statusDiv = document.getElementById('versionStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#dcfce7';
    statusDiv.style.border = '2px solid #10b981';
    statusDiv.style.color = '#065f46';
    statusDiv.innerHTML = `<strong>✓ Update check frequency changed to: ${intervalNames[interval]}</strong>`;
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

function setupUpdateChecker() {
    // Clear existing interval
    if (updateCheckIntervalId) {
        clearInterval(updateCheckIntervalId);
        updateCheckIntervalId = null;
    }

    const interval = getUpdateInterval();
    
    // If interval is 0 (Never), don't set up auto-check
    if (interval === 0) {
        console.log('Auto-update check disabled');
        return;
    }

    // Set up new interval
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
   Export/Import Functions
   ========================================================================== */

function exportCSV() {
    window.location.href = `${API_URL}/api/export/inventory`;
}

function triggerImport() {
    document.getElementById('csvFileInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    alert('CSV import will be available in the next update!');
    event.target.value = '';
}

/* ==========================================================================
   Database Reset
   ========================================================================== */

async function confirmReset() {
    // First confirmation
    if (!confirm('⚠️ WARNING: Delete ALL Data?\n\nThis will permanently delete:\n• All products\n• All inventory batches\n• All settings\n\nThis action CANNOT be undone!\n\nClick OK to continue or Cancel to abort.')) {
        return;
    }
    
    // Second confirmation
    if (!confirm('🚨 FINAL WARNING!\n\nYou are about to delete EVERYTHING.\n\nMake sure you have exported your data first!\n\nType confirmation required. Click OK to proceed.')) {
        return;
    }
    
    // Third confirmation - type check
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
            
            // Clear localStorage
            localStorage.clear();
            
            // Reload the page
            location.reload();
        } else {
            alert('Error resetting database:\n' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Reset error:', error);
        alert('Failed to reset database. Check your connection.');
    }
}