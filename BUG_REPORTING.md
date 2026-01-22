# 🐛 Bug Reporting Guide

> **Quick Reference**: Use this guide when reporting bugs to maintain consistency and speed up debugging.

---

## 📋 Quick Bug Report Template

Copy and fill this out when reporting bugs:

```markdown
## Bug: [Short descriptive title]

**Where**: [Page/section where bug occurs]
**What**: [What's broken/not working]
**Expected**: [What should happen]
**Actual**: [What actually happens]
**Steps**: 
1. Step one
2. Step two
3. Bug appears

**Impact**: [Critical/High/Medium/Low]
**Version**: [Current version from package.json]

[Optional: Screenshot/error message/logs]
```

---

## 🎯 Bug Report Examples

### Example 1: UI Bug (Simple)
```markdown
## Bug: Categories dropdown not showing in product edit

**Where**: Inventory page → Edit Product modal
**What**: Category dropdown is empty
**Expected**: Should show all 12 categories (Dairy, Produce, etc.)
**Actual**: Dropdown shows "Select Category" but no options appear
**Steps**: 
1. Go to Inventory page
2. Click Edit on any product
3. Look at Category dropdown

**Impact**: High (can't assign categories to products)
**Version**: v0.7.8
```

### Example 2: Display Bug (Data Issue)
```markdown
## Bug: Supplier name showing as [object Object]

**Where**: Product cards on Inventory page
**What**: Supplier displays as "[object Object]" instead of name
**Expected**: Should show "ABC Suppliers" (actual supplier name)
**Actual**: Shows literal text "[object Object]"
**Steps**: 
1. Go to Inventory page
2. Look at any product card with supplier assigned

**Impact**: Medium (display issue, doesn't break functionality)
**Version**: v0.7.8

**Browser Console Error**: 
TypeError: Cannot read property 'name' of undefined
  at renderProductCard (inventory.js:245)
```

### Example 3: Server Bug (Critical)
```markdown
## Bug: Server crashes when adding new supplier

**Where**: Settings → Suppliers → Add Supplier
**What**: Server crashes completely when saving new supplier
**Expected**: New supplier saves and appears in list
**Actual**: Server stops responding, need to restart service
**Steps**: 
1. Go to Settings
2. Click Suppliers tab
3. Click "Add Supplier"
4. Fill in name, email, phone
5. Click Save
6. Server crashes

**Impact**: Critical (server crash)
**Version**: v0.7.8

**Server Error**: 
Error: SQLITE_ERROR: table suppliers has no column named contact_name
  at /opt/invai/server.js:345:12

**Server Logs**:
journalctl -u invai -n 20:
[Paste relevant log lines]
```

---

## 📊 Severity Levels

### 🔴 Critical
- Server crashes
- Data loss
- Complete feature failure
- Cannot start application
- Security vulnerabilities

**Response Time**: Fix immediately

### 🟠 High Priority
- Major feature not working
- Blocking user workflow
- Incorrect data displayed
- Performance severely degraded

**Response Time**: Fix within 24 hours

### 🟡 Medium Priority
- Minor feature issues
- UI/UX problems
- Non-critical display errors
- Workaround available

**Response Time**: Fix in next update

### 🟢 Low Priority
- Cosmetic issues
- Minor typos
- Slight alignment problems
- Enhancement requests

**Response Time**: Batch fix in future version

---

## 📝 Reporting Multiple Bugs

### Quick List Format

When you have multiple bugs, use this format:

```markdown
## Bugs Found After [Version] Update

### 🔴 Critical
1. **Server crash on supplier add** - Settings → Suppliers → crashes on save
2. **Cannot save products** - Save button does nothing

### 🟡 High Priority
3. **Categories not loading** - Edit modal dropdown empty
4. **Filter not working** - Category filter shows no results
5. **Batch suggestions wrong** - Shows newest instead of oldest

### 🟢 Medium/Low Priority
6. **Typo in button** - "Sumbit" instead of "Submit"
7. **Alignment issue** - Supplier card text slightly off-center
8. **Dashboard count off** - Shows 99 products but actually 100
```

Then provide full details for Critical/High bugs:

```markdown
---

## Critical Bug #1: Server crash on supplier add

**Where**: Settings → Suppliers → Add Supplier
[Continue with full template...]
```

---

## 🔍 Information to Include

### Always Include
- ✅ **Version**: Current version from package.json
- ✅ **Location**: Exact page/section where bug occurs
- ✅ **Steps to reproduce**: Clear 1-2-3 steps
- ✅ **Expected vs Actual**: What should happen vs what does happen
- ✅ **Impact level**: Critical/High/Medium/Low

### Include When Available
- 📱 **Browser**: Chrome 120, Firefox 115, Safari 17, Edge 119
- 🖥️ **OS**: Ubuntu 22.04, Windows 11, macOS Sonoma
- 🔧 **Environment**: Production server, local dev, Docker
- 📸 **Screenshot**: Visual bugs or error messages
- 📋 **Console errors**: F12 → Console tab → copy error
- 📝 **Server logs**: `journalctl -u invai -n 50 --no-pager`
- 💾 **Database state**: Table exists? Row count? Example data?

### Optional Context
- 🕐 **When it started**: "Worked fine on v0.7.7, broke on v0.7.8"
- 🔄 **Frequency**: "Happens every time" vs "Happens randomly"
- 🛠️ **Workaround**: "Can fix by restarting server" or "No workaround"
- 📊 **Data specifics**: "Only happens with products that have no category"

---

## 🚫 What NOT to Include

### Avoid These
- ❌ **Long explanations** of how you think it should be fixed
- ❌ **Multiple unrelated bugs** in one report (split them up)
- ❌ **Speculative guesses** about the cause (unless certain)
- ❌ **Feature requests** mixed with bug reports (separate those)
- ❌ **Duplicate reports** (check if already reported)
- ❌ **Vague descriptions** like "it's broken" or "doesn't work"

---

## 💬 Communication Shortcuts

### Rapid Report (Multiple Bugs)
```
Found 3 bugs after v0.7.8 update:
1. Categories dropdown empty in edit modal
2. Supplier showing as [object Object] on cards  
3. Filter by supplier returns no results

Want details on any specific one?
```

### Single Critical Bug
```
CRITICAL BUG: Server crashes when adding supplier

[Use full template format]
```

### Mixed Approach
```
Got 5 bugs - 2 critical, 3 minor:

CRITICAL:
- Server crashes when adding supplier (details below)
- Can't save products, button disabled

[Full details for critical bug...]

MINOR (quick list):
- Typo in Settings tab ("Setings")
- Category colors not showing
- Dashboard count off by 1
```

---

## 🔧 Getting Debug Information

### Browser Console Errors
1. Open Developer Tools: `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Go to Console tab
3. Reproduce the bug
4. Copy any red error messages
5. Include in bug report

### Server Logs (Linux systemd)
```bash
# Last 50 lines
journalctl -u invai -n 50 --no-pager

# Follow live logs
journalctl -u invai -f

# Since specific time
journalctl -u invai --since "10 minutes ago"
```

### Database Inspection
```bash
# Connect to database
sqlite3 /opt/invai/inventory.db

# List tables
.tables

# Show table schema
.schema suppliers

# Count rows
SELECT COUNT(*) FROM suppliers;

# Show sample data
SELECT * FROM suppliers LIMIT 5;

# Exit
.quit
```

### Check Current Version
```bash
# From package.json
cat /opt/invai/package.json | grep version

# From git
cd /opt/invai && git log -1 --oneline
```

---

## 🎯 What Happens After Reporting

When you report a bug, the AI assistant will:

1. ✅ **Acknowledge** the bug and confirm understanding
2. ✅ **Diagnose** the root cause based on your description
3. ✅ **Prioritize** based on severity
4. ✅ **Fix** the code and push updates to repository
5. ✅ **Test** the fix logic before committing
6. ✅ **Document** the fix in CHANGELOG.md
7. ✅ **Provide** update instructions

### For Critical Bugs
- Immediate attention
- Hot-fix commit created
- Detailed explanation of what went wrong
- Prevention steps for future

### For Non-Critical Bugs
- Grouped with similar fixes
- Scheduled for next version
- May ask for additional context
- Can be batched with other improvements

---

## 📚 Related Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - See what bugs were fixed in each version
- **[ROADMAP.md](ROADMAP.md)** - Check if bug is known/planned to be fixed
- **[scripts/README.md](scripts/README.md)** - Troubleshooting and fix scripts
- **[README.md](README.md)** - General documentation and support

---

## 🆘 Emergency Procedures

### If Server Won't Start
```bash
# Check service status
sudo systemctl status invai

# View recent errors
journalctl -u invai -n 100 --no-pager

# Restore from backup (if database corrupted)
cp /opt/invai/backups/inventory_backup_LATEST.db /opt/invai/inventory.db
sudo systemctl restart invai
```

### If Database is Corrupted
```bash
# Check database integrity
sqlite3 /opt/invai/inventory.db "PRAGMA integrity_check;"

# If corrupt, restore from backup
ls -lh /opt/invai/backups/
cp /opt/invai/backups/inventory_backup_YYYYMMDD_HHMMSS.db /opt/invai/inventory.db
sudo systemctl restart invai
```

### If Update Broke Everything
```bash
# Rollback to previous version
cd /opt/invai
git log --oneline -10  # Find previous stable commit
git reset --hard [COMMIT_SHA]  # Use commit from before update
sudo systemctl restart invai

# Report what broke with full details
```

---

## 📞 Getting Help

### When to Report a Bug
- Something that worked before is now broken
- Error messages appear
- Data is incorrect or missing
- UI doesn't behave as expected
- Server crashes or stops responding

### When NOT to Report as Bug
- You want a new feature (use feature request instead)
- You need help using the app (ask for documentation)
- You have a question about setup (use support channels)
- It's working as designed but you don't like it (use feedback)

### Support Channels
- **GitHub Issues**: [github.com/zv20/invai/issues](https://github.com/zv20/invai/issues)
- **GitHub Discussions**: [github.com/zv20/invai/discussions](https://github.com/zv20/invai/discussions)
- **AI Assistant**: Just say "Found a bug:" and provide details

---

## ✅ Bug Report Checklist

Before submitting, ensure you've included:

- [ ] Clear, descriptive title
- [ ] Location where bug occurs
- [ ] Steps to reproduce (1-2-3 format)
- [ ] Expected behavior
- [ ] Actual behavior
- [ ] Severity/Impact level
- [ ] Current version number
- [ ] Error messages (if any)
- [ ] Browser/environment info (if relevant)
- [ ] Screenshots (if visual bug)

---

**Last Updated**: January 22, 2026  
**InvAI Version**: v0.7.8

---

<div align="center">
  <sub>Good bug reports lead to quick fixes! 🚀</sub>
</div>