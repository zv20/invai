# AI Assistant Handoff - Inventory Management System

**Last Updated:** January 28, 2026  
**Current Version:** v0.10.6  
**Status:** Production-ready, running smoothly  
**Server Location:** `/opt/invai`

---

## 🎯 Quick Context

### What This Is
**InvAI** - Professional grocery inventory management system with:
- Real-time inventory tracking
- Batch/expiration management
- Analytics dashboard with charts
- Supplier & category management
- PWA support (installable web app)
- JWT authentication with role-based access
- Automated backups
- Dark mode

### Technology Stack
- **Backend:** Node.js + Express
- **Database:** SQLite (production), PostgreSQL (optional)
- **Frontend:** Vanilla JavaScript (no framework)
- **Security:** JWT, CSRF tokens, Helmet, rate limiting
- **Deployment:** Systemd service on Linux server

---

## 📍 Server Information

### Location
```bash
Server: US
Path: /opt/invai
URL: 
Branch: beta (testing channel)
```

### Service Management
```bash
# Service name:
sudo systemctl status inventory-app

# Or:
sudo systemctl status invai

# Common commands:
sudo systemctl restart inventory-app
sudo systemctl stop inventory-app
sudo systemctl start inventory-app
sudo journalctl -u inventory-app -n 50 -f
```

---

## 🚀 Common Commands

### Update from GitHub
```bash
cd /opt/invai
bash update.sh
# Automated update script that:
# - Checks for updates
# - Shows changelog
# - Creates backup
# - Pulls code
# - Restarts service
```

### Check Current State
```bash
cd /opt/invai

# Check version
grep '"version"' package.json
# Current: "version": "0.10.6"

# Check branch
git branch --show-current
# Should show: beta

# Check service status
systemctl status inventory-app

# Check logs
journalctl -u inventory-app -n 50
```

### Manual Git Operations
```bash
cd /opt/invai

# Pull latest
git fetch origin beta
git pull origin beta

# Check status
git status

# View recent commits
git log --oneline -10
```

### Version Management
```bash
# Version is in ONE place:
nano package.json
# Change "version": "0.10.7"

# Commit and push:
git add package.json
git commit -m "Bump version to 0.10.7"
git push origin beta

# On server:
bash update.sh

# Console and UI automatically show new version
```

---

## ✅ What's Working Well

### Recently Fixed (January 28, 2026)
1. ✅ **CSP Compliance** - No Content Security Policy violations
2. ✅ **Rate Limiting** - Fixed excessive rate limit errors (PR #32)
3. ✅ **Backup System** - Delete button works (PR #34)
4. ✅ **Dynamic Versioning** - Loads from package.json (PR #37)
5. ✅ **PWA Icons** - Fixed with .gitattributes (PR #39)
6. ✅ **Update Script** - Fully tested and working (PR #36)

### Current Status
- ✅ Console: Clean, no errors
- ✅ Authentication: JWT working properly
- ✅ Service: Running stable
- ✅ Updates: Automated via update.sh
- ✅ Backups: Automatic during updates

---

## 🔧 Configuration Files

### Environment Variables
```bash
# Location: .env (not in Git, server only)
NODE_ENV=production
PORT=3000
JWT_SECRET=[auto-generated]
JWT_EXPIRY=7d
CSRF_SECRET=[auto-generated]

# Check JWT status:
npm run jwt:status

# Generate new JWT secret:
npm run jwt:generate
```

### Important Files
```bash
/opt/invai/
├── server.js                 # Main server
├── package.json             # Version, dependencies
├── .env                     # Secrets (not in Git)
├── update.sh                # Update script
├── inventory.db             # SQLite database (if exists)
├── backups/                 # Automatic backups
├── logs/                    # Application logs
├── public/                  # Frontend files
├── routes/                  # API endpoints
├── lib/                     # Business logic
├── middleware/              # Express middleware
└── scripts/                 # Utility scripts
```

---

## 📝 Recent Work (Last Session)

### PRs Merged Today
1. **PR #32** - Fixed rate limiting + caching
2. **PR #34** - Fixed backup delete button CSP violation
3. **PR #36** - Tested update script workflow
4. **PR #37** - Dynamic version loading from package.json
5. **PR #39** - Fixed PWA icons with .gitattributes

### PRs Pending Review
- **PR #40** - Cleanup audit (identifies unused files)
  - Lists 14 files to delete
  - Lists 9 files to archive
  - Lists 4 scripts to review
  - Provides step-by-step cleanup commands

### Version Changes
- Started at: v0.10.5
- Ended at: v0.10.6
- Method: Manual edit of package.json

---

## 🐛 Known Issues

### None Currently! 🎉

All major issues from today were resolved:
- ❌ ~~CSP violations~~ → ✅ Fixed
- ❌ ~~Rate limiting errors~~ → ✅ Fixed  
- ❌ ~~Hardcoded versions~~ → ✅ Fixed
- ❌ ~~PWA icon errors~~ → ✅ Fixed

---

## 🎯 Potential Next Steps

### Cleanup (PR #40)
Review and execute cleanup audit:
```bash
# See: CLEANUP_AUDIT_2026.md
# Removes ~20 unused files
# Archives ~9 historical docs
```

### Testing
```bash
# Run tests:
npm test
npm run test:coverage

# Create test user:
npm run test:setup
```

### Backup Management
```bash
# Create manual backup:
npm run backup:create

# List backups:
npm run backup:list

# Restore backup:
npm run backup:restore
```

---

## 🔐 Security

### Authentication
- JWT tokens (7-day expiry)
- HTTP-only secure cookies
- CSRF protection on state-changing requests
- Rate limiting (read: 200/15min, write: 50/15min)

### Security Headers
```javascript
// Helmet.js configured:
- CSP: fully compliant (no inline scripts/styles)
- HSTS: enabled
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
```

### Security Scripts
```bash
# Check JWT status:
npm run jwt:status

# Rotate JWT secret:
npm run jwt:rotate

# Reset admin password:
node scripts/reset-admin-password.js
```

---

## 📊 Monitoring

### Check Application Health
```bash
# Service status:
systemctl status inventory-app

# Live logs:
journalctl -u inventory-app -f

# Recent errors:
journalctl -u inventory-app -p err -n 50

# Check port:
ss -tlnp | grep 3000

# Test endpoint:
curl http://localhost:3000/health
```

### Performance
```bash
# Check memory:
ps aux | grep node

# Check disk:
df -h /opt/invai

# Check database size:
du -h /opt/invai/inventory.db

# Check backup sizes:
du -sh /opt/invai/backups/*
```

---

## 🤝 Working with the User

### User Preferences
- Prefers **simple solutions** over complex ones
- Wants to avoid **unnecessary dependencies**
- Likes **step-by-step explanations**
- Appreciates **testing before applying changes**
- Runs as **root user** (sudo commands not needed)

### Communication Style
- Provide **clear, concise answers**
- Show **exact commands** to run
- Explain **why**, not just how
- **Test thoroughly** before suggesting changes
- Create **PRs** for review, don't push directly

### GitHub Workflow
1. Create branch for changes
2. Make commits with clear messages
3. Create PR with detailed description
4. User reviews and merges
5. User runs `bash update.sh` on server
6. Verify changes in browser console

---

## 📚 Key Documentation

### In Repository
- `README.md` - Main documentation
- `CHANGELOG.md` - Version history
- `CLEANUP_AUDIT_2026.md` - Cleanup recommendations
- `SECURITY_PATCHES.md` - Security updates log
- `TESTING_FULL.md` - Testing guide
- `docs/PWA_SETUP.md` - PWA configuration
- `docs/POSTGRESQL_SETUP.md` - PostgreSQL migration

### Update Channels
- **beta** branch - Testing (what user runs)
- **main** branch - Stable (not currently used)
- User is on beta channel by choice

---

## 🎨 Frontend Notes

### Architecture
- Vanilla JavaScript (no framework)
- Modular file structure
- CSP-compliant (no inline scripts/styles)
- Event delegation pattern
- Client-side caching (5-min for categories/suppliers)

### Key Files
```bash
public/
├── index.html              # Main app
├── login.html              # Login page
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── core.js            # Main app logic
│   ├── dashboard.js       # Dashboard widgets
│   ├── categories-manager.js
│   ├── suppliers-manager.js
│   ├── backup-manager.js
│   ├── settings.js
│   └── [more modules]
└── icons/                 # PWA icons
```

### Console Version Display
```javascript
// Version loaded dynamically:
🚀 Starting Grocery Inventory App...
✓ Version loaded: v0.10.6
✓ Grocery Inventory App v0.10.6 initialized
```

---

## 🆘 Troubleshooting

### Service Won't Start
```bash
# Check logs:
journalctl -u inventory-app -n 100

# Check syntax:
node -c server.js

# Check port:
ss -tlnp | grep 3000

# Restart:
sudo systemctl restart inventory-app
```

### Update Script Fails
```bash
# Check Git status:
git status

# Reset if needed:
git fetch origin beta
git reset --hard origin/beta

# Re-run update:
bash update.sh
```

### Database Issues
```bash
# Check database:
ls -lh inventory.db

# Backup exists:
ls -lh backups/

# Restore if needed:
npm run backup:restore
```

### Browser Issues
```bash
# Hard refresh:
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Clear cache:
# Browser DevTools → Application → Clear Storage

# Check console:
# F12 → Console tab
```

---

## ✨ Summary for Next AI Assistant

**You're taking over a production inventory management system that's:**
- ✅ Running smoothly on a Linux server
- ✅ Recently cleaned up and optimized
- ✅ Has automated updates (`bash update.sh`)
- ✅ Version v0.10.6 (beta channel)
- ✅ No critical issues

**User is technical and prefers:**
- Simple, practical solutions
- Testing before applying
- Clear explanations
- PR-based workflow

**If user asks for help, start by checking:**
1. Current status: `systemctl status inventory-app`
2. Recent logs: `journalctl -u inventory-app -n 50`
3. Browser console (F12) for frontend issues
4. This handoff document for context

**Common user requests:**
- Fix bugs (create PR with fix)
- Add features (create PR with implementation)
- Check status (show commands + output)
- Update app (`bash update.sh`)
- Review/cleanup code (like PR #40)

**The app is in good shape - help maintain and improve it!** 🚀

---

## 📞 Quick Reference Commands

```bash
# Navigate to app
cd /opt/invai

# Check everything
systemctl status inventory-app && \
grep version package.json && \
git status && \
journalctl -u inventory-app -n 10

# Update from GitHub
bash update.sh

# Restart service
systemctl restart inventory-app

# View logs
journalctl -u inventory-app -f

# Check version
node -p "require('./package.json').version"

# Create backup
npm run backup:create

# Run tests
npm test
```

---

**Good luck! The app is solid and the user is great to work with.** 👍
