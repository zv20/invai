# 🚀 InvAI Development Handoff - Sprint 2: User Authentication & RBAC

## 📋 Current Status (as of January 25, 2026)

**Version**: v0.8.2a  
**Branch**: `beta`  
**Last Completed**: Sprint 1 - Testing Infrastructure ✅  
**Next Up**: Sprint 2 - User Authentication & Role-Based Access Control  

---

## ✅ What's Been Accomplished

### Sprint 1: Testing Infrastructure (Complete)
- ✅ **91 tests** passing (58 unit + 33 integration)
- ✅ **60% code coverage** (exceeded 30% target)
- ✅ **GitHub Actions CI/CD** pipeline operational
- ✅ **Test automation tools** (setup, reset password)
- ✅ **Comprehensive documentation** in `tests/README.md`

### Test Breakdown:
- **Cache Manager**: 20 tests, 100% coverage
- **Activity Logger**: 18 tests, 87.5% coverage
- **CSV Exporter**: 20 tests, 91.8% coverage
- **Auth API**: 11 integration tests
- **Products API**: 15 integration tests
- **Batches API**: 7 integration tests

### Infrastructure:
- Jest + Supertest testing framework
- GitHub Actions runs tests on push/PR
- Test user setup automation (`npm run test:setup`)
- Password reset tool for testing
- CI/CD pipeline tests on Node 18.x and 20.x

---

## 🎯 Sprint 2 Objectives: User Authentication & RBAC

**Target Version**: v0.8.3a  
**Estimated Duration**: 2-3 sessions  
**Target Completion**: February 8, 2026  

### Goals:
1. Build complete user authentication system
2. Implement role-based access control (4 roles)
3. Create user management UI
4. Enhance audit trail with user tracking
5. Add security hardening features
6. Write tests for all new features (target: 70% coverage)

---

## 📐 Sprint 2 Feature Specifications

### 1. User Authentication System

**Endpoints to Enhance/Create:**
- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - Enhanced with session tracking ✅ (exists, needs enhancement)
- `GET /api/auth/me` - Get current user ✅ (exists)
- `POST /api/auth/change-password` - Change own password ✅ (exists)
- `POST /api/auth/reset-password-request` - Request password reset (NEW)
- `POST /api/auth/reset-password` - Reset password with token (NEW)
- `POST /api/auth/logout` - Enhanced logout ✅ (exists)

**Features:**
- Password complexity validation (min 8 chars, uppercase, number, special char)
- Email validation and uniqueness check
- Password hashing with bcrypt (already implemented)
- Session tracking (login time, last activity)
- Account lockout after 5 failed attempts (15 min lockout)
- "Remember me" functionality (optional)
- First-time setup wizard (if no users exist)

**Database Changes:**
```sql
-- Enhance users table
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users ADD COLUMN created_by INTEGER;
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create sessions table (optional, for enhanced tracking)
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 2. Role-Based Access Control (RBAC)

**Four Roles:**

1. **Owner** (`role: 'owner'`)
   - Full system access
   - User management (create, edit, delete, change roles)
   - All settings access
   - All inventory operations
   - All reports
   - Cannot be deleted if last owner

2. **Manager** (`role: 'manager'`)
   - All inventory operations (create, edit, delete products/batches)
   - View all reports
   - Export data
   - Limited settings (own profile only)
   - Cannot manage users
   - Cannot access sensitive settings

3. **Staff** (`role: 'staff'`)
   - Add/edit products and batches
   - Cannot delete products/batches
   - View basic reports (no financial data)
   - Cannot export data
   - Cannot access settings
   - Own profile only

4. **View-Only** (`role: 'viewer'`)
   - Read-only access to inventory
   - View basic reports (no cost data)
   - Cannot modify anything
   - Cannot export data
   - Own profile only

**Permission Matrix:**

| Action | Owner | Manager | Staff | Viewer |
|--------|-------|---------|-------|--------|
| View Products | ✅ | ✅ | ✅ | ✅ |
| Create Products | ✅ | ✅ | ✅ | ❌ |
| Edit Products | ✅ | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ✅ | ❌ | ❌ |
| View Batches | ✅ | ✅ | ✅ | ✅ |
| Create Batches | ✅ | ✅ | ✅ | ❌ |
| Edit Batches | ✅ | ✅ | ✅ | ❌ |
| Delete Batches | ✅ | ✅ | ❌ | ❌ |
| View Reports (all) | ✅ | ✅ | 📊 | 📊 |
| View Cost Data | ✅ | ✅ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Access Settings | ✅ | 👤 | 👤 | 👤 |
| View Activity Log | ✅ | ✅ | 👤 | 👤 |

📊 = Limited (no cost data)  
👤 = Own profile only

**Implementation:**

```javascript
// middleware/permissions.js
const permissions = {
  // Product permissions
  'products:view': ['owner', 'manager', 'staff', 'viewer'],
  'products:create': ['owner', 'manager', 'staff'],
  'products:update': ['owner', 'manager', 'staff'],
  'products:delete': ['owner', 'manager'],
  
  // Batch permissions
  'batches:view': ['owner', 'manager', 'staff', 'viewer'],
  'batches:create': ['owner', 'manager', 'staff'],
  'batches:update': ['owner', 'manager', 'staff'],
  'batches:delete': ['owner', 'manager'],
  
  // Report permissions
  'reports:view': ['owner', 'manager', 'staff', 'viewer'],
  'reports:view_costs': ['owner', 'manager'],
  'reports:export': ['owner', 'manager'],
  
  // User management
  'users:view': ['owner'],
  'users:create': ['owner'],
  'users:update': ['owner'],
  'users:delete': ['owner'],
  
  // Settings
  'settings:view': ['owner'],
  'settings:update': ['owner'],
};

function hasPermission(userRole, permission) {
  return permissions[permission]?.includes(userRole) || false;
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permission,
        userRole: req.user.role
      });
    }
    
    next();
  };
}

module.exports = { hasPermission, requirePermission };
```

**Route Protection Example:**

```javascript
// routes/products.js
const { requirePermission } = require('../middleware/permissions');

// View products (all roles)
router.get('/', authenticate, requirePermission('products:view'), async (req, res) => {
  // ...
});

// Create product (owner, manager, staff)
router.post('/', authenticate, requirePermission('products:create'), async (req, res) => {
  // ...
});

// Delete product (owner, manager only)
router.delete('/:id', authenticate, requirePermission('products:delete'), async (req, res) => {
  // ...
});
```

---

### 3. User Management UI

**New Pages/Routes:**

1. **User List Page** (`/users`) - Owner only
   - Table showing all users
   - Columns: Username, Email, Role, Status (Active/Locked), Last Login, Actions
   - Filter by role
   - Search by username/email
   - Sort by various fields
   - Actions: Edit, Reset Password, Activate/Deactivate, Delete

2. **Create User Page** (`/users/new`) - Owner only
   - Form fields: Username, Email, Password, Confirm Password, Role
   - Password strength indicator
   - Validation feedback
   - Cancel/Save buttons

3. **Edit User Page** (`/users/:id/edit`) - Owner only
   - Same as create but populated with existing data
   - Cannot edit username (read-only)
   - Can change role
   - Can activate/deactivate account
   - Password field optional (only if changing)

4. **User Profile Page** (`/profile`) - All users
   - View own information
   - Change own password
   - View own activity history
   - Update email (with verification)

5. **First-Time Setup Wizard** (`/setup`) - No auth required
   - Only shown if no users exist in database
   - Create first owner account
   - Set up basic settings
   - Welcome message and quick tour

**UI Components:**

```html
<!-- User List Table -->
<table id="userTable">
  <thead>
    <tr>
      <th>Username</th>
      <th>Email</th>
      <th>Role</th>
      <th>Status</th>
      <th>Last Login</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- Populated dynamically -->
  </tbody>
</table>

<!-- User Form -->
<form id="userForm">
  <input type="text" name="username" required>
  <input type="email" name="email" required>
  <input type="password" name="password" required>
  <input type="password" name="confirmPassword" required>
  <select name="role" required>
    <option value="owner">Owner</option>
    <option value="manager">Manager</option>
    <option value="staff">Staff</option>
    <option value="viewer">View Only</option>
  </select>
  <button type="submit">Save User</button>
</form>

<!-- Password Strength Indicator -->
<div class="password-strength">
  <div class="strength-bar" id="strengthBar"></div>
  <span id="strengthText">Weak</span>
</div>
```

---

### 4. Enhanced Audit Trail

**Database Changes:**

```sql
-- Add user_id to activity_log
ALTER TABLE activity_log ADD COLUMN user_id INTEGER;
ALTER TABLE activity_log ADD COLUMN username TEXT;
ALTER TABLE activity_log ADD COLUMN ip_address TEXT;

-- Add foreign key (if not already exists)
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

-- Create login audit table
CREATE TABLE login_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  success INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Enhanced Logging:**

```javascript
// Track all user actions
await activityLogger.log({
  action_type: 'create',
  entity_type: 'product',
  entity_id: product.id,
  description: `Created product: ${product.name}`,
  user_id: req.user.id,
  username: req.user.username,
  ip_address: req.ip,
  old_values: null,
  new_values: JSON.stringify(product)
});

// Track login attempts
await db.run(
  `INSERT INTO login_audit (user_id, username, success, ip_address, user_agent, failure_reason) 
   VALUES (?, ?, ?, ?, ?, ?)`,
  [user?.id, username, success ? 1 : 0, req.ip, req.headers['user-agent'], failureReason]
);
```

**User Activity Timeline:**
- View all actions by a specific user
- Filter by action type, entity type, date range
- Export user activity report

---

### 5. Security Hardening

**Features to Implement:**

1. **Rate Limiting** (already have express-rate-limit)
   ```javascript
   // Stricter rate limit on login
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 attempts
     message: 'Too many login attempts, please try again later'
   });
   
   router.post('/api/auth/login', loginLimiter, ...);
   ```

2. **Account Lockout**
   - After 5 failed login attempts
   - Lock account for 15 minutes
   - Email notification to user
   - Owner can manually unlock

3. **CSRF Protection**
   ```javascript
   const csrf = require('csurf');
   app.use(csrf({ cookie: true }));
   ```

4. **XSS Prevention**
   - Already using helmet.js ✅
   - Sanitize all user inputs
   - Content Security Policy headers

5. **Secure Session Cookies**
   ```javascript
   app.use(session({
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: {
       secure: process.env.NODE_ENV === 'production',
       httpOnly: true,
       maxAge: 24 * 60 * 60 * 1000 // 24 hours
     }
   }));
   ```

6. **Password Policies**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one number
   - At least one special character
   - Cannot reuse last 3 passwords (optional)

---

## 🧪 Testing Requirements

**Target Coverage**: 70%+

### Unit Tests to Write:

1. **Permission Middleware** (`tests/unit/permissions.test.js`)
   - Test `hasPermission()` for all roles
   - Test `requirePermission()` middleware
   - Test permission denied responses
   - Test edge cases (no user, invalid role)

2. **Password Validation** (`tests/unit/password-validation.test.js`)
   - Test complexity requirements
   - Test password strength calculation
   - Test common password rejection
   - Test password comparison

3. **Account Lockout** (`tests/unit/account-lockout.test.js`)
   - Test failed login increment
   - Test lockout after 5 attempts
   - Test lockout expiration
   - Test lockout reset after successful login

### Integration Tests to Write:

1. **User Registration** (`tests/integration/user-registration.test.js`)
   - Register new user with valid data
   - Reject duplicate username
   - Reject duplicate email
   - Reject weak password
   - Validate email format

2. **User Management** (`tests/integration/user-management.test.js`)
   - Owner can list all users
   - Owner can create users
   - Owner can update users
   - Owner can delete users
   - Manager cannot access user management
   - Staff cannot access user management

3. **Role Enforcement** (`tests/integration/role-enforcement.test.js`)
   - Owner can delete products
   - Manager can delete products
   - Staff cannot delete products
   - Viewer cannot create products
   - Test all permission combinations

4. **Security** (`tests/integration/security.test.js`)
   - Test rate limiting on login
   - Test account lockout
   - Test CSRF protection
   - Test XSS prevention
   - Test SQL injection prevention

---

## 📁 Files to Create/Modify

### New Files:
```
middleware/permissions.js
controllers/userController.js
routes/users.js
public/js/users.js
public/js/profile.js
public/js/setup-wizard.js
public/users.html
public/profile.html
public/setup.html
migrations/008_enhance_user_management.js
tests/unit/permissions.test.js
tests/unit/password-validation.test.js
tests/unit/account-lockout.test.js
tests/integration/user-registration.test.js
tests/integration/user-management.test.js
tests/integration/role-enforcement.test.js
tests/integration/security.test.js
```

### Files to Modify:
```
routes/auth.js (enhance existing endpoints)
middleware/auth.js (add permission checks)
lib/activity-logger.js (add user tracking)
server.js (register new routes)
package.json (bump version to 0.8.3a)
ROADMAP.md (mark Sprint 2 complete)
CHANGELOG.md (document changes)
public/js/dashboard.js (show user info)
public/css/styles.css (user management styles)
```

---

## 🎯 Success Criteria

**Sprint 2 is complete when:**

1. ✅ User registration working with validation
2. ✅ All 4 roles implemented and enforced
3. ✅ User management UI complete (list, create, edit, delete)
4. ✅ User profile page functional
5. ✅ First-time setup wizard working
6. ✅ Enhanced audit trail tracking users
7. ✅ Security features implemented (rate limit, lockout, CSRF, XSS)
8. ✅ All routes protected with permission middleware
9. ✅ 70%+ test coverage
10. ✅ All tests passing (unit + integration)
11. ✅ Documentation updated (ROADMAP, CHANGELOG)
12. ✅ Version bumped to 0.8.3a

---

## 🚀 How to Continue This Work

**Start your next session with this prompt:**

```
I'm continuing development on InvAI, a professional inventory management system.

We just completed Sprint 1 (Testing Infrastructure) with 91 tests passing and 60% coverage.

Now starting Sprint 2: User Authentication & RBAC (v0.8.3a)

Key context:
- Current version: v0.8.2a on beta branch
- GitHub repo: zv20/invai
- Tech stack: Node.js, Express, SQLite, JWT auth
- Users table exists with basic fields (id, username, password, role)
- JWT auth middleware exists in middleware/auth.js
- Activity logger exists in lib/activity-logger.js

Today's goal: Implement [specific feature from Sprint 2 plan]

Please:
1. Review the HANDOFF_PROMPT.md for full Sprint 2 specifications
2. Start with [specific task]
3. Write tests as we go
4. Update documentation when complete
5. Follow the same structured approach we've been using

Let's build the [specific feature] first. Ready?
```

---

## 📞 Contact & Resources

- **Repository**: https://github.com/zv20/invai
- **Branch**: `beta`
- **Documentation**: See `ROADMAP.md`, `CHANGELOG.md`, `tests/README.md`
- **Testing**: Run `npm run test:all` before committing
- **CI/CD**: GitHub Actions runs automatically on push

---

## 💡 Development Tips

1. **Always write tests first** - TDD approach
2. **Run tests frequently** - `npm test` after each change
3. **Update docs as you go** - Don't wait until the end
4. **Commit often** - Small, focused commits
5. **Use meaningful commit messages** - Follow conventional commits
6. **Test both happy and error paths** - Don't just test success cases
7. **Check coverage** - `npm run test:coverage` to see gaps
8. **Follow existing patterns** - Look at current code structure
9. **Security first** - Validate all inputs, sanitize outputs
10. **Mobile-friendly** - Test UI on small screens

---

**Last Updated**: January 25, 2026  
**Sprint 1 Status**: ✅ Complete  
**Sprint 2 Status**: 📋 Ready to Start  
**Version**: v0.8.2a → v0.8.3a (target)

---

**Good luck with Sprint 2! 🚀**
