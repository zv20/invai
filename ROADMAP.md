# invai Roadmap

> **📝 IMPORTANT**: This roadmap is a living document. Update this file whenever features are completed, priorities change, or new features are planned. Keep it synchronized with actual development progress.

---

## Current Version: v0.7.8
**Last Updated**: January 22, 2026

---

## v0.8.0 - Inventory Audits & Change Tracking
**Status**: 📋 Planned  
**Target**: Q2 2026  
**Focus**: Accountability and audit trails

### Audit System
- [ ] Create audit_log table:
  - id, timestamp, user_id, action_type, item_type, item_id, old_value, new_value, reason, notes
- [ ] Track all inventory changes:
  - Quantity adjustments
  - Product edits
  - Batch modifications
  - Deletions

### Stock Adjustment Features
- [ ] Stock count/audit mode UI
- [ ] Adjustment reasons dropdown:
  - Physical count correction
  - Damaged goods
  - Stolen/shrinkage
  - Expired and disposed
  - Customer return
  - Supplier credit
  - Data entry error
- [ ] Adjustment notes field (optional details)
- [ ] Before/after quantity display

### Variance Reporting
- [ ] Expected vs actual stock report
- [ ] Variance summary by category
- [ ] Shrinkage/loss tracking
- [ ] Adjustment history view (filterable by date, user, reason)
- [ ] Export variance reports

### Change History View
- [ ] "History" tab on product detail page
- [ ] Timeline of all changes (who, when, what, why)
- [ ] Filter by action type
- [ ] Filter by date range
- [ ] Search within history

**Notes:**
- Before v0.10.0 (no login): Track changes as "System" or manual user initials entry
- After v0.10.0 (with login): Automatic user attribution to all actions

---

## v0.9.0 - Reporting & Analytics
**Status**: 📋 Planned  
**Target**: Q3 2026  
**Focus**: Business intelligence

### Advanced Reporting
- [ ] Inventory turnover rate (by product, category, supplier)
- [ ] Cost analysis with FIFO/FEFO tracking
- [ ] Expiry waste reports (cost of expired goods)
- [ ] Supplier performance metrics:
  - Average cost per supplier
  - Delivery reliability (if tracked)
  - Product count per supplier
- [ ] Stock value trends over time
- [ ] Low stock frequency reports

### Export Capabilities
- [ ] PDF report generation:
  - Inventory snapshot
  - Variance reports
  - Expiry waste reports
  - Category summaries
- [ ] Excel exports with charts:
  - Pivot-ready data exports
  - Pre-formatted sheets with graphs
  - Custom date range selection

### Dashboard Enhancements
- [ ] Charts for inventory trends
- [ ] Cost breakdown visualizations
- [ ] Expiry timeline graph
- [ ] Category distribution pie chart
- [ ] Interactive date range picker

---

## v0.10.0 - User Management & Security
**Status**: 📋 Planned  
**Target**: Q4 2026  
**Focus**: Multi-user support and audit compliance

### User Authentication
- [ ] Login system (username/password)
- [ ] Session management
- [ ] Password reset functionality
- [ ] First-time setup wizard

### Role-Based Permissions
- [ ] **Admin**: Full access (all operations, settings, user management)
- [ ] **Manager**: Inventory operations, reports, limited settings
- [ ] **Staff**: Add/edit inventory, basic operations
- [ ] **Viewer**: Read-only access to inventory and reports

### Activity Logging
- [ ] Complete audit trail of all user actions
- [ ] Login/logout tracking
- [ ] Failed login attempts
- [ ] Permission-based action logging
- [ ] Export activity logs

### Security Features
- [ ] Secure password hashing
- [ ] Session timeout
- [ ] Brute-force protection
- [ ] Data backup before critical operations
- [ ] User-specific data visibility (if needed)

---

## v0.11.0 - Mobile & API Integration
**Status**: 📋 Planned  
**Target**: Q1 2027  
**Focus**: Accessibility and extensibility

### Progressive Web App (PWA)
- [ ] Install as app on mobile devices
- [ ] Offline mode with local storage
- [ ] Background sync when online
- [ ] Push notifications for alerts
- [ ] App-like experience on phones/tablets

### Mobile Optimizations
- [ ] Touch-friendly UI improvements
- [ ] Optimized barcode scanner for mobile cameras
- [ ] Swipe gestures for quick actions
- [ ] Mobile-first filter interface
- [ ] Simplified mobile navigation

### API Documentation
- [ ] RESTful API documentation
- [ ] Authentication for API access
- [ ] Rate limiting
- [ ] API usage examples
- [ ] Webhook support for external integrations

### Integration Capabilities
- [ ] Export/Import via API
- [ ] Third-party app connections
- [ ] Automated data sync options
- [ ] External barcode database lookup

---

## Implementation Timeline

| Version  | Target Date | Status |
|----------|-------------|--------|
| v0.7.8   | Q1 2026     | ✅ Current |
| v0.8.0   | Q2 2026     | 📋 Planned |
| v0.9.0   | Q3 2026     | 📋 Planned |
| v0.10.0  | Q4 2026     | 📋 Planned |
| v0.11.0  | Q1 2027     | 📋 Planned |

> **Note**: App will remain in beta (v0.x.x) until comprehensive testing is complete and we're ready for production v1.0.0 release.

---

## Completed Versions

### ✅ v0.7.7/v0.7.8 - Categories & Suppliers + Repository Cleanup (Jan 21-22, 2026)

**Migration 002: Categories & Suppliers System**
- [x] Create categories table (pre-defined list)
- [x] Default categories: Dairy, Produce, Meat, Bakery, Frozen, Dry Goods, Beverages, Snacks, Condiments, Cleaning, Personal Care, Other
- [x] Migrate products from text "item" field to category_id
- [x] Category management UI in Settings (add/edit/delete/reorder)
- [x] Category-based filtering on Inventory page
- [x] Color-coded category badges
- [x] Create suppliers table (user-managed)
- [x] Migrate products from text "supplier" field to supplier_id
- [x] Supplier management UI in Settings (add/edit/delete)
- [x] Filter products by supplier
- [x] Supplier display on product cards and detail view

**Filtering System**
- [x] Filter by category (dropdown/checkboxes)
- [x] Filter by supplier
- [x] Filter by stock status (in stock, low stock, out of stock)
- [x] Filter by expiry status (expired, urgent, soon, normal)
- [x] Filter by location
- [x] Combine multiple filters
- [x] Clear all filters button
- [x] Show active filter count

**v0.7.8 Repository Cleanup**
- [x] Reorganize scripts into `/scripts/fixes/` and `/scripts/install/`
- [x] Create comprehensive scripts/README.md documentation
- [x] Remove obsolete documentation files
- [x] Clean migration directory (removed duplicate migrations)
- [x] Improve update system with channel auto-detection

### ✅ v0.7.0 - Migration System & Update Channels (Jan 21, 2026)
- [x] Database migration system with version tracking
- [x] Update channel switching (Stable/Beta)
- [x] Automatic backups before migrations
- [x] Channel management UI in Settings
- [x] Migration runner with rollback support

### ✅ v0.6.0 - Smart Inventory Actions (Jan 21, 2026)
- [x] FIFO/FEFO batch suggestions
- [x] Quick actions on batches (+1, +5, -1, -5, empty)
- [x] Bulk operations (delete, location change, quantity adjust)
- [x] Browser notifications for low stock
- [x] Batch-level quantity management

### ✅ v0.5.1 - Dynamic About Section (Jan 20, 2026)
- [x] Changelog API endpoint
- [x] Auto-updating About section in Settings
- [x] Version display with release notes

### ✅ v0.5.0 - Compact Cards (Jan 20, 2026)
- [x] Compact product cards with barcode display
- [x] Location display with multi-location support
- [x] Improved card layout and styling

### ✅ v0.4.0 - Unified Inventory (Jan 20, 2026)
- [x] Merged Products and Inventory tabs
- [x] Product detail view modal
- [x] Batch management in detail view

### ✅ v0.3.0 - Dashboard (Jan 20, 2026)
- [x] Real-time statistics (total products, low stock, expiring soon)
- [x] Category breakdown chart
- [x] Recent activity feed
- [x] Quick navigation to inventory

### ✅ v0.2.0 - Barcode Scanning (Jan 19, 2026)
- [x] Webcam barcode scanning integration
- [x] Product search by barcode
- [x] Scanner modal UI

### ✅ v0.1.0 - Initial Release (Jan 18, 2026)
- [x] Product management (CRUD)
- [x] Batch tracking with expiry dates
- [x] Inventory value calculations
- [x] CSV import/export
- [x] Basic dashboard statistics

---

## Status Legend

- 🔄 **In Progress** - Currently being developed
- 📋 **Planned** - Scheduled for future development
- ✅ **Completed** - Feature shipped
- ⏸️ **On Hold** - Paused/deprioritized
- ❌ **Cancelled** - Removed from roadmap

---

## How to Update This Roadmap

1. **When starting a feature**: Change status from 📋 Planned to 🔄 In Progress
2. **When completing a feature**: Check the box `[ ]` → `[x]`
3. **When shipping a version**: 
   - Update version status to ✅ Completed
   - Move version to "Completed Versions" section
   - Update "Current Version" at top
   - Update "Last Updated" date
4. **When priorities change**: Reorder items or update timeline
5. **When adding new features**: Add to appropriate version section
6. **Commit changes with meaningful message**: e.g., "docs: Update roadmap - completed Migration 002"

---

## Notes & Decisions

### Design Principles
- Keep UI simple and intuitive
- Focus on grocery inventory needs
- Maintain backward compatibility when possible
- Use migrations for all database changes
- Stay in beta (v0.x.x) until production-ready

### Out of Scope (Intentionally Excluded)
- Complex warehouse management
- E-commerce integration
- Recipe/BOM management
- Advanced manufacturing features
- Supplier order automation

### Path to v1.0.0 (Production Release)
The app will graduate to v1.0.0 when:
- All v0.x.x planned features are complete
- Comprehensive testing (manual + automated) is done
- Security audit passed (especially for multi-user features)
- Production deployment proven stable
- Documentation complete (user guide, API docs)
- Migration path from beta to production tested

---

**Last Reviewed**: January 22, 2026  
**Next Review**: When starting v0.8.0 development