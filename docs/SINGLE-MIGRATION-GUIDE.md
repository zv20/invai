# Single Migration Baseline - v0.8.0

## Overview

Your app now uses a **single baseline migration** structure. This is the cleanest possible setup.

## Migration Structure

### Final State
```
migrations/
├── 001_complete_baseline.js  # THE ONLY MIGRATION (all tables)
└── migration-runner.js       # System
```

### What 001_complete_baseline.js Includes

- ✅ Products table
- ✅ Categories table (with color, icon, display_order)
- ✅ Suppliers table (with is_active column)
- ✅ All relationships (category_id, supplier_id)
- ✅ Data migration from old text columns

## Update Process

### For Existing Users (One-Time)

```bash
cd /opt/invai
git pull origin beta
npm start
```

**What happens automatically:**

1. Migration 005 (final_consolidation) runs
2. Database history rewritten to single baseline
3. Auto-cleanup removes old migration files
4. App starts with clean structure

**Result:** Only `001_complete_baseline.js` remains!

### For New Users

```bash
git clone https://github.com/zv20/invai.git
cd invai
npm install
npm start
```

**What happens:**
- Migration 001 runs (creates all tables)
- App ready to use
- Clean, simple, professional

## Database State

### Migration History

```sql
SELECT * FROM schema_migrations;
```

**Result:**
```
version | name              | applied_at
--------|-------------------|---------------------------
1       | complete_baseline | 2026-01-22 16:45:00
```

That's it! Just one record. ✨

### Schema Verification

```sql
-- Check all tables exist
SELECT name FROM sqlite_master WHERE type='table';

-- Verify suppliers has is_active
PRAGMA table_info(suppliers);
```

## Future Migrations

### Adding New Features

When you need to add a new feature:

1. **Create migration file**
   ```bash
   # migrations/002_your_new_feature.js
   module.exports = {
     version: 2,
     name: 'your_new_feature',
     description: 'Add awesome new feature',
     async up(db) { /* your changes */ },
     async down(db) { /* rollback */ }
   };
   ```

2. **Push to beta**
   ```bash
   git add migrations/002_your_new_feature.js
   git commit -m "feat: Add awesome new feature"
   git push origin beta
   ```

3. **Users update**
   ```bash
   git pull origin beta
   npm start  # Migration 002 runs automatically
   ```

4. **Keep it clean** (optional)
   ```bash
   npm run cleanup  # Removes old migrations, keeps baseline + latest
   ```

### Auto-Cleanup Feature

The cleanup script can run automatically after migrations:

```javascript
// In server.js (already configured)
const autoCleanup = require('./scripts/auto-cleanup');

async function initializeDatabase() {
  await runMigrations(db);
  await autoCleanup.runIfNeeded();  // ← Automatic!
}
```

**Benefits:**
- Users don't need to remember to cleanup
- Always maintains clean structure
- Non-intrusive (runs silently)

### Migration Numbering

From now on:
- **001**: Complete baseline (permanent)
- **002**: Your next feature
- **003**: Another feature
- And so on...

Each new migration is just **one file**. Simple!

## Manual Cleanup

If you ever need to manually cleanup:

```bash
# Dry run (see what would be deleted)
node scripts/cleanup-migrations.js --dry-run

# Actually cleanup
node scripts/cleanup-migrations.js

# Or via npm
npm run cleanup
```

## Backup Location

Old migration files are backed up to:
```
migrations/.backup/
├── 002_categories_suppliers.js
├── 002_categories_suppliers_complete.js
├── 003_fix_supplier_active_status.js
├── 004_consolidate_migrations.js
└── 005_final_consolidation.js
```

You can safely delete this folder if you don't need the history.

## Benefits

### For Development
- ✅ **One file** to understand the schema
- ✅ Clean git history
- ✅ Easy to onboard new developers
- ✅ No confusing migration chains

### For Deployment
- ✅ Fast startup (one migration runs)
- ✅ Predictable database state
- ✅ Easy to backup/restore
- ✅ Simple troubleshooting

### For Maintenance
- ✅ Clear schema documentation
- ✅ No legacy migrations to maintain
- ✅ Future migrations are additive
- ✅ Clean, professional codebase

## Troubleshooting

### Migration 005 stuck or failed

```bash
# Check migration status
sqlite3 inventory.db "SELECT * FROM schema_migrations;"

# If stuck, manually run cleanup
node scripts/cleanup-migrations.js
```

### Want to see old migrations

```bash
ls -la migrations/.backup/
```

### Schema looks wrong

```sql
-- Verify all tables
SELECT name FROM sqlite_master WHERE type='table';

-- Check suppliers has is_active
PRAGMA table_info(suppliers);

-- Expected: id, name, contact_name, phone, email, address, notes, is_active, created_at, updated_at
```

### Need to restore old migrations

Don't! Your schema is already correct. The old migrations are just different paths to the same result.

## Version History

- **v0.7.0**: Initial migration system
- **v0.7.4**: Categories feature
- **v0.7.8f**: Supplier is_active + emergency fixes
- **v0.8.0**: **Single baseline consolidation** ← You are here

## What's Next?

Your migration system is now **production-ready** and **maintainable**:

1. ✅ Single baseline migration
2. ✅ Auto-cleanup system
3. ✅ Future migrations start at version 2
4. ✅ Professional, clean structure

Start building features! 🚀

---

**Last Updated:** January 22, 2026  
**Maintained by:** zv20  
**License:** MIT
