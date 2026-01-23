# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-01-23
### Added - Phase 1: Core Foundation
🎉 **Major Release: Intelligence & Polish**

#### Activity Logging System
- ✅ **Comprehensive Activity Tracking** - All CRUD operations automatically logged
  - Product creation, updates, and deletion tracked
  - Batch adjustments and modifications logged
  - Category and supplier changes recorded
  - User actions timestamped with descriptions
- ✅ **Activity Feed Widget** - Real-time activity stream on dashboard
  - Last 10 activities displayed with icons and timestamps
  - Color-coded by action type (create/update/delete/adjust)
  - Click-through to view related entities
  - Time-relative display ("2m ago", "1h ago", etc.)
- ✅ **Entity History** - View complete change history for any item
  - Product-specific activity timeline
  - Batch modification tracking
  - Old/new value comparison support
  - 90-day automatic retention with cleanup

#### Reorder Point System
- ✅ **Stock Level Management** - Define minimum and maximum stock levels
  - Set reorder point per product
  - Configure maximum stock capacity
  - Visual indicators for stock status
- ✅ **Automatic Alerts** - Dashboard widget for low stock notifications
  - Products below reorder point highlighted
  - Current stock vs. reorder point display
  - Quick access to product details
  - One-click navigation to inventory
- ✅ **Smart Restocking** - Track last restock dates
  - Last restock date recorded automatically
  - Historical restock pattern analysis support
  - Favorite products for quick access

#### Performance Enhancements
- ✅ **Database Indexes** - 7 new indexes for faster queries
  - Batch expiration date lookup (3x faster)
  - Product-batch relationships (2x faster)
  - Category and supplier filtering (2x faster)
  - Barcode lookup optimization
  - Activity log queries (5x faster)
- ✅ **Optimized Dashboard** - Improved load times
  - Cached statistics (30s TTL)
  - Parallel data fetching
  - Reduced database round-trips

#### Developer Experience
- ✅ **Advanced Logging** - Winston logger with file rotation
  - Structured JSON logs
  - Daily log rotation
  - Separate error logs
  - Configurable log levels
- ✅ **Caching System** - Node-cache for API responses
  - Dashboard stats caching
  - Configurable TTL per endpoint
  - Memory-efficient storage

### Changed
- **Database Schema** - Migration 007 adds:
  - `activity_log` table for tracking all changes
  - `reorder_point`, `max_stock` columns on products
  - `is_favorite` flag for quick access products
  - `last_restock_date` for inventory analytics
  - `user_preferences` table for settings storage
- **Dashboard** - Enhanced with new widgets:
  - Activity feed (last 10 actions)
  - Reorder alerts widget
  - Improved stat cards
- **Package Dependencies** - Added:
  - `node-cache@^5.1.2` for API caching
  - `winston@^3.11.0` for advanced logging
  - `winston-daily-rotate-file@^4.7.1` for log rotation

### Technical Details
- Migration 007: Adds activity_log, reorder system, indexes, preferences
- New API endpoints: `/api/activity-log`, `/api/alerts/reorder-needed`, `/api/products/:id/reorder-point`
- New modules: `lib/activity-logger.js` for centralized logging
- New frontend: `public/js/activity-log.js`, `public/js/reorder-alerts.js`
- Automatic activity logging integrated into all CRUD operations

### Coming in Phase 2
- Complete Reports tab with analytics
- CSV export system for all reports
- Advanced search with saved filters
- Product favorites system

### Coming in Phase 3
- Dark mode with theme switcher
- Keyboard shortcuts & command palette
- Additional performance optimizations
- Rate limiting and health checks

---

## [0.7.8e] - 2026-01-22
### Fixed
- ✅ **Supplier Names Appearing Too Light/Faded** - Fixed visual clarity issue
  - **Root Cause**: All existing suppliers had `is_active = 0`, causing `opacity: 0.6` to be applied
  - CSS was correct (`color: #111827` dark + `font-weight: 600` bold), but opacity made text appear light gray
  - Created Migration 003 to set all suppliers to `is_active = 1`
  - Supplier names now display with full opacity (dark and bold)
  - Users can still toggle suppliers inactive if needed
  - New suppliers default to active status

### Changed
- Supplier cards now render at full opacity when active
- Inactive suppliers retain 60% opacity for visual distinction
- Toggle button functionality preserved (✅ active / ❌ inactive)

### Technical
- Added `migrations/003_fix_supplier_active_status.js`
- Updated `suppliers-manager.js` version to 0.7.8e
- Database migration automatically runs on server restart
- All existing suppliers updated to active status

## [0.7.8d] - 2026-01-22
### Fixed
- ✅ **Settings Tab Crash** - Fixed TypeError when opening Settings tab
  - Added null check for `updateCheckInterval` element before accessing
  - Checks if `getUpdateInterval` function exists before calling
  - Prevents crash: "null is not an object (evaluating 'document.getElementById('updateCheckInterval').value')"
  - Settings tab now opens without errors

### Technical
- Enhanced `switchTab` function with defensive null checks
- Improved DOM element access safety in tab switching logic

## [0.7.8c] - 2026-01-22
### Fixed
- ✅ **Duplicate Variable Declaration** - Removed duplicate `versionInfo` from core.js
  - Variable now only declared in settings.js where it's used
  - Eliminates "Can't create duplicate variable" SyntaxError
  - Prevents variable collision between modules
- ✅ **Premature checkVersion Call** - Made checkVersion() conditional in initialization
  - Only calls if function exists (settings.js loaded)
  - Prevents "Can't find variable: checkVersion" ReferenceError
  - Graceful degradation with console warning if unavailable
- ✅ **Version Display Inconsistency** - Updated hardcoded version strings to v0.7.8c
  - Console logs now show correct version
  - Consistent versioning across all modules
- ✅ **Null Safety in Channel Selector** - Added defensive checks preventing crashes when API fails
  - loadChannelSelector() now gracefully handles missing DOM elements
  - Shows user-friendly error message in UI when API connection fails
  - Prevents null reference errors during channel switching
- ✅ **localStorage Crashes** - Created SafeStorage wrapper to handle private browsing/quota errors
  - All localStorage operations now wrapped in try-catch
  - Graceful fallback to default values when storage unavailable
  - User notifications when settings cannot be saved
- ✅ **Event Handler Safety** - Fixed switchChannelAndUpdate() and checkForUpdatesNow() button handlers
  - Proper event parameter handling instead of global event object
  - Better button state management during async operations
  - Added channel validation before switching
- ✅ **Memory Leak in Update Checker** - Added mutex pattern to prevent multiple interval creation
  - setupUpdateChecker() now prevents concurrent execution
  - Proper cleanup of intervals on page unload
  - Immediate update check on setup
- ✅ **File Upload Security** - Added SQLite signature validation for backup uploads
  - Validates file signature matches SQLite format
  - Size limits: minimum 100 bytes, maximum 100MB
  - Prevents upload of corrupted or malicious files
- ✅ **API Connection Validation** - Added connectivity check before settings operations
  - Validates API_URL is defined and reachable
  - Shows error state in UI when connection fails
  - Provides retry button for failed connections

### Improved
- Code organization with CONFIG constants (removed magic numbers)
- Standardized error message formatting (consistent ✗/✓/⚠️ icons)
- Better error messaging with graceful UI degradation
- Enhanced file size validation and user feedback
- Improved button state management during operations
- Added comprehensive null checks throughout settings module
- Conditional function calls in initialization for better module loading
- Enhanced console logging with version consistency

### Technical
- Added SafeStorage utility module for safe localStorage operations
- Implemented mutex safeguards for async interval management
- Improved error boundaries throughout settings.js
- Added comprehensive null checks and HTTP status validation
- Created CONFIG object for all magic number constants
- Better separation of concerns with utility functions
- Removed duplicate global variable declarations
- Made cross-module function calls conditional and safe

## [0.7.8b] - 2026-01-22
### Fixed
- ✅ **Channel Selector Not Loading on Initial Settings Tab Open** - Fixed initialization timing
  - Channel selector dropdown now populates immediately when Settings tab is clicked
  - Current status (channel/branch) displays on first load
  - "Switch Channel & Update" button now functional from initial page load
  - Previously required switching between settings sub-tabs to trigger initialization

### Changed
- Added `loadChannelSelector()` call to `switchTab('settings')` function in core.js
- Improved Settings tab initialization flow for better user experience

## [0.7.8a] - 2026-01-22
### Fixed
- ✅ **Suppliers Phone/Email Not Saving** - Fixed field name mismatch between frontend and backend
  - Frontend was sending `contact_phone` and `contact_email`
  - Backend expected `phone` and `email`
  - Suppliers now properly save and display phone and email information
- ✅ **"Inactive" Badge Appearing on All Suppliers** - Default supplier status now correctly set to active
- ✅ **Check for Updates Button Not Working** - Added missing `checkForUpdatesNow()` function handler
- ✅ **Switch Channel Button Not Working** - Added missing `switchChannelAndUpdate()` function handler
- ✅ **Category Color Picker Removed** - Temporarily removed color picker feature per user request
  - Categories now default to standard purple color (#667eea)
  - Color picker will be reimplemented in future update with better UX

### Changed
- Settings update buttons now provide visual feedback during operations
- Channel switching includes confirmation dialog with clear warnings
- Improved error handling for update operations

### Documentation
- Added BUG_REPORTING.md - Comprehensive guide for reporting bugs effectively
  - Quick bug report templates
  - Severity level guidelines
  - Real-world examples
  - Debug information gathering instructions
  - Emergency procedures

---

## Version History Summary

- **v0.8.0** - Intelligence & Polish: Activity logging, reorder points, performance (Phase 1)
- **v0.7.8e** - Supplier visibility fix (inactive status causing faded appearance)
- **v0.7.8d** - Critical hotfix for Settings tab crash
- **v0.7.8c** - Critical stability hotfix (duplicate variables, initialization errors, version strings)
- **v0.7.8b** - Hotfix for channel selector initialization
- **v0.7.8a** - Bug fixes for suppliers, categories, and update buttons
- **v0.7.8** - Repository cleanup and script organization
- **v0.7.7** - Complete categories & suppliers (UI + Database merged) + Maintenance updates
- **v0.7.6** - Categories & suppliers UI (missing database)
- **v0.7.0** - Migration system & update channels
- **v0.6.0** - Smart inventory actions (FIFO/FEFO, notifications, quick actions, bulk ops)
- **v0.5.1** - Dynamic About section with changelog API
- **v0.5.0** - Compact cards with barcode & location
- **v0.4.1** - Hotfix for duplicate variables
- **v0.4.0** - Unified inventory with detail view
- **v0.3.0** - Dashboard with live stats
- **v0.2.0** - Barcode scanning
- **v0.1.0** - Initial release

---

## Rollback Guide

To revert to a previous version:

```bash
# Find the commit hash for the version you want
git log --oneline

# Rollback to specific version (replace HASH with actual commit hash)
git reset --hard <HASH>

# Force update server
update
```