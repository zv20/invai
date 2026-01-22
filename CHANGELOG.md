# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.7.8] - 2026-01-22
### Changed
- **Repository Cleanup** - Organized scripts into dedicated subdirectories
  - Created `/scripts/fixes/` for database fix scripts
  - Created `/scripts/install/` for installation scripts
  - Added comprehensive scripts/README.md documentation
- **Code Organization** - Removed obsolete files from root directory
  - Deleted BRANCH_RENAME.md (branch rename complete)
  - Deleted server-update-endpoint.txt (unused code snippet)
  - Deleted SYSTEM_UPDATE_PATCH.md (superseded by installers)
  - Deleted fix_supplier_columns.js (never needed)
- **Improved Maintainability** - Cleaner root directory structure for easier navigation

### Documentation
- Added `/scripts/README.md` with detailed usage instructions for all scripts
- Updated file paths in script documentation
- Enhanced troubleshooting guides

## [0.7.7] - 2026-01-22
### Maintenance & Infrastructure
- **Branch Rename** - Renamed `develop` branch to `beta` for UI/branch consistency
- **Update Script Enhanced** - Added git branch auto-detection fallback when `.update-channel` file is missing
- **Database Fix Scripts** - Created `fix_suppliers_table.js` and `fix_supplier_columns.js` for migration recovery
- **Migration Cleanup** - Removed duplicate migration files (002_categories.js, 003_suppliers.js, 004_enhanced_product_fields.js)
- **Documentation** - Updated all references from `develop` to `beta` across codebase
  - server.js (3 instances)
  - update.sh
  - SYSTEM_UPDATE_PATCH.md
  - README.md
  - .github/workflows/update-checker.yml

### Fixed
- Update script now correctly detects current branch if channel file is missing
- Prevents accidental branch switching during updates
- Enhanced error handling in update workflow

### Added
- **Migration 002** - Automated creation of categories and suppliers tables (from beta)
- Complete integration of v0.7.6 UI with v0.7.5e database migrations

### Changed
- Update system is now more robust with intelligent fallback detection
- Merged beta branch bugfixes and migrations into main
- Complete, functional categories and suppliers system (UI + Database)

## [0.7.6] - 2026-01-21
### Added
- **Categories Table** - Dedicated database table for categories with color support and descriptions
- **Suppliers Table** - Dedicated database table for suppliers with contact information (contact person, email, address)
- **Category Management UI** - Full CRUD interface for managing categories with color picker
- **Supplier Management UI** - Full CRUD interface for managing suppliers with contact details
- **Migration 002** - Automatic migration of existing categories and suppliers from products table
- **Category Colors** - Visual color coding for categories throughout the app
- New API endpoints for categories CRUD (`/api/settings/categories`)
- New API endpoints for suppliers CRUD (`/api/settings/suppliers`)

### Fixed
- ✅ **Categories menu empty on load** - Now loads automatically when Settings tab is opened
- ✅ **Suppliers menu empty on load** - Now loads automatically when Settings tab is opened
- ✅ **Color picker not working** - Categories now store color metadata in database
- ✅ **Supplier phone column error** - Replaced with proper contact_person, email, and address fields
- ✅ **Update page not initializing** - Channel selection now loads immediately when Updates tab opens
- ✅ **Backups not loading initially** - Backup list now populates automatically when Backups tab opens

### Changed
- Suppliers now have structured contact information instead of just a name
- Categories support descriptions and custom colors
- Improved settings navigation with auto-loading for all tabs

## [0.7.0] - 2026-01-21
### Added
- **Database Migration System** - Automated schema versioning and migrations
- **Migration Runner** - Handles sequential migration execution with rollback support
- **Migration History Tracking** - Tracks applied migrations in dedicated table
- **Automatic Backups** - Creates safety backups before running migrations
- **Migration Status API** - New endpoint `/api/migrations/status` for migration information
- **Baseline Migration (001)** - Establishes initial schema for existing databases
- **Update Channel System** - Choose between Stable and Beta release channels
- **Channel Switching** - Switch between main and beta branches with automatic backup
- **Channel Persistence** - Remembers selected channel across restarts
- **Update Channel API** - New endpoints for channel management

### Changed
- Database initialization now uses migration system
- Legacy data migration integrated into new system
- Server startup includes migration status check
- Enhanced error handling for failed migrations

## [0.6.0] - 2026-01-21
### Added
- **FIFO/FEFO Batch Suggestions** - Smart recommendations for which batch to use first based on expiry dates
- **Low Stock Browser Notifications** - Get notified when items fall below reorder threshold
- **Quick Actions** - Fast quantity adjustments with +1, +5, -1, -5 buttons and mark as empty
- **Bulk Operations** - Select multiple batches for batch deletion, location updates, and quantity adjustments
- **Batch Suggestion API** - New endpoint `/api/products/:id/batch-suggestion` for FIFO/FEFO logic
- **Low Stock Alerts API** - New endpoint `/api/alerts/low-stock` with configurable threshold
- **Quick Adjustment API** - New endpoint `/api/inventory/batches/:id/adjust` for rapid quantity changes
- **Mark Empty API** - New endpoint `/api/inventory/batches/:id/mark-empty` for zero-out batches
- **Bulk Delete API** - New endpoint `/api/inventory/bulk/delete` for multi-batch deletion
- **Bulk Location Update API** - New endpoint `/api/inventory/bulk/update-location` for batch moves
- **Bulk Quantity Adjust API** - New endpoint `/api/inventory/bulk/adjust` for mass quantity changes

### Changed
- Enhanced product detail view with batch suggestion display
- Improved batch cards with quick action buttons
- Added urgency indicators (expired, urgent, soon, normal) for batch suggestions

## [0.5.1] - 2026-01-20
### Added
- **Changelog API** - Dynamic version and changelog retrieval from CHANGELOG.md
- **Auto-updating About section** - Settings page now shows current version and latest changes automatically
### Changed
- About section in Settings now loads dynamically from API
- Version information always reflects latest package.json version

## [0.5.0] - 2026-01-20
### Changed
- **Compact product cards** - Reduced card height by 30% with tighter spacing
- **Prominent barcode display** - Barcodes now displayed on dedicated line with larger font
- **Location display** - Shows primary storage location with multi-location indicator (+N)
- Optimized card layout for better information density
- Smaller font sizes for badges and metadata

### Added
- Location fetching for all products to display on inventory cards
- Multi-location support with "+ N more" indicator

## [0.4.1] - 2026-01-20
### Fixed
- **CRITICAL:** Duplicate variable declarations (`selectedProductId`) causing SyntaxError
- Removed duplicate `let` statements from inventory.js (variables now only in core.js)
- JavaScript execution errors preventing inventory page from loading

## [0.4.0] - 2026-01-20
### Changed
- **Unified Inventory** - Merged "Products" and "Inventory" tabs into single "Inventory" tab
- Streamlined navigation from 4 tabs to 3 tabs (Dashboard → Inventory → Settings)
- Redesigned inventory workflow with click-through detail view
- Product list view now shows stock counts, expiry warnings, and batch information

### Added
- Product detail view with comprehensive information display
- Alert banners on detail pages for expired and expiring items
- "Back to Inventory" button for easy navigation
- Visual expiry warnings on product cards (red/orange alerts)
- Batch management directly from product detail view
- Cost per item calculations in detail view

### Removed
- Separate "Products" tab (merged into Inventory)
- Product dropdown selector (replaced with clickable cards)

## [0.3.0] - 2026-01-20
### Added
- **Dashboard with real-time statistics**
  - Total products, items, and inventory value
  - Low stock alerts (products with < 10 items)
  - Expiration tracking (expired, urgent 7 days, soon 30 days)
  - Category breakdown chart
  - Recent activity feed
- Auto-refresh every 60 seconds for live data
- Visual indicators for stock levels (red/yellow/green)
- Expiry status badges with color coding

### Changed
- Default landing page is now Dashboard (instead of Inventory)
- Improved visual hierarchy with card-based layout

## [0.2.0] - 2026-01-19
### Added
- **Barcode scanning** functionality via webcam
- Product search by barcode
- Auto-populate product form when barcode match found
- Visual feedback for successful/failed scans
- Camera permission handling

### Changed
- Enhanced product modal with barcode field
- Improved product search with barcode support

## [0.1.0] - 2026-01-18
### Added
- Initial grocery inventory application
- Product management (CRUD operations)
- Batch tracking with expiration dates
- Inventory value calculations
- Cost tracking (per case and per item)
- Location tracking for batches
- Supplier and brand categorization
- In-house numbering system
- Search functionality
- Modal-based forms for products and batches
- SQLite database backend
- RESTful API with Express.js
- Responsive UI with purple gradient theme
- CSV import/export functionality
- Database backup and restore

### Technical Details
- Express.js server on port 3000
- SQLite3 database (`inventory.db`)
- Multi-file JavaScript architecture (core.js, inventory.js, dashboard.js, settings.js)
- CORS enabled for API access
- File upload support with Multer

---

## Version History Summary

- **v0.7.8c** - Critical stability hotfix (duplicate variables, initialization errors, version strings)
- **v0.7.8b** - Hotfix for channel selector initialization
- **v0.7.8a** - Bug fixes for suppliers, categories, and update buttons
- **v0.7.8** - Repository cleanup and script organization
- **v0.7.7** - Complete categories & suppliers (UI + Database merged) + Maintenance updates
- **v0.7.6** - Categories & suppliers UI (missing database)
- **v0.7.0** - Migration system & update channels
- **v0.6.0** - Smart inventory actions (FIFO/FEFO, notifications, quick actions, bulk ops)
- **v0.7.1** - Dynamic About section with changelog API
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

### Version Commit Hashes
- v0.7.8c: [5521f64](https://github.com/zv20/invai/commit/5521f64f9ddde7f8e3e98017fbf35d0e7c74d1b9) (latest)
- v0.7.8b: Check git log
- v0.7.8a: Check git log
- v0.7.8: Check git log
- v0.7.7: Check git log
- v0.7.6: Check git log
- v0.7.0: Check git log
- v0.6.0: Check git log
- v0.5.1: Check git log
- v0.5.0: `0ff631b`
- v0.4.1: `8e53033`
- v0.4.0: `8480f8a`
- v0.3.0: Check git log
- v0.2.0: Check git log
- v0.1.0: Check git log