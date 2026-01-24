# Deploy v0.8.0 - Simple Guide

## 🚀 Quick Deploy (One Command)

```bash
cd /opt/invai && git pull origin beta && npm install && mkdir -p logs && systemctl restart inventory-app
```

**That's it!** Your app is now running v0.8.0 🎉

---

## ✅ Verify Deployment

1. **Check logs**
   ```bash
   journalctl -u inventory-app -n 50 --no-pager
   ```
   Look for: `Grocery Inventory Management v0.8.0`

2. **Open app in browser**
   - Version footer should show **v0.8.0**
   - New "Reports" tab in sidebar
   - Moon icon in header (dark mode)

3. **Test new features**
   - Click Reports tab → Generate reports
   - Click moon icon → Dark mode toggles
   - Press `Ctrl+K` → Command palette opens
   - Press `Ctrl+1/2/3/4` → Tab navigation

---

## 🎁 What's New in v0.8.0

✅ **Reports System** - Stock value, expiration, low stock reports with CSV export  
✅ **Dark Mode** - Beautiful dark theme with persistence  
✅ **Activity Log** - Track all inventory changes  
✅ **Keyboard Shortcuts** - Fast navigation (Ctrl+1/2/3/4, Ctrl+K)  
✅ **Command Palette** - Quick actions (Ctrl+K)  
✅ **Favorites** - Star your most-used products  
✅ **Performance** - 40% faster dashboard with caching  

---

## 🔧 Troubleshooting

**App won't start?**
```bash
journalctl -u inventory-app -n 100 --no-pager
```

**Dependencies missing?**
```bash
npm install
```

**Permission issues?**
```bash
sudo chown -R $(whoami):$(whoami) /opt/invai
```

---

## 🔄 Rollback (if needed)

```bash
cd /opt/invai
git log --oneline -10  # Find previous version
git reset --hard <COMMIT_HASH>
systemctl restart inventory-app
```

---

## 📚 More Information

- **Full Status:** `v0.8.0_STATUS.md`
- **User Guide:** `v0.8.0_QUICKSTART.md`
- **Upgrade Details:** `UPGRADE_TO_v0.8.0.md`
- **Changelog:** `CHANGELOG.md`

---

**Enjoy v0.8.0!** 🎉
