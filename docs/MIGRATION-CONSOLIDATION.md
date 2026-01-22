# Migration Consolidation Guide - v0.8.0

## Overview

This guide explains the migration consolidation process that cleans up the migration structure from 4 files down to 3.

## What Changed

### Before (v0.7.8f)
```
migrations/
├── 001_baseline.js                      # Products table
├── 002_categories_suppliers.js          # Categories + Suppliers (no is_active)
├── 003_fix_supplier_active_status.js    # Emergency fix (adds is_active)
└── migration-runner.js                   # System
```

### After (v0.8.0)
```
migrations/
├── 001_baseline.js                           # Products table (unchanged)
├── 002_categories_suppliers_complete.js      # Categories + Suppliers WITH is_active
├── 004_consolidate_migrations.js             # Cleanup orchestrator
└── migration-runner.js                        # System
```

## How It Works

### For Existing Users (Upgrading from v0.7.8f)

1. **Update your app** (git pull)
   ```bash
   git pull origin beta
   npm start
   ```

2. **Migration 004 runs automatically**
   - Checks if `is_active` column exists ✅
   - Deletes old migration records (versions 2, 3)
   - Inserts consolidated migration record (version 2)
   - Your data remains unchanged

3. **Run cleanup script** (removes old files)
   ```bash
   node scripts/cleanup-migrations.js
   ```

4. **Result**: Clean migration structure, same working app

### For New Users (Fresh Install)

1. **Clone and install**
   ```bash
   git clone https://github.com/zv20/invai.git
   cd invai
   npm install
   npm start
   ```

2. **Migrations run automatically**
   - 001_baseline.js
   - 002_categories_suppliers_complete.js (with is_active)
   - 004_consolidate_migrations.js (no-op, nothing to consolidate)

3. **Result**: Clean database schema from the start

## Cleanup Script Details

### What It Does

1. ✅ Verifies migration 004 has run
2. 📦 Backs up old files to `migrations/.backup/`
3. 🗑️ Removes old migration files
4. 🔍 Verifies final structure

### Files Removed

- `002_categories_suppliers.js` (old version)
- `003_fix_supplier_active_status.js` (emergency fix)

### Files Kept

- `001_baseline.js` ✅
- `002_categories_suppliers_complete.js` ✅
- `004_consolidate_migrations.js` ✅
- `migration-runner.js` ✅

### Safety Features

- **Backup created**: Old files saved to `.backup/` directory
- **Verification check**: Won't run unless migration 004 completed
- **Non-destructive**: Your app keeps working if script fails
- **Idempotent**: Safe to run multiple times

## Running the Cleanup

### Manual Execution

```bash
node scripts/cleanup-migrations.js
```

### Add to package.json (Optional)

```json
{
  "scripts": {
    "cleanup-migrations": "node scripts/cleanup-migrations.js"
  }
}
```

Then run:
```bash
npm run cleanup-migrations
```

### Expected Output

```
🧹 Migration Cleanup Script v0.8.0
=====================================

✅ Migration 004 (consolidation) verified

📦 Backing up old migration files...
   ✅ Backed up: 002_categories_suppliers.js
   ✅ Backed up: 003_fix_supplier_active_status.js

🗑️  Removing old migration files...
   ✅ Removed: 002_categories_suppliers.js
   ✅ Removed: 003_fix_supplier_active_status.js

   Total files removed: 2

🔍 Verifying cleanup...

📁 Remaining migration files:
   - 001_baseline.js
   - 002_categories_suppliers_complete.js
   - 004_consolidate_migrations.js

✅ Migration cleanup complete!
   Your migrations directory is now clean.

==================================================

📊 Summary:
   - Old migrations backed up to: migrations/.backup/
   - Old migration files removed
   - Migration history consolidated in database
   - Clean migration structure: 001 + 002 + 004

🎉 Your app now has a clean migration structure!
   New installs will only see 3 migration files.
```

## Database Schema Verification

### Check Migration History

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

**Before Consolidation:**
```
version | name                          | applied_at
--------|-------------------------------|---------------------------
1       | baseline                      | 2026-01-20 12:00:00
2       | categories_suppliers_tables   | 2026-01-20 12:00:01
3       | fix_supplier_active_status    | 2026-01-22 16:00:00
```

**After Consolidation:**
```
version | name                              | applied_at
--------|-----------------------------------|---------------------------
1       | baseline                          | 2026-01-20 12:00:00
2       | categories_suppliers_complete     | 2026-01-22 16:30:00
4       | consolidate_migrations            | 2026-01-22 16:30:01
```

### Check Suppliers Table Schema

```sql
PRAGMA table_info(suppliers);
```

**Expected Output:**
```
cid | name         | type    | notnull | dflt_value | pk
----|--------------|---------|---------|------------|-
0   | id           | INTEGER | 0       |            | 1
1   | name         | TEXT    | 1       |            | 0
2   | contact_name | TEXT    | 0       |            | 0
3   | phone        | TEXT    | 0       |            | 0
4   | email        | TEXT    | 0       |            | 0
5   | address      | TEXT    | 0       |            | 0
6   | notes        | TEXT    | 0       |            | 0
7   | is_active    | INTEGER | 0       | 1          | 0  ← Must exist
8   | created_at   | DATETIME| 0       | CURRENT... | 0
9   | updated_at   | DATETIME| 0       | CURRENT... | 0
```

## Troubleshooting

### Error: Migration 004 has not run yet

**Solution:** Run your update/start command first:
```bash
npm start
```

Then run the cleanup script.

### Error: Could not open database

**Solution:** Make sure `inventory.db` exists in your project root:
```bash
ls -la inventory.db
```

If missing, start the app first to create it.

### Cleanup script fails but app still works

**Don't panic!** The cleanup script is non-critical:
- Your app continues working with old migration files
- You can manually delete old migration files
- Backups are in `migrations/.backup/`

### Want to restore old migrations?

```bash
cp migrations/.backup/*.js migrations/
```

## Benefits of Consolidation

### For Developers
- ✅ Cleaner codebase
- ✅ Easier to understand migration history
- ✅ Fewer files to maintain
- ✅ No emergency fix reminders

### For New Users
- ✅ Clean install experience
- ✅ Logical migration progression
- ✅ No confusing emergency fixes
- ✅ Proper schema from start

### For Existing Users
- ✅ Seamless upgrade
- ✅ No data loss
- ✅ No manual intervention
- ✅ Automatic cleanup option

## Next Steps

1. ✅ Update to latest beta branch
2. ✅ Let migration 004 run automatically
3. ✅ Run cleanup script
4. ✅ Verify clean migration structure
5. ✅ Continue developing!

## Version History

- **v0.7.8f**: Emergency fix (003) added for is_active
- **v0.8.0**: Migration consolidation system introduced
- **Future**: Clean 3-migration structure as baseline

---

**Last Updated:** January 22, 2026  
**Maintained by:** zv20  
**License:** MIT
