# InvAI Production Roadmap

> **📝 IMPORTANT**: This roadmap is a living document. Update this file whenever features are completed, priorities change, or new features are planned. Keep it synchronized with actual development progress.

---

## Current Version: v0.8.1a
**Last Updated**: January 25, 2026
**Status**: 🟢 Active Development → Production Path

---

## 🎯 Path to Production (v1.0.0)

This roadmap outlines the transformation from beta to production-ready inventory management system over the next 7 months.

### Timeline Overview

| Phase | Version | Timeline | Status | Focus |
|-------|---------|----------|--------|-------|
| **Phase 1** | v0.8.x | Months 1-2 | 🔄 In Progress | Production Essentials |
| **Phase 2** | v0.9.x | Months 3-4 | 📋 Planned | Business Intelligence |
| **Phase 3** | v0.10.x | Months 5-6 | 📋 Planned | Operational Excellence |
| **Phase 4** | v1.0.0 | Month 7+ | 📋 Planned | Scale & Integration |

---

## Phase 1: Production Essentials (v0.8.x - Next 2 Months)
**Status**: 🔄 In Progress  
**Target**: March 2026  
**Focus**: Testing, security, reliability

### 🧪 Testing Infrastructure - CRITICAL
**Priority**: P0 (Blocker for production)

- [ ] **Unit Tests** - Core business logic validation
  - [ ] Inventory calculations (FIFO/FEFO, value, quantity)
  - [ ] Batch expiry logic and suggestions
  - [ ] Reorder point calculations
  - [ ] Activity logging functions
  - [ ] CSV import/export functions
  - Target: 70%+ coverage of `lib/` modules

- [ ] **Integration Tests** - API endpoint validation
  - [ ] Products API (CRUD operations)
  - [ ] Batches API (CRUD, suggestions)
  - [ ] Categories & Suppliers API
  - [ ] Reports API (all report types)
  - [ ] Authentication flows
  - Target: 60%+ coverage of API routes

- [ ] **Test Automation**
  - [ ] GitHub Actions CI pipeline setup
  - [ ] Automated tests on every commit
  - [ ] Pull request test validation
  - [ ] Test coverage reporting
  - [ ] Fail builds on coverage drop

- [ ] **Testing Tools Setup**
  - [ ] Jest or Mocha test framework
  - [ ] Supertest for API testing
  - [ ] Istanbul/NYC for coverage
  - [ ] Test database fixtures
  - [ ] Mock authentication helpers

**Acceptance Criteria**: 60%+ total coverage, all critical paths tested, CI/CD pipeline passing

---

### 🔐 User Management & Security - HIGH
**Priority**: P0 (Blocker for production)  
**Note**: Moving v0.10.0 RBAC to Phase 1 (don't wait until Q4 2026)

- [ ] **User Authentication System**
  - [ ] JWT-based login/logout
  - [ ] Secure password hashing (bcrypt)
  - [ ] Session management with auto-logout
  - [ ] Password complexity requirements
  - [ ] First-time setup wizard
  - [ ] Password reset flow (email-based)

- [ ] **Role-Based Access Control (RBAC)**
  - [ ] **Owner Role**: Full system access, user management, all settings
  - [ ] **Manager Role**: Inventory operations, reports, limited settings (no user management)
  - [ ] **Staff Role**: Add/edit inventory, basic operations (no settings)
  - [ ] **View-Only Role**: Read-only access to inventory and reports
  - [ ] Permission middleware for API routes
  - [ ] UI elements hidden based on role

- [ ] **Enhanced Audit Trail**
  - [ ] Link all activity log entries to specific users
  - [ ] Login/logout tracking
  - [ ] Failed login attempt logging
  - [ ] Permission-based action filtering
  - [ ] User activity reports

- [ ] **Security Features**
  - [ ] 2FA (optional but available)
  - [ ] Session timeout configuration
  - [ ] Brute-force protection (rate limiting)
  - [ ] Secure session cookies (httpOnly, secure)
  - [ ] CSRF protection
  - [ ] XSS sanitization

- [ ] **Database Changes**
  - [ ] Create `users` table (id, username, email, password_hash, role, created_at, last_login)
  - [ ] Create `sessions` table (id, user_id, token, expires_at)
  - [ ] Add `user_id` to activity_log
  - [ ] Migration 008: User management schema

**Acceptance Criteria**: Multi-user login working, all roles enforced, security audit passed

---

### 💾 Database Improvements - HIGH
**Priority**: P1 (Required for scale)

- [ ] **PostgreSQL Support**
  - [ ] PostgreSQL adapter/driver setup
  - [ ] Database abstraction layer (support both SQLite and PostgreSQL)
  - [ ] Migration scripts compatible with both databases
  - [ ] Connection string configuration
  - [ ] Environment-based database selection
  - [ ] Production uses PostgreSQL, dev uses SQLite

- [ ] **Automated Backup System**
  - [ ] Daily automated backups to external storage
  - [ ] AWS S3 / Backblaze B2 / local NAS support
  - [ ] Retention policy (keep 30 daily, 12 monthly)
  - [ ] Backup verification (test restore)
  - [ ] Backup size monitoring
  - [ ] Email alerts on backup failure

- [ ] **Database Reliability**
  - [ ] Connection pooling (pg-pool)
  - [ ] Transaction rollback on errors
  - [ ] Query timeout configuration
  - [ ] Prepared statements (SQL injection prevention)
  - [ ] Database health monitoring
  - [ ] Automatic reconnection on connection loss

- [ ] **Performance Optimization**
  - [ ] Query performance analysis
  - [ ] Additional indexes for slow queries
  - [ ] Query result caching strategy
  - [ ] Batch insert optimization
  - [ ] Archive old activity logs (>90 days)

**Acceptance Criteria**: PostgreSQL running in production, daily backups automated, no SQL errors

---

### 📋 Stock Take / Physical Inventory - HIGH
**Priority**: P1 (Critical business feature)

- [ ] **Stock Count Mode**
  - [ ] Dedicated "Stock Take" page/mode
  - [ ] Location-specific counts (count one location at a time)
  - [ ] Barcode scanning for quick counting
  - [ ] Expected vs actual quantity display
  - [ ] Real-time variance calculation
  - [ ] Save partial counts (resume later)

- [ ] **Adjustment Reasons**
  - [ ] Dropdown with predefined reasons:
    - Physical count correction
    - Shrinkage (theft/loss)
    - Expired and disposed
    - Damaged goods
    - Customer return
    - Supplier credit
    - Data entry error
    - Transfer between locations
    - Other (with notes)
  - [ ] Mandatory reason selection
  - [ ] Optional notes field for details

- [ ] **Variance Reporting**
  - [ ] Before/after quantity snapshots
  - [ ] Variance summary by category
  - [ ] Variance summary by location
  - [ ] Cost impact calculation (value of variance)
  - [ ] Shrinkage/loss tracking over time
  - [ ] Export variance reports to CSV/PDF

- [ ] **Stock Count Scheduling**
  - [ ] Schedule recurring counts (weekly/monthly/quarterly)
  - [ ] Assign counts to specific users
  - [ ] Count completion tracking
  - [ ] Overdue count alerts
  - [ ] Count history log

- [ ] **Database Changes**
  - [ ] Create `stock_counts` table (id, location_id, scheduled_date, completed_date, user_id, status)
  - [ ] Create `stock_count_items` table (id, count_id, product_id, expected_qty, actual_qty, variance, reason, notes)
  - [ ] Migration 009: Stock count system

**Acceptance Criteria**: Full stock take workflow working, variance reports accurate, reasons tracked

---

## Phase 2: Business Intelligence (v0.9.x - Months 3-4)
**Status**: 📋 Planned  
**Target**: May 2026  
**Focus**: Advanced reporting and analytics

### 📊 Enhanced Reporting

- [ ] **Turnover Analysis**
  - [ ] Product turnover rate (inventory turns per period)
  - [ ] Fast-moving vs slow-moving products
  - [ ] Days of inventory on hand (DOH)
  - [ ] Turnover by category and supplier
  - [ ] Seasonal trend analysis
  - [ ] Reorder suggestions based on turnover

- [ ] **Cost Tracking & Analysis**
  - [ ] Cost per category breakdown
  - [ ] Cost per supplier comparison
  - [ ] FIFO cost tracking (oldest batches first)
  - [ ] Cost variance over time
  - [ ] Margin analysis (if selling prices added)
  - [ ] Cost trends by product

- [ ] **Waste Reporting**
  - [ ] Expired goods cost calculation
  - [ ] Waste by category
  - [ ] Waste trends over time
  - [ ] Waste reduction recommendations
  - [ ] Expiry pattern analysis

- [ ] **Stock Performance**
  - [ ] Low stock frequency (items often running out)
  - [ ] Out-of-stock incidents tracking
  - [ ] Stockout cost estimation
  - [ ] Optimal reorder point suggestions
  - [ ] Safety stock recommendations

- [ ] **Supplier Performance**
  - [ ] Average cost per supplier
  - [ ] Product count per supplier
  - [ ] Supplier reliability metrics
  - [ ] Cost comparison across suppliers
  - [ ] Supplier ranking

- [ ] **Date Range Filtering**
  - [ ] All reports support custom date ranges
  - [ ] Quick filters (last 7/30/90 days, this month, last month, YTD)
  - [ ] Date range presets
  - [ ] Compare periods (this month vs last month)

**Acceptance Criteria**: All reports implemented, date filtering working, insights actionable

---

### 📤 Export Capabilities

- [ ] **PDF Report Generation**
  - [ ] Inventory snapshot PDF (current stock levels)
  - [ ] Variance reports with charts
  - [ ] Expiry waste reports
  - [ ] Category summaries
  - [ ] Professional formatting with logo
  - [ ] Page headers/footers with date/page numbers

- [ ] **Advanced CSV/Excel Exports**
  - [ ] Excel exports with multiple sheets
  - [ ] Pre-formatted sheets with charts/graphs
  - [ ] Pivot-ready data exports
  - [ ] Formulas in Excel files
  - [ ] Template CSV generator for imports

- [ ] **Scheduled Reports**
  - [ ] Email reports on schedule (daily/weekly/monthly)
  - [ ] Configure recipients
  - [ ] Attach PDF or CSV
  - [ ] Report delivery log
  - [ ] Custom report templates

**Acceptance Criteria**: PDF/Excel exports working, scheduled emails sending, reports professional

---

### 📈 Dashboard Improvements

- [ ] **Charts & Visualizations**
  - [ ] Inventory value trends (line chart over time)
  - [ ] Category distribution (pie/donut chart)
  - [ ] Expiry timeline (bar chart by week/month)
  - [ ] Low stock alerts (gauge/progress bars)
  - [ ] Stock turnover heatmap
  - [ ] Interactive charts (click to drill down)

- [ ] **Comparative Analytics**
  - [ ] This week vs last week stats
  - [ ] Month-over-month growth
  - [ ] Year-over-year comparison
  - [ ] Trend arrows (↑↓) on stat cards
  - [ ] Percentage change indicators

- [ ] **Alerts Widget Enhancement**
  - [ ] High-value items alert (>$X value)
  - [ ] Expiring soon with cost impact
  - [ ] Low stock with reorder suggestions
  - [ ] Negative stock warnings
  - [ ] Unusual activity alerts

- [ ] **Date Range Picker**
  - [ ] Interactive date range selector on dashboard
  - [ ] All widgets update based on selected range
  - [ ] Persist date range preference
  - [ ] Quick range buttons

**Acceptance Criteria**: Dashboard visually enhanced, charts interactive, trends clear

---

### 📥 Data Import/Export Enhancements

- [ ] **Bulk Product Import**
  - [ ] CSV import with validation
  - [ ] Field mapping interface
  - [ ] Duplicate detection
  - [ ] Error reporting with line numbers
  - [ ] Preview before import
  - [ ] Rollback failed imports

- [ ] **Batch Import**
  - [ ] Import batches with expiry dates
  - [ ] Link to existing products
  - [ ] Batch number/lot tracking
  - [ ] Multiple batches per product in one import

- [ ] **Template Generator**
  - [ ] Download CSV template with headers
  - [ ] Example rows in template
  - [ ] Instructions in template
  - [ ] Category/supplier dropdown values included

- [ ] **Comprehensive Export**
  - [ ] Export entire inventory with all batches
  - [ ] Include product images (if added)
  - [ ] Export with calculated fields (value, DOH, etc.)
  - [ ] Export filtered results only

**Acceptance Criteria**: CSV import working with validation, templates helpful, exports complete

---

## Phase 3: Operational Excellence (v0.10.x - Months 5-6)
**Status**: 📋 Planned  
**Target**: July 2026  
**Focus**: Mobile support and automation

### 📱 Mobile Optimization (PWA)

- [ ] **Progressive Web App**
  - [ ] Service worker for offline support
  - [ ] App manifest (installable on mobile)
  - [ ] Offline data caching
  - [ ] Background sync when back online
  - [ ] "Add to Home Screen" prompt
  - [ ] App icon and splash screen

- [ ] **Offline Mode**
  - [ ] Cache critical data locally (IndexedDB)
  - [ ] Queue actions when offline
  - [ ] Sync queue on reconnection
  - [ ] Conflict resolution (offline + online changes)
  - [ ] Offline indicator in UI

- [ ] **Mobile-Optimized UI**
  - [ ] Touch-friendly buttons (44x44px minimum)
  - [ ] Mobile-optimized barcode scanner
  - [ ] Swipe gestures for quick actions
  - [ ] Bottom navigation bar
  - [ ] Mobile-first filter interface (drawer/modal)
  - [ ] Simplified mobile navigation
  - [ ] Larger tap targets

- [ ] **Push Notifications**
  - [ ] Browser push notifications API
  - [ ] Low stock push alerts
  - [ ] Expiring soon push alerts
  - [ ] Stock count reminders
  - [ ] Notification preferences
  - [ ] Silent hours configuration

**Acceptance Criteria**: App installable on mobile, works offline, push notifications functional

---

### ⚙️ Advanced Inventory Features

- [ ] **Reorder Automation**
  - [ ] Auto-generate suggested purchase orders
  - [ ] Based on reorder points and turnover
  - [ ] Lead time consideration
  - [ ] Suggested order quantities
  - [ ] Email purchase list to supplier
  - [ ] Order tracking (pending/received)

- [ ] **Product Variants**
  - [ ] Group related products (sizes/flavors of same item)
  - [ ] Variant attributes (size, color, flavor)
  - [ ] Shared base product information
  - [ ] Variant-specific pricing and stock
  - [ ] Combined reporting for variant families

- [ ] **Product Images**
  - [ ] Upload product photos
  - [ ] Image gallery (multiple images per product)
  - [ ] Thumbnail generation
  - [ ] Image storage (local or S3)
  - [ ] Display in product cards and detail view

- [ ] **Notes & Special Handling**
  - [ ] Product notes field (handling instructions)
  - [ ] Storage requirements (temperature, etc.)
  - [ ] Allergen warnings
  - [ ] Preparation instructions
  - [ ] Display notes prominently

- [ ] **Favorites Enhancements**
  - [ ] Pin products to top of inventory
  - [ ] Custom favorite groups/collections
  - [ ] Quick access from mobile home screen
  - [ ] Share favorite lists with team

- [ ] **Custom Fields**
  - [ ] User-defined product attributes
  - [ ] Field types (text, number, date, dropdown)
  - [ ] Custom field templates by category
  - [ ] Filter/search by custom fields
  - [ ] Display in product detail view

**Acceptance Criteria**: Reorder automation working, product variants functional, images uploading

---

### 🔍 Monitoring & Reliability

- [ ] **Application Monitoring**
  - [ ] Uptime monitoring (internal + external)
  - [ ] Response time tracking
  - [ ] Error rate monitoring
  - [ ] Memory/CPU usage tracking
  - [ ] Disk space alerts
  - [ ] Database connection monitoring

- [ ] **Alerting System**
  - [ ] Email alerts for critical issues
  - [ ] SMS alerts (optional, via Twilio)
  - [ ] Alert thresholds configuration
  - [ ] Alert escalation (if not acknowledged)
  - [ ] On-call schedule
  - [ ] Alert history and analytics

- [ ] **Performance Metrics**
  - [ ] API response time percentiles (p50, p95, p99)
  - [ ] Slow query detection
  - [ ] Frontend performance monitoring
  - [ ] Page load time tracking
  - [ ] User action timing

- [ ] **Backup Verification**
  - [ ] Automated backup restore testing
  - [ ] Monthly full restore test
  - [ ] Backup integrity checks
  - [ ] Backup size trending
  - [ ] Restore time benchmarks

- [ ] **Error Tracking**
  - [ ] Sentry integration (or similar)
  - [ ] Client-side error capturing
  - [ ] Server-side error capturing
  - [ ] Error grouping and trends
  - [ ] Source map support for stack traces
  - [ ] Error alert notifications

**Acceptance Criteria**: Monitoring setup, alerts functional, errors tracked, backups verified

---

## Phase 4: Scale & Integration (v1.0.0 - Month 7+)
**Status**: 📋 Planned  
**Target**: September 2026  
**Focus**: API, integrations, multi-store

### 📚 API Documentation

- [ ] **Public REST API**
  - [ ] OpenAPI/Swagger documentation
  - [ ] Interactive API explorer
  - [ ] Code examples (curl, JavaScript, Python)
  - [ ] Authentication guide
  - [ ] Rate limit documentation
  - [ ] Error code reference

- [ ] **API Authentication**
  - [ ] API key generation
  - [ ] API key management UI
  - [ ] Key scopes/permissions
  - [ ] OAuth2 support (optional)
  - [ ] Key rotation policy

- [ ] **Rate Limiting**
  - [ ] Per-key rate limits
  - [ ] Tiered limits by plan
  - [ ] Rate limit headers (X-RateLimit-*)
  - [ ] Rate limit exceeded responses
  - [ ] Burst allowance

- [ ] **Webhooks**
  - [ ] Webhook event subscriptions
  - [ ] Event types (product.created, batch.expired, etc.)
  - [ ] Webhook endpoint configuration
  - [ ] Retry logic on failure
  - [ ] Webhook delivery logs
  - [ ] Webhook signature verification

- [ ] **API Versioning**
  - [ ] Version in URL (/api/v1/)
  - [ ] Multiple version support
  - [ ] Deprecation warnings
  - [ ] Version migration guide

**Acceptance Criteria**: API documented, authentication working, webhooks functional, versioned

---

### 🏪 Multi-Store Support (Optional)

- [ ] **Store Management**
  - [ ] Create/manage multiple store locations
  - [ ] Store-specific settings
  - [ ] Store hierarchy (chains/franchises)
  - [ ] Store contact information
  - [ ] Store-specific users

- [ ] **Stock Transfers**
  - [ ] Transfer inventory between stores
  - [ ] Transfer requests and approvals
  - [ ] Transfer in-transit tracking
  - [ ] Transfer history
  - [ ] Cost implications of transfers

- [ ] **Consolidated Reporting**
  - [ ] Cross-store inventory reports
  - [ ] Aggregate analytics
  - [ ] Store comparison reports
  - [ ] Chain-wide dashboards
  - [ ] Drill-down to individual stores

- [ ] **Per-Store Permissions**
  - [ ] Users assigned to specific stores
  - [ ] Cross-store admin role
  - [ ] View-only access to other stores
  - [ ] Transfer permissions

**Acceptance Criteria**: Multiple stores supported, transfers working, consolidated reporting functional

---

### 🔗 Integration Options

- [ ] **Barcode Database Lookup**
  - [ ] UPC/EAN API integration (UPCDatabase, Open Food Facts)
  - [ ] Auto-populate product info from barcode
  - [ ] Image lookup from barcode
  - [ ] Nutritional data lookup
  - [ ] Fallback to manual entry

- [ ] **Accounting Software Export**
  - [ ] QuickBooks export format
  - [ ] Xero export format
  - [ ] Generic accounting CSV format
  - [ ] Cost of goods sold (COGS) calculation
  - [ ] Inventory valuation export

- [ ] **Label Printer Support**
  - [ ] Zebra printer support
  - [ ] Dymo printer support
  - [ ] Generate printable labels (barcode + name + price)
  - [ ] Batch label printing
  - [ ] Custom label templates

- [ ] **Notification Integrations**
  - [ ] Email notifications (low stock, expiry)
  - [ ] Slack webhooks for alerts
  - [ ] Discord webhooks
  - [ ] Microsoft Teams integration
  - [ ] SMS notifications (Twilio)

- [ ] **External Storage**
  - [ ] AWS S3 for image storage
  - [ ] Backblaze B2 support
  - [ ] Google Cloud Storage
  - [ ] Cloudflare R2

**Acceptance Criteria**: Key integrations working, barcode lookup functional, notifications sending

---

## ✅ Completed Features

### v0.8.0 - Intelligence & Polish (January 2026)
- [x] Reports & Analytics (Stock Value, Expiration, Low Stock, Turnover framework)
- [x] Activity Logging System (90-day retention)
- [x] Reorder Point System with alerts
- [x] Product Favorites
- [x] Dark Mode with system detection
- [x] Keyboard Shortcuts and Command Palette
- [x] Performance Optimization (40% faster dashboard)
- [x] Database indexing
- [x] Winston logging with rotation
- [x] API caching
- [x] Health endpoint

### v0.7.x - Foundation (January 2026)
- [x] Categories & Suppliers Management
- [x] Migration System with rollback
- [x] Update Channels (Stable/Beta)
- [x] FIFO/FEFO Batch Suggestions
- [x] Quick Actions and Bulk Operations
- [x] Barcode Scanning
- [x] Dashboard with Statistics
- [x] Product and Batch Management
- [x] CSV Import/Export

---

## 🎓 Success Criteria for v1.0.0

The application will graduate to production v1.0.0 when:

### Testing & Quality
- [ ] ✅ 60%+ test coverage
- [ ] ✅ CI/CD pipeline passing
- [ ] ✅ No critical bugs in issue tracker
- [ ] ✅ Performance benchmarks met
- [ ] ✅ Security audit passed

### Features
- [ ] ✅ All Phase 1-4 features complete
- [ ] ✅ User management and RBAC working
- [ ] ✅ Multi-user tested in production scenario
- [ ] ✅ Mobile PWA functional
- [ ] ✅ API documented and stable

### Documentation
- [ ] ✅ User guide complete
- [ ] ✅ API documentation published
- [ ] ✅ Admin guide written
- [ ] ✅ Video tutorials created
- [ ] ✅ FAQ section comprehensive

### Deployment
- [ ] ✅ Production deployment stable (30+ days)
- [ ] ✅ Automated backups running
- [ ] ✅ Monitoring and alerts configured
- [ ] ✅ Incident response plan documented
- [ ] ✅ Rollback procedure tested

### Migration
- [ ] ✅ Beta to production migration path tested
- [ ] ✅ Data migration tools created
- [ ] ✅ Migration documentation complete

---

## 📊 Progress Tracking

### Overall Completion
- **Phase 1 (Production Essentials)**: 🔄 10% (Started)
- **Phase 2 (Business Intelligence)**: 📋 0% (Planned)
- **Phase 3 (Operational Excellence)**: 📋 0% (Planned)
- **Phase 4 (Scale & Integration)**: 📋 0% (Planned)

### Next Milestone
**Target**: End of February 2026  
**Goal**: Complete testing infrastructure and begin user management

---

## 🚫 Out of Scope

Features intentionally excluded from v1.0.0:
- Complex warehouse management (WMS)
- E-commerce/online store integration
- Recipe/Bill of Materials (BOM) management
- Manufacturing resource planning (MRP)
- Supplier order automation (beyond email lists)
- Point of Sale (POS) system
- Customer relationship management (CRM)

---

## 📝 How to Update This Roadmap

1. **Starting a feature**: Change status from 📋 Planned to 🔄 In Progress
2. **Completing a feature**: Check the box `[ ]` → `[x]`
3. **Shipping a version**: Move to "Completed Features" section
4. **Changing priorities**: Reorder items or update timeline
5. **Adding features**: Add to appropriate phase
6. **Commit changes**: Use meaningful commit messages

---

**Last Reviewed**: January 25, 2026  
**Next Review**: February 1, 2026 (Phase 1 sprint planning)
