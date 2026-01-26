# Repository Structure Guide

**Last Updated:** January 25, 2026  
**Version:** v0.9.0  

---

## 📁 Directory Organization

### Root Level
```
invai/
├── 📄 README.md                    # Main project documentation
├── 📄 ROADMAP.md                   # Development roadmap
├── 📄 CHANGELOG.md                 # Version history
├── 📄 package.json                 # Node dependencies
├── 📄 server.js                    # Express server entry point
├── 🔧 .env.example                 # Environment variables template
├── 🔧 .gitignore                   # Git ignore rules
└── 📁 [Directories listed below]
```

### Server & Configuration
```
config/                             # Configuration files
├── config.js                       # App configuration
├── database.js                     # Database setup
└── auth.js                         # Authentication config

middleware/                         # Express middleware
├── auth.js                         # Authentication middleware
├── errorHandler.js                 # Error handling
├── validation.js                   # Input validation
└── logging.js                      # Request logging

routes/                             # API routes
├── index.js                        # Route aggregator
├── auth.js                         # Auth endpoints
├── products.js                     # Product endpoints
├── batches.js                      # Batch endpoints
├── reports.js                      # Report endpoints
├── predictions.js                  # Prediction endpoints
├── users.js                        # User endpoints
└── settings.js                     # Settings endpoints

controllers/                        # Business logic
├── productController.js
├── batchController.js
├── reportController.js
├── predictionController.js
├── userController.js
└── authController.js

utils/                              # Utility functions
├── database.js                     # Database utilities
├── validation.js                   # Validation functions
├── pdf.js                          # PDF generation
├── export.js                       # Export utilities
├── crypto.js                       # Encryption utilities
└── helpers.js                      # General helpers
```

### Frontend - Public Directory
```
public/                             # Frontend static files
├── index.html                      # Main dashboard (UPDATED v0.9.0)
├── login.html                      # Login page (UPDATED v0.9.0)
├── register.html                   # Registration page (UPDATED v0.9.0)
├── users.html                      # User management (UPDATED v0.9.0)
├── predictions.html                # Predictions (UPDATED v0.9.0)
├── advanced-search.html            # Search (UPDATED v0.9.0)
├── dashboard-builder.html          # Dashboard builder (UPDATED v0.9.0)
├── offline.html                    # Offline fallback (NEW v0.9.0)
│
├── manifest.json                   # PWA manifest (NEW v0.9.0)
├── sw.js                           # Service worker (NEW v0.9.0)
├── favicon.ico                     # Browser icon (NEW v0.9.0)
│
├── css/                            # Stylesheets
│   ├── style.css                   # Main styles
│   ├── dark-mode.css               # Dark mode styles
│   ├── charts.css                  # Chart styles
│   └── mobile.css                  # Mobile styles (NEW v0.9.0)
│
├── js/                             # JavaScript files
│   ├── core.js                     # Core functions
│   ├── api.js                      # API client
│   ├── auth.js                     # Auth functions
│   ├── utils.js                    # Utilities
│   ├── dashboard.js                # Dashboard logic
│   ├── products.js                 # Product management
│   ├── batches.js                  # Batch management
│   ├── reports.js                  # Report generation
│   ├── predictions.js              # Predictions logic
│   ├── pwa-init.js                 # PWA initialization (NEW v0.9.0)
│   ├── pwa-install.js              # PWA install handler (NEW v0.9.0)
│   ├── touch-gestures.js           # Touch gestures (NEW v0.9.0)
│   ├── mobile-components.js        # Mobile components (NEW v0.9.0)
│   ├── mobile-navigation.js        # Mobile nav (NEW v0.9.0)
│   ├── barcode-scanner.js          # Barcode scanner (NEW v0.9.0)
│   └── camera-capture.js           # Camera capture (NEW v0.9.0)
│
├── lib/                            # Third-party libraries
│   └── pwa/
│       └── offlineStorage.js       # Offline storage (NEW v0.9.0)
│
└── icons/                          # App icons (NEW v0.9.0)
    ├── icon-192x192.png            # Mobile icon
    ├── icon-512x512.png            # Splash icon
    ├── icon.svg                    # Vector icon
    └── favicon.ico                 # Browser icon
```

### Database & Migrations
```
migrations/                         # Database migrations
├── 001_create_tables.js            # Initial schema
├── 002_add_audit_log.js            # Audit logging
├── 003_add_predictions.js          # ML features
├── 004_add_multi_store.js          # Multi-location
├── 005_add_indexes.js              # Performance
└── [More migrations as needed]
```

### Documentation
```
docs/                               # Documentation directory
├── TESTING.md                      # Testing guide (UPDATED v0.9.0)
├── BUG_TRACKER.md                  # Bug tracking (NEW v0.9.0)
├── RELEASE_NOTES_v0.9.0.md         # Release notes (NEW v0.9.0)
├── API.md                          # API documentation
├── ARCHITECTURE.md                 # System architecture
├── SECURITY.md                     # Security guide
├── DEPLOYMENT.md                   # Deployment guide
└── TROUBLESHOOTING.md              # Troubleshooting guide
```

### Scripts & Deployment
```
scripts/                            # Utility scripts
├── backup.js                       # Database backup
├── restore.js                      # Database restore
├── migrate.js                      # Migration runner
├── seed.js                         # Database seeding
└── cleanup.js                      # Cleanup utilities

Docker files:
├── Dockerfile                      # Docker container
└── docker-compose.yml              # Docker compose

Setup scripts:
├── setup.sh                        # Initial setup
├── update.sh                       # Update script
├── system-update-wrapper.sh        # System updates
└── SYSTEMCTL_SETUP.md              # Service setup
```

### Testing
```
tests/                              # Test files
├── unit/                           # Unit tests
├── integration/                    # Integration tests
├── e2e/                            # End-to-end tests
└── fixtures/                       # Test data
```

---

## 📊 File Classification

### Core Application Files (Required)
- ✅ `server.js` - Application entry point
- ✅ `config/` - Configuration
- ✅ `routes/` - API endpoints
- ✅ `controllers/` - Business logic
- ✅ `public/` - Frontend files
- ✅ `package.json` - Dependencies

### Database Files (Required)
- ✅ `migrations/` - Schema management
- ✅ `config/database.js` - Connection setup
- ✅ `.db files` - SQLite databases (gitignored)

### Documentation (Important)
- ✅ `README.md` - Project overview
- ✅ `ROADMAP.md` - Development path
- ✅ `CHANGELOG.md` - Version history
- ✅ `docs/` - Detailed documentation

### Development Files (Supporting)
- ✅ `scripts/` - Utility scripts
- ✅ `tests/` - Test files
- ✅ `.env.example` - Environment template

---

## 🗂️ Frontend File Organization

### HTML Pages (7 Total)
| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main dashboard | ✅ v0.9.0 |
| `login.html` | User login | ✅ v0.9.0 |
| `register.html` | User registration | ✅ v0.9.0 |
| `users.html` | User management | ✅ v0.9.0 |
| `predictions.html` | ML predictions | ✅ v0.9.0 |
| `advanced-search.html` | Advanced search | ✅ v0.9.0 |
| `dashboard-builder.html` | Dashboard customization | ✅ v0.9.0 |

### CSS Files
| File | Purpose | Status |
|------|---------|--------|
| `style.css` | Main styles | ✅ Updated |
| `dark-mode.css` | Dark theme | ✅ Updated |
| `charts.css` | Chart styles | ✅ Current |
| `mobile.css` | Mobile styles | ✅ NEW v0.9.0 |

### JavaScript Organization
| Category | Files | Purpose |
|----------|-------|----------|
| **Core** | `core.js`, `api.js`, `auth.js`, `utils.js` | Application foundation |
| **Features** | `products.js`, `batches.js`, `reports.js`, `predictions.js` | Feature modules |
| **PWA** | `pwa-init.js`, `pwa-install.js` | Progressive web app |
| **Mobile** | `touch-gestures.js`, `mobile-components.js`, `mobile-navigation.js` | Mobile support |
| **Features** | `barcode-scanner.js`, `camera-capture.js` | Advanced features |
| **Utilities** | `offlineStorage.js` | Offline support |

---

## 🔄 File Dependencies

```
HTML Pages
    ↓
    ├─ css/ (styling)
    └─ js/ (functionality)
         ├─ core.js (foundation)
         ├─ api.js (backend communication)
         ├─ Feature modules (products, reports, etc.)
         ├─ PWA modules (offline support)
         ├─ Mobile modules (touch, gestures)
         └─ libraries/ (third-party)

Backend (server.js)
    ↓
    ├─ config/ (setup)
    ├─ middleware/ (processing)
    ├─ routes/ (endpoints)
    └─ controllers/ (logic)
         ├─ Database access
         ├─ Business logic
         └─ External services
```

---

## 📝 Important File Purposes

### server.js
- Express application setup
- Middleware configuration
- Route registration
- Error handling
- Server startup

### package.json
- Node dependencies
- NPM scripts
- Project metadata
- Version information

### config/database.js
- SQLite connection
- Connection pooling
- Database initialization

### public/sw.js
- Service worker
- Offline caching
- Background sync
- PWA lifecycle

### migrations/
- Database schema changes
- Data structure evolution
- Version-specific updates

---

## 🚀 Running the Application

**Development:**
```bash
npm install           # Install dependencies
npm run dev           # Start development server
```

**Production:**
```bash
npm run build         # Build for production
npm start             # Start production server
```

**Database:**
```bash
npm run migrate       # Run migrations
npm run seed          # Seed test data
npm run backup        # Backup database
```

---

## 🗑️ Cleanup Notes

**Archive Files (Deprecated):**
- These are kept for reference but not actively used:
  - `EXECUTION_PLAN.md` - Old execution plan
  - `SPRINT_1_PLAN.md` - Sprint 1 planning
  - `QUICK-REFERENCE.md` - Old reference
  - `QUICKSTART_SECURITY.md` - Old security guide
  - `SECURITY_UPDATE_v0.8.1.md` - Old security update
  - `UPGRADE_TO_v0.8.0.md` - Old upgrade guide

**Index:**
Keep organized in `docs/archived/` for historical reference

---

## ✅ Best Practices

1. **Don't modify:** `package-lock.json` (auto-generated)
2. **Don't commit:** `.env`, `node_modules/`, `*.db` (in .gitignore)
3. **Always update:** `CHANGELOG.md` when adding features
4. **Keep organized:** New files in appropriate directories
5. **Document:** Add comments to complex functions
6. **Test:** Write tests for new features

---

**Repository Size:** ~50MB (with node_modules)  
**Source Code Only:** ~5MB  
**Core Application:** ~1MB  
