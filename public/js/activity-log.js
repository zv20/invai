/**
 * Activity Log Module
 * Displays recent activity feed
 */

let activityData = [];

// Load activity log
async function loadActivityLog(limit = 50) {
  try {
    const response = await fetch(`/api/activity-log?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to load activity log');
    
    activityData = await response.json();
    renderActivityLog();
  } catch (error) {
    console.error('Error loading activity log:', error);
    showNotification('Failed to load activity log', 'error');
  }
}

// Render activity log
function renderActivityLog() {
  const container = document.getElementById('activityLog');
  if (!container) return;
  
  if (activityData.length === 0) {
    container.innerHTML = '<div class="empty-state-small">No recent activity</div>';
    return;
  }
  
  const html = activityData.slice(0, 10).map(activity => {
    const icon = getActivityIcon(activity.action_type);
    const color = getActivityColor(activity.action_type);
    const timeAgo = formatTimeAgo(activity.created_at);
    
    return `
      <div class="activity-item" style="border-left: 3px solid ${color}">
        <div class="activity-icon" style="color: ${color}">${icon}</div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

// Get activity icon
function getActivityIcon(actionType) {
  const icons = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    adjust: '↕️'
  };
  return icons[actionType] || '•';
}

// Get activity color
function getActivityColor(actionType) {
  const colors = {
    create: '#10b981',
    update: '#3b82f6',
    delete: '#ef4444',
    adjust: '#f59e0b'
  };
  return colors[actionType] || '#6b7280';
}

// Format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Load activity for specific entity
async function loadEntityActivity(entityType, entityId) {
  try {
    const response = await fetch(`/api/activity-log/${entityType}/${entityId}`);
    if (!response.ok) throw new Error('Failed to load entity activity');
    
    const activities = await response.json();
    return activities;
  } catch (error) {
    console.error('Error loading entity activity:', error);
    return [];
  }
}

// Initialize activity log
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Activity log will be loaded when dashboard loads
  });
}