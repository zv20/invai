# Version System Test

This file is used to test the automated git-tag versioning system.

## Test Details
- **Date:** January 28, 2026
- **Purpose:** Verify version bump from v0.10.5 → v0.10.6
- **Type:** Patch release (bug fix / test)

## Expected Workflow

1. ✅ Merge this PR to beta
2. ✅ Pull changes to server
3. ✅ Run `npm run version:bump patch`
4. ✅ Verify version changes to v0.10.6
5. ✅ Push new tag to GitHub
6. ✅ Restart app

## Success Criteria

- [ ] Version bumped: 0.10.5 → 0.10.6
- [ ] Git tag created: v0.10.6
- [ ] package.json updated
- [ ] Tag pushed to GitHub
- [ ] UI shows v0.10.6

---

**Note:** This file can be deleted after successful test.
