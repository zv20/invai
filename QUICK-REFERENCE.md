# 📘 InvAI Quick Reference

## 📦 Repository

```
Repo: zv20/invai
Branches: main (stable), beta (latest)
Version: v0.8.1
License: MIT
```

## 📂 File Structure

```
/opt/invai/
├── server.js              # Main API server (~450 lines)
├── inventory.db           # SQLite database
├── package.json           # Dependencies
├── update.sh             # Auto-update script
│
├── routes/               # HTTP layer (13 modules)
│   ├── auth.js           # Authentication
│   ├── users.js          # User management
│   ├── products.js       # Product endpoints
│   ├── batches.js        # Batch endpoints
│   ├── categories.js     # Category endpoints
│   ├── suppliers.js      # Supplier endpoints
│   ├── dashboard.js      # Dashboard stats
│   ├── settings.js       # Settings/preferences
│   ├── reports.js        # Report generation
│   ├── inventory-helpers.js  # Inventory utilities
│   ├── backups.js        # Backup operations
│   ├── system.js         # System info/health
│   └── import-export.js  # CSV operations
│
├── controllers/          # Business logic layer
│   ├── productController.js
│   ├── batchController.js
│   ├── categoryController.js
│   ├── supplierController.js
│   ├── reportController.js
│   └── backupController.js
│
├── middleware/           # Request processing
│   ├── auth.js           # JWT authentication
│   ├── errorHandler.js   # Centralized errors
│   └── asyncHandler.js   # Async wrapper
│
├── utils/                # Utilities
│   ├── db.js             # Async DB wrapper
│   └── csv-helpers.js    # CSV utilities
│
├── lib/                  # Supporting libraries
│   ├── activity-logger.js
│   ├── cache-manager.js
│   └── csv-export.js
│
├── migrations/           # Database migrations
│   ├── migration-runner.js
│   └── migrations/
│
├── public/               # Frontend
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── core.js
│       ├── dashboard.js
│       ├── inventory.js
│       ├── reports.js
│       ├── settings.js
│       ├── filters.js
│       ├── scanner.js
│       └── charts.js
│
├── docs/                 # Documentation
│   └── archive/          # Historical docs
│
└── backups/              # Auto-backups (keep 10)
```

## 🏗️ Architecture (MVC Pattern)

```
┌─────────────────────────────────────┐
│         HTTP Request                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Route Layer (routes/*.js)          │
│  - Request validation               │
│  - Response formatting              │
│  - HTTP status codes                │
│  - Cache management                 │
│  - Error handling                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Controller Layer (controllers/*)   │
│  - Business logic                   │
│  - Database operations              │
│  - Activity logging                 │
│  - Data transformations             │
│  - Bulk operations                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Database Layer (utils/db.js)       │
│  - Async/await wrapper              │
│  - Query execution                  │
│  - Transaction support              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         SQLite Database             │
└─────────────────────────────────────┘
```

## 🔄 App Logic Flow

### Authentication Flow
```
┌─────────┐
│ Login   │
└────┬────┘
     │
     ▼
┌─────────────┐
│ JWT Token   │ (24h expiry)
│ + Role      │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ authFetch()  │ Auto-adds token
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ routes/      │ HTTP handling
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Auth Check   │ (middleware)
└──────┬───────┘
       │
   ✓───┴───✗
   │       │
   ▼       ▼
┌────┐  ┌────┐
│200 │  │401 │
└────┘  └────┘
```

### Inventory Logic
```
Product → Multiple Batches → FIFO/FEFO Sort → Use Oldest First
   │           │                  │
   │           │                  └─→ Expiry alerts
   │           └─→ Location tracking
   └─→ SKU, Barcode, Cost
```

### Request Flow Example
```
UI Event
  │
  ▼
core.js authFetch()
  │
  ▼
routes/products.js
  │ (validation)
  ▼
controllers/productController.js
  │ (business logic)
  ▼
utils/db.js
  │ (async wrapper)
  ▼
SQLite
  │
  ▼
Response → UI Update
```

### Backup System
```
┌──────────────┐
│ Manual/Auto  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Controller   │ BackupController.create()
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Create .db   │
│ snapshot     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Save to      │
│ /backups/    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Keep last 10 │ (auto-cleanup)
└──────────────┘
```

### Update Flow
```
┌─────────────┐
│ Run update  │ (bash update.sh)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Backup DB   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Git pull    │ (selected branch)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Migrations  │ (if any)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Restart     │ (systemctl)
└─────────────┘
```

## 🔧 systemctl Commands

```bash
# No sudo needed
systemctl status inventory-app     # Check status
systemctl start inventory-app      # Start
systemctl stop inventory-app       # Stop
systemctl restart inventory-app    # Restart
journalctl -u inventory-app -f     # Live logs
```

**Service Details:**
- Name: `inventory-app.service`
- User-level (no sudo)
- Auto-restart on crash
- Starts on boot

## 📍 Server Locations

```bash
App:       /opt/invai/
Database:  /opt/invai/inventory.db
Backups:   /opt/invai/backups/
Logs:      journalctl -u inventory-app
Service:   ~/.config/systemd/user/inventory-app.service
Update:    /opt/invai/update.sh
Port:      3000
URL:       http://192.168.1.8:3000
```

## 🔄 Git Workflow

### Development Cycle
```
1. Make changes locally
2. Test in browser (http://192.168.1.8:3000)
3. Commit to beta:
   git add .
   git commit -m "feat: description"
   git push origin beta

4. Test beta branch
5. Merge to main when stable:
   - Create PR: beta → main
   - Review changes
   - Merge PR

6. Update server:
   cd /opt/invai
   bash update.sh
```

### Commit Messages
```
feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructure
perf: Performance
test: Tests
chore: Maintenance
```

## 🤖 AI Agent Workflow

### Development Cycle with AI Assistant

```
1. PREPARE A PLAN
   - Analyze current codebase and requirements
   - Identify files that need changes
   - Propose implementation approach
   - List all affected files and changes
   - Get user approval before proceeding

2. SHOW THE DIFFERENCE
   - Display code changes (before/after)
   - Explain what each change does
   - Highlight important decisions
   - Show commit message preview
   - Confirm changes with user

3. COMMIT
   - Create/update files via GitHub API
   - Write proper conventional commit message
   - Push to beta branch
   - Verify commit on GitHub
   - Ready for testing
```

### Commit Message Format
```
<type>: <description>

<body explaining changes>

Files:
- NEW/UPDATE/DELETE: path/to/file (description)
- NEW/UPDATE/DELETE: path/to/file (description)
```

### Example AI Workflow
```
User: "Add password reset feature"

AI (Step 1 - Plan):
  ✓ Analyze auth system
  ✓ Propose: email token system
  ✓ Files needed:
    - routes/auth.js (add endpoints)
    - lib/email-sender.js (new)
    - public/js/auth.js (UI)

AI (Step 2 - Difference):
  📝 Show code snippets
  📝 Explain token generation
  📝 Show commit message

AI (Step 3 - Commit):
  ✅ Push to beta branch
  ✅ Provide GitHub commit URL
  ✅ Ready for systemctl restart
```

## 🛠️ Quick Fixes

### App won't start
```bash
systemctl status inventory-app
journalctl -u inventory-app -n 50
```

### Database locked
```bash
systemctl stop inventory-app
fuser /opt/invai/inventory.db  # Find process
systemctl start inventory-app
```

### Update failed
```bash
cd /opt/invai/backups
ls -lh  # Find latest backup
cp backup-YYYYMMDD-HHMMSS.db ../inventory.db
systemctl restart inventory-app
```

### Port already in use
```bash
lsof -i :3000
kill <PID>
systemctl start inventory-app
```

## 📊 Database Schema

```sql
products(id, name, inhouse_number, barcode, brand, category_id, supplier_id, 
         items_per_case, cost_per_case, reorder_point, notes, created_at, updated_at)

inventory_batches(id, product_id, case_quantity, total_quantity, expiry_date, 
                  location, received_date, notes)

categories(id, name, description, color, icon, sort_order)

suppliers(id, name, contact, email, phone, address, notes, is_active)

users(id, username, password_hash, role, created_at)

activity_log(id, entity_type, entity_id, action, username, details, timestamp)

preferences(id, key, value, user_id)
```

## 🔑 Key Features

- ✅ JWT Authentication
- ✅ Role-based access (admin/user)
- ✅ MVC Architecture (routes + controllers)
- ✅ Modular route structure
- ✅ FIFO/FEFO batch tracking
- ✅ Expiry alerts (expired/urgent/soon)
- ✅ Barcode scanning
- ✅ Auto-backups (keep 10)
- ✅ CSV import/export
- ✅ Reports & analytics
- ✅ Dark mode
- ✅ Keyboard shortcuts (Ctrl+K)
- ✅ systemctl service
- ✅ Auto-update script

## 📝 Code Pattern Examples

### Route Handler (HTTP layer)
```javascript
// routes/products.js
router.post('/', asyncHandler(async (req, res) => {
  // Validation
  if (!req.body.name) {
    return res.status(400).json({ error: 'Name required' });
  }
  
  // Call controller
  const product = await controller.createProduct(
    req.body, 
    req.user.username
  );
  
  // Cache management
  cache.invalidate('products:all');
  
  // Response
  res.status(201).json(product);
}));
```

### Controller (Business logic)
```javascript
// controllers/productController.js
class ProductController {
  async createProduct(data, username) {
    // Database operation
    const result = await this.db.run(
      'INSERT INTO products (...) VALUES (...)',
      [data.name, data.barcode, ...]
    );
    
    // Activity logging
    await this.activityLogger.log(
      'product', result.lastID, 'created', username
    );
    
    // Return enriched data
    return await this.getProductById(result.lastID);
  }
}
```

### Frontend API Call
```javascript
// public/js/inventory.js
const response = await authFetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
});

// authFetch() automatically:
// 1. Gets JWT from localStorage
// 2. Adds Authorization header
// 3. Handles 401 (redirect to login)
```

## 🎯 Module Responsibilities

### Backend
```
server.js              → App initialization, route registration
routes/*.js            → HTTP handling, validation, responses
controllers/*.js       → Business logic, database operations
middleware/auth.js     → JWT verification, role checks
utils/db.js            → Async database wrapper
lib/*.js               → Supporting services (cache, logging, CSV)
```

### Frontend
```
core.js       → Auth, API client, global utils
dashboard.js  → Stats, charts, alerts
inventory.js  → Products, batches, CRUD
reports.js    → Analytics, exports
settings.js   → Config, backups, updates
filters.js    → Categories, suppliers, search
scanner.js    → Barcode scanning
charts.js     → Data visualization
```

## 🔒 Protected Endpoints

```
Admin only:
- DELETE /api/products/:id
- DELETE /api/batches/:id
- POST /api/database/reset
- POST /api/backup/create
- DELETE /api/backup/delete/:filename
- POST /api/backup/restore/:filename
- POST /api/users (create users)
- DELETE /api/users/:id

Authenticated:
- All POST/PUT/DELETE operations
- All /api/* endpoints (except auth/login)

Public:
- POST /api/auth/login
- GET /health
- Static files (index.html, CSS, JS)
```

## 🚀 Recent Refactoring (v0.8.1)

### Groups 1-4 Complete:

**GROUP 1:** Documentation cleanup
- Created `/docs/archive/` for historical docs
- Removed empty stub files from root
- Deleted legacy `server.old.js`

**GROUP 2:** Route extraction
- Reduced `server.js` from 1,200+ lines to ~450 lines
- Created 5 new route modules (reports, inventory-helpers, backups, system, import-export)
- Created `utils/csv-helpers.js`

**GROUP 3:** Controller layer
- Created 6 controller classes
- Separated business logic from HTTP handling
- Standardized patterns across all entities

**GROUP 4:** Controller integration
- Updated all routes to use controllers
- Clean MVC separation achieved
- Improved testability and maintainability

---

**Last Updated:** January 2026 (v0.8.1 - Modular Architecture + AI Workflow)
**Repo:** [github.com/zv20/invai](https://github.com/zv20/invai)