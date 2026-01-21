# Changelog

All notable changes to the Grocery Inventory Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.4] - 2026-01-21

### Added
- **🏷️ Categories Management System**
  - Dedicated categories table with rich metadata (color, icon, description, display order)
  - Full CRUD API endpoints for categories
  - Color-coded category badges throughout UI
  - Category icons with emoji support
  - Category quick-edit with validation
  - Delete protection (prevents deletion if products use the category)
  - Category filtering in inventory views

- **🚚 Suppliers Management System**
  - Dedicated suppliers table with contact information
  - Full CRUD API endpoints for suppliers
  - Contact details (name, phone, email, address)
  - Supplier notes and metadata
  - Supplier quick-edit with validation
  - Delete protection (prevents deletion if products use the supplier)
  - Supplier filtering in inventory views

- **Enhanced Product Management**
  - Product images support
  - Allergen information tracking
  - Nutritional data storage
  - Storage temperature requirements
  - Enhanced search with category/supplier joins

- **Database Migration**
  - Migration 004: Add categories and suppliers tables
  - Automated data migration from legacy text fields to relational tables
  - Foreign key relationships with proper constraints
  - Backward compatibility maintained

- **UI Enhancements**
  - Modern settings management interface
  - Category/supplier management modals
  - Color picker for category customization
  - Improved form validation and error handling
  - Toast notifications for all operations
  - Enhanced visual feedback with category colors and icons

### Changed
- Products now reference categories/suppliers by ID instead of plain text
- Dashboard stats now use proper JOIN queries
- Inventory summary includes category/supplier metadata
- Search functionality enhanced to include supplier names
- Export/import updated for new schema

### Fixed
- Category/supplier filtering now works correctly
- Null handling improved in category/supplier queries
- Product queries optimized with proper JOINs
- Dashboard breakdown uses relational data

### Database Schema
- Added `categories` table with columns: id, name, description, color, icon, display_order, created_at, updated_at
- Added `suppliers` table with columns: id, name, contact_name, phone, email, address, notes, created_at, updated_at
- Modified `products` table: added category_id, supplier_id, product_image, allergen_info, nutritional_data, storage_temp
- Legacy category and supplier text fields deprecated (kept for migration)

## [0.7.0] - 2026-01-18

### Added
- **🔧 Database Migration System**
  - Automated schema versioning and migration tracking
  - Migration history with timestamps and status
  - Automatic backup creation before migrations
  - Migration rollback capability
  - Migration status API endpoint
  - Version tracking in migrations_history table

- **📡 Update Channel System**
  - Stable channel (main branch) for production releases
  - Beta channel (develop branch) for latest features
  - Channel switching with automatic backup
  - Channel preference persistence
  - Update channel management API

- **Enhanced Settings Interface**
  - Dedicated settings page with tabs
  - Migration status viewer
  - Channel management interface
  - System information display

### Changed
- Database initialization now uses migration system
- Legacy data migration integrated with new system
- Version checking respects selected update channel
- Startup logs include migration and channel information

### Fixed
- Database schema conflicts during updates
- Column addition errors for existing databases
- Migration order and dependencies

### Technical
- Migration runner supports async operations
- Each migration creates automatic backup
- Failed migrations prevent application startup
- Migration files organized in migrations/ directory

## [0.6.0] - 2026-01-10

### Added
- **🎯 Smart Inventory Actions**
  - FIFO/FEFO batch suggestion API
  - Urgency indicators (expired, urgent, soon, normal)
  - Low stock alerts with configurable thresholds
  - Quick quantity adjustment for batches
  - Mark batch as empty feature
  - Bulk operations: delete batches, update location, adjust quantities
  - Batch suggestion includes expiry calculation

- **Batch Intelligence**
  - Automatic batch prioritization (oldest first, expiry-aware)
  - Days-until-expiry calculation
  - Smart recommendations for which batch to use
  - Expiry status indicators

### Changed
- Inventory operations now suggest optimal batches
- Low stock threshold made configurable
- Batch operations can be performed in bulk

### API Endpoints
- GET `/api/products/:id/batch-suggestion` - Get recommended batch to use
- GET `/api/alerts/low-stock` - Get low stock alerts
- POST `/api/inventory/batches/:id/adjust` - Quick quantity adjustment
- POST `/api/inventory/batches/:id/mark-empty` - Mark batch as depleted
- POST `/api/inventory/bulk/delete` - Bulk delete batches
- POST `/api/inventory/bulk/update-location` - Bulk update batch locations
- POST `/api/inventory/bulk/adjust` - Bulk quantity adjustment

## [0.5.0] - 2026-01-05

### Added
- **📊 Dashboard System**
  - Real-time inventory statistics
  - Total products, items, and inventory value
  - Low stock alerts counter
  - Category breakdown (top 5)
  - Recent products list
  - Expiration alerts (expired, urgent, soon)
  - Visual cards with icons
  
- **📋 Changelog System**
  - CHANGELOG.md file created
  - Changelog API endpoint
  - In-app changelog viewer
  - Version history display
  - Categorized change lists

- **💾 Enhanced Backup System**
  - Backup upload and restore
  - Automatic safety backups before restore
  - Backup file validation
  - File size and age information
  - Download backup files

### Changed
- Dashboard replaces basic home screen
- Expiration tracking enhanced with categorization
- Backup management more robust

### API Endpoints
- GET `/api/dashboard/stats` - Dashboard statistics
- GET `/api/dashboard/expiration-alerts` - Expiration alerts by urgency
- GET `/api/changelog` - Get changelog data
- POST `/api/backup/upload` - Upload and restore backup file

## [0.4.0] - 2025-12-20

### Added
- Product-level cost tracking (cost per case)
- Inventory value calculation
- Value reporting in inventory summary
- Per-item cost calculation
- Total inventory value API endpoint

### Changed
- Products table includes cost_per_case column
- Export includes cost information
- Import supports cost data

## [0.3.0] - 2025-12-10

### Added
- CSV Export functionality
- CSV Import with data validation
- Bulk product and batch creation
- Import progress reporting
- Export includes all product and batch data

### Changed
- Import handles duplicate products intelligently
- CSV format standardized

## [0.2.0] - 2025-12-01

### Added
- Backup system with automatic cleanup
- Manual backup creation
- Backup list and download
- Backup restore functionality
- Maximum backup retention (10 backups)
- Timestamp-based backup naming

### Changed
- Database operations include backup safety
- Old backups automatically cleaned up

## [0.1.0] - 2025-11-15

### Added
- Initial release
- Product management (CRUD operations)
- Inventory batch tracking
- Expiration date tracking
- Search functionality
- Category and supplier fields
- Barcode support
- Location tracking
- SQLite database
- RESTful API
- Responsive web interface

### Features
- Add, edit, delete products
- Track inventory by batch
- Monitor expiration dates
- Search across products
- Filter by category
- In-house numbering system
- Case and item quantity tracking