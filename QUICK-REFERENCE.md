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
├── server.js           # Main API server
├── inventory.db        # SQLite database
├── package.json        # Dependencies
├── update.sh          # Auto-update script
├── public/
│   ├── index.html     # Main UI
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── core.js         # Auth, API client
│       ├── dashboard.js    # Stats
│       ├── inventory.js    # Product/batch mgmt
│       ├── reports.js      # Analytics
│       ├── settings.js     # Config
│       ├── filters.js      # Category/supplier
│       ├── scanner.js      # Barcode
│       └── charts.js       # Visualizations
└── backups/           # Auto-backups
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
│ API Endpoint │
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
 [200]   [401]
```

### Inventory Logic
```
Product → Multiple Batches → FIFO/FEFO Sort → Use Oldest First
   │           │                  │
   │           │                  └─→ Expiry alerts
   │           └─→ Location tracking
   └─→ SKU, Barcode, Cost
```

### Data Flow
```
UI Event → core.js authFetch() → Server API → SQLite → Response → UI Update
   │                                │
   └─→ JWT token attached           └─→ Auth check
```

### Backup System
```
┌──────────────┐
│ Manual/Auto  │
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
products(id, name, sku, barcode, brand, category_id, supplier_id, ...)
batches(id, product_id, expiry, quantity_cases, quantity_items, location, ...)
categories(id, name, color, description)
suppliers(id, name, contact_name, phone, email, address, active)
activity_log(id, action, entity_type, entity_id, details, timestamp)
preferences(id, user_id, key, value)
```

## 🔑 Key Features

- ✅ JWT Authentication
- ✅ Role-based access (admin/user/viewer)
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

## 📝 API Pattern

```javascript
// Frontend (any module)
const response = await authFetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// authFetch() automatically:
// 1. Gets JWT from localStorage
// 2. Adds Authorization header
// 3. Handles 401 (redirect to login)
```

## 🎯 Module Responsibilities

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
- DELETE /api/backup/delete/:filename

Authenticated:
- All POST/PUT/DELETE operations
- All /api/* endpoints

Public:
- POST /api/auth/login
- Static files (index.html, CSS, JS)
```

---

**Last Updated:** January 2026 (v0.8.1)
**Repo:** [github.com/zv20/invai](https://github.com/zv20/invai)