// Update Channel Settings Manager

class UpdateChannelManager {
  constructor() {
    this.currentChannel = 'stable';
    this.init();
  }

  async init() {
    await this.loadCurrentSettings();
    this.attachEventListeners();
  }

  async loadCurrentSettings() {
    try {
      const response = await fetch('/api/settings/update-channel');
      const data = await response.json();
      this.currentChannel = data.channel;
      this.renderChannelSelector(data);
      this.renderCurrentStatus(data);
    } catch (error) {
      console.error('Failed to load update settings:', error);
      this.showError('Failed to load update channel settings');
    }
  }

  renderChannelSelector(data) {
    const container = document.getElementById('channelSelector');
    if (!container) return;

    const html = `
      <div class="channel-options">
        ${data.availableChannels.map(channel => `
          <label class="channel-card ${channel.id === data.channel ? 'active' : ''}">
            <input type="radio" name="updateChannel" value="${channel.id}" 
                   ${channel.id === data.channel ? 'checked' : ''}>
            <div class="channel-content">
              <div class="channel-header">
                <span class="channel-icon">${channel.id === 'stable' ? '✅' : '🧪'}</span>
                <h4>${channel.name}</h4>
              </div>
              <p class="channel-description">${channel.description}</p>
              <code class="channel-branch">Branch: ${channel.branch}</code>
            </div>
          </label>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  renderCurrentStatus(data) {
    const container = document.getElementById('currentStatus');
    if (!container) return;

    const html = `
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Current Channel:</span>
          <span class="status-value ${data.channel}">${data.channel.toUpperCase()}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Active Branch:</span>
          <span class="status-value">${data.currentBranch}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Version:</span>
          <span class="status-value">${window.APP_VERSION || 'Unknown'}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  attachEventListeners() {
    const checkBtn = document.getElementById('checkUpdatesBtn');
    const switchBtn = document.getElementById('switchChannelBtn');
    const saveBtn = document.getElementById('saveChannelBtn');

    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkForUpdates());
    }

    if (switchBtn) {
      switchBtn.addEventListener('click', () => this.switchChannel());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveChannelPreference());
    }

    // Listen for channel selection changes
    document.addEventListener('change', (e) => {
      if (e.target.name === 'updateChannel') {
        this.handleChannelChange(e.target.value);
      }
    });
  }

  handleChannelChange(newChannel) {
    const switchBtn = document.getElementById('switchChannelBtn');
    if (switchBtn && newChannel !== this.currentChannel) {
      switchBtn.disabled = false;
      switchBtn.classList.add('highlight');
    } else if (switchBtn) {
      switchBtn.disabled = true;
      switchBtn.classList.remove('highlight');
    }
  }

  async checkForUpdates() {
    const btn = document.getElementById('checkUpdatesBtn');
    const resultsDiv = document.getElementById('updateResults');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Checking...';
    resultsDiv.innerHTML = '';
    resultsDiv.classList.remove('hidden');

    try {
      const response = await fetch('/api/settings/check-updates', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();

      if (data.updateAvailable) {
        resultsDiv.innerHTML = `
          <div class="alert alert-warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <strong>Update Available!</strong>
              <p>Current: v${data.currentVersion}</p>
              <p>Latest: v${data.latestVersion} (${data.channel} channel)</p>
              <small>Commit ${data.commitSha} • ${new Date(data.commitDate).toLocaleString()}</small>
            </div>
          </div>
        `;
      } else {
        resultsDiv.innerHTML = `
          <div class="alert alert-success">
            <div class="alert-icon">✅</div>
            <div class="alert-content">
              <strong>Up to Date</strong>
              <p>You're running the latest version (v${data.currentVersion})</p>
            </div>
          </div>
        `;
      }
    } catch (error) {
      resultsDiv.innerHTML = `
        <div class="alert alert-error">
          <div class="alert-icon">❌</div>
          <div class="alert-content">
            <strong>Check Failed</strong>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Check for Updates';
    }
  }

  async switchChannel() {
    const selectedChannel = document.querySelector('input[name="updateChannel"]:checked').value;
    
    const confirmed = confirm(
      `Switch to ${selectedChannel.toUpperCase()} channel?\n\n` +
      `This will:\n` +
      `✓ Create automatic backup of your database\n` +
      `✓ Switch to ${selectedChannel === 'beta' ? 'develop' : 'main'} branch\n` +
      `✓ Update dependencies if needed\n` +
      `✓ Restart the server\n\n` +
      `Your data will be preserved. Continue?`
    );

    if (!confirmed) return;

    const btn = document.getElementById('switchChannelBtn');
    const resultsDiv = document.getElementById('updateResults');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Switching...';
    resultsDiv.innerHTML = '';

    try {
      const response = await fetch('/api/settings/switch-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel })
      });

      const data = await response.json();

      if (response.ok) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = `
          <div class="alert alert-success">
            <div class="alert-icon">✅</div>
            <div class="alert-content">
              <strong>Channel Switched!</strong>
              <p>${data.message}</p>
              <p><strong>Backup created:</strong> ${data.backupFile || 'Yes'}</p>
              <p><strong>New branch:</strong> ${data.branch}</p>
            </div>
          </div>
        `;

        // Prompt for restart
        setTimeout(() => {
          if (confirm('Server must restart to apply changes. Restart now?')) {
            this.restartServer();
          }
        }, 2000);

      } else {
        throw new Error(data.error || 'Failed to switch channel');
      }

    } catch (error) {
      resultsDiv.classList.remove('hidden');
      resultsDiv.innerHTML = `
        <div class="alert alert-error">
          <div class="alert-icon">❌</div>
          <div class="alert-content">
            <strong>Switch Failed</strong>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔄 Switch Channel & Update';
    }
  }

  async saveChannelPreference() {
    const selectedChannel = document.querySelector('input[name="updateChannel"]:checked').value;
    
    try {
      const response = await fetch('/api/settings/update-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel })
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('Update preference saved');
        this.currentChannel = selectedChannel;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.showError('Failed to save preference: ' + error.message);
    }
  }

  async restartServer() {
    const resultsDiv = document.getElementById('updateResults');
    resultsDiv.innerHTML = `
      <div class="alert alert-info">
        <div class="alert-icon">🔄</div>
        <div class="alert-content">
          <strong>Restarting Server...</strong>
          <p>Please wait 10 seconds, then refresh the page.</p>
        </div>
      </div>
    `;

    try {
      await fetch('/api/restart', { method: 'POST' });
    } catch (error) {
      // Expected - server is restarting
    }

    setTimeout(() => {
      window.location.reload();
    }, 10000);
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new UpdateChannelManager();
  });
} else {
  new UpdateChannelManager();
}
