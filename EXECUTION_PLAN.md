# InvAI Production Execution Plan

> **Actionable implementation plan for transforming InvAI from beta to production-ready (v1.0.0)**

**Created**: January 25, 2026  
**Timeline**: 7 months (Feb 2026 - Sep 2026)  
**Current Version**: v0.8.1a  
**Target Version**: v1.0.0

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Production Essentials (Months 1-2)](#phase-1-production-essentials)
3. [Phase 2: Business Intelligence (Months 3-4)](#phase-2-business-intelligence)
4. [Phase 3: Operational Excellence (Months 5-6)](#phase-3-operational-excellence)
5. [Phase 4: Scale & Integration (Month 7+)](#phase-4-scale--integration)
6. [Resource Requirements](#resource-requirements)
7. [Risk Management](#risk-management)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

### Current State
- **Version**: v0.8.1a (beta)
- **Status**: Functional inventory system with 11 products
- **Users**: Single-user mode (no authentication)
- **Database**: SQLite (development-ready)
- **Testing**: None (no test suite)
- **Deployment**: Manual updates via git

### Target State (v1.0.0)
- **Production-Ready**: Multi-user authentication with RBAC
- **Database**: PostgreSQL with automated backups
- **Testing**: 60%+ coverage with CI/CD pipeline
- **Mobile**: PWA with offline support
- **API**: Documented REST API with webhooks
- **Monitoring**: Full observability stack

### Critical Path
1. **Testing Infrastructure** (Weeks 1-2) - BLOCKER
2. **User Authentication** (Weeks 3-4) - BLOCKER
3. **PostgreSQL Migration** (Weeks 5-6) - HIGH
4. **Stock Take System** (Weeks 7-8) - HIGH
5. All other features build on this foundation

---

## Phase 1: Production Essentials
**Duration**: 2 months (Feb - Mar 2026)  
**Goal**: Make the system production-ready with testing, security, and reliability

### Sprint 1: Testing Foundation (Weeks 1-2)
**Goal**: Establish test infrastructure and basic coverage

#### Week 1: Setup
- [ ] **Day 1-2**: Choose and install testing framework
  - Install Jest as primary test framework
  - Install Supertest for API testing
  - Install Istanbul/NYC for coverage
  - Create `tests/` directory structure
  - Configure `package.json` test scripts
  
- [ ] **Day 3-5**: Write first tests
  - Unit tests for `lib/activity-logger.js`
  - Unit tests for `lib/csv-export.js`
  - Unit tests for `lib/cache-manager.js`
  - Target: 80%+ coverage of these modules

#### Week 2: API Testing
- [ ] **Day 1-3**: Products API tests
  - Test GET /api/products (list)
  - Test GET /api/products/:id (detail)
  - Test POST /api/products (create)
  - Test PUT /api/products/:id (update)
  - Test DELETE /api/products/:id (delete)
  
- [ ] **Day 4-5**: More API tests
  - Test Batches API endpoints
  - Test Categories API
  - Test Suppliers API
  - Test Reports API
  - Setup GitHub Actions workflow

**Deliverable**: Test suite with 30%+ coverage, CI/CD running

---

### Sprint 2: User Authentication (Weeks 3-4)
**Goal**: Implement multi-user login with JWT

#### Week 3: Backend Authentication
- [ ] **Day 1**: Database schema
  - Create Migration 008 (users, sessions tables)
  - Design user schema (id, username, email, password_hash, role, created_at)
  - Design sessions schema (id, user_id, token, expires_at)
  - Run migration
  
- [ ] **Day 2-3**: Authentication endpoints
  - POST /api/auth/register (first user becomes owner)
  - POST /api/auth/login (returns JWT token)
  - POST /api/auth/logout (invalidates session)
  - GET /api/auth/me (current user info)
  - Password hashing with bcrypt (salt rounds: 10)
  
- [ ] **Day 4-5**: Auth middleware
  - Create `middleware/auth.js` (verify JWT)
  - Protect all existing API routes
  - Add user_id to activity logs
  - Test authentication flow

#### Week 4: Frontend & RBAC
- [ ] **Day 1-2**: Login UI
  - Create login page
  - Create registration page (first user only)
  - Session management (store JWT in localStorage)
  - Redirect to login if unauthorized
  
- [ ] **Day 3-4**: Role-based access control
  - Create `middleware/rbac.js` (check permissions)
  - Define role permissions matrix
  - Apply RBAC to API endpoints
  - Hide UI elements based on role
  
- [ ] **Day 5**: User management UI
  - Settings → Users tab (owner only)
  - Add/edit/delete users
  - Assign roles
  - Password reset functionality

**Deliverable**: Working multi-user authentication with 4 roles (Owner, Manager, Staff, View-Only)

---

### Sprint 3: PostgreSQL Migration (Weeks 5-6)
**Goal**: Support production-grade database

#### Week 5: Database Abstraction
- [ ] **Day 1-2**: Database adapter pattern
  - Create `lib/db-adapter.js` (abstract DB operations)
  - Support both SQLite and PostgreSQL
  - Environment variable for DB type
  - Refactor existing queries to use adapter
  
- [ ] **Day 3-4**: PostgreSQL setup
  - Install `pg` package
  - Create PostgreSQL connection pool
  - Test local PostgreSQL connection
  - Convert migrations to work with both DBs
  
- [ ] **Day 5**: Migration testing
  - Run all migrations on PostgreSQL
  - Verify schema correctness
  - Test data integrity
  - Performance comparison (SQLite vs PostgreSQL)

#### Week 6: Production Database
- [ ] **Day 1-2**: Data migration tool
  - Script to export from SQLite
  - Script to import to PostgreSQL
  - Validation checks
  - Rollback procedure
  
- [ ] **Day 3-4**: Backup system
  - Automated daily backups (cron job)
  - Backup to external storage (S3 or similar)
  - Retention policy (30 daily, 12 monthly)
  - Test restore procedure
  
- [ ] **Day 5**: Connection pooling & reliability
  - Configure pg-pool
  - Connection retry logic
  - Query timeout handling
  - Transaction rollback on errors

**Deliverable**: PostgreSQL running in production with automated backups

---

### Sprint 4: Stock Take System (Weeks 7-8)
**Goal**: Physical inventory counting with variance tracking

#### Week 7: Stock Count Core
- [ ] **Day 1-2**: Database schema
  - Create Migration 009 (stock_counts, stock_count_items)
  - Design schema for counts and adjustments
  - Reason codes table
  - Run migration
  
- [ ] **Day 3-4**: Backend API
  - POST /api/stock-counts (create new count)
  - GET /api/stock-counts/:id (get count details)
  - PUT /api/stock-counts/:id (update count)
  - POST /api/stock-counts/:id/complete (finalize)
  - POST /api/stock-count-items (add item to count)
  
- [ ] **Day 5**: Variance calculation
  - Calculate expected vs actual
  - Cost impact calculation
  - Automatic inventory adjustment
  - Activity log integration

#### Week 8: Stock Take UI
- [ ] **Day 1-2**: Stock take page
  - Create "Stock Take" navigation item
  - List of counts (active, completed)
  - Create new count modal
  - Location selection
  
- [ ] **Day 3-4**: Counting interface
  - Barcode scanning for quick counting
  - Manual product selection
  - Expected vs actual display
  - Variance highlighting (red/green)
  - Reason dropdown with notes
  
- [ ] **Day 5**: Variance reporting
  - Variance report page
  - Summary by category
  - Summary by location
  - Export to CSV/PDF
  - Historical variance trends

**Deliverable**: Full stock take workflow with variance reporting

---

## Phase 2: Business Intelligence
**Duration**: 2 months (Apr - May 2026)  
**Goal**: Advanced reporting, dashboards, and data management

### Sprint 5: Enhanced Reporting (Weeks 9-10)
**Goal**: Turnover, cost, and waste analysis

#### Week 9: Turnover & Cost Analysis
- [ ] **Day 1-2**: Turnover calculations
  - Calculate turnover rate per product
  - Days of inventory on hand (DOH)
  - Fast vs slow movers
  - Turnover by category/supplier
  
- [ ] **Day 3-4**: Cost tracking
  - FIFO cost tracking implementation
  - Cost variance over time
  - Cost per category report
  - Supplier cost comparison
  
- [ ] **Day 5**: Frontend reports
  - Turnover report page
  - Cost analysis page
  - Charts and visualizations
  - Date range filtering

#### Week 10: Waste & Stock Performance
- [ ] **Day 1-2**: Waste reporting
  - Expired goods cost calculation
  - Waste by category
  - Waste trends over time
  - Waste reduction recommendations
  
- [ ] **Day 3-4**: Stock performance
  - Low stock frequency tracking
  - Out-of-stock incident tracking
  - Optimal reorder point suggestions
  - Safety stock calculator
  
- [ ] **Day 5**: Supplier performance
  - Average cost per supplier
  - Supplier reliability metrics
  - Supplier ranking dashboard

**Deliverable**: Comprehensive business intelligence reports

---

### Sprint 6: Dashboard Enhancements (Weeks 11-12)
**Goal**: Visual analytics and comparative insights

#### Week 11: Charts & Visualizations
- [ ] **Day 1-2**: Chart library integration
  - Choose charting library (Chart.js recommended)
  - Install and configure
  - Create chart components
  - Responsive design
  
- [ ] **Day 3-4**: Dashboard charts
  - Inventory value trend line chart
  - Category distribution pie chart
  - Expiry timeline bar chart
  - Stock turnover heatmap
  
- [ ] **Day 5**: Interactive features
  - Click to drill down
  - Tooltip on hover
  - Legend toggles
  - Chart export (PNG/SVG)

#### Week 12: Comparative Analytics
- [ ] **Day 1-2**: Time comparisons
  - This week vs last week
  - Month-over-month
  - Year-over-year
  - Trend arrows and percentages
  
- [ ] **Day 3-4**: Date range picker
  - Interactive date selector
  - All widgets update on range change
  - Quick range buttons
  - Persist preference
  
- [ ] **Day 5**: Enhanced alerts
  - High-value items widget
  - Unusual activity alerts
  - Predictive low stock warnings

**Deliverable**: Visual analytics dashboard with comparative insights

---

### Sprint 7: Data Import/Export (Weeks 13-14)
**Goal**: Bulk operations and CSV management

#### Week 13: Bulk Import
- [ ] **Day 1-2**: CSV import backend
  - Parse CSV files (use Papa Parse)
  - Validate data
  - Duplicate detection
  - Error reporting
  
- [ ] **Day 3-4**: Import UI
  - Upload CSV interface
  - Field mapping modal
  - Preview before import
  - Progress indicator
  - Error display with line numbers
  
- [ ] **Day 5**: Batch import
  - Import batches with expiry dates
  - Link to products
  - Batch number tracking

#### Week 14: Export & Templates
- [ ] **Day 1-2**: Excel export
  - Install ExcelJS library
  - Multi-sheet exports
  - Pre-formatted with charts
  - Formulas in cells
  
- [ ] **Day 3-4**: PDF export
  - Install PDFKit or similar
  - Professional report formatting
  - Charts in PDFs
  - Page headers/footers
  
- [ ] **Day 5**: Template generator
  - Download CSV templates
  - Example rows
  - Instructions included
  - Dynamic templates by category

**Deliverable**: Robust import/export with templates and validation

---

### Sprint 8: Scheduled Reports (Weeks 15-16)
**Goal**: Automated report delivery

#### Week 15-16: Email Automation
- [ ] **Day 1-2**: Email service setup
  - Choose email service (Nodemailer + SendGrid/Mailgun)
  - Configure SMTP
  - Test email sending
  - Email templates
  
- [ ] **Day 3-4**: Report scheduling
  - Schedule configuration UI
  - Cron job setup
  - Report generation queue
  - Recipient management
  
- [ ] **Day 5**: Delivery & logging
  - Attach PDF/CSV to emails
  - Delivery confirmation
  - Failed delivery retry
  - Delivery log and history

**Deliverable**: Automated scheduled report emails

---

## Phase 3: Operational Excellence
**Duration**: 2 months (Jun - Jul 2026)  
**Goal**: Mobile support, automation, and monitoring

### Sprint 9-10: Mobile PWA (Weeks 17-20)
**Goal**: Progressive Web App with offline support

#### Weeks 17-18: PWA Foundation
- [ ] **Week 17**: Service Worker
  - Create service worker
  - Cache strategy (network-first, cache-first)
  - Offline fallback page
  - Background sync
  
- [ ] **Week 18**: App Manifest
  - Create manifest.json
  - App icons (192x192, 512x512)
  - Splash screen
  - Install prompts

#### Weeks 19-20: Mobile Optimization
- [ ] **Week 19**: Touch UI
  - Touch-friendly buttons (44x44px min)
  - Mobile navigation (bottom bar)
  - Swipe gestures
  - Mobile barcode scanner
  
- [ ] **Week 20**: Offline Mode
  - IndexedDB caching
  - Action queue
  - Sync on reconnect
  - Conflict resolution

**Deliverable**: Installable PWA with offline support

---

### Sprint 11: Automation (Weeks 21-22)
**Goal**: Reorder automation and advanced features

#### Week 21: Reorder Automation
- [ ] **Day 1-2**: Reorder logic
  - Auto-generate purchase orders
  - Based on reorder points and turnover
  - Lead time consideration
  - Suggested quantities
  
- [ ] **Day 3-4**: Purchase order management
  - Create PO from suggestions
  - Email PO to supplier
  - Track PO status (pending/received)
  - Receive PO and update inventory
  
- [ ] **Day 5**: Supplier integration
  - Email templates for POs
  - Supplier order preferences
  - Order history

#### Week 22: Advanced Features
- [ ] **Day 1-2**: Product variants
  - Variant system design
  - Group related products
  - Variant-specific pricing
  - Combined reporting
  
- [ ] **Day 3**: Product images
  - Image upload
  - Thumbnail generation
  - Image storage (local or S3)
  - Gallery view
  
- [ ] **Day 4**: Notes & custom fields
  - Product notes field
  - Custom field system
  - Field types (text, number, date, dropdown)
  - Display in UI
  
- [ ] **Day 5**: Testing & polish

**Deliverable**: Automated reordering and advanced product features

---

### Sprint 12: Monitoring (Weeks 23-24)
**Goal**: Observability and reliability

#### Week 23: Application Monitoring
- [ ] **Day 1-2**: Monitoring setup
  - Choose monitoring solution (Prometheus + Grafana or similar)
  - Install and configure
  - Metric collection
  - Dashboard creation
  
- [ ] **Day 3-4**: Key metrics
  - Response time tracking
  - Error rate monitoring
  - Memory/CPU usage
  - Database connections
  - Queue depth
  
- [ ] **Day 5**: Performance monitoring
  - Slow query detection
  - API endpoint timings
  - Page load tracking

#### Week 24: Alerting & Error Tracking
- [ ] **Day 1-2**: Alert system
  - Email alerts for critical issues
  - Alert thresholds
  - Escalation rules
  - On-call schedule
  
- [ ] **Day 3-4**: Error tracking
  - Sentry integration
  - Client-side error capture
  - Server-side error capture
  - Source maps
  
- [ ] **Day 5**: Backup verification
  - Automated restore testing
  - Backup integrity checks
  - Restore time benchmarks

**Deliverable**: Full observability stack with alerting

---

## Phase 4: Scale & Integration
**Duration**: 1+ months (Aug - Sep 2026)  
**Goal**: API, integrations, and v1.0.0 launch

### Sprint 13-14: API Documentation (Weeks 25-28)
**Goal**: Public REST API

#### Weeks 25-26: API Docs
- [ ] **Week 25**: OpenAPI spec
  - Write OpenAPI/Swagger spec
  - Document all endpoints
  - Request/response schemas
  - Error codes
  
- [ ] **Week 26**: Interactive docs
  - Swagger UI setup
  - Code examples
  - Authentication guide
  - Rate limit docs

#### Weeks 27-28: API Features
- [ ] **Week 27**: API authentication
  - API key generation
  - Key management UI
  - Key scopes/permissions
  - Rate limiting
  
- [ ] **Week 28**: Webhooks
  - Webhook subscriptions
  - Event types
  - Retry logic
  - Signature verification

**Deliverable**: Documented public API with webhooks

---

### Sprint 15: Integrations (Weeks 29-30)
**Goal**: External integrations

#### Week 29: Core Integrations
- [ ] **Day 1-2**: Barcode database lookup
  - Integrate UPC/EAN API
  - Auto-populate product info
  - Fallback to manual entry
  
- [ ] **Day 3-4**: Accounting export
  - QuickBooks format
  - Xero format
  - COGS calculation
  
- [ ] **Day 5**: Label printing
  - Zebra printer support
  - Label templates
  - Batch printing

#### Week 30: Notification Integrations
- [ ] **Day 1-2**: Slack/Discord
  - Webhook setup
  - Alert formatting
  - Channel configuration
  
- [ ] **Day 3-4**: SMS notifications
  - Twilio integration
  - SMS templates
  - Cost management
  
- [ ] **Day 5**: Testing & polish

**Deliverable**: Key integrations working

---

### Sprint 16: V1.0.0 Launch Prep (Weeks 31-32)
**Goal**: Final polish and launch

#### Week 31: Documentation
- [ ] **Day 1-2**: User guide
  - Complete user documentation
  - Screenshots and videos
  - Step-by-step tutorials
  - FAQ section
  
- [ ] **Day 3-4**: Admin guide
  - Installation guide
  - Configuration guide
  - Backup/restore procedures
  - Troubleshooting
  
- [ ] **Day 5**: API docs finalization

#### Week 32: Launch
- [ ] **Day 1-2**: Final testing
  - Load testing
  - Security audit
  - Performance benchmarks
  - Bug fixes
  
- [ ] **Day 3-4**: Migration preparation
  - Beta to production migration guide
  - Data migration tools
  - Rollback procedures
  
- [ ] **Day 5**: Launch v1.0.0
  - Merge to main branch
  - Tag release
  - Update documentation
  - Announcement

**Deliverable**: v1.0.0 production release! 🎉

---

## Resource Requirements

### Development Resources
- **1 Full-Time Developer** (primary)
- **Part-Time Tester** (optional, weeks 1-4 and 31-32)
- **DevOps Consultant** (optional, for PostgreSQL and monitoring setup)

### Infrastructure
- **Development Server**: Existing (inv.z101c.duckdns.org)
- **Production Server**: VPS or cloud instance (4GB RAM, 2 vCPU minimum)
- **PostgreSQL Database**: Managed instance or self-hosted
- **External Backup Storage**: S3, Backblaze B2, or similar (50GB minimum)
- **Monitoring**: Prometheus + Grafana or managed service

### Software/Services
- **Testing**: Jest, Supertest (free)
- **CI/CD**: GitHub Actions (free for public repos)
- **Email**: SendGrid or Mailgun (free tier available)
- **Error Tracking**: Sentry (free tier available)
- **SMS**: Twilio (pay-as-you-go)
- **Storage**: AWS S3 or Backblaze B2 (pay-as-you-go)

### Estimated Costs
- **Server**: $20-50/month
- **Database**: $15-30/month (managed PostgreSQL)
- **Backup Storage**: $5-10/month
- **Email Service**: $0-20/month
- **SMS (optional)**: Pay-as-you-go (~$0.01/SMS)
- **Total**: ~$50-120/month

---

## Risk Management

### High-Risk Items

1. **Testing Infrastructure Delay**
   - **Risk**: Testing setup takes longer than expected
   - **Impact**: Delays entire Phase 1
   - **Mitigation**: Start immediately, use proven tools (Jest), seek help if stuck
   - **Contingency**: Reduce target coverage from 60% to 50%

2. **PostgreSQL Migration Issues**
   - **Risk**: Data loss or corruption during migration
   - **Impact**: Production downtime, data loss
   - **Mitigation**: Thorough testing, multiple backups, staged migration
   - **Contingency**: Rollback to SQLite, keep SQLite as backup for 30 days

3. **Authentication Bugs**
   - **Risk**: Security vulnerabilities in auth system
   - **Impact**: Unauthorized access, data breach
   - **Mitigation**: Security audit, use proven libraries (bcrypt, jsonwebtoken), penetration testing
   - **Contingency**: Bug bounty program, rapid patching process

4. **Scope Creep**
   - **Risk**: Feature requests exceed timeline
   - **Impact**: Delayed v1.0.0 launch
   - **Mitigation**: Strict prioritization, defer non-critical features to v1.1.0
   - **Contingency**: MVP approach, launch with core features only

### Medium-Risk Items

1. **PWA Offline Complexity**
   - **Risk**: Offline sync conflicts and data loss
   - **Mitigation**: Simple last-write-wins strategy initially
   - **Contingency**: Launch PWA without full offline support

2. **Third-Party Integration Issues**
   - **Risk**: External APIs unreliable or change
   - **Mitigation**: Graceful degradation, fallback options
   - **Contingency**: Defer integrations to v1.1.0

3. **Performance Under Load**
   - **Risk**: System slow with many users
   - **Mitigation**: Load testing, query optimization, caching
   - **Contingency**: Horizontal scaling, CDN for static assets

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] ✅ Test coverage ≥60%
- [ ] ✅ CI/CD pipeline passing all tests
- [ ] ✅ Multi-user authentication working
- [ ] ✅ 4 roles (Owner, Manager, Staff, View) enforced
- [ ] ✅ PostgreSQL running in production
- [ ] ✅ Daily automated backups successful
- [ ] ✅ Stock take workflow complete
- [ ] ✅ Zero critical bugs in issue tracker

### Phase 2 Success Criteria
- [ ] ✅ All reports (turnover, cost, waste) functional
- [ ] ✅ Dashboard with 5+ charts
- [ ] ✅ CSV/Excel/PDF export working
- [ ] ✅ Scheduled email reports sending
- [ ] ✅ Bulk import with validation working

### Phase 3 Success Criteria
- [ ] ✅ PWA installable on mobile
- [ ] ✅ Offline mode functional
- [ ] ✅ Reorder automation working
- [ ] ✅ Product images uploading
- [ ] ✅ Monitoring dashboard live
- [ ] ✅ Alerting system functional

### Phase 4 Success Criteria
- [ ] ✅ API documented (OpenAPI spec)
- [ ] ✅ Webhooks functional
- [ ] ✅ 3+ integrations working
- [ ] ✅ User guide complete
- [ ] ✅ Admin guide complete

### V1.0.0 Launch Criteria
- [ ] ✅ All phase success criteria met
- [ ] ✅ Security audit passed
- [ ] ✅ Load testing successful (100+ concurrent users)
- [ ] ✅ 30 days stable operation
- [ ] ✅ Documentation complete
- [ ] ✅ Migration path tested

---

## Weekly Checklist Template

### Week X: [Feature Name]
**Goal**: [One-line goal]

**Monday**
- [ ] Task 1
- [ ] Task 2

**Tuesday**
- [ ] Task 3
- [ ] Task 4

**Wednesday**
- [ ] Task 5
- [ ] Testing

**Thursday**
- [ ] Task 6
- [ ] Documentation

**Friday**
- [ ] Code review
- [ ] Merge to beta
- [ ] Weekly retrospective

**Blockers**: (list any blockers here)

**Notes**: (any important notes for the week)

---

## Daily Standup Template

### Daily Standup - [Date]

**Yesterday**:
- Completed: [What was finished]
- Progress: [What is in progress]

**Today**:
- Plan: [What will be worked on]
- Goal: [Expected outcome]

**Blockers**:
- [Any blockers or concerns]

**Questions**:
- [Any questions or help needed]

---

## Next Steps

### Immediate Actions (This Week)
1. **Review and approve this execution plan**
2. **Set up project management** (GitHub Projects or similar)
3. **Create Sprint 1 tasks** in issue tracker
4. **Install testing framework** (Jest + Supertest)
5. **Write first unit test** (any module)
6. **Commit daily** and track progress

### Week 1 Kickoff
- Monday: Install Jest, create test structure
- Tuesday: Write first 3 unit tests
- Wednesday: Test activity-logger.js module
- Thursday: Test csv-export.js module
- Friday: Test cache-manager.js module, review coverage

**Let's build something amazing! 🚀**

---

**Document Version**: 1.0  
**Last Updated**: January 25, 2026  
**Next Review**: February 1, 2026 (after Week 1 completion)
