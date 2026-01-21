// Update Settings Manager
class UpdateSettingsManager {
  constructor() {
    this.currentChannel = 'stable';
    this.currentBranch = 'main';
    this.init();
  }

  async init() {
    await this.loadChannelInfo();
    this.setupEventListeners();
  }

  async loadChannelInfo() {
    try {
      const response = await fetch('/api/settings/update-channel');
      const data = await response.json();
      
      this.currentChannel = data.channel;
      this.currentBranch = data.currentBranch;
      
      this.updateUI(data);
    } catch (error) {
      console.error('Error loading channel info:', error);
      showToast('Failed to load channel information', 'error');
    }
  }

  updateUI(data) {
    // Update current channel badge
    const currentChannelBadge = document.getElementById('currentChannel');
    if (currentChannelBadge) {
      currentChannelBadge.textContent = data.channel.toUpperCase();
      currentChannelBadge.className = `channel-badge ${data.channel === 'stable' ? 'stable' : 'beta'}`;
    }

    // Update current branch info
    const currentBranchInfo = document.getElementById('currentBranch');
    if (currentBranchInfo) {
      currentBranchInfo.textContent = data.currentBranch;
    }

    // Highlight selected channel
    document.querySelectorAll('.channel-option').forEach(option => {
      const channelId = option.dataset.channel;
      if (channelId === data.channel) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  setupEventListeners() {
    // Channel selection
    document.querySelectorAll('.channel-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const channel = e.currentTarget.dataset.channel;
        this.selectChannel(channel);
      });
    });

    // Switch channel button
    const switchBtn = document.getElementById('switchChannelBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => this.confirmSwitch());
    }
  }

  selectChannel(channel) {
    if (channel === this.currentChannel) {
      showToast('Already on ' + channel + ' channel', 'info');
      return;
    }

    // Update UI selection
    document.querySelectorAll('.channel-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    document.querySelector(`[data-channel="${channel}"]`).classList.add('selected');

    // Enable switch button
    const switchBtn = document.getElementById('switchChannelBtn');
    switchBtn.disabled = false;
    switchBtn.textContent = `Switch to ${channel.toUpperCase()} Channel`;
    switchBtn.dataset.targetChannel = channel;
  }

  async confirmSwitch() {
    const switchBtn = document.getElementById('switchChannelBtn');
    const targetChannel = switchBtn.dataset.targetChannel;
    
    if (!targetChannel || targetChannel === this.currentChannel) {
      return;
    }

    const branchName = targetChannel === 'beta' ? 'develop' : 'main';
    
    const confirmed = confirm(
      `⚠️ CHANNEL SWITCH\n\n` +
      `You are about to switch from ${this.currentChannel.toUpperCase()} to ${targetChannel.toUpperCase()} channel.\n\n` +
      `This will:\n` +
      `• Create an automatic backup\n` +
      `• Switch to the "${branchName}" branch\n` +
      `• Update all code and dependencies\n` +
      `• Require a server restart\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return;
    }

    await this.switchChannel(targetChannel);
  }

  async switchChannel(channel) {
    const switchBtn = document.getElementById('switchChannelBtn');
    const originalText = switchBtn.textContent;
    
    try {
      switchBtn.disabled = true;
      switchBtn.textContent = 'Switching... This may take a minute';

      const response = await fetch('/api/settings/switch-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(
          `Successfully switched to ${channel} channel! Server will restart in 5 seconds...`,
          'success'
        );

        setTimeout(() => {
          alert(
            '🔄 RESTART REQUIRED\n\n' +
            'The channel switch is complete.\n\n' +
            'Please restart the server manually with:\n' +
            'pm2 restart invai\n\n' +
            'Or: npm start'
          );
        }, 5000);
      } else {
        throw new Error(result.error || 'Failed to switch channel');
      }
    } catch (error) {
      console.error('Channel switch error:', error);
      showToast('Failed to switch channel: ' + error.message, 'error');
      switchBtn.textContent = originalText;
      switchBtn.disabled = false;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.updateSettingsManager = new UpdateSettingsManager();
  });
} else {
  window.updateSettingsManager = new UpdateSettingsManager();
}

// Toast notification helper
function showToast(message, type = 'info') {
  // Create toast if it doesn't exist
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}