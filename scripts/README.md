# InvAI Scripts Directory

Organized collection of maintenance, fix, and installation scripts for the InvAI inventory management system.

---

## 📁 Directory Structure

```
scripts/
├── fixes/              # One-time database fix scripts
└── install/            # Installation and setup scripts
```

---

## 🔧 Fixes Scripts (`/fixes/`)

One-time scripts to fix database issues from problematic migrations or edge cases.

### `fix_suppliers_table.js`

**Purpose**: Creates missing suppliers table for users affected by old Migration 002

**When to use**:
- Updated to v0.7.7 but suppliers table is missing
- Old `002_categories.js` migration ran instead of correct `002_categories_suppliers.js`
- Supplier management features showing errors

**Usage**:
```bash
cd /opt/invai
node scripts/fixes/fix_suppliers_table.js
sudo systemctl restart invai
```

**What it does**:
1. Creates suppliers table with proper schema
2. Adds `supplier_id` column to products table
3. Migrates existing supplier names from products to suppliers table
4. Links products to suppliers via foreign key

**Safe to run multiple times**: Yes (uses `IF NOT EXISTS` and `INSERT OR IGNORE`)

---

## 🛠️ Install Scripts (`/install/`)

Scripts to install system components or add features to your InvAI installation.

### `install-system-update.sh`

**Purpose**: Replaces system-wide `update` command with channel-aware version

**When to use**:
- First time setting up InvAI
- After switching to beta channel
- If `update` command pulls from wrong branch

**Usage**:
```bash
cd /opt/invai
sudo bash scripts/install/install-system-update.sh
```

**What it does**:
1. Backs up old `/usr/local/bin/update-inventory` script
2. Installs improved `system-update-wrapper.sh` as system command
3. New script respects `.update-channel` file
4. Falls back to auto-detecting git branch if channel file missing

**Requirements**: Must run as root (sudo)

---

### `install-update-endpoint.sh`

**Purpose**: Adds `/api/system/update` endpoint to server.js for web-based updates

**Status**: ⚠️ **Planned Feature** - API endpoint code exists but UI is not yet implemented

**When to use**:
- When web-based "Update Now" button is added to Settings UI (future version)

**Usage**:
```bash
cd /opt/invai
bash scripts/install/install-update-endpoint.sh
sudo systemctl restart invai
```

**What it does**:
1. Backs up server.js
2. Injects `/api/system/update` endpoint after channel-switching endpoint
3. Enables one-click updates from web interface (when UI is built)

**Requirements**: Run from invai root directory

---

## 📋 Best Practices

### Before Running Any Script

1. **Backup your database**:
   ```bash
   cp /opt/invai/inventory.db /opt/invai/inventory.db.backup-$(date +%Y%m%d)
   ```

2. **Read the script**: Understand what it does
   ```bash
   cat scripts/fixes/fix_suppliers_table.js
   ```

3. **Check current state**: Verify the issue exists
   ```bash
   sqlite3 /opt/invai/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers';"
   ```

### After Running Fix Scripts

1. **Restart the service**:
   ```bash
   sudo systemctl restart invai
   ```

2. **Check logs** for errors:
   ```bash
   journalctl -u invai -n 50 --no-pager
   ```

3. **Verify in web UI**: Test the fixed functionality

---

## ⚠️ Troubleshooting

### Script Won't Run

**Make executable**:
```bash
chmod +x scripts/install/install-system-update.sh
```

### "Permission Denied" Errors

Install scripts need root:
```bash
sudo bash scripts/install/install-system-update.sh
```

### Database Lock Errors

Stop the service first:
```bash
sudo systemctl stop invai
node scripts/fixes/fix_suppliers_table.js
sudo systemctl start invai
```

### Script Fails Midway

1. Restore from backup:
   ```bash
   cp inventory.db.backup-YYYYMMDD inventory.db
   ```

2. Check error messages in terminal
3. Report issue on GitHub with full error output

---

## 🆘 Getting Help

If scripts don't work as expected:

1. **Check the logs**: `journalctl -u invai -n 100`
2. **Verify database schema**: `sqlite3 inventory.db ".schema"`
3. **Check git branch**: `git branch --show-current`
4. **Open GitHub issue**: [github.com/zv20/invai/issues](https://github.com/zv20/invai/issues)

---

**Last Updated**: January 22, 2026  
**InvAI Version**: v0.7.7+
