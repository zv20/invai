# Page Refactoring Plan - v0.11.0

## Overview
Refactoring the monolithic `index.html` into separate pages for better maintainability, performance, and user experience.

## Changes Made ✅

### 1. Mobile Navigation Cleanup
- ✅ **Removed mobile bottom navigation bar**
  - Updated `public/css/mobile.css`
  - Disabled `.bottom-nav` and `.bottom-nav-item` completely
  - Removed bottom padding from body (no longer needed)
  - Updated FAB positioning (no longer offset for bottom nav)

### 2. Shared Navigation Component
- ✅ **Created `public/includes/nav.html`**
  - Contains complete navigation structure
  - Includes all pages: Dashboard, Inventory, Reports, Users, Predictions, Advanced Search, Dashboard Builder, Settings
  - Auto-highlights active page based on current URL
  - Ready to be included in all pages

- ✅ **Created `public/js/shared-nav.js`**
  - Shared navigation functionality
  - Handles menu toggle, sidebar overlay, active page highlighting
  - Used across all pages for consistent behavior

## Still TODO 🔄

The following pages need to be created from the current `index.html`:

### 3. Page Separation
**Extract from `index.html`:**

#### 3a. `dashboard.html`
- Dashboard tab content
- Stats cards, expiration alerts
- Category breakdown, recent products
- Required JS: `dashboard.js`, `charts.js`

#### 3b. `inventory.html`
- Inventory tab content  
- Product list view, detail view
- Add product/batch modals
- Required JS: `inventory.js`, `batch-suggestions.js`, `quick-actions.js`

#### 3c. `reports.html`
- Reports tab content
- Report navigation, export functionality
- Required JS: `reports.js`, `charts.js`

#### 3d. `settings.html`
- Settings tab content
- All settings subtabs (updates, categories, suppliers, backups, about, danger zone)
- All modals (category, supplier)
- Required JS: `settings.js`, `update-settings.js`, `categories-manager.js`, `suppliers-manager.js`

### 4. Update Existing Pages
**Already exist but need navigation updates:**
- `users.html` - Add shared navigation
- `predictions.html` - Add shared navigation  
- `advanced-search.html` - Add shared navigation
- `dashboard-builder.html` - Add shared navigation

### 5. Shared Resources
**Common to all pages:**
- Scanner modal
- Command palette
- Version footer
- Dark mode toggle
- Auth check

## Benefits

### Performance
- ✅ Smaller initial page load (only load what's needed)
- ✅ Faster page switches (no tab hiding/showing)
- ✅ Better caching (pages cached independently)

### Maintainability  
- ✅ Easier to find and edit specific features
- ✅ Cleaner file structure
- ✅ Reduced file size per page

### User Experience
- ✅ Proper browser history (back button works)
- ✅ Bookmarkable URLs for each page
- ✅ Consistent navigation across mobile and desktop
- ✅ No redundant bottom nav bar on mobile

### Navigation
- ✅ **Unified hamburger menu** on both mobile and desktop
- ✅ **All pages accessible** from one menu
- ✅ **No confusion** between bottom nav and hamburger menu

## Implementation Notes

### Shared HTML Structure
Each page will follow this structure:
```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <!-- Meta tags, CSS -->
</head>
<body>
    <div class="container">
        <!-- Navigation (from includes/nav.html) -->
        
        <!-- Page-specific content -->
        
        <!-- Shared modals (scanner, command palette) -->
    </div>
    
    <!-- Shared JS -->
    <script src="js/auth.js"></script>
    <script src="js/shared-nav.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/event-handlers.js"></script>
    <script src="js/dark-mode.js"></script>
    
    <!-- Page-specific JS -->
</body>
</html>
```

### URL Structure
- `/` or `/index.html` → Redirect to `/dashboard.html`
- `/dashboard.html` → Dashboard
- `/inventory.html` → Inventory
- `/reports.html` → Reports  
- `/users.html` → User Management
- `/predictions.html` → Predictions
- `/advanced-search.html` → Advanced Search
- `/dashboard-builder.html` → Dashboard Builder
- `/settings.html` → Settings

## Testing Checklist

- [ ] Navigation menu works on mobile and desktop
- [ ] Active page is highlighted in menu
- [ ] All pages load correctly
- [ ] Dark mode persists across pages
- [ ] Authentication works on all pages
- [ ] Back button works properly
- [ ] Bookmarks work for each page
- [ ] Scanner modal works on all pages
- [ ] Command palette works on all pages

## Version
Target: **v0.11.0**

## Migration Path

1. Deploy this branch to beta server
2. Test mobile and desktop navigation
3. Create remaining pages (dashboard.html, inventory.html, reports.html, settings.html)
4. Update existing pages with new navigation
5. Test all functionality
6. Merge to main for production
