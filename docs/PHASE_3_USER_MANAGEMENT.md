# Phase 3: User Management UI & API

**Version**: v0.8.2a → v0.8.3a  
**Sprint**: Sprint 2 (50% → 100%)  
**Date**: January 25, 2026  
**Status**: ✅ Complete and Deployed to Beta

---

## 🎯 Overview

Phase 3 completes Sprint 2 by adding comprehensive user management capabilities to InvAI. Building on the RBAC foundation from Phase 2, this phase adds:

- **Enhanced User Schema**: Email, activity tracking, audit trail
- **User Management API**: Full CRUD with UserController
- **Admin UI**: User list, create/edit, password reset
- **Security**: Role-based access, self-modification protection

---

## 📚 What's New

### 1. Database Migration 008
**File**: `migrations/008_user_management.js`

**New Fields Added to `users` Table**:
- `email` (VARCHAR, UNIQUE): User email address
- `is_active` (BOOLEAN): Soft delete flag (1=active, 0=inactive)
- `last_login` (DATETIME): Last successful login timestamp
- `created_at` (DATETIME): When user was created
- `created_by` (INTEGER): Who created this user
- `updated_at` (DATETIME): Last modification timestamp
- `updated_by` (INTEGER): Who last modified this user

**Features**:
- Automatic `updated_at` trigger
- Unique index on email
- Backward compatible (populates existing users)
- Handles duplicate column errors gracefully

### 2. UserController
**File**: `controllers/userController.js`

**Methods**:
- `getAllUsers(options)` - Paginated list with filters
- `getUserById(id)` - Single user with audit trail
- `createUser(data, creator, creatorId)` - Create with validation
- `updateUser(id, updates, updater, updaterId)` - Update with protection
- `deleteUser(id, deleter, deleterId)` - Soft delete
- `updatePassword(id, password, updater, updaterId)` - Password reset
- `updateLastLogin(id)` - Track login activity

**Validations**:
- Password minimum 6 characters
- Valid role selection (owner, manager, staff, viewer)
- Unique username and email
- Self-modification protection
- Required field validation

### 3. Enhanced User Routes
**File**: `routes/users.js`

**Endpoints**:
```
GET    /api/users              - List users (paginated, filtered)
GET    /api/users/:id          - Get single user
POST   /api/users              - Create user
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Deactivate user
PUT    /api/users/:id/password - Reset password
```

**All endpoints require `users:*` permissions (owner only)**

### 4. User Management UI
**File**: `public/users.html`

**Features**:
- User cards showing role, status, activity
- Search by username/email
- Filter by role and status
- Create/edit modal with validation
- Password reset dialog
- Activate/deactivate controls
- Pagination (20 users per page)
- Responsive design

---

## 🚀 Deployment Instructions

### Step 1: Backup Database
```bash
cd /opt/invai
sqlite3 grocery.db ".backup backups/pre-phase3-$(date +%Y%m%d-%H%M%S).db"
```

### Step 2: Pull Updates
```bash
cd /opt/invai
git fetch origin
git checkout beta
git pull origin beta
```

### Step 3: Run Migration
```bash
node migrations/migration-runner.js
```

**Expected Output**:
```
Running migration 008: User Management Enhancements
✓ Added column: email
✓ Added column: is_active
✓ Added column: last_login
✓ Added column: created_at
✓ Added column: created_by
✓ Added column: updated_at
✓ Added column: updated_by
✓ Created updated_at trigger
✓ Populated existing users with default emails
✓ Created unique index on email
✅ Migration 008 completed successfully
```

### Step 4: Restart Service
```bash
systemctl restart inventory-app
systemctl status inventory-app
```

### Step 5: Verify
1. Navigate to `http://192.168.1.8:3000/users.html`
2. You should see existing users listed
3. Try creating a new user
4. Test filtering and search
5. Test password reset

---

## 📝 API Documentation

### List Users
```http
GET /api/users?page=1&limit=20&search=&role=&is_active=
```

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20)
- `search` (string): Search username or email
- `role` (string): Filter by role (owner, manager, staff, viewer)
- `is_active` (boolean): Filter by status (true/false)

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@invai.local",
        "role": "owner",
        "is_active": 1,
        "last_login": "2026-01-25T10:30:00Z",
        "created_at": "2026-01-01T00:00:00Z",
        "created_by_username": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Create User
```http
POST /api/users
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "secure123",
  "role": "staff"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "john",
    "email": "john@example.com",
    "role": "staff",
    "is_active": 1,
    "created_at": "2026-01-25T15:00:00Z",
    "created_by_username": "admin"
  },
  "message": "User created successfully"
}
```

### Update User
```http
PUT /api/users/5
Content-Type: application/json

{
  "email": "john.smith@example.com",
  "role": "manager",
  "is_active": true
}
```

### Reset Password
```http
PUT /api/users/5/password
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

### Deactivate User
```http
DELETE /api/users/5
```

**Note**: This is a soft delete (sets `is_active = 0`)

---

## 🧪 Testing

### Manual Testing Checklist

**User List**:
- [ ] Users display correctly
- [ ] Search by username works
- [ ] Search by email works
- [ ] Role filter works
- [ ] Status filter works
- [ ] Pagination works
- [ ] Last login displays correctly

**Create User**:
- [ ] Modal opens/closes
- [ ] All fields required
- [ ] Email validation works
- [ ] Password minimum 6 chars enforced
- [ ] User created successfully
- [ ] Activity logged
- [ ] Email must be unique

**Edit User**:
- [ ] Modal pre-fills correctly
- [ ] Username is read-only
- [ ] Email can be updated
- [ ] Role can be changed
- [ ] Cannot change own role
- [ ] Changes saved successfully

**Password Reset**:
- [ ] Prompt appears
- [ ] Minimum 6 chars enforced
- [ ] Password updated successfully
- [ ] Activity logged

**Deactivate/Activate**:
- [ ] Confirmation dialog shown
- [ ] User deactivated (is_active=0)
- [ ] Cannot deactivate self
- [ ] Can reactivate user
- [ ] Activity logged

### Automated Testing

**Run Tests**:
```bash
cd /opt/invai
npm test -- tests/integration/users.test.js
```

---

## 🔐 Security Features

### Access Control
- All endpoints require `users:*` permissions
- Only **owner** role can access user management
- Non-owners redirected to dashboard

### Self-Protection
- Cannot change own role
- Cannot deactivate yourself
- Cannot delete yourself

### Data Protection
- Passwords hashed with bcrypt (10 rounds)
- No password exposure in API responses
- Email uniqueness enforced
- SQL injection protection (parameterized queries)

### Audit Trail
- `created_by` tracks who created each user
- `updated_by` tracks who modified each user
- All actions logged via activityLogger
- Timestamps for created_at and updated_at

---

## 🐞 Troubleshooting

### Migration Fails

**Error: "duplicate column name"**
```
✓ Solution: This is expected if migration ran before. 
           Migration handles this gracefully.
```

**Error: "database is locked"**
```bash
systemctl stop inventory-app
node migrations/migration-runner.js
systemctl start inventory-app
```

### UI Shows "Failed to load users"

**Check API Response**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/users
```

**Check Logs**:
```bash
journalctl -u inventory-app -n 50
```

**Check Permission**:
- Ensure logged-in user has `owner` or `admin` role
- Check token is valid
- Check RBAC middleware is loaded

### Email Already Exists Error

**Check Existing Users**:
```bash
sqlite3 /opt/invai/grocery.db "SELECT id, username, email FROM users;"
```

**Update Duplicate Email**:
```bash
sqlite3 /opt/invai/grocery.db
UPDATE users SET email = 'newunique@example.com' WHERE id = 5;
```

### Cannot Access User Management Page

**Check Role**:
```bash
sqlite3 /opt/invai/grocery.db "SELECT id, username, role FROM users WHERE username = 'YOUR_USERNAME';"
```

**Update Role to Owner**:
```bash
sqlite3 /opt/invai/grocery.db
UPDATE users SET role = 'owner' WHERE id = 1;
```

---

## 📋 Database Schema Changes

### Before Migration
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### After Migration
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  email VARCHAR(255) UNIQUE,                    -- NEW
  is_active BOOLEAN DEFAULT 1,                  -- NEW
  last_login DATETIME,                          -- NEW
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),      -- NEW
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)       -- NEW
);

CREATE UNIQUE INDEX idx_users_email ON users(email);

CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

---

## ✅ Success Metrics

**Phase 3 Complete When**:
- [x] Migration 008 runs successfully
- [x] UserController created with all methods
- [x] User routes use RBAC middleware
- [x] User management UI functional
- [x] All manual tests pass
- [x] Activity logging works
- [x] Audit trail populated
- [x] Documentation complete

---

## 🔗 Related Documentation

- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Project structure and workflow
- [SPRINT_1_PLAN.md](../SPRINT_1_PLAN.md) - Sprint overview
- [Phase 2: RBAC Middleware](./PHASE_2_RBAC.md) - Permission system
- [middleware/permissions.js](../middleware/permissions.js) - RBAC implementation

---

**Status**: 🎉 **Phase 3 Complete!**  
**Next**: Phase 4 - User Profile Management & Activity Logs  
**Version**: v0.8.3a (Sprint 2 - 100% Complete)
