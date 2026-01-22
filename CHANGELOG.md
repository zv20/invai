# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.7] - 2026-01-21
### Added
- **Migration 002** - Automated creation of categories and suppliers tables (from beta)
- Complete integration of v0.7.6 UI with v0.7.5e database migrations

### Fixed
- ✅ **Categories menu empty on load** - Auto-loads when Settings tab opens (from v0.7.5e)
- ✅ **Suppliers menu empty on load** - Auto-loads when Settings tab opens (from v0.7.5e)
- ✅ **Color picker not working** - Categories table now includes color column (from v0.7.5e)
- ✅ **Supplier phone column error** - Suppliers table properly structured with contact fields (from v0.7.5e)
- ✅ **Update page not initializing** - Channel selection loads on tab open (from v0.7.5e)
- ✅ **Backups not loading initially** - Backup list auto-populates (from v0.7.5e)
- ✅ **Main branch missing Migration 002** - Now includes critical database tables for categories/suppliers

### Changed
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

- **v0.7.7** - Complete categories & suppliers (UI + Database merged)
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

### Version Commit Hashes
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