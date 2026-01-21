# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- v0.5.1: Check git log
- v0.5.0: `0ff631b`
- v0.4.1: `8e53033`
- v0.4.0: `8480f8a`
- v0.3.0: Check git log
- v0.2.0: Check git log
- v0.1.0: Check git log