/**
 * Update Channel Settings
 * Handles UI for selecting and switching update channels (stable/beta)
 */

let currentChannelData = null;

/**
 * Load channel settings when Settings tab is opened
 */
function switchSettingsTab(tab) {
  // Hide all subtabs
  document.querySelectorAll('.settings-subtab').forEach(subtab => {
    subtab.classList.remove('active');
  });
  
  // Remove active class from all nav items
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show selected subtab
  document.getElementById(`settings-${tab}`).classList.add('active');
  
  // Add active class to clicked nav item
  event.target.classList.add('active');
  
  // Load channel settings if updates tab is selected
  if (tab === 'updates') {
    loadChannelSettings();
  }
}

/**
 * Load current channel settings and available channels
 */
async function loadChannelSettings() {
  try {
    const response = await fetch('/api/settings/update-channel');
    const data = await response.json();
    currentChannelData = data;
    
    renderChannelSelector(data);
    renderCurrentStatus(data);
  } catch (error) {
    console.error('Failed to load channel settings:', error);
    showToast('Failed to load channel settings', 'error');
  }
}

/**
 * Render channel selector cards
 */
function renderChannelSelector(data) {
  const container = document.getElementById('channelSelector');
  if (!container) return;
  
  const channelsHtml = data.availableChannels.map(channel => {
    const isActive = channel.id === data.channel;
    const icon = channel.id === 'stable' ? '🛡️' : '🔬';
    
    return `
      <label class="channel-card ${isActive ? 'active' : ''}">
        <input type="radio" name="channel" value="${channel.id}" ${isActive ? 'checked' : ''} onchange="onChannelSelect('${channel.id}')">
        <div class="channel-content">
          <div class="channel-header">
            <span class="channel-icon">${icon}</span>
            <h4>${channel.name}</h4>
          </div>
          <p class="channel-description">${channel.description}</p>
          <div class="channel-branch">Branch: ${channel.branch}</div>
        </div>
      </label>
    `;
  }).join('');
  
  container.innerHTML = channelsHtml;
}

/**
 * Render current status display
 */
function renderCurrentStatus(data) {
  const container = document.getElementById('currentStatus');
  if (!container) return;
  
  const currentChannel = data.availableChannels.find(c => c.id === data.channel);
  
  container.innerHTML = `
    <div class="status-grid">
      <div class="status-item">
        <div class="status-label">Current Channel</div>
        <div class="status-value ${data.channel}">${currentChannel?.name || data.channel}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Current Branch</div>
        <div class="status-value">${data.currentBranch}</div>
      </div>
    </div>
  `;
}

/**
 * Handle channel selection change
 */
function onChannelSelect(channelId) {
  const switchBtn = document.getElementById('switchChannelBtn');
  if (!switchBtn) return;
  
  const isDifferent = channelId !== currentChannelData.channel;
  switchBtn.disabled = !isDifferent;
  
  if (isDifferent) {
    switchBtn.classList.add('highlight');
  } else {
    switchBtn.classList.remove('highlight');
  }
}

/**
 * Check for updates button handler
 */
document.getElementById('checkUpdatesBtn')?.addEventListener('click', async () => {
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Checking...';
  btn.disabled = true;
  
  try {
    const response = await fetch('/api/version');
    const data = await response.json();
    
    const resultsDiv = document.getElementById('updateResults');
    resultsDiv.classList.remove('hidden');
    
    if (data.updateAvailable) {
      resultsDiv.innerHTML = `
        <div class="alert alert-info">
          <div class="alert-icon">🎉</div>
          <div class="alert-content">
            <strong>Update Available!</strong>
            <p>Current: v${data.currentVersion} → Latest: v${data.latestVersion}</p>
            <p>Channel: ${data.channel} (${data.branch})</p>
            <small>Click "Switch Channel & Update" to upgrade</small>
          </div>
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `
        <div class="alert alert-success">
          <div class="alert-icon">✅</div>
          <div class="alert-content">
            <strong>You're Up to Date!</strong>
            <p>Running v${data.currentVersion} on ${data.channel} channel</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
    showToast('Failed to check for updates', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

/**
 * Switch channel and update
 */
document.getElementById('switchChannelBtn')?.addEventListener('click', async () => {
  const selectedChannel = document.querySelector('input[name="channel"]:checked')?.value;
  if (!selectedChannel) return;
  
  const channelName = currentChannelData.availableChannels.find(c => c.id === selectedChannel)?.name;
  
  if (!confirm(`Switch to ${channelName} channel and update?\n\nThis will:\n1. Create a backup\n2. Switch git branch\n3. Pull latest changes\n4. Update dependencies\n5. Require server restart`)) {
    return;
  }
  
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Switching...';
  btn.disabled = true;
  
  const resultsDiv = document.getElementById('updateResults');
  resultsDiv.classList.remove('hidden');
  resultsDiv.innerHTML = `
    <div class="alert alert-info">
      <div class="alert-icon">⏳</div>
      <div class="alert-content">
        <strong>Channel Switch In Progress...</strong>
        <p>This may take 30-60 seconds. Do not close this page.</p>
      </div>
    </div>
  `;
  
  try {
    const response = await fetch('/api/settings/switch-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: selectedChannel })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      resultsDiv.innerHTML = `
        <div class="alert alert-success">
          <div class="alert-icon">✅</div>
          <div class="alert-content">
            <strong>Channel Switch Successful!</strong>
            <p>Switched to ${channelName} channel (${data.branch} branch)</p>
            <p><strong>⚠️ Server Restart Required</strong></p>
            <small>Backup created: ${data.backupFile}</small>
          </div>
        </div>
        <div class="alert alert-warning" style="margin-top: 15px;">
          <div class="alert-icon">🔄</div>
          <div class="alert-content">
            <strong>Next Steps:</strong>
            <p>1. SSH into your server</p>
            <p>2. Run: <code>pm2 restart invai</code></p>
            <p>3. Refresh this page</p>
          </div>
        </div>
      `;
      
      showToast('Channel switched! Restart server to apply.', 'success');
      
      // Reload channel settings after 2 seconds
      setTimeout(() => loadChannelSettings(), 2000);
    } else {
      throw new Error(data.error || 'Failed to switch channel');
    }
  } catch (error) {
    console.error('Failed to switch channel:', error);
    resultsDiv.innerHTML = `
      <div class="alert alert-error">
        <div class="alert-icon">❌</div>
        <div class="alert-content">
          <strong>Channel Switch Failed</strong>
          <p>${error.message}</p>
          <small>${error.hint || ''}</small>
        </div>
      </div>
    `;
    showToast('Failed to switch channel', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}