# Changelog

All notable changes to InvAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for Sprint 4 (v0.9.x)
- PostgreSQL database support for production
- Automated backup system (S3/Backblaze B2/NAS)
- Stock take / physical inventory feature
- Performance optimization and query caching
- Database connection pooling
- Enhanced audit trail retention policies

---

## [0.9.0-beta] - 2026-01-25

### 🎉 Sprint 3 Complete! All Three Phases Delivered

**Status**: ✅ Sprint 3 Complete (100%)
**Timeline**: January 25, 2026 (all phases completed same day)
**Achievement**: Enterprise-grade security implemented ahead of 2-week schedule

---

## Sprint 3 Phase 3: Security Headers & CSRF Protection ✅

### Added - Security Headers (Helmet.js)
- **Content Security Policy (CSP)**
  - Prevents XSS attacks by controlling resource sources
  - Restricts script sources to self and trusted CDNs
  - Blocks inline scripts and eval()
  - Frame ancestors limited to prevent clickjacking
  - Report-only mode for testing (configurable)

- **HTTP Strict Transport Security (HSTS)**
  - Forces HTTPS connections for 1 year
  - Include subdomains in HSTS policy
  - Preload list compatible
  - Prevents protocol downgrade attacks

- **X-Frame-Options**
  - Set to DENY to prevent clickjacking
  - Prevents embedding in iframes
  - Protection against UI redressing attacks

- **X-Content-Type-Options**
  - Set to nosniff
  - Prevents MIME type sniffing
  - Forces browser to respect declared content type

- **Referrer-Policy**
  - Set to strict-origin-when-cross-origin
  - Protects user privacy
  - Limits referrer information leakage

- **X-DNS-Prefetch-Control**
  - Disabled for privacy
  - Prevents DNS prefetching
  - Reduces information disclosure

### Added - CSRF Protection
- **CSRF Middleware** (`middleware/csrf.js` - 185 lines)
  - Double-submit cookie pattern implementation
  - Token generation using crypto.randomBytes(32)
  - Token validation for POST/PUT/DELETE/PATCH requests
  - Automatic token refresh on validation
  - Session-based token storage
  - Configurable token expiration (1 hour)
  - Background cleanup of expired tokens (every 15 minutes)
  - Proper 403 responses for invalid/missing tokens

- **CSRF Token Endpoint**
  - `GET /api/auth/csrf-token` - Get CSRF token for forms
  - Returns token and expiration time
  - Protected by authentication
  - Token included in response cookie

- **Frontend CSRF Integration** (`public/js/core.js`)
  - Automatic CSRF token inclusion in all API calls
  - Token fetched on page load
  - Stored in memory (not localStorage for security)
  - Added to X-CSRF-Token header on all requests
  - Automatic retry with new token on 403

### Added - Input Sanitization
- **Sanitization Utilities** (`utils/sanitizer.js` - 148 lines)
  - `sanitizeHtml(input)` - Remove HTML tags and dangerous content
  - `sanitizeForSQL(input)` - Prevent SQL injection (prepared statement helper)
  - `sanitizeFilename(input)` - Safe filename generation
  - `sanitizeUrl(input)` - URL validation and sanitization
  - `isValidEmail(email)` - Email format validation
  - `escapeRegex(string)` - Regex special character escaping
  - XSS prevention for all user inputs
  - Common attack pattern detection
  - Whitelist-based validation where appropriate

### Changed - Server Configuration
- **server.js Enhanced**
  - Helmet middleware applied globally
  - CSP policy configured for application needs
  - HSTS enabled for production
  - CSRF middleware applied to all routes except public endpoints
  - CSRF token cleanup scheduler started on server init
  - Security headers logged on startup

### Security Improvements
- **XSS Protection**: Content Security Policy blocks inline scripts
- **Clickjacking Protection**: X-Frame-Options prevents iframe embedding
- **CSRF Protection**: Double-submit cookie pattern prevents CSRF attacks
- **HTTPS Enforcement**: HSTS forces secure connections
- **MIME Sniffing Prevention**: X-Content-Type-Options prevents content type confusion
- **Input Sanitization**: All user inputs sanitized to prevent injection attacks
- **Privacy Protection**: Referrer policy limits information disclosure

### Testing
- Manual testing of CSRF protection (form submissions)
- Security header validation (securityheaders.com scan)
- XSS attack prevention testing
- CSRF token rotation testing
- All API endpoints verified with CSRF tokens
- Production deployment verified

### Files Created/Modified
- ✅ `middleware/csrf.js` (185 lines)
- ✅ `utils/sanitizer.js` (148 lines)
- ✅ `server.js` (updated with Helmet + CSRF)
- ✅ `routes/auth.js` (added CSRF token endpoint)
- ✅ `public/js/core.js` (added CSRF token to API calls)
- ✅ `package.json` (verified helmet dependency)

---

## Sprint 3 Phase 2: Password Policies & Account Lockout ✅

### Added - Password Complexity Validator
- **Password Validator** (`utils/passwordValidator.js` - 9,285 bytes)
  - Minimum 8 characters requirement
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*)
  - Common password rejection (top 10,000 passwords)
  - Password strength meter (weak/fair/good/strong)
  - Detailed validation error messages
  - `validatePassword(password)` - Returns validation result with errors
  - `calculatePasswordStrength(password)` - Returns strength score and level
  - `isCommonPassword(password)` - Checks against common password list
  - Used on user creation and password change

### Added - Password History
- **Database Schema (Migration 010)**
  - `password_history` table created
  - Fields:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `user_id` (INTEGER NOT NULL) - Foreign key to users table
    - `password_hash` (TEXT NOT NULL) - Bcrypt hash of password
    - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
  - Foreign key with CASCADE delete (cleanup on user deletion)
  - Index on user_id for fast lookups
  - Tracks last 5 passwords per user
  - Automatic cleanup (retains only last 5 per user)

- **Password History Validation**
  - Check new password against last 5 hashes
  - Bcrypt comparison for secure matching
  - Clear error message on reuse attempt
  - Automatic storage on successful password change
  - Cleanup of old history (>5 entries per user)

### Added - Password Expiration
- **Database Enhancement**
  - `password_changed_at` column added to users table
  - Set on user creation and password change
  - Tracks password age for expiration policy

- **Expiration Policy**
  - Passwords expire after 90 days
  - Warning shown 14 days before expiration (day 76+)
  - Force password change on day 91
  - Configurable via environment variables:
    - `PASSWORD_EXPIRY_DAYS` (default: 90)
    - `PASSWORD_EXPIRY_WARNING_DAYS` (default: 14)

- **Password Status API**
  - `GET /api/auth/password-status` - Check password expiration
  - Returns:
    - `daysUntilExpiry` - Days remaining
    - `isExpired` - Boolean expiration status
    - `needsWarning` - Boolean for warning banner
    - `passwordChangedAt` - Timestamp of last change

- **UI Enhancements**
  - **Dashboard Warning Banner** (`public/dashboard.html`)
    - Displays 14 days before expiration
    - Shows days remaining count
    - Change password button
    - Dismiss option (re-shows on next login)
    - Color-coded urgency (yellow warning, orange urgent, red expired)
  - **Password Change Modal**
    - Accessible from dashboard banner
    - Current password + new password + confirm
    - Real-time password strength indicator
    - Complexity requirements checklist
  - **CSS Styles** (`public/css/styles.css`)
    - Warning banner styles (warning/urgent/error states)
    - Responsive design for mobile
    - Dark mode support

### Added - Account Lockout
- **Database Schema (Migration 011)**
  - `login_attempts` table created
  - Fields:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `username` (TEXT NOT NULL)
    - `ip_address` (TEXT NOT NULL)
    - `attempted_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
    - `success` (BOOLEAN NOT NULL)
  - Indexes on username and ip_address
  - Tracks failed login attempts
  - Automatic cleanup (>24 hours old attempts)

- **Lockout Manager** (`utils/accountLockout.js` - 12,484 bytes)
  - `recordAttempt(username, ipAddress, success)` - Log login attempt
  - `checkLockout(username, ipAddress)` - Check if account locked
  - `resetAttempts(username)` - Clear attempts on successful login
  - `unlockAccount(username, adminUser)` - Admin unlock capability
  - `getAccountStatus(username)` - Get lockout info with time remaining
  - `cleanupOldAttempts()` - Background job (removes >24h old)
  - Configuration:
    - Max attempts: 5 failed logins
    - Lockout duration: 15 minutes
    - Cleanup interval: Every hour
  - Comprehensive logging of all lockout events

- **Login API Enhancement** (`routes/auth.js`)
  - Check lockout status before authentication
  - Return 423 (Locked) with time remaining
  - Record all login attempts (success/failure)
  - Reset counter on successful login
  - Log lockout events for security audit

- **Admin Unlock Endpoint**
  - `POST /api/auth/unlock/:userId` - Admin unlock account
  - Owner-only permission required
  - Logs unlock action for audit trail
  - Clears failed attempt history
  - Returns unlock confirmation

- **UI Enhancements**
  - **Login Page Lockout Display** (`public/login.html`)
    - Lockout message with countdown timer
    - Updates every second
    - Hides login form when locked
    - Shows time remaining until unlock
  - **User Management Admin Controls** (`public/users.html`)
    - Lock status indicator on user cards
    - Admin unlock button for locked accounts
    - Unlock confirmation dialog
    - Real-time status updates
  - **Password Strength Meter**
    - Real-time strength indicator (weak/fair/good/strong)
    - Color-coded display (red/yellow/blue/green)
    - Complexity requirements checklist
    - Visual feedback on user creation form

### Security Improvements
- **Brute Force Protection**: Account lockout after 5 failed attempts
- **Password Complexity**: Enforced 8+ chars with mixed case, numbers, symbols
- **Password Reuse Prevention**: Cannot reuse last 5 passwords
- **Password Expiration**: Forces password refresh every 90 days
- **Audit Trail**: All failed attempts and lockouts logged
- **Admin Controls**: Owner can unlock accounts remotely
- **IP Tracking**: Failed attempts tracked by IP for security analysis

### Testing
- Manual testing of password complexity (all rules enforced)
- Password history testing (reuse blocked)
- Password expiration testing (warning + force change)
- Account lockout testing (5 failed attempts)
- Lockout timer testing (15-minute countdown)
- Admin unlock testing (owner can unlock)
- UI testing (banners, modals, indicators)
- Production deployment verified

### Files Created/Modified
- ✅ `migrations/010_password_history.js` (4,420 bytes)
- ✅ `migrations/011_account_lockout.js` (7,398 bytes)
- ✅ `utils/passwordValidator.js` (9,285 bytes)
- ✅ `utils/accountLockout.js` (12,484 bytes)
- ✅ `routes/auth.js` (updated with lockout + password status)
- ✅ `public/dashboard.html` (added warning banner)
- ✅ `public/login.html` (added lockout display)
- ✅ `public/users.html` (added unlock controls + strength meter)
- ✅ `public/css/styles.css` (added warning banner styles)

---

## Sprint 3 Phase 1: Session Management ✅
## [0.8.4a] - 2026-01-25

### Added - Session Management
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

---

## Sprint 3 Summary

### Achievement Highlights
- ✅ **All 3 Phases Complete**: Session Management, Password Policies, Security Headers
- ✅ **3 Database Migrations**: 009 (sessions), 010 (password history), 011 (lockout)
- ✅ **5 New Utility Modules**: sessionManager, passwordValidator, accountLockout, csrf, sanitizer
- ✅ **10+ New API Endpoints**: Session management, password status, unlock, CSRF token
- ✅ **Comprehensive UI Updates**: Warning banners, lockout displays, strength meters, unlock controls
- ✅ **Enterprise Security**: CSRF, XSS protection, account lockout, password policies
- ✅ **Ahead of Schedule**: 2-week sprint completed in 1 day

### Files Created in Sprint 3
- `migrations/009_add_session_management.js`
- `migrations/010_password_history.js`
- `migrations/011_account_lockout.js`
- `config/security.js`
- `utils/sessionManager.js`
- `utils/passwordValidator.js`
- `utils/accountLockout.js`
- `middleware/session.js`
- `middleware/csrf.js`
- `utils/sanitizer.js`

### Files Modified in Sprint 3
- `routes/auth.js` (session endpoints, lockout, password status)
- `server.js` (Helmet security headers, CSRF middleware)
- `public/dashboard.html` (password expiration warning)
- `public/login.html` (lockout display with countdown)
- `public/users.html` (unlock controls, strength meter)
- `public/js/core.js` (CSRF token integration)
- `public/css/styles.css` (warning banner styles)

### Security Posture Improvements
1. **Session Security**: Database-backed with timeout and limits
2. **Password Security**: Complexity, history, expiration policies
3. **Brute Force Protection**: Account lockout after failed attempts
4. **CSRF Protection**: Token-based validation on all state changes
5. **XSS Protection**: Content Security Policy and input sanitization
6. **Clickjacking Protection**: X-Frame-Options header
7. **HTTPS Enforcement**: HSTS header
8. **Input Validation**: Comprehensive sanitization utilities

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

### Security
- **Access Control**: All user management endpoints require `users:*` permissions (owner only)
- **Self-Protection**: Users cannot modify their own role or deactivate themselves
- **Password Security**: Bcrypt hashing (10 rounds), minimum 6 characters
- **Audit Trail**: Complete tracking of who created/modified each user
- **Soft Deletes**: User deactivation instead of hard deletion preserves audit trail
- **Email Uniqueness**: Enforced at database level with unique index
- **Input Validation**: All fields validated before processing

---

## [0.8.2a] - 2026-01-25

### Added - Sprint 2 Phase 1-2: RBAC Implementation
- **Role-Based Access Control (RBAC) System**
  - 4-role permission system: Owner, Manager, Staff, View-Only
  - Granular permissions for all resources (products, batches, reports, users, settings)
  - Permission middleware with 7 exported functions
  - Backward compatibility for legacy 'admin' role

### Testing
- **Total Tests**: 62 (38 RBAC unit + 24 integration)
- **RBAC Coverage**: 100%

---

## [0.8.1a] - 2026-01-18

### Added - Sprint 1: Testing Infrastructure
- Jest testing framework
- 91 total tests (58 unit + 33 integration)
- ~60% code coverage
- GitHub Actions CI/CD pipeline

---

## [0.8.0] - 2026-01-15

### Added - Intelligence & Polish Phase
- Reports & Analytics
- Activity Logging System
- Reorder Point System
- Product Favorites
- Dark Mode
- Keyboard Shortcuts
- Performance Optimization

---

## Version Numbering

**Format**: `MAJOR.MINOR.PATCH[a|b|rc]`

- **MAJOR**: Incompatible API changes (v1.0.0 = production ready)
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, small improvements
- **a**: Alpha (active development)
- **b**: Beta (feature complete, testing)
- **rc**: Release candidate (production ready, final testing)

**Current**: v0.9.0-beta (Sprint 3 Complete - Enhanced Security)
**Next**: v0.9.x (Sprint 4 - Database & Reliability)
**Target**: v1.0.0 (Production Ready)

---

## Links

- [Roadmap](ROADMAP.md)
- [GitHub Repository](https://github.com/zv20/invai)
- [Issue Tracker](https://github.com/zv20/invai/issues)
