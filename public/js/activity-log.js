/**
 * Activity Log Module
 * Display recent activities and entity history
 * v0.8.0
 */

// Load recent activity for dashboard widget
async function loadRecentActivity(limit = 10) {
  try {
    const response = await fetch(`/api/activity-log?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to load activity');
    
    const activities = await response.json();
    renderActivityFeed(activities);
  } catch (error) {
    console.error('Error loading activity:', error);
  }
}

// Render activity feed widget
function renderActivityFeed(activities) {
  const container = document.getElementById('activityFeedContainer');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm italic p-4">No recent activity</p>';
    return;
  }

  container.innerHTML = activities.map(activity => `
    <div class="activity-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition"
         onclick="viewActivityDetail('${activity.entity_type}', ${activity.entity_id})">
      <div class="flex items-start">
        <div class="activity-icon ${getActivityIconClass(activity.action_type)}">
          ${getActivityIcon(activity.action_type)}
        </div>
        <div class="flex-1 ml-3">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm text-gray-900">${activity.entity_name}</span>
            <span class="text-xs text-gray-500">${formatTimeAgo(activity.created_at)}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">${activity.description}</p>
          ${renderActivityBadge(activity)}
        </div>
      </div>
    </div>
  `).join('');
}

// Get icon for activity type
function getActivityIcon(actionType) {
  const icons = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    adjust: '📊'
  };
  return icons[actionType] || '📝';
}

// Get icon class for styling
function getActivityIconClass(actionType) {
  const classes = {
    create: 'bg-green-100 text-green-600',
    update: 'bg-blue-100 text-blue-600',
    delete: 'bg-red-100 text-red-600',
    adjust: 'bg-yellow-100 text-yellow-600'
  };
  return `activity-icon-base ${classes[actionType] || 'bg-gray-100 text-gray-600'}`;
}

// Render activity badge
function renderActivityBadge(activity) {
  const badges = {
    product: '🏷️ Product',
    batch: '📦 Batch',
    category: '📁 Category',
    supplier: '🏢 Supplier'
  };
  return `<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mt-1">${badges[activity.entity_type] || activity.entity_type}</span>`;
}

// Format timestamp as relative time
function formatTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

// View activity detail
function viewActivityDetail(entityType, entityId) {
  if (entityType === 'product') {
    switchTab('inventory');
    setTimeout(() => openProductDetail(entityId), 300);
  }
}

// Load entity-specific activity history
async function loadEntityHistory(entityType, entityId) {
  try {
    const response = await fetch(`/api/activity-log/${entityType}/${entityId}`);
    if (!response.ok) throw new Error('Failed to load history');
    
    const history = await response.json();
    displayEntityHistory(history);
  } catch (error) {
    console.error('Error loading entity history:', error);
  }
}

// Display entity history in modal or panel
function displayEntityHistory(history) {
  // Implementation depends on UI design
  console.log('Entity history:', history);
}

// Auto-refresh activity feed
let activityRefreshInterval;
function startActivityRefresh(intervalMs = 30000) {
  if (activityRefreshInterval) clearInterval(activityRefreshInterval);
  activityRefreshInterval = setInterval(() => loadRecentActivity(), intervalMs);
}

// Initialize activity log
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadRecentActivity();
    startActivityRefresh();
  });
} else {
  loadRecentActivity();
  startActivityRefresh();
}