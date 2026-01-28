# Repository Cleanup Audit - January 2026

## 🎯 Purpose
Identify and remove unused, outdated, or redundant files to keep the repository clean and maintainable.

---

## 🗑️ Safe to Delete - High Confidence

### Test/Temporary Files
```bash
# Delete these immediately:
rm UPDATE_TEST.md                    # Was just for testing update script (PR #36)
rm .update-channel                   # Server-specific, shouldn't be in Git
rm .gitkeep_migrations_deleted      # Placeholder file, no longer needed
```

**Reason:** These are temporary test files or server-specific configs that don't belong in the repository.

---

## 📋 Safe to Delete - Documentation Consolidation

### Old Planning/Execution Documents (Completed)
```bash
# These were planning docs - work is done:
rm EXECUTION_PLAN.md                # Old execution plan
rm SPRINT_1_PLAN.md                 # Sprint 1 is complete
rm HANDOFF_PROMPT.md                # Old AI assistant handoff doc
```

### Outdated Upgrade Guides
```bash
# Very old version upgrade guides:
rm UPGRADE_TO_v0.8.0.md             # 3 versions old (current: v0.10.6)
rm SECURITY_UPDATE_v0.8.1.md        # 2 versions old
rm docs/RELEASE_NOTES_v0.9.0.md     # 1 version old
rm docs/v0.8.0_SERVER_PATCH.md      # Old patch notes
```

**Reason:** Outdated version docs. Current version is v0.10.6. Keep only CHANGELOG.md for history.

### Duplicate/Redundant Documentation
```bash
# Duplicates or superseded:
rm QUICK-REFERENCE.md               # Redundant with README.md
rm REPO_STRUCTURE.md                # Can be generated if needed
rm CLEANUP_LOG.md                   # Historical, move to docs/archive/
```

---

## 📦 Move to Archive (Don't Delete)

### Sprint Documentation (Historical Value)
```bash
# Move to docs/archive/:
mv docs/SPRINT_3_SECURITY.md docs/archive/
mv docs/SPRINT_5_COMPLETE.md docs/archive/
mv docs/SPRINT_5_PROGRESS.md docs/archive/
mv docs/SPRINT_6_INTEGRATION.md docs/archive/
mv docs/SPRINT_6_INTEGRATION_CHECKLIST.md docs/archive/
mv docs/SPRINT_6_QUICK_START.md docs/archive/
mv docs/PHASE_1_SESSION_MANAGEMENT_STATUS.md docs/archive/
mv docs/PHASE_3_USER_MANAGEMENT.md docs/archive/
mv docs/SERVER_INTEGRATION_PATCH.md docs/archive/
```

**Reason:** Historical documentation worth keeping for reference, but not actively used.

---

## ⚠️ Review Before Deleting

### Scripts That May Be Unused
```bash
# Check if these are still used:
scripts/generate-pwa-icons.sh      # Added in PR #38 but .gitattributes fixed it
scripts/apply-security-update.js   # One-time security patch script?
scripts/cleanup-migrations.js      # Migrations already consolidated
scripts/update-html-pwa.js         # One-time PWA update script?
```

**Action Required:** Check if these scripts are called by any active processes before deleting.

---

## ✅ Keep - Essential Files

### Documentation (Keep)
- **README.md** - Main docs ✅
- **CHANGELOG.md** - Version history ✅
- **ROADMAP.md** - Future plans ✅
- **BUG_REPORTING.md** - Bug process ✅
- **SECURITY_PATCHES.md** - Security history ✅
- **SECURITY_TESTING.md** - Security testing ✅
- **TESTING_FULL.md** - Testing guide ✅
- **SYSTEMCTL_SETUP.md** - Deployment guide ✅
- **QUICKSTART_SECURITY.md** - Security setup ✅

### Scripts (Keep)
- **create-test-user.js** - Testing ✅
- **generate-jwt.js** - JWT management ✅
- **jwt-status.js** - JWT status ✅
- **rotate-jwt.js** - JWT rotation ✅
- **jwt-manage.sh** - JWT helper ✅
- **generate-vapid-keys.js** - PWA push notifications ✅
- **reset-admin-password.js** - Password recovery ✅
- **restore-backup.js** - Backup restoration ✅
- **auto-cleanup.js** - Automatic cleanup ✅
- **check-jwt-on-start.js** - Startup validation ✅
- **complete-security-setup.js** - Security setup ✅
- **post-update.sh** - Post-update tasks ✅

### Documentation (Keep - Active)
- **docs/TESTING.md** - Testing guide ✅
- **docs/PWA_SETUP.md** - PWA configuration ✅
- **docs/POSTGRESQL_SETUP.md** - PostgreSQL guide ✅
- **docs/MOBILE_GUIDE.md** - Mobile usage ✅
- **docs/PERFORMANCE_GUIDE.md** - Performance tips ✅
- **docs/BUG_TRACKER.md** - Bug tracking ✅
- **docs/MIGRATION-CONSOLIDATION.md** - Migration info ✅
- **docs/SINGLE-MIGRATION-GUIDE.md** - Migration help ✅

---

## 📦 Summary of Actions

### Immediate Deletion (5 files)
```bash
rm UPDATE_TEST.md
rm .update-channel
rm .gitkeep_migrations_deleted
```

### Safe Deletion - Old Docs (9 files)
```bash
rm EXECUTION_PLAN.md
rm SPRINT_1_PLAN.md
rm HANDOFF_PROMPT.md
rm UPGRADE_TO_v0.8.0.md
rm SECURITY_UPDATE_v0.8.1.md
rm QUICK-REFERENCE.md
rm REPO_STRUCTURE.md
rm CLEANUP_LOG.md
rm docs/RELEASE_NOTES_v0.9.0.md
rm docs/v0.8.0_SERVER_PATCH.md
```

### Move to Archive (9 files)
```bash
mv docs/SPRINT_*.md docs/archive/
mv docs/PHASE_*.md docs/archive/
mv docs/SERVER_INTEGRATION_PATCH.md docs/archive/
```

### Review Before Deleting (4 scripts)
```bash
# Check usage first:
scripts/generate-pwa-icons.sh
scripts/apply-security-update.js
scripts/cleanup-migrations.js
scripts/update-html-pwa.js
```

---

## 📊 Impact

**Before Cleanup:**
- Root: ~27 files
- docs/: ~19 files
- scripts/: ~19 files

**After Cleanup:**
- Root: ~16 files (-11)
- docs/: ~10 active files (-9 moved to archive)
- scripts/: ~15-19 files (depending on review)

**Total Reduction:** ~20 files cleaned up
**Archive Created:** ~9 historical docs preserved

---

## 🚀 Recommended Execution

### Phase 1: Safe Immediate Cleanup
```bash
cd /opt/invai

# Delete temporary/test files
git rm UPDATE_TEST.md .update-channel .gitkeep_migrations_deleted

# Commit
git commit -m "Remove temporary test files"
```

### Phase 2: Archive Sprint Docs
```bash
# Create archive directory if not exists
mkdir -p docs/archive

# Move sprint documentation
git mv docs/SPRINT_*.md docs/archive/
git mv docs/PHASE_*.md docs/archive/
git mv docs/SERVER_INTEGRATION_PATCH.md docs/archive/

# Commit
git commit -m "Archive completed sprint documentation"
```

### Phase 3: Remove Old Version Docs
```bash
# Delete outdated upgrade guides
git rm UPGRADE_TO_v0.8.0.md
git rm SECURITY_UPDATE_v0.8.1.md
git rm docs/RELEASE_NOTES_v0.9.0.md
git rm docs/v0.8.0_SERVER_PATCH.md

# Commit
git commit -m "Remove outdated version upgrade guides"
```

### Phase 4: Remove Redundant Docs
```bash
# Delete duplicates
git rm EXECUTION_PLAN.md SPRINT_1_PLAN.md HANDOFF_PROMPT.md
git rm QUICK-REFERENCE.md REPO_STRUCTURE.md CLEANUP_LOG.md

# Commit
git commit -m "Remove redundant documentation"
```

### Phase 5: Review Scripts
```bash
# Check if scripts are still used:
grep -r "generate-pwa-icons" .
grep -r "apply-security-update" .
grep -r "cleanup-migrations" .
grep -r "update-html-pwa" .

# If not used, delete:
# git rm scripts/[unused-script].js
# git commit -m "Remove unused scripts"
```

---

## ✅ Benefits

1. **Cleaner Repository** - Easier to navigate
2. **Faster Clones** - Less data to download
3. **Clear Documentation** - Only current/relevant docs
4. **Maintainability** - Less confusion about what's active
5. **Historical Preservation** - Archive keeps important history

---

## 📝 Notes

- **Git History Preserved**: Deleted files remain in Git history
- **Rollback Possible**: Can always restore from commits
- **Archive Available**: Important docs moved, not deleted
- **Script Review**: Check script usage before removing

---

**Ready to clean up?** Follow the phased approach above for a safe, organized cleanup! 🧹
