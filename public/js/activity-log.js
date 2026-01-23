// Activity Log Module
// Displays recent activity feed on dashboard

const ActivityLog = {
  async loadRecentActivity() {
    try {
      const response = await fetch('/api/activity-log?limit=10');
      const activities = await response.json();
      this.renderActivityFeed(activities);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  },

  renderActivityFeed(activities) {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }

    const html = activities.map(activity => this.createActivityItem(activity)).join('');
    container.innerHTML = html;
  },

  createActivityItem(activity) {
    const icon = this.getActionIcon(activity.action_type);
    const timeAgo = this.getTimeAgo(activity.created_at);
    
    return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-entity">${activity.entity_type}</span>
            <span class="activity-time">${timeAgo}</span>
          </div>
        </div>
      </div>
    `;
  },

  getActionIcon(actionType) {
    const icons = {
      'create': '➕',
      'update': '✏️',
      'delete': '🗑️',
      'adjust': '🔧'
    };
    return icons[actionType] || '📝';
  },

  getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  },

  async loadEntityHistory(entityType, entityId) {
    try {
      const response = await fetch(`/api/activity-log/${entityType}/${entityId}`);
      const activities = await response.json();
      return activities;
    } catch (error) {
      console.error('Error loading entity history:', error);
      return [];
    }
  }
};

// Auto-refresh activity feed every 30 seconds if on dashboard
setInterval(() => {
  if (window.location.hash === '' || window.location.hash === '#dashboard') {
    ActivityLog.loadRecentActivity();
  }
}, 30000);
