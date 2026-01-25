# Changelog

All notable changes to InvAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for Sprint 3 Phase 2-4 (v0.8.4a)
- Password complexity policies (8+ chars, upper, lower, number, special)
- Password history tracking (prevent reuse of last 5 passwords)
- Password expiration (90 days with 14-day warning)
- Account lockout after failed attempts (5 attempts, 15-minute lockout)
- Security headers & CSRF protection (Helmet.js, CSP)
- Enhanced audit trail for security events

---

## [0.8.4a] - 2026-01-25

### 🎉 Sprint 3 Phase 1 Complete! (Session Management)

### Added - Sprint 3 Phase 1: Session Management
- **Database Schema (Migration 009)**
  - `user_sessions` table for database-backed session tracking
  - Fields:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `session_id` (TEXT NOT NULL UNIQUE) - UUID for session identification
    - `user_id` (INTEGER NOT NULL) - Foreign key to users table
    - `ip_address` (TEXT) - Track login IP for security
    - `user_agent` (TEXT) - Track browser/device for session management
    - `created_at` (DATETIME) - Session creation timestamp
    - `last_activity` (DATETIME) - Track last request time for inactivity timeout
    - `expires_at` (DATETIME NOT NULL) - Absolute session expiration
    - `is_active` (BOOLEAN DEFAULT 1) - Soft delete for invalidated sessions
  - 4 indexes for performance:
    - `idx_sessions_user_id` - Fast user session lookups
    - `idx_sessions_session_id` - Fast session validation
    - `idx_sessions_expires_at` - Efficient cleanup queries
    - `idx_sessions_is_active` - Filter active sessions
  - Foreign key constraint with CASCADE delete
  - Idempotent migration (safe to re-run)

- **Security Configuration** (`config/security.js`)
  - `SESSION_TIMEOUT` - 8 hours (28,800 seconds)
  - `INACTIVITY_TIMEOUT` - 30 minutes (1,800 seconds)
  - `MAX_CONCURRENT_SESSIONS` - 3 sessions per user
  - `SESSION_CLEANUP_INTERVAL` - 15 minutes (900 seconds)
  - All timeouts configurable via environment variables
  - Centralized security constants

- **Session Manager** (`utils/sessionManager.js` - 316 lines)
  - `initialize(db, logger)` - Setup with database and logger instances
  - `createSession(userId, ipAddress, userAgent)` - Create new session
    - Generates UUID v4 session ID
    - Enforces MAX_CONCURRENT_SESSIONS (FIFO eviction)
    - Stores in database with expiration
    - Returns session ID for JWT inclusion
  - `validateSession(sessionId)` - Validate session is active and not expired
    - Checks session exists
    - Verifies is_active flag
    - Validates not expired (current time < expires_at)
    - Updates last_activity on valid access
    - Returns full session object or null
  - `updateActivity(sessionId)` - Update last_activity timestamp
    - Called on every authenticated request
    - Prevents inactivity timeout
    - Extends session lifetime
  - `invalidateSession(sessionId, reason)` - Logout/terminate session
    - Sets is_active = 0
    - Logs reason (user_logout, expired, etc.)
    - Preserves session record for audit trail
  - `getUserSessions(userId)` - List all active sessions for user
    - Returns array of session objects
    - Ordered by created_at DESC
    - Includes IP, user agent, timestamps
  - `invalidateAllUserSessions(userId, exceptSessionId)` - Logout other devices
    - Invalidates all user sessions except current
    - Used for password change, security actions
  - `cleanupExpiredSessions()` - Background cleanup job
    - Runs every 15 minutes (configurable)
    - Removes sessions where expires_at < now OR last_activity + INACTIVITY_TIMEOUT < now
    - Frees database space
    - Logs cleanup statistics
  - Comprehensive error handling throughout
  - Full integration with Winston logger

- **Session Validation Middleware** (`middleware/session.js`)
  - `validateSession` middleware function
  - Extracts sessionId from JWT token
  - Validates JWT contains sessionId field
  - Calls sessionManager.validateSession()
  - Checks session is active and not expired
  - Updates last_activity on each request
  - Attaches session object to req.session
  - Returns 401 with specific error codes:
    - `SESSION_ID_MISSING` - JWT doesn't have sessionId
    - `SESSION_NOT_FOUND` - Session doesn't exist in database
    - `SESSION_EXPIRED` - Session past expiration or inactive too long
  - User-friendly error messages
  - Applied to all protected routes via authenticate middleware chain

- **Enhanced Authentication Routes** (`routes/auth.js`)
  - **Login Enhancement**
    - Creates database session on successful login
    - JWT now includes `sessionId` field
    - Updates `last_login` timestamp in users table
    - Tracks IP address and user agent
    - Returns token with embedded sessionId
  
  - **New Session Management Endpoints**:
    - `GET /api/auth/sessions` - View all active sessions
      - Returns array of user's sessions
      - Marks current session with `isCurrent` flag
      - Hides full session ID for security (shows first 8 chars)
      - Protected by authenticate + validateSession
    
    - `GET /api/auth/session-info` - Current session details
      - Returns full info about current session
      - IP address, user agent, timestamps
      - Expiration info
      - Protected by authenticate + validateSession
    
    - `POST /api/auth/logout` - Logout current session
      - Invalidates current session in database
      - Logs logout event
      - Returns success message
      - Protected by authenticate + validateSession
    
    - `DELETE /api/auth/sessions/:sessionId` - Terminate specific session
      - Allows user to logout other devices
      - Validates session belongs to current user
      - Cannot terminate current session (use /logout)
      - Protected by authenticate + validateSession
    
    - `DELETE /api/auth/sessions` - Logout all other devices
      - Invalidates all sessions except current
      - Used for security actions (password change, etc.)
      - Returns count of terminated sessions
      - Protected by authenticate + validateSession
  
  - **Password Change Enhancement**
    - Now automatically invalidates all other sessions
    - Forces re-login on all other devices
    - Current session remains active
    - Security best practice

### Changed
- Authentication middleware now chains with session validation
- Login response includes JWT with sessionId
- Password change now triggers session cleanup
- All protected routes now validate session on each request
- JWT tokens now contain session context

### Security
- **Database-Backed Sessions**: Sessions now tracked in database, not just JWT
- **Session Timeout**: 8-hour absolute timeout enforced
- **Inactivity Timeout**: 30-minute inactivity auto-logout
- **Concurrent Session Limit**: Max 3 sessions per user (oldest evicted)
- **IP Tracking**: Login IP address logged for security audits
- **User Agent Tracking**: Device/browser tracked for session management
- **Automatic Cleanup**: Expired sessions removed every 15 minutes
- **Session Invalidation**: Proper logout invalidates session immediately
- **Activity Tracking**: Last activity updated on every request
- **Audit Trail**: All session events logged

### Fixed
- Sessions now properly invalidated on logout (not just JWT expiry)
- Concurrent logins now tracked and limited
- Inactive sessions now auto-expire after 30 minutes
- Session hijacking risk reduced with database validation

### Testing
- Manual testing of all session endpoints
- Session creation verified (login creates DB record)
- Session validation verified (401 on invalid/expired)
- Session cleanup verified (automatic removal)
- Concurrent session limit verified (oldest evicted)
- Logout verified (session invalidated)
- Multi-device login tested (3 sessions max)
- Production deployment verified

### Performance
- 4 database indexes for fast session lookups
- Cleanup job runs every 15 minutes (not on every request)
- Session validation cached in request object
- Efficient queries with WHERE is_active = 1

### Files Created/Modified
- ✅ `migrations/009_add_session_management.js` (114 lines)
- ✅ `config/security.js` (62 lines)
- ✅ `utils/sessionManager.js` (316 lines)
- ✅ `middleware/session.js` (78 lines)
- ✅ `routes/auth.js` (updated with session support)

### Status
- ✅ **Sprint 3 Phase 1 Complete (100%)** - 2026-01-25
- ✅ Migration 009 applied successfully
- ✅ All 5 files created/updated
- ✅ All endpoints tested and working
- ✅ Production deployment verified
- ✅ No errors or warnings
- 📋 **Phase 2 (Password Policies) Next** - Target: January 26-28, 2026

### Achievement Summary
- ✅ Complete in ~2 hours (3-day target - 700% ahead of schedule!)
- ✅ 5 files created/updated (~1,200 lines of code)
- ✅ 8-hour session timeout implemented
- ✅ 30-minute inactivity auto-logout
- ✅ Max 3 concurrent sessions per user
- ✅ 5 new API endpoints for session management
- ✅ IP address and user agent tracking
- ✅ Automatic cleanup every 15 minutes
- ✅ Enterprise-grade session management complete

---

## [0.8.3a] - 2026-01-25

### 🎉 Sprint 2 Phase 3 Complete! (100%)

### Added - Sprint 2 Phase 3: User Management UI & API
- **Enhanced User Schema (Migration 008)**
  - `email` field (VARCHAR 255, UNIQUE) - User email address
  - `is_active` field (BOOLEAN) - Soft delete flag for user deactivation
  - `last_login` field (DATETIME) - Track last successful login
  - `created_at`, `created_by` - Audit trail for user creation
  - `updated_at`, `updated_by` - Audit trail for user modifications
  - Automatic `updated_at` trigger on user changes
  - Unique index on email field
  - Backward compatible migration (handles existing users)
  - **Defensive migration checks** (prevents duplicate column errors on re-run)

- **UserController** (`controllers/userController.js`)
  - `getAllUsers(options)` - Paginated user list with search and filters
  - `getUserById(id)` - Fetch single user with audit trail
  - `createUser(data, creator, creatorId)` - Create user with validation
  - `updateUser(id, updates, updater, updaterId)` - Update with self-protection
  - `deleteUser(id, deleter, deleterId)` - Soft delete (set is_active=0)
  - `updatePassword(id, password, updater, updaterId)` - Password reset
  - `updateLastLogin(id)` - Track login activity
  - Password validation (minimum 6 characters)
  - Email uniqueness validation
  - Role validation (owner, manager, staff, viewer)
  - Self-modification protection (can't change own role or deactivate self)
  - Activity logging integration

- **Enhanced User Management Routes** (`routes/users.js`)
  - `GET /api/users` - List users (paginated, searchable, filterable)
    - Query params: `page`, `limit`, `search`, `role`, `is_active`
    - Returns: user list with pagination metadata
  - `GET /api/users/:id` - Get single user details
  - `POST /api/users` - Create new user
    - Body: `{ username, email, password, role }`
    - Validation: all fields required, password ≥ 6 chars
  - `PUT /api/users/:id` - Update user information
    - Body: `{ email?, role?, is_active? }`
    - Protection: cannot change own role or deactivate self
  - `DELETE /api/users/:id` - Deactivate user (soft delete)
    - Sets `is_active = 0` instead of hard delete
    - Protection: cannot delete yourself
  - `PUT /api/users/:id/password` - Reset user password
    - Body: `{ newPassword }`
    - Validation: minimum 6 characters
  - All endpoints protected by RBAC (`users:*` permissions - owner only)
  - Comprehensive error handling (400, 401, 403, 404, 409)
  - Activity logging for all operations

- **User Management UI** (`public/users.html`)
  - User list with card-based layout
  - Real-time search by username or email
  - Filter by role (owner, manager, staff, viewer)
  - Filter by status (active, inactive)
  - Pagination (20 users per page)
  - User cards display:
    - Username and role badge (color-coded)
    - Email address
    - Active/inactive status
    - Last login timestamp
    - Action buttons (Edit, Reset Password, Activate/Deactivate)
  - Create/Edit user modal:
    - Form validation (required fields, email format, password length)
    - Role selection with descriptions
    - Read-only username on edit
    - Password field only shown on create
  - Password reset dialog with validation
  - Activate/deactivate confirmation dialogs
  - Permission check (redirects non-owners to dashboard)
  - Responsive design following existing patterns
  - Error handling with user-friendly messages
  - **Beautiful gradient UI with purple theme**

- **Documentation**
  - `docs/PHASE_3_USER_MANAGEMENT.md` - Complete implementation guide
  - Migration instructions and expected output
  - API endpoint documentation with examples
  - Manual testing checklist
  - Security features documentation
  - Troubleshooting guide
  - Database schema changes documentation

### Changed
- User routes now use MVC pattern with UserController
- Enhanced error responses with specific codes (VALIDATION_ERROR, DUPLICATE_USER, etc.)
- Improved permission checking for user management operations
- Better HTTP status code usage (400, 401, 403, 404, 409)
- Login page now redirects to `/` instead of non-existent `/settings.html`
- User page now correctly uses `auth_token` from localStorage
- User page redirects to `/` instead of non-existent `/dashboard.html`

### Fixed - Deployment Hotfixes (2026-01-25)
- **Migration 008 Defensive Checks**
  - Added column existence checks before ALTER TABLE
  - Prevents duplicate column errors on server restart
  - Graceful handling of already-applied migrations
  - Migration now idempotent (can run multiple times safely)

- **UI/UX Fixes**
  - Fixed CSS 404 error: `/css/style.css` → `/css/styles.css`
  - Fixed login redirect from `/settings.html` to `/`
  - Fixed user page localStorage key from `token` to `auth_token`
  - Fixed user page redirect from `/dashboard.html` to `/`
  - Fixed back button in user page from `/dashboard.html` to `/`

- **JavaScript Fixes**
  - Fixed core.js TypeError on pages without `productSearch` element
  - Added defensive checks for DOM elements before accessing
  - Made core.js safe to load on any page (users.html, etc.)
  - Prevents console errors on user management page

### Security
- **Access Control**: All user management endpoints require `users:*` permissions (owner only)
- **Self-Protection**: Users cannot modify their own role or deactivate themselves
- **Password Security**: Bcrypt hashing (10 rounds), minimum 6 characters
- **Audit Trail**: Complete tracking of who created/modified each user
- **Soft Deletes**: User deactivation instead of hard deletion preserves audit trail
- **Email Uniqueness**: Enforced at database level with unique index
- **Input Validation**: All fields validated before processing

### Testing
- Manual testing checklist (15 test scenarios)
- User list, create, edit, delete functionality verified
- Password reset tested
- Permission checks verified
- Self-protection rules tested
- Migration re-run safety tested
- UI tested on production environment
- All console errors resolved

### Documentation
- Complete API documentation with request/response examples
- Deployment guide with step-by-step instructions
- Troubleshooting section for common issues
- Database migration documentation
- Security features documented

### Status
- ✅ **Sprint 2 Complete (100%)** - 2026-01-25
- Phase 1: RBAC Middleware ✔️ (2026-01-22)
- Phase 2: Protected Routes ✔️ (2026-01-23)
- Phase 3: User Management UI ✔️ (2026-01-25)
- All hotfixes applied ✔️
- Production deployment successful ✔️

---

## [0.8.2a] - 2026-01-25

### Added - Sprint 2 Phase 1-2: RBAC Implementation
- **Role-Based Access Control (RBAC) System**
  - 4-role permission system: Owner, Manager, Staff, View-Only
  - Granular permissions for all resources (products, batches, reports, users, settings)
  - Permission middleware (`middleware/permissions.js`) with 7 exported functions
  - `hasPermission(role, permission)` - Check if role has specific permission
  - `requirePermission(permission)` - Express middleware to enforce permission
  - `requireAllPermissions(...permissions)` - Require user has all permissions
  - `requireAnyPermission(...permissions)` - Require user has at least one permission
  - `getRolePermissions(role)` - Get all permissions for a role
  - Backward compatibility for legacy 'admin' role (mapped to 'owner')

- **Permission Matrix**
  | Action | Owner | Manager | Staff | Viewer |
  |--------|-------|---------|-------|--------|
  | View data | ✅ | ✅ | ✅ | ✅ |
  | Create/Update items | ✅ | ✅ | ✅ | ❌ |
  | Delete items | ✅ | ✅ | ❌ | ❌ |
  | View cost data | ✅ | ✅ | ❌ | ❌ |
  | Export reports | ✅ | ✅ | ❌ | ❌ |
  | Manage users | ✅ | ❌ | ❌ | ❌ |
  | Manage settings | ✅ | ❌ | ❌ | ❌ |

- **Protected API Routes**
  - Products API: `requirePermission('products:view|create|update|delete')`
  - Batches API: `requirePermission('batches:view|create|update|delete')`
  - Reports API: `requirePermission('reports:view|view_costs|export')`
  - All sensitive endpoints now protected by RBAC middleware
  - Proper 401 (unauthorized) and 403 (forbidden) responses

- **RBAC Testing**
  - 38 unit tests for permission logic (100% coverage)
    - Product permissions (4 tests)
    - Batch permissions (4 tests)
    - Report permissions (3 tests)
    - User management permissions (1 test)
    - Settings permissions (1 test)
    - Activity log permissions (2 tests)
    - Profile permissions (1 test)
    - Edge cases (4 tests)
    - Middleware tests (18 tests)
  - 24 integration tests for route protection
    - Products API with different roles (15 tests)
    - Batches API with different roles (9 tests)
  - Edge case testing (null roles, unknown permissions)
  - Backward compatibility tests for admin role

### Changed
- Updated routes to use RBAC middleware:
  - `routes/products.js` - All endpoints protected
  - `routes/batches.js` - All endpoints protected
  - `routes/reports.js` - All endpoints protected
- Enhanced error responses with permission details
- Improved authentication middleware to work with RBAC

### Fixed
- Permission checks now properly handle legacy 'admin' role
- Consistent error responses across all protected routes
- Proper HTTP status codes (401 vs 403) for auth failures

### Testing
- **Total Tests**: 62 (38 RBAC unit + 24 integration)
- **RBAC Coverage**: 100% (middleware fully tested)
- **Integration Tests**: All routes properly protected
- **All tests passing**: ✅

### Documentation
- Added inline documentation for all permission functions
- Documented permission matrix in code comments
- Updated roadmap to reflect RBAC completion

---

### Added - Sprint 1 Week 2: Integration Tests & CI/CD
- **Integration Testing Framework**
  - Supertest integration with Jest for API testing
  - 33 integration tests covering authentication, products, and batches APIs
  - Authentication API tests (11 tests for login, token validation, /me endpoint)
  - Products API tests (15 tests for CRUD operations with auth)
  - Batches API tests (7 tests for batch management)
  - Test runs against live server with real authentication flow

- **GitHub Actions CI/CD Pipeline**
  - Automated testing on every push to main/beta branches
  - Automated testing on every pull request
  - Multi-version Node.js testing (18.x and 20.x)
  - Separate unit and integration test jobs
  - Code coverage upload to Codecov
  - Test database setup in CI environment
  - Server health checks before integration tests

- **Test Automation Tools**
  - `npm run test:setup` - Automated test user creation
  - `npm run test:integration` - Run integration tests
  - `npm run test:all` - Run all tests with coverage
  - `scripts/create-test-user.js` - Test user setup script
  - `scripts/reset-admin-password.js` - Admin password reset tool

- **Testing Documentation**
  - Comprehensive `tests/README.md` with setup guide
  - Test environment configuration instructions
  - Troubleshooting guide for common test issues
  - Test writing guidelines and examples

### Changed
- Updated `package.json` with integration test scripts
- Modified Jest configuration for integration test support
- Updated test timeout to 15 seconds for slower API calls

### Fixed
- Integration tests now handle authentication properly
- Tests gracefully skip when prerequisites not met
- Server port conflict handling in test environment

### Testing
- **Total Tests**: 91 (58 unit + 33 integration)
- **Coverage**: ~60% (200% of target)
- **CI/CD**: Fully automated
- **Test Suites**: 6 (3 unit + 3 integration)

---

## [0.8.1a] - 2026-01-18

### Added - Sprint 1 Week 1: Unit Testing Infrastructure
- **Testing Framework Setup**
  - Jest testing framework configured
  - Test directory structure (`tests/unit`, `tests/integration`, `tests/fixtures`)
  - Test scripts in package.json (`test`, `test:unit`, `test:coverage`, `test:watch`)
  - Coverage reporting with Istanbul
  - Test setup file with environment configuration

- **Cache Manager Tests** (20 tests, 100% coverage)
  - Basic cache operations (set, get, delete)
  - Cache expiration behavior
  - Namespace isolation
  - Cache clearing
  - Statistics tracking
  - TTL functionality

- **Activity Logger Tests** (18 tests, 87.5% coverage)
  - Log entry creation
  - Recent activity retrieval
  - Entity-specific history
  - Date filtering
  - Error handling
  - Database connection management

- **CSV Export Tests** (20 tests, 91.8% coverage)
  - Product export
  - Batch export
  - Category export
  - Low stock export
  - Expiring items export
  - CSV format validation
  - Empty data handling

### Changed
- Updated package.json with Jest and testing dependencies
- Added test scripts for different testing scenarios
- Updated .gitignore to exclude coverage reports

### Testing
- **Total Tests**: 58 unit tests
- **Coverage**: 50% overall (exceeded 30% target)
- **Test Suites**: 3
- **All tests passing**: ✅

---

## [0.8.0] - 2026-01-15

### Added - Intelligence & Polish Phase
- **Reports & Analytics**
  - Stock Value Report (total inventory value by category)
  - Expiration Report (items expiring within 30 days)
  - Low Stock Report (items below reorder point)
  - Turnover Report framework (for future enhancements)
  - CSV export for all reports
  - Date range filtering

- **Activity Logging System**
  - Comprehensive activity log table
  - Tracks all CRUD operations (Create, Read, Update, Delete)
  - Entity tracking (products, batches, categories, suppliers)
  - User action tracking
  - 90-day retention policy
  - Activity timeline view

- **Reorder Point System**
  - Configurable reorder point per product
  - Low stock alerts on dashboard
  - Visual indicators in product list
  - Automatic reorder suggestions

- **Product Favorites**
  - Mark products as favorites
  - Quick access filter for favorites
  - Favorite count on dashboard
  - Persistent favorite state

- **Dark Mode**
  - System preference detection
  - Manual toggle
  - Persistent theme preference
  - Smooth transitions
  - Optimized for readability

- **Keyboard Shortcuts & Command Palette**
  - `Ctrl+K` / `Cmd+K` - Open command palette
  - `Ctrl+N` - New product
  - `Ctrl+B` - New batch
  - `Ctrl+F` - Search
  - `Ctrl+D` - Dashboard
  - `/` - Focus search
  - Visual shortcut hints

- **Performance Optimization**
  - Dashboard load time reduced by 40%
  - Product list pagination
  - Lazy loading for large lists
  - Debounced search
  - Optimized database queries

- **Infrastructure**
  - Winston logging with daily rotation
  - Structured logging (info, error, debug levels)
  - Log retention (14 days for app logs, 30 days for errors)
  - API response caching (30-second TTL)
  - Database indexing on frequently queried fields
  - Health check endpoint (`/health`)

### Changed
- Improved dashboard layout and statistics
- Enhanced product cards with more information
- Better error handling throughout application
- Optimized batch expiry calculations

### Fixed
- Memory leaks in long-running sessions
- Race conditions in batch updates
- Incorrect inventory value calculations
- Barcode scanner issues on some devices

---

## [0.7.2] - 2026-01-10

### Added
- Categories Management (create, edit, delete categories)
- Suppliers Management (create, edit, delete suppliers)
- Category and supplier assignment to products
- Category-based filtering in product list
- Supplier-based filtering in product list

### Changed
- Product form now includes category and supplier dropdowns
- Dashboard statistics now include category breakdown
- Improved data model with foreign key relationships

---

## [0.7.1] - 2026-01-08

### Added
- Database Migration System
  - Sequential migration runner
  - Automatic schema versioning
  - Migration rollback support
  - Migration status tracking
  - Automatic backups before migrations

- Update Channel System
  - Stable channel (main branch, tested releases)
  - Beta channel (beta branch, latest features)
  - Channel switching from UI
  - Version checking from GitHub
  - Update notifications

### Changed
- Modularized database initialization
- Improved backup system with channel-specific naming
- Enhanced error handling in database operations

---

## [0.7.0] - 2026-01-05

### Added - Foundation Features
- **FIFO/FEFO Batch Suggestions**
  - Smart batch suggestions based on expiry date (FEFO)
  - Fallback to oldest batch first (FIFO)
  - Urgency indicators (expired, urgent, soon, normal)
  - Visual warnings for expiring batches

- **Quick Actions**
  - Quick add batch from product card
  - Quick adjust quantity
  - Quick delete with confirmation
  - Keyboard-accessible quick actions

- **Bulk Operations**
  - Select multiple products
  - Bulk delete products
  - Bulk category assignment
  - Bulk export to CSV

- **Barcode Scanning**
  - QuaggaJS integration
  - Camera-based barcode scanning
  - Manual barcode entry fallback
  - Automatic product lookup by barcode
  - Barcode assignment to products

- **Dashboard Enhancements**
  - Real-time statistics (total products, batches, inventory value)
  - Expiring soon alerts (next 7 days)
  - Low stock alerts
  - Recent activity feed
  - Quick action buttons

---

## [0.6.0] - 2026-01-01

### Added - Core Features
- Product Management
  - Create, read, update, delete products
  - Product details (name, barcode, brand, supplier, category)
  - Items per case and cost per case
  - Product notes

- Batch/Lot Management
  - Create batches for products
  - Track case quantity and total quantity
  - Expiry date tracking
  - Storage location
  - Batch notes

- Inventory Operations
  - Add new inventory batches
  - Adjust batch quantities
  - Remove empty batches
  - View batch history

- CSV Import/Export
  - Export products to CSV
  - Export batches to CSV
  - Import products from CSV
  - Field mapping for imports

- Search and Filtering
  - Search products by name, barcode, or brand
  - Filter by category
  - Filter by supplier
  - Sort by various fields

- User Interface
  - Responsive design (mobile, tablet, desktop)
  - Clean and intuitive layout
  - Modal dialogs for forms
  - Toast notifications
  - Loading states

---

## [0.5.0] - 2025-12-20

### Added - Beta Release
- Initial beta release
- SQLite database setup
- Express.js server
- Basic product CRUD operations
- Simple inventory tracking
- Basic web UI

---

## Version Numbering

**Format**: `MAJOR.MINOR.PATCH[a|b|rc]`

- **MAJOR**: Incompatible API changes (v1.0.0 = production ready)
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, small improvements
- **a**: Alpha (active development)
- **b**: Beta (feature complete, testing)
- **rc**: Release candidate (production ready, final testing)

**Current**: v0.8.4a (Alpha - Sprint 3 Phase 1 Complete)
**Next**: v0.8.4a (Sprint 3 Phases 2-4 - Password Policies, Security, Audit)
**Target**: v1.0.0 (Production Ready)

---

## Links

- [Roadmap](ROADMAP.md)
- [GitHub Repository](https://github.com/zv20/invai)
- [Issue Tracker](https://github.com/zv20/invai/issues)
