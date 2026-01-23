/**
 * Activity Log Module
 * Display recent activity feed
 * v0.8.0
 */

const ActivityLog = (() => {
  const API_URL = '/api';

  /**
   * Load and display activity feed
   */
  async function loadActivityFeed(containerId = 'activityFeed', limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await fetch(`${API_URL}/activity-log?limit=${limit}`);
      const activities = await response.json();

      if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state-small">No recent activity</div>';
        return;
      }

      container.innerHTML = activities.map(activity => renderActivityItem(activity)).join('');
    } catch (error) {
      console.error('Error loading activity:', error);
      container.innerHTML = '<div class="error-state">Failed to load activity</div>';
    }
  }

  /**
   * Render single activity item
   */
  function renderActivityItem(activity) {
    const icon = getActionIcon(activity.action_type);
    const color = getActionColor(activity.action_type);
    const timeAgo = getTimeAgo(activity.created_at);

    return `
      <div class="activity-item">
        <div class="activity-icon" style="background: ${color}20; color: ${color};">
          ${icon}
        </div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-entity">${activity.entity_type}</span>
            <span class="activity-time">${timeAgo}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get icon for action type
   */
  function getActionIcon(actionType) {
    const icons = {
      'create': '➕',
      'update': '✏️',
      'delete': '🗑️',
      'adjust': '🔄'
    };
    return icons[actionType] || '📌';
  }

  /**
   * Get color for action type
   */
  function getActionColor(actionType) {
    const colors = {
      'create': '#10b981',
      'update': '#3b82f6',
      'delete': '#ef4444',
      'adjust': '#f59e0b'
    };
    return colors[actionType] || '#6b7280';
  }

  /**
   * Format time ago
   */
  function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  }

  return {
    loadActivityFeed
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.ActivityLog = ActivityLog;
}